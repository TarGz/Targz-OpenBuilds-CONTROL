// Restart From Point — Two methods:
// 1. 3D View scrubber: slider moves cone along toolpath, pick restart point visually
// 2. Editor cursor: click a line in GCODE editor, see coords in banner

var restartSelectionActive = false;
var restartSelectedLine = -1;
var restartSelectedPointIdx = -1;
var originalToolpathColors = null;
var _restartDebounceTimer = null;
var scrubberOpen = false;

// ============================================================
// 3D VIEW SCRUBBER — primary method
// ============================================================

function openScrubber() {
  if (!object || !object.userData || !object.userData.linePoints || object.userData.linePoints.length < 2) {
    Metro.toast.create('No G-code loaded in 3D view. Open a G-code file first.', null, 5000, 'bg-red');
    return;
  }
  if (simRunning) {
    Metro.toast.create('Stop the simulation first.', null, 3000, 'bg-orange');
    return;
  }

  scrubberOpen = true;
  restartSelectionActive = true;

  var slider = document.getElementById('restartSlider');
  slider.max = object.userData.linePoints.length - 1;
  slider.value = 0;

  // Set cone to orange
  if (typeof cone !== 'undefined' && cone) {
    cone.visible = true;
    cone.material = new THREE.MeshPhongMaterial({
      color: 0xff8c00,
      specular: 0xcc6600,
      shininess: 100,
      opacity: 0.8,
      transparent: true
    });
  }

  $('#restartScrubber').show();
  $('#openScrubberBtn').hide();

  // Move to start
  onRestartSliderMove(0);
}

function closeScrubber() {
  scrubberOpen = false;
  restartSelectionActive = false;
  restartSelectedLine = -1;
  restartSelectedPointIdx = -1;

  // Restore cone to blue
  if (typeof cone !== 'undefined' && cone) {
    cone.material = new THREE.MeshPhongMaterial({
      color: 0x0000ff,
      specular: 0x0000ff,
      shininess: 100,
      opacity: 0.6,
      transparent: true
    });
  }

  restoreToolpathColors();
  $('#restartScrubber').hide();
  $('#openScrubberBtn').show();
}

function onRestartSliderMove(value) {
  var idx = parseInt(value);
  if (!object || !object.userData || !object.userData.linePoints) return;

  var lp = object.userData.linePoints[idx];
  if (!lp) return;

  // Skip fake points — find nearest real point
  if (lp.fake) {
    for (var i = idx + 1; i < object.userData.linePoints.length; i++) {
      if (!object.userData.linePoints[i].fake) {
        lp = object.userData.linePoints[i];
        idx = i;
        break;
      }
    }
  }

  restartSelectedPointIdx = idx;
  restartSelectedLine = (lp.indx !== undefined) ? lp.indx : -1;

  // Move cone
  var x = lp.x, y = lp.y, z = lp.z;
  if (object.userData.inch) {
    x *= 25.4; y *= 25.4; z *= 25.4;
  }

  if (typeof cone !== 'undefined' && cone) {
    cone.position.x = x;
    cone.position.y = y;
    cone.position.z = z;
  }

  // Dim toolpath before this point
  dimToolpathBefore(idx);

  // Update info display
  var lineNum = (lp.indx !== undefined) ? (lp.indx + 1) : '?';
  var gcodeText = '';
  if (lp.indx !== undefined && typeof editor !== 'undefined') {
    gcodeText = editor.session.getLine(lp.indx);
    if (gcodeText && gcodeText.length > 60) gcodeText = gcodeText.substring(0, 60) + '...';
    gcodeText = ' | ' + escapeHtml(gcodeText);
  }

  $('#restartScrubInfo').html(
    '<span class="badge bg-orange fg-white mr-1">Line ' + lineNum + '</span> ' +
    'X:' + lp.x.toFixed(2) + ' Y:' + lp.y.toFixed(2) + ' Z:' + lp.z.toFixed(2) +
    '<span class="fg-gray">' + gcodeText + '</span>'
  );
}

function triggerRestartFromScrubber() {
  if (restartSelectedLine < 0) {
    Metro.toast.create('Current position is not on a G-code motion line. Move the slider.', null, 3000, 'bg-orange');
    return;
  }
  var lineNumber = restartSelectedLine + 1; // 0-based to 1-based
  closeScrubber();
  startFromHere(lineNumber);
}


// ============================================================
// EDITOR CURSOR — secondary method (banner in editor tab)
// ============================================================

function initRestartFromPoint() {
  if (typeof editor !== 'undefined' && editor) {
    editor.selection.on('changeCursor', function() {
      clearTimeout(_restartDebounceTimer);
      _restartDebounceTimer = setTimeout(onEditorCursorChange, 150);
    });
  }
}

function onEditorCursorChange() {
  if (!object || !object.userData || !object.userData.gcodeLineToPointIndex) return;
  if (simRunning) return;
  // Don't update editor banner while scrubber is open
  if (scrubberOpen) return;

  var row = editor.getCursorPosition().row;
  var pointIdx = object.userData.gcodeLineToPointIndex[row];

  if (pointIdx !== undefined) {
    showRestartSelection(row, pointIdx);
  } else {
    hideRestartBanner();
  }
}

