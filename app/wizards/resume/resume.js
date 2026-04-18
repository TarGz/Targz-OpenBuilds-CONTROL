// Recovery / Restart from line
// Original by @rlwoodjr — https://github.com/OpenBuilds/OpenBuilds-CONTROL/issues/96
// Hardened version with comprehensive modal state scanning and safety checks

function recoverCrashedJob() {
  if (localStorage.getItem('gcodeLineNumber')) {
    var lineNumber = localStorage.getItem('gcodeLineNumber')
    if (lineNumber > editor.session.getLength()) {
      lineNumber = 1;
    }
  } else {
    var lineNumber = 1;
  }

  var resumeTemplate = `
  <form>
    Enter the starting line to recover the job from:
    <br>
    <span class="text-small">(Make sure you opened the GCODE first)</span>
    <hr>
    <input id="selectedLineNumber" data-prepend="<i class='fas fa-list-ol'></i> Start from line: " type="number" data-role="input" data-clear-button="false" value="` + lineNumber + `" data-editable="true"></input>
    <hr>
  </form>
  <div class="remark success">
  Tip: You can also pick the line from the GCODE Editor tab — click on a line and use the "Restart from here" button in the 3D view
  </div>
  <hr>
  <div class="remark warning">
    NOTE: Use this tool at your own risk. Recovering GCODE is a risky operation. You are also responsible for ensuring that work origin is correctly set.
  </div>
  `
  Metro.dialog.create({
    title: "<i class='fas fa-fw fa-route'></i> Recover Job From Line Number",
    content: resumeTemplate,
    clsDialog: 'dark',
    actions: [{
        caption: "Proceed to next step",
        cls: "js-dialog-close alert",
        onclick: function() {
          startFromHere($("#selectedLineNumber").val());
        }
      },
      {
        caption: "Cancel",
        cls: "js-dialog-close",
        onclick: function() {}
      }
    ]
  });
};


