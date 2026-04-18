// Command Deck — interaction layer for the CD layout.
// Bridges new CD elements to existing socket.io/jog/ui plumbing.

$(document).ready(function () {

  // Resize the 3D renderer once the Command Deck layout is in place.
  // Three.js sized itself before flex:1 chained through, leaving a tiny canvas.
  setTimeout(function () {
    if (typeof fixRenderSize === 'function') fixRenderSize();
  }, 200);
  setTimeout(function () {
    if (typeof fixRenderSize === 'function') fixRenderSize();
  }, 800);


  // ─── Step size buttons ───────────────────────────────────────────────────
  $('.cd-step-btn').on('click', function () {
    var step = parseFloat($(this).data('step'));
    if (unit === 'mm') {
      jogdistXYZ = step;
    } else {
      // convert stored mm values to their inch equivalents
      var map = { 0.01: 0.0254, 0.1: 0.0254, 1: 0.254, 10: 2.54 };
      jogdistXYZ = map[step] !== undefined ? map[step] : step;
    }
    // sync old dist buttons so existing jog.js logic stays consistent
    var idMap = { 0.01: '#dist01', 0.1: '#dist01', 1: '#dist1', 10: '#dist10' };
    var target = idMap[step];
    if (target) $(target).trigger('click');

    $('.cd-step-btn').removeClass('cd-step-active');
    $(this).addClass('cd-step-active');
  });

  // ─── Unit toggle (mirror existing mmMode/inMode buttons) ─────────────────
  // The CD unit buttons call mmMode()/inMode() inline — we just sync styling.
  function syncUnitBtns() {
    if (unit === 'mm') {
      $('#cdMmBtn').addClass('cd-unit-active');
      $('#cdInBtn').removeClass('cd-unit-active');
      $('.cdUnitsLabel').text('mm');
    } else {
      $('#cdInBtn').addClass('cd-unit-active');
      $('#cdMmBtn').removeClass('cd-unit-active');
      $('.cdUnitsLabel').text('inch');
    }
  }

  // Patch mmMode/inMode to also sync CD buttons after they run
  var _origMmMode = window.mmMode;
  window.mmMode = function () {
    _origMmMode.apply(this, arguments);
    syncUnitBtns();
  };
  var _origInMode = window.inMode;
  window.inMode = function () {
    _origInMode.apply(this, arguments);
    syncUnitBtns();
  };
  syncUnitBtns(); // initial sync on load

  // ─── Dev Machine (simulator) ─────────────────────────────────────────────
  // Provides a no-hardware "connected" state so the UI can be exercised
  // (DROs, feed, job controls, etc.) without a real controller.
  var DEV_PORT_VALUE = '__dev-machine__';
  var devTimer = null;
  var devPos = { x: 0, y: 0, z: 0 };

  function fakeStatus(overrides) {
    var s = {
      comms: {
        connectionStatus: 1,
        interfaces: {
          activePort: 'Dev Machine (simulator)',
          serialBaud: 115200,
          ports: []
        }
      },
      machine: {
        position: {
          work: { x: devPos.x, y: devPos.y, z: devPos.z },
          machine: { x: devPos.x, y: devPos.y, z: devPos.z }
        },
        overrides: {
          realFeed: 0,
          feedOverride: 100,
          spindleOverride: 100
        },
        modals: { spindle: 'M5' }
      },
      driver: { version: 'dev-0.0.0' }
    };
    return Object.assign(s, overrides || {});
  }

  function startDevMachine() {
    window._devMachineActive = true;
    var s = fakeStatus();
    if (typeof cdUpdateConnection === 'function') cdUpdateConnection(1, s);
    if (typeof cdUpdatePosition === 'function') cdUpdatePosition('0.000', '0.000', '0.000');
    if (typeof cdUpdateFeed === 'function') cdUpdateFeed(0, 100, 100, false);
    if (typeof cdUpdateQueue === 'function') cdUpdateQueue(0);
    if (typeof cdUpdateMPos === 'function') cdUpdateMPos('0.000', '0.000', '0.000');
    clearInterval(devTimer);
    devTimer = setInterval(function () {
      if (!window._devMachineActive) return;
      // Heartbeat — keeps "connected" state fresh in case any code expects updates
      if (typeof cdUpdatePosition === 'function') {
        cdUpdatePosition(devPos.x.toFixed(3), devPos.y.toFixed(3), devPos.z.toFixed(3));
      }
    }, 1000);
  }

  function stopDevMachine() {
    window._devMachineActive = false;
    clearInterval(devTimer);
    devTimer = null;
    if (typeof cdUpdateConnection === 'function') cdUpdateConnection(0, fakeStatus({ comms: { connectionStatus: 0 } }));
  }

  // The Dev Machine option is injected by cdSyncPortOptions on every sync.

  // Intercept sendGcode when the Dev Machine is active — echo to the console
  // and, for G0/G1 jogs, move the fake position so the DRO updates visibly.
  var _origSendGcode = window.sendGcode;
  window.sendGcode = function (gcode) {
    if (window._devMachineActive) {
      if (typeof printLog === 'function') {
        printLog('<span class="fg-blue">[ Dev Machine ]</span> ' + String(gcode).replace(/\n/g, ' | '));
      }
      // Very light parse: pick up absolute X/Y/Z targets from $J / G0 / G1
      var lines = String(gcode).split(/\r?\n/);
      lines.forEach(function (ln) {
        var mx = ln.match(/X(-?\d+(?:\.\d+)?)/i);
        var my = ln.match(/Y(-?\d+(?:\.\d+)?)/i);
        var mz = ln.match(/Z(-?\d+(?:\.\d+)?)/i);
        if (mx) devPos.x = parseFloat(mx[1]);
        if (my) devPos.y = parseFloat(my[1]);
        if (mz) devPos.z = parseFloat(mz[1]);
      });
      if (typeof cdUpdatePosition === 'function') {
        cdUpdatePosition(devPos.x.toFixed(3), devPos.y.toFixed(3), devPos.z.toFixed(3));
      }
      return;
    }
    if (typeof _origSendGcode === 'function') _origSendGcode.apply(this, arguments);
  };

  // ─── Connect / Disconnect button ─────────────────────────────────────────
  $('#cdConnBtn').on('click', function () {
    // Dev Machine disconnect
    if (window._devMachineActive) {
      stopDevMachine();
      return;
    }
    if ($('#cdConnBtn').hasClass('cd-connected')) {
      closePort();
      return;
    }
    var chosen = $('#cdPortSelect').val();
    if (chosen === DEV_PORT_VALUE) {
      startDevMachine();
      return;
    }
    // Mirror CD select → #portUSB, then call existing selectPort()
    if (chosen) $('#portUSB').val(chosen);
    if ($('#portUSB').val()) {
      selectPort();
    }
  });

  // ─── Port selector sync (CD <select> ↔ #portUSB) ─────────────────────────
  // Mirror options from the hidden Metro #portUSB select (kept live-populated
  // by ui.js from socket port-scan events) into our CD <select>.
  function cdSyncPortOptions() {
    var $src = $('#portUSB');
    var $dst = $('#cdPortSelect');
    if (!$src.length || !$dst.length) return;
    var currentDst = $dst.val();
    var currentSrc = $src.val();
    $dst.empty();
    $src.find('option').each(function () {
      var $o = $(this);
      $dst.append($('<option></option>').val($o.val()).text($o.text()));
    });
    // Preserve selection: prefer whatever #portUSB has, else what CD had
    var preferred = currentSrc || currentDst;
    if (preferred) $dst.val(preferred);
    // Always inject the Dev Machine simulator option at the top
    var DEV_PORT_VALUE = '__dev-machine__';
    if ($dst.find('option[value="' + DEV_PORT_VALUE + '"]').length === 0) {
      $dst.prepend($('<option></option>').val(DEV_PORT_VALUE).text('▸ Dev Machine (simulator)'));
    }
    // Restore selection if we just prepended
    if (preferred) $dst.val(preferred);

    // Never disable — Dev Machine is always a valid pick.
    $dst.prop('disabled', false);
  }

  // When user picks a different port in the CD select, mirror to #portUSB
  $('#cdPortSelect').on('change', function () {
    $('#portUSB').val($(this).val()).trigger('change');
  });

  // Initial populate, plus periodic re-sync to pick up backend port scans.
  // We intentionally avoid DOMSubtreeModified — it fires too aggressively
  // (including while the user has our <select> open) and closes the menu.
  cdSyncPortOptions();
  setInterval(cdSyncPortOptions, 2000);
  window.cdSyncPortOptions = cdSyncPortOptions;

  // ─── File open ───────────────────────────────────────────────────────────
  // The original #openGcodeBtn* elements are dropdown toggles, not direct
  // file openers — triggering click on them just opens the Metro dropdown.
  // Call the actual file-open action for the current runtime instead.
  $('#cdFileOpen').on('click', function () {
    if (navigator.userAgent.indexOf('Electron') >= 0) {
      if (typeof socket !== 'undefined' && socket) {
        socket.emit('openFile');
      }
      return;
    }

    // Browser: the original <input type="file" id="file"> lives inside
    // a Metro ribbon-dropdown that's display:none by default, so triggering
    // click() on it from there silently no-ops. Use the native element and
    // temporarily make it reachable, or fall back to a freshly created one.
    var existing = document.getElementById('file');
    if (existing) {
      var prevParent = existing.parentNode;
      var prevParentDisplay = prevParent ? prevParent.style.display : null;
      // Move it out of any hidden ancestor onto <body> just for the click
      document.body.appendChild(existing);
      existing.style.position = 'fixed';
      existing.style.left = '-9999px';
      existing.click();
      // Don't move it back immediately — the 'change' handler may still
      // reference it. It remains functional either way.
      return;
    }

    // Fallback: create a one-shot input
    var input = document.createElement('input');
    input.type = 'file';
    input.accept = '.gcode,.gc,.tap,.nc,.cnc';
    input.style.display = 'none';
    input.addEventListener('change', function () {
      if (!input.files || !input.files[0]) return;
      var reader = new FileReader();
      reader.onload = function (e) {
        if (typeof editor !== 'undefined' && editor) {
          editor.setValue(e.target.result);
          editor.clearSelection();
          if (typeof parseGcodeInWebWorker === 'function') {
            parseGcodeInWebWorker(editor.getValue());
          }
        }
        loadedFileName = input.files[0].name;
        if (typeof setWindowTitle === 'function') setWindowTitle();
        if (typeof cdUpdateFileState === 'function') cdUpdateFileState(true, loadedFileName);
      };
      reader.readAsText(input.files[0]);
    });
    document.body.appendChild(input);
    input.click();
  });

  $('#cdFileUnload').on('click', function () {
    // Clear editor and reset state
    if (typeof editor !== 'undefined') {
      editor.execCommand('selectall');
      editor.execCommand('del');
      if (typeof parseGcodeInWebWorker === 'function') {
        parseGcodeInWebWorker(editor.getValue());
      }
    }
    loadedFileName = '';
    setWindowTitle();
    cdUpdateFileState(false, '');
  });

  // ─── Alarm unlock ────────────────────────────────────────────────────────
  $('#cdUnlockAlarm').on('click', function () {
    socket.emit('clearAlarm', 2);
  });

  // ─── Pause / Resume toggle ───────────────────────────────────────────────
  $('#cdPauseResumeBtn').on('click', function () {
    if ($(this).hasClass('cd-resuming')) {
      socket.emit('resume', true);
    } else {
      socket.emit('pause', true);
    }
  });

  // ─── Stop ────────────────────────────────────────────────────────────────
  $('#cdStopBtn').on('click', function () {
    socket.emit('stop', { stop: true, jog: false, abort: false });
  });

  // ─── Abort (with confirm modal) ──────────────────────────────────────────
  $('#cdAbortBtn').on('click', function () {
    $('#cd-abort-modal').fadeIn(120);
  });

  $('#cdAbortCancel').on('click', function () {
    $('#cd-abort-modal').fadeOut(120);
  });

  $('#cd-abort-modal').on('click', function (e) {
    if (e.target === this) $('#cd-abort-modal').fadeOut(120);
  });

  $('#cdAbortConfirm').on('click', function () {
    socket.emit('stop', { stop: false, jog: false, abort: true });
    $('#cd-abort-modal').fadeOut(120);
  });

  // ─── Utility buttons ─────────────────────────────────────────────────────
  var toolIsOn = false;

  $('#cdToolBtn').on('click', function () {
    if (toolIsOn) {
      sendGcode('M5');
    } else {
      sendGcode('M3 S' + (typeof grblParams !== 'undefined' && grblParams['$30'] ? parseInt(grblParams['$30']) : 1000));
    }
    toolIsOn = !toolIsOn;
    cdUpdateToolState(toolIsOn);
  });

  $('#cdChkSizeBtn').on('click', function () {
    $('#chkSize').trigger('click');
  });

  $('#cdGotoXY0Btn').on('click', function () {
    $('#gotozeroWPos').trigger('click');
  });

  // ─── Scrub panel (docked at bottom of right sidebar) ─────────────────────
  // Show the scrub panel whenever gcode is loaded (so user can pick a
  // restart point anytime). Initialize slider range on geometry load.
  $('.cd-scrub-step').on('click', function () {
    var step = parseInt($(this).data('step'), 10);
    var slider = document.getElementById('restartSlider');
    if (!slider) return;
    var next = Math.max(parseInt(slider.min, 10), Math.min(parseInt(slider.max, 10), parseInt(slider.value, 10) + step));
    slider.value = next;
    if (typeof onRestartSliderMove === 'function') onRestartSliderMove(next);
  });

  // Edit Start trigger — opens the scrub panel
  $('#cdEditStartBtn').on('click', function () {
    if (typeof openScrubber === 'function') {
      openScrubber();
    }
    if (typeof cdShowScrubPanel === 'function') cdShowScrubPanel();
  });

  $('#cdScrubStopBtn').on('click', function () {
    if (typeof closeScrubber === 'function') {
      closeScrubber();
    } else if (typeof restoreToolpathColors === 'function') {
      restoreToolpathColors();
    }
    $('#cd-scrub-panel').hide();
    // Re-show the Edit Start trigger so the user can reopen the panel
    if (typeof editor !== 'undefined' && editor && editor.session && editor.session.getLength() > 1) {
      $('#cd-scrub-trigger').show();
    }
  });

  // Expose a helper so gcode-load code can show the panel + init slider range
  window.cdShowScrubPanel = function () {
    var slider = document.getElementById('restartSlider');
    if (slider && typeof object !== 'undefined' && object && object.userData && object.userData.linePoints) {
      slider.max = object.userData.linePoints.length - 1;
      slider.value = 0;
      if (typeof onRestartSliderMove === 'function') onRestartSliderMove(0);
    }
    $('#cd-scrub-trigger').hide();
    $('#cd-scrub-panel').show();
  };

  // ─── Troubleshooting tab in CD top bar ───────────────────────────────────
  $('#cdTabTroubleshooting').on('click', function () {
    troubleshootingPanel();
  });

  // ─── CD-aware reconnect helpers ──────────────────────────────────────────

  // Called by setConnectBar() mirror (see websocket.js additions).
  // Updates CD top bar connection state.
  window.cdUpdateConnection = function (connectionStatus, status) {
    var connected = connectionStatus >= 1;
    var running = connectionStatus === 3;
    var paused = connectionStatus === 4;
    var alarm = connectionStatus === 5;

    $('#cdConnDot').toggleClass('cd-connected', connected);
    $('#cdConnLabel').toggleClass('cd-connected', connected);

    var port = (status && status.comms && status.comms.interfaces && status.comms.interfaces.activePort)
      ? status.comms.interfaces.activePort : '';

    if (connected) {
      $('#cdConnLabel').text('LINK' + (port ? ' · ' + port : ''));
      $('#cdConnBtn').text('DISCONNECT').addClass('cd-connected');
      $('#cd-port-wrap').hide();
    } else {
      $('#cdConnLabel').text('OFFLINE');
      $('#cdConnBtn').text('CONNECT').removeClass('cd-connected');
    }

    // Status bar
    var stateStr = '';
    var dotClass = '';
    switch (connectionStatus) {
      case 0: stateStr = 'DISCONNECTED'; dotClass = ''; break;
      case 1: stateStr = 'CONNECTED'; dotClass = 'cd-idle'; break;
      case 2: stateStr = 'READY'; dotClass = 'cd-idle'; break;
      case 3: stateStr = 'RUNNING'; dotClass = 'cd-running'; break;
      case 4: stateStr = 'HOLD'; dotClass = 'cd-paused'; break;
      case 5: stateStr = 'ALARM'; dotClass = 'cd-alarm'; break;
      default: stateStr = 'UNKNOWN'; dotClass = '';
    }
    $('#cdStateDot').attr('class', 'cd-state-dot ' + dotClass);
    $('#cdStateLabel').text(stateStr);
    $('#cdPortStatus').text(connected ? 'PORT: ' + (port || 'Connected') : 'PORT: Not Connected');
    if (status && status.comms && status.comms.interfaces && status.comms.interfaces.serialBaud) {
      $('#cdBaud').text('BAUD ' + status.comms.interfaces.serialBaud);
    }

    // Alarm banner
    $('#cd-alarm-banner').toggle(alarm);

    // Jog section disabled state
    var canJog = connected && !running && !alarm;
    $('#cd-jog-section').toggleClass('cd-jog-disabled', !canJog);
    $('.cd-axis-set0').prop('disabled', !connected);
    $('#cdHome').prop('disabled', !canJog);

    // Overrides disabled state
    $('.cd-vslider').toggleClass('cd-disabled', !connected);

    // Run controls
    cdUpdateRunControls(connectionStatus);

    // CD position strip dimming
    $('.cd-axis-readout').toggleClass('cd-disabled', !connected);
  };

  // ─── Machine position updates ─────────────────────────────────────────────
  window.cdUpdatePosition = function (x, y, z) {
    // Don't overwrite the value while the user is editing that axis
    if (!$('#cdXPos').hasClass('cd-axis-editing')) $('#cdXPos').text(x);
    if (!$('#cdYPos').hasClass('cd-axis-editing')) $('#cdYPos').text(y);
    if (!$('#cdZPos').hasClass('cd-axis-editing')) $('#cdZPos').text(z);
  };

  // ─── Click-to-edit DROs — jog to absolute target on Enter ────────────────
  function cdGetJogRate(axis) {
    if (axis === 'X' && typeof jogRateX !== 'undefined') return jogRateX;
    if (axis === 'Y' && typeof jogRateY !== 'undefined') return jogRateY;
    if (axis === 'Z' && typeof jogRateZ !== 'undefined') return jogRateZ;
    return 2000;
  }

  function cdCurrentWorkPos(axis) {
    try {
      var p = laststatus.machine.position.work;
      if (axis === 'X') return p.x;
      if (axis === 'Y') return p.y;
      if (axis === 'Z') return p.z;
    } catch (e) {}
    return 0;
  }

  function cdMakeAxisEditable($valEl, axis) {
    if ($valEl.hasClass('cd-axis-editing')) return;
    var originalText = $valEl.text();
    var currentVal;
    if (typeof unit !== 'undefined' && unit === 'in') {
      currentVal = (cdCurrentWorkPos(axis) / 25.4).toFixed(3);
    } else {
      currentVal = cdCurrentWorkPos(axis).toString();
    }

    // Use contenteditable on the value div itself — no injected <input>, so
    // Metro auto-init can't wrap it with its clear-button/dropdown shell.
    $valEl.addClass('cd-axis-editing');
    $valEl.text(currentVal);
    $valEl.attr('contenteditable', 'true');
    $valEl.focus();

    // Select all the text
    var range = document.createRange();
    range.selectNodeContents($valEl[0]);
    var sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);

    var settled = false;

    function teardown() {
      $valEl.removeClass('cd-axis-editing');
      $valEl.removeAttr('contenteditable');
      $valEl.off('keydown.cdedit blur.cdedit');
    }

    function commit() {
      if (settled) return; settled = true;
      var v = $valEl.text().trim();
      teardown();
      if (v === '' || isNaN(parseFloat(v))) {
        $valEl.text(originalText);
        return;
      }
      // Revert display; cdUpdatePosition will push the real value as the
      // machine moves.
      $valEl.text(originalText);
      var isInch = (typeof unit !== 'undefined' && unit === 'in');
      var gUnit = isInch ? 'G20' : 'G21';
      // Enter: JOG to absolute target. The machine moves to the typed value.
      sendGcode('$J=G90 ' + gUnit + ' ' + axis + v + ' F' + cdGetJogRate(axis));
    }
    function cancel() {
      if (settled) return; settled = true;
      teardown();
      $valEl.text(originalText);
    }

    $valEl.on('keydown.cdedit', function (e) {
      // Block jog / macro shortcuts (bound on document) while editing
      e.stopPropagation();
      if (e.key === 'Enter') { e.preventDefault(); commit(); }
      else if (e.key === 'Escape') { e.preventDefault(); cancel(); }
    });
    // keypress also needed — some jQuery shortcut plugins listen there
    $valEl.on('keypress.cdedit keyup.cdedit', function (e) {
      e.stopPropagation();
    });
    $valEl.on('blur.cdedit', cancel);
  }

  $('#cdXPos').on('click', function () { cdMakeAxisEditable($(this), 'X'); });
  $('#cdYPos').on('click', function () { cdMakeAxisEditable($(this), 'Y'); });
  $('#cdZPos').on('click', function () { cdMakeAxisEditable($(this), 'Z'); });

  // ─── Run control state ────────────────────────────────────────────────────
  window.cdUpdateRunControls = function (connectionStatus) {
    var connected = connectionStatus >= 1;
    var running = connectionStatus === 3;
    var paused = connectionStatus === 4;

    var hasFile = typeof editor !== 'undefined' && editor.session && editor.session.getLength() > 1;
    var canStart = connected && hasFile && !running && connectionStatus !== 5;

    // Toggle idle vs active blocks
    $('#cdRunIdle').toggle(!running && !paused);
    $('#cdRunActive').toggle(running || paused);

    // START button
    $('#cdStartBtn').prop('disabled', !canStart);

    // PAUSE/RESUME button state
    if (paused) {
      $('#cdPauseResumeBtn').text('▶ RESUME').addClass('cd-resuming');
    } else {
      $('#cdPauseResumeBtn').text('❚❚ PAUSE').removeClass('cd-resuming');
    }

    // Progress bar paused tint
    $('#cdProgressBar').toggleClass('cd-paused', paused);

    // Utility buttons
    var canUtil = connected && !running && connectionStatus !== 5;
    $('#cdChkSizeBtn').prop('disabled', !canUtil || !hasFile);
    $('#cdGotoXY0Btn').prop('disabled', !connected || connectionStatus === 5);
    $('#cdProbeBtn').prop('disabled', !canUtil);
    $('#cdToolBtn').prop('disabled', !connected || connectionStatus === 5);
  };

  // ─── File state ───────────────────────────────────────────────────────────
  window.cdUpdateFileState = function (loaded, filename) {
    if (loaded && filename) {
      $('#cdFileName').text(filename).show();
      $('#cdFileUnload').show();
      $('#cdFileOpen').hide();
      $('#cd-job-info').show();
      // Show the Edit Start trigger; panel stays closed until user clicks it
      $('#cd-scrub-trigger').show();
      $('#cd-scrub-panel').hide();
      var baseName = filename.replace(/\.[^/.]+$/, '');
      $('#cdJobName').text(baseName);
    } else {
      $('#cdFileName').hide();
      $('#cdFileUnload').hide();
      $('#cdFileOpen').show();
      $('#cd-job-info').hide();
      $('#cd-scrub-trigger').hide();
      $('#cd-scrub-panel').hide();
      $('#cdProgressPct').html('0.0<span class="cd-progress-pct-unit">%</span>');
      $('#cdProgressBar').css('width', '0%');
    }
  };

  // ─── Job progress ─────────────────────────────────────────────────────────
  window.cdUpdateJobProgress = function (pct, currentLine, totalLines, elapsed, remaining, travelMm) {
    $('#cdProgressPct').html(pct.toFixed(1) + '<span class="cd-progress-pct-unit">%</span>');
    $('#cdProgressBar').css('width', Math.min(100, pct) + '%');
    if (totalLines) {
      $('#cdJobMeta').text(totalLines.toLocaleString() + ' LINES');
    }
    if (currentLine !== undefined) {
      $('#cdLine').text(currentLine.toLocaleString());
    }
    if (elapsed !== undefined) {
      $('#cdElapsed').text(cdFmtTime(elapsed));
    }
    if (remaining !== undefined) {
      $('#cdRemaining').text(cdFmtTime(remaining));
    }
    if (travelMm !== undefined) {
      $('#cdTravel').text(Math.round(travelMm) + 'mm');
    }
  };

  window.cdFmtTime = function (minutes) {
    var h = Math.floor(minutes / 60);
    var m = Math.floor(minutes % 60);
    return String(h).padStart(2, '0') + 'h:' + String(m).padStart(2, '0') + 'm';
  };

  // ─── Feed display ─────────────────────────────────────────────────────────
  window.cdUpdateFeed = function (feedMmPerMin, jogPct, toolPct, toolOn) {
    $('#cdFeedValue').html(Math.round(feedMmPerMin) + ' <span class="cd-feed-unit">mm/min</span>');
    var toolStr = toolOn ? 'ON' : 'OFF';
    $('#cdFeedMeta').text('TOOL: ' + toolStr + ' · JOG: ' + Math.round(jogPct) + '%');
  };

  // ─── Tool state ───────────────────────────────────────────────────────────
  window.cdUpdateToolState = function (on) {
    toolIsOn = on;
    $('#cdToolLabel').text(on ? 'TOOL · ON' : 'TOOL · OFF');
    $('#cdToolBtn').toggleClass('cd-active', on);
  };

  // ─── Queue ────────────────────────────────────────────────────────────────
  window.cdUpdateQueue = function (count) {
    $('#cdQueue').text('QUEUE ' + count);
  };

  // ─── MPos ─────────────────────────────────────────────────────────────────
  window.cdUpdateMPos = function (x, y, z) {
    $('#cdMpos').text('MPos X' + x + ' Y' + y + ' Z' + z);
  };

});