function showRestartSelection(gcodeLineNum, pointIdx) {
  var lp = object.userData.linePoints[pointIdx];
  if (!lp) return;

  restartSelectionActive = true;
  restartSelectedLine = gcodeLineNum;
  restartSelectedPointIdx = pointIdx;

  // Move cone to the selected point
  var x = lp.x, y = lp.y, z = lp.z;
  if (object.userData.inch) {
    x *= 25.4; y *= 25.4; z *= 25.4;
  }

  if (typeof cone !== 'undefined' && cone) {
    cone.position.x = x;
    cone.position.y = y;
    cone.position.z = z;
    cone.visible = true;
    cone.material = new THREE.MeshPhongMaterial({
      color: 0xff8c00,
      specular: 0xcc6600,
      shininess: 100,
      opacity: 0.8,
      transparent: true
    });
  }

  dimToolpathBefore(pointIdx);

  // Show banner in editor tab
  var gcodeText = editor.session.getLine(gcodeLineNum);
  if (gcodeText && gcodeText.length > 50) gcodeText = gcodeText.substring(0, 50) + '...';

  var coordsText = 'X:' + lp.x.toFixed(2) + ' Y:' + lp.y.toFixed(2) + ' Z:' + lp.z.toFixed(2);

  $('#restartBanner').html(
    '<span class="badge bg-orange fg-white mr-1" style="font-size:12px;">Line ' + (gcodeLineNum + 1) + '</span> ' +
    '<span class="text-small fg-lightGray mr-1">' + coordsText + '</span> ' +
    '<span class="text-small fg-gray mr-1" title="' + escapeHtml(editor.session.getLine(gcodeLineNum)) + '">' + escapeHtml(gcodeText) + '</span>' +
    '<button class="button mini alert ml-2" onclick="triggerRestartFromHere()" title="Generate recovery G-code from this line"><i class="fas fa-play"></i> Restart from here</button>' +
    '<button class="button mini info ml-1" onclick="showRestartIn3D()" title="Switch to 3D view to see position"><i class="mif-3d-rotation"></i> Show in 3D</button>' +
    '<button class="button mini dark ml-1" onclick="clearRestartSelection()" title="Cancel selection"><i class="fas fa-times"></i></button>'
  ).show();
}


// ============================================================
// SHARED UTILITIES
// ============================================================

function escapeHtml(text) {
  if (!text) return '';
  var div = document.createElement('div');
  div.appendChild(document.createTextNode(text));
  return div.innerHTML;
}

function showRestartIn3D() {
  $('#gcodeviewertab').click();
  if (typeof fixRenderSize === 'function') fixRenderSize();
}

function dimToolpathBefore(pointIdx) {
  if (!object || !object.geometry || !object.geometry.attributes.color) return;

  var colors = object.geometry.attributes.color;

  // Save original colors on first use
  if (!originalToolpathColors) {
    originalToolpathColors = new Float32Array(colors.array);
  }

  // Restore original first (in case user moves selection)
  colors.array.set(originalToolpathColors);

  // Dim vertices before the selected point (multiply RGB by 0.25)
  for (var i = 0; i < pointIdx * 3; i++) {
    colors.array[i] = originalToolpathColors[i] * 0.25;
  }

  colors.needsUpdate = true;
}

function restoreToolpathColors() {
  if (!originalToolpathColors || !object || !object.geometry || !object.geometry.attributes.color) return;

  var colors = object.geometry.attributes.color;
  colors.array.set(originalToolpathColors);
  colors.needsUpdate = true;
  originalToolpathColors = null;
}

function clearRestartSelection() {
  restartSelectionActive = false;
  restartSelectedLine = -1;
  restartSelectedPointIdx = -1;

  if (typeof cone !== 'undefined' && cone) {
    cone.material = new THREE.MeshPhongMaterial({
      color: 0x0000ff,
      specular: 0x0000ff,
      shininess: 100,
      opacity: 0.6,
      transparent: true
    });
  }

  restoreToolpathColors();
  hideRestartBanner();
}

function hideRestartBanner() {
  $('#restartBanner').hide();
}

function triggerRestartFromHere() {
  if (restartSelectedLine < 0) return;
  var lineNumber = restartSelectedLine + 1;
  clearRestartSelection();
  startFromHere(lineNumber);
}

// Reset state when a new gcode file is loaded
function onGcodeReloaded() {
  originalToolpathColors = null;
  restartSelectionActive = false;
  restartSelectedLine = -1;
  restartSelectedPointIdx = -1;
  scrubberOpen = false;
  hideRestartBanner();
  $('#restartScrubber').hide();
  $('#openScrubberBtn').show();
}

// Initialize when DOM is ready
$(document).ready(function() {
  setTimeout(initRestartFromPoint, 1000);
});
