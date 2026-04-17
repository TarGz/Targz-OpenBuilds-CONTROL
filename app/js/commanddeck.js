// Command Deck — interaction layer for the CD layout.
// Bridges new CD elements to existing socket.io/jog/ui plumbing.

$(document).ready(function () {

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

  // ─── Connect / Disconnect button ─────────────────────────────────────────
  $('#cdConnBtn').on('click', function () {
    if ($('#cdConnBtn').hasClass('cd-connected')) {
      closePort();
    } else {
      // Show native port selector popup and connect
      if ($('#portUSB').val()) {
        selectPort();
      } else {
        // If no port selected yet, open a simple inline select
        var port = prompt('Enter serial port (e.g. /dev/ttyUSB0):');
        if (port) {
          $('#portUSB').val(port);
          selectPort();
        }
      }
    }
  });

  // ─── File open ───────────────────────────────────────────────────────────
  $('#cdFileOpen').on('click', function () {
    $('#openGcodeBtnElectron19').trigger('click');
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
    $('#cdXPos').text(x);
    $('#cdYPos').text(y);
    $('#cdZPos').text(z);
  };

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
      var baseName = filename.replace(/\.[^/.]+$/, '');
      $('#cdJobName').text(baseName);
    } else {
      $('#cdFileName').hide();
      $('#cdFileUnload').hide();
      $('#cdFileOpen').show();
      $('#cd-job-info').hide();
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