// Scan all G-code lines before the target to extract full machine state
function scanModalState(lineNumber) {
  var state = {
    // Coordinates (last seen absolute positions)
    x: null,
    y: null,
    z: null,
    a: null,
    // Z values
    firstZ: null,         // first Z move (for header detection)
    firstZLine: 0,
    lastCuttingZ: null,   // last negative Z (cutting depth)
    // Feed rates
    lastCuttingFeed: null, // last F on G1/G2/G3 line
    lastRapidFeed: null,   // last F on G0 line
    // Modal groups
    distanceMode: 'G90',   // G90 or G91
    units: 'G21',          // G20 or G21
    wcs: 'G54',            // G54-G59
    plane: 'G17',          // G17/G18/G19
    feedRateMode: 'G94',   // G93/G94
    motionMode: 'G0',      // G0/G1/G2/G3
    // Spindle
    spindleState: null,    // M3, M4, or M5
    spindleSpeed: null,    // S value
    spindleLine: null,     // full spindle line text
    spindleDwell: null,    // G4 dwell after spindle on
    // Coolant
    coolant: 'M9',         // M7/M8/M9
    // Tool
    toolNumber: null,      // T number
    hasToolChange: false,  // M6 seen
    // G92 offset
    g92Active: false,
    g92Line: null,
    // Warnings
    warnings: []
  };

  var foundFirstZ = false;
  var lastMotionMode = 'G0'; // track whether line is rapid or cutting

  for (var i = 0; i < lineNumber - 1; i++) {
    var rawLine = editor.session.getLine(i);
    if (!rawLine || rawLine.length === 0) continue;

    // Strip comments (everything after ; or inside parentheses)
    var line = rawLine.split(/[;(]/)[0].trim().toUpperCase();
    if (line.length === 0) continue;

    // Track motion mode (sticky — affects how we interpret F values)
    if (/\bG0\b/.test(line)) lastMotionMode = 'G0';
    if (/\bG1\b/.test(line)) lastMotionMode = 'G1';
    if (/\bG2\b/.test(line)) lastMotionMode = 'G2';
    if (/\bG3\b/.test(line)) lastMotionMode = 'G3';

    // Distance mode
    if (/\bG90\b/.test(line)) state.distanceMode = 'G90';
    if (/\bG91\b/.test(line)) state.distanceMode = 'G91';

    // Units
    if (/\bG20\b/.test(line)) state.units = 'G20';
    if (/\bG21\b/.test(line)) state.units = 'G21';

    // WCS
    var wcsMatch = line.match(/\b(G5[4-9])\b/);
    if (wcsMatch) state.wcs = wcsMatch[1];

    // Plane
    if (/\bG17\b/.test(line)) state.plane = 'G17';
    if (/\bG18\b/.test(line)) state.plane = 'G18';
    if (/\bG19\b/.test(line)) state.plane = 'G19';

    // Feed rate mode
    if (/\bG93\b/.test(line)) state.feedRateMode = 'G93';
    if (/\bG94\b/.test(line)) state.feedRateMode = 'G94';

    // G92 offset
    if (/\bG92\b/.test(line) && !/\bG92\.1\b/.test(line)) {
      state.g92Active = true;
      state.g92Line = line;
    }
    if (/\bG92\.1\b/.test(line)) {
      state.g92Active = false;
      state.g92Line = null;
    }

    // Coordinates — use regex for robust extraction
    var xMatch = line.match(/X([+-]?\d*\.?\d+)/);
    var yMatch = line.match(/Y([+-]?\d*\.?\d+)/);
    var zMatch = line.match(/Z([+-]?\d*\.?\d+)/);
    var aMatch = line.match(/A([+-]?\d*\.?\d+)/);

    if (xMatch) state.x = parseFloat(xMatch[1]);
    if (yMatch) state.y = parseFloat(yMatch[1]);
    if (zMatch) {
      var zVal = parseFloat(zMatch[1]);
      if (!foundFirstZ) {
        state.firstZ = zVal;
        state.firstZLine = i + 1;
        foundFirstZ = true;
      }
      if (zVal < 0) {
        state.lastCuttingZ = zVal;
      }
      state.z = zVal;
    }
    if (aMatch) state.a = parseFloat(aMatch[1]);

    // Feed rate — associate with motion mode
    var fMatch = line.match(/F([+-]?\d*\.?\d+)/);
    if (fMatch) {
      var fVal = parseFloat(fMatch[1]);
      if (lastMotionMode === 'G0') {
        state.lastRapidFeed = fVal;
      } else {
        state.lastCuttingFeed = fVal;
      }
    }

    // Spindle
    if (/\bM3\b/.test(line) || /\bM4\b/.test(line)) {
      state.spindleState = /\bM3\b/.test(line) ? 'M3' : 'M4';
      var sMatch = line.match(/S([+-]?\d*\.?\d+)/);
      if (sMatch) state.spindleSpeed = parseFloat(sMatch[1]);
      state.spindleLine = line.trim();
      // Check next line for dwell (G4 pause for spindle spin-up)
      var nextLine = editor.session.getLine(i + 1);
      if (nextLine && nextLine.toUpperCase().trim().indexOf('G4') !== -1) {
        state.spindleDwell = nextLine.trim().toUpperCase();
      } else {
        state.spindleDwell = null;
      }
    }
    if (/\bM5\b/.test(line)) {
      state.spindleState = 'M5';
      state.spindleSpeed = null;
      state.spindleLine = null;
      state.spindleDwell = null;
    }

    // S value can appear on motion lines too (laser mode)
    var sOnMotion = line.match(/S([+-]?\d*\.?\d+)/);
    if (sOnMotion && !(/\bM[345]\b/.test(line))) {
      state.spindleSpeed = parseFloat(sOnMotion[1]);
    }

    // Coolant
    if (/\bM7\b/.test(line)) state.coolant = 'M7';
    if (/\bM8\b/.test(line)) state.coolant = 'M8';
    if (/\bM9\b/.test(line)) state.coolant = 'M9';

    // Tool
    var toolMatch = line.match(/\bT(\d+)/);
    if (toolMatch) state.toolNumber = parseInt(toolMatch[1]);
    if (/\bM0?6\b/.test(line)) state.hasToolChange = true;
  }

  // Generate warnings
  if (state.distanceMode === 'G91') {
    state.warnings.push('G91 (incremental mode) was active before restart point. Absolute positions may be unreliable. Recovery will use G90 for positioning, then restore G91.');
  }
  if (state.hasToolChange && state.toolNumber !== null) {
    state.warnings.push('Tool change detected before restart point. Ensure Tool T' + state.toolNumber + ' is loaded.');
  }
  if (state.g92Active) {
    state.warnings.push('G92 offset was active. The recovery will attempt to restore it, but verify work coordinates carefully.');
  }
  if (state.spindleState === null || state.spindleState === 'M5') {
    state.warnings.push('No active spindle command found before restart point. You may need to start spindle manually before running.');
  }
  if (state.x === null && state.y === null) {
    state.warnings.push('No X/Y coordinates found before restart point. Cannot determine entry position.');
  }

  return state;
}


function validateRecovery(lineNumber) {
  var errors = [];
  var warnings = [];

  // Check editor has content
  if (!editor || editor.session.getLength() <= 1) {
    errors.push('No G-code loaded in editor. Please open a G-code file first.');
  }

  // Check line number is valid
  if (lineNumber < 1 || lineNumber > editor.session.getLength()) {
    errors.push('Line number ' + lineNumber + ' is out of range (file has ' + editor.session.getLength() + ' lines).');
  }

  // Check machine connection (if laststatus is available)
  if (typeof laststatus !== 'undefined' && laststatus) {
    if (laststatus.comms && laststatus.comms.connectionStatus < 2) {
      warnings.push('Machine is not connected. You can generate the recovery G-code, but cannot run it until connected.');
    }
    if (laststatus.comms && laststatus.comms.connectionStatus === 5) {
      errors.push('Machine is in ALARM state. Clear the alarm before attempting recovery.');
    }
    // Check if work zero might not be set
    if (laststatus.machine && laststatus.machine.position && laststatus.machine.position.offset) {
      var off = laststatus.machine.position.offset;
      if (off.x === 0 && off.y === 0 && off.z === 0) {
        warnings.push('Work coordinate offsets are all zero. Work zero may not be set — verify before running.');
      }
    }
  }

  return { errors: errors, warnings: warnings };
}


function startFromHere(lineNumber) {
  lineNumber = parseInt(lineNumber);

  // Validate first
  var validation = validateRecovery(lineNumber);
  if (validation.errors.length > 0) {
    Metro.dialog.create({
      title: "<i class='fas fa-fw fa-exclamation-triangle fg-red'></i> Cannot Recover",
      content: '<div class="remark alert">' + validation.errors.join('<br>') + '</div>',
      clsDialog: 'dark',
      actions: [{
        caption: "OK",
        cls: "js-dialog-close",
        onclick: function() {}
      }]
    });
    return;
  }

  // Scan modal state
  var state = scanModalState(lineNumber);

  // Combine warnings
  var allWarnings = validation.warnings.concat(state.warnings);

  // Build recovery G-code preview
  var recoveryHeader = buildRecoveryGcode(lineNumber, state, true);

  // Build strategy display
  var warningsHtml = '';
  if (allWarnings.length > 0) {
    warningsHtml = '<div class="remark warning mt-2"><b>Warnings:</b><ul>';
    for (var i = 0; i < allWarnings.length; i++) {
      warningsHtml += '<li>' + allWarnings[i] + '</li>';
    }
    warningsHtml += '</ul></div>';
  }

  var stateHtml = '<table class="table compact striped">';
  stateHtml += '<tr><td>Units</td><td>' + state.units + (state.units === 'G20' ? ' (inch)' : ' (mm)') + '</td></tr>';
  stateHtml += '<tr><td>Distance Mode</td><td>' + state.distanceMode + (state.distanceMode === 'G91' ? ' <span class="fg-red">(incremental)</span>' : ' (absolute)') + '</td></tr>';
  stateHtml += '<tr><td>WCS</td><td>' + state.wcs + '</td></tr>';
  stateHtml += '<tr><td>Plane</td><td>' + state.plane + '</td></tr>';
  stateHtml += '<tr><td>Entry Position</td><td>X' + (state.x !== null ? state.x : '?') + ' Y' + (state.y !== null ? state.y : '?') + '</td></tr>';
  stateHtml += '<tr><td>Cutting Z</td><td>' + (state.lastCuttingZ !== null ? state.lastCuttingZ : 'N/A') + '</td></tr>';
  stateHtml += '<tr><td>Cutting Feed</td><td>' + (state.lastCuttingFeed !== null ? 'F' + state.lastCuttingFeed : 'N/A') + '</td></tr>';
  stateHtml += '<tr><td>Spindle</td><td>' + (state.spindleLine ? state.spindleLine : '<span class="fg-red">OFF / Not found</span>') + '</td></tr>';
  if (state.hasToolChange) {
    stateHtml += '<tr><td>Tool</td><td>T' + state.toolNumber + ' <span class="fg-orange">(verify loaded)</span></td></tr>';
  }
  stateHtml += '</table>';

  var previewHtml = '<div style="max-height:200px; overflow-y:auto; background:#1a1a1a; padding:8px; border-radius:4px; font-family:monospace; font-size:12px; white-space:pre; color:#0f0;">' +
    escapeHtmlResume(recoveryHeader) + '</div>';

  var resumeFileTemplate = `
    <form>
      <div>
        <b>Recovery strategy for restarting from line ` + lineNumber + `:</b>
        <hr>
        <div class="text-small"><b>Detected Machine State:</b></div>
        ` + stateHtml + `
        <hr>
        <div class="text-small"><b>Recovery G-code preview (header):</b></div>
        ` + previewHtml + `
        ` + warningsHtml + `
      </div>
    </form>
    <div class="remark warning mt-2">
      NOTE: Recovery will replace the editor content. The job will NOT start automatically — you must click Run Job.
    </div>
  `

  // Store state for redoJob to use
  window._recoveryState = state;
  window._recoveryLineNumber = lineNumber;

  // Skip the confirmation dialog — proceed straight to recovery.
  // (Validation errors are still surfaced above via Metro.dialog; warnings
  // are non-blocking.)
  redoJob();
}

function escapeHtmlResume(text) {
  if (!text) return '';
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}


function buildRecoveryGcode(lineNumber, state, headerOnly) {
  var gcode = '';
  var headerLines = [];

  // Keep header: all lines before the first Z motion
  var headerEnd = state.firstZLine > 0 ? state.firstZLine - 1 : 0;
  for (var i = 0; i < headerEnd; i++) {
    var line = editor.session.getLine(i);
    headerLines.push(line);
  }

  gcode += '; === RECOVERY - Restart from line ' + lineNumber + ' ===\n';
  gcode += '; Generated: ' + new Date().toISOString() + '\n';
  gcode += '; Original header lines: 1-' + (headerEnd > 0 ? headerEnd : 1) + '\n';
  gcode += '\n';

  // Original header
  for (var i = 0; i < headerLines.length; i++) {
    gcode += headerLines[i] + '\n';
  }

  gcode += '\n; --- Recovery state restoration ---\n';

  // Restore modal state (always use G90 for recovery positioning)
  gcode += state.units + '  ; restore units\n';
  gcode += 'G90  ; absolute mode for recovery positioning\n';
  gcode += state.wcs + '  ; restore WCS\n';
  gcode += state.plane + '  ; restore plane\n';
  gcode += state.feedRateMode + '  ; restore feed rate mode\n';

  // Restore G92 if it was active
  if (state.g92Active && state.g92Line) {
    gcode += state.g92Line + '  ; restore G92 offset\n';
  }

  // Spindle restore
  if (state.spindleState && state.spindleState !== 'M5' && state.spindleLine) {
    gcode += state.spindleLine + '  ; restore spindle\n';
    if (state.spindleDwell) {
      gcode += state.spindleDwell + '  ; spindle spin-up dwell\n';
    }
  }

  // Coolant restore
  if (state.coolant !== 'M9') {
    gcode += state.coolant + '  ; restore coolant\n';
  }

  gcode += '\n; --- Recovery positioning ---\n';

  // Safe Z retract (machine coordinates — always safe regardless of WCS)
  gcode += 'G53 G0 Z-5  ; safe Z retract (machine coords)\n';

  // Rapid to entry XY position
  var xyMove = 'G0';
  if (state.x !== null) xyMove += ' X' + state.x;
  if (state.y !== null) xyMove += ' Y' + state.y;
  if (state.a !== null) xyMove += ' A' + state.a;
  gcode += xyMove + '  ; rapid to restart position\n';

  // Plunge to cutting Z
  if (state.lastCuttingZ !== null) {
    var plungeFeed = state.lastCuttingFeed ? ' F' + state.lastCuttingFeed : '';
    gcode += 'G1 Z' + state.lastCuttingZ + plungeFeed + '  ; plunge to cutting depth\n';
  } else if (state.z !== null) {
    var plungeFeed = state.lastCuttingFeed ? ' F' + state.lastCuttingFeed : '';
    gcode += 'G1 Z' + state.z + plungeFeed + '  ; plunge to last Z\n';
  }

  // Restore cutting feed if not already set
  if (state.lastCuttingFeed) {
    gcode += 'F' + state.lastCuttingFeed + '  ; restore cutting feedrate\n';
  }

  // Restore distance mode if it was incremental
  if (state.distanceMode === 'G91') {
    gcode += 'G91  ; restore incremental mode\n';
  }

  gcode += '\n; --- Resume from line ' + lineNumber + ' ---\n';

  if (headerOnly) {
    return gcode;
  }

  // Append remaining gcode from target line onward
  var totalLines = editor.session.getLength();
  for (var i = lineNumber - 1; i < totalLines; i++) {
    gcode += editor.session.getLine(i) + '\n';
  }

  return gcode;
}


function redoJob() {
  var state = window._recoveryState;
  var lineNumber = window._recoveryLineNumber;

  if (!state || !lineNumber) {
    Metro.toast.create('Recovery state not found. Please try again.', null, 5000, 'bg-red');
    return;
  }

  var gcode = buildRecoveryGcode(lineNumber, state, false);

  editor.session.setValue("");
  editor.session.setValue(gcode);
  $('#controlTab').click();
  parseGcodeInWebWorker(gcode);

  // Clean up
  window._recoveryState = null;
  window._recoveryLineNumber = null;

}
