// Command Deck — interaction layer for the CD layout.
// Bridges new CD elements to existing socket.io/jog/ui plumbing.

$(document).ready(function () {

  // Version badge — fetch from /api/version (Express serves app/ via HTTP, so
  // require('../../version.js') does not resolve reliably in the renderer).
  $.getJSON('/api/version').done(function (v) {
    if (!v) return;
    var ver = v.appVersion || (v.version ? String(v.version).replace(/-targz$/, '') : '');
    if (ver) $('#cdLogoVersion').text('v' + ver);
  });

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
      var map = { 0.01: 0.0254, 0.1: 0.0254, 1: 0.254, 10: 2.54, 100: 25.4 };
      jogdistXYZ = map[step] !== undefined ? map[step] : step;
    }
    // sync old dist buttons so existing jog.js logic stays consistent
    var idMap = { 0.01: '#dist01', 0.1: '#dist01', 1: '#dist1', 10: '#dist10', 100: '#dist100' };
    var target = idMap[step];
    if (target) $(target).trigger('click');

    $('.cd-step-btn').removeClass('cd-step-active');
    $(this).addClass('cd-step-active');
  });

  // Sync jogdistXYZ to whichever step button renders as active on load — fixes
  // the mismatch where jog.js defaulted to 10 but the UI highlighted 1.
  setTimeout(function () {
    var $active = $('.cd-step-btn.cd-step-active').first();
    if ($active.length) $active.trigger('click');
  }, 50);

  // Sync the JOG override slider to whatever localStorage persisted last run,
  // so the displayed % matches the real jogRateX/Y/Z multiplier on page load.
  // Without this the CD slider always reads 100 while jogOverride() at startup
  // applied whatever was stored (eg 1 → 40mm/min, feels like a dead jog).
  setTimeout(function () {
    var stored = parseInt(localStorage.getItem('jogOverride'), 10);
    if (!stored || isNaN(stored)) return;
    var $sl = $('#cdJro');
    if (!$sl.length) return;
    var min = parseInt($sl.attr('min') || '1', 10);
    var max = parseInt($sl.attr('max') || '300', 10);
    var clamped = Math.max(min, Math.min(max, stored));
    $sl.val(clamped);
    $('#cdJroVal').text(clamped);
  }, 100);

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
      return;
    }
    var chosen = $('#cdPortSelect').val();
    if (chosen) {
      $('#portUSB').val(chosen);
      selectPort();
    }
  });

  // Alarm banner debounce state — used by cdUpdateConnection below.
  var _lastAlarmShown = false;
  var _alarmShowTimer = null;

  // ─── Port selector: custom dropdown in CD topbar ────────────────────────
  // #cdPortSelect options are populated by populatePortsMenu() (websocket.js)
  // which injects the same HTML it feeds to Metro4. This function just
  // refreshes the visible label / menu after that injection.
  var _cdPortMenuOpen = false;

  function cdSyncPortOptions() {
    var $dst = $('#cdPortSelect');
    if (!$dst.length) return;
    if (_cdPortMenuOpen) return;

    $dst.prop('disabled', false);
    cdPortUpdateLabel();
  }

  function cdPortCurrentOptionText() {
    var $dst = $('#cdPortSelect');
    var v = $dst.val();
    if (!v) return '';
    var $opt = $dst.find('option').filter(function () { return this.value === v; }).first();
    return $opt.length ? $opt.text() : '';
  }

  function cdPortUpdateLabel() {
    var txt = cdPortCurrentOptionText();
    $('#cdPortButtonLabel').text(txt || 'Select a port…');
  }

  function cdPortBuildMenu() {
    var $menu = $('#cdPortMenu');
    var $dst = $('#cdPortSelect');
    var currentVal = $dst.val();
    $menu.empty();

    $dst.children().each(function () {
      var $node = $(this);
      if ($node.is('optgroup')) {
        $menu.append($('<div class="cd-port-menu-group"></div>').text($node.attr('label')));
        var $opts = $node.children('option');
        if (!$opts.length) {
          $menu.append($('<div class="cd-port-menu-item cd-port-menu-item-disabled"></div>').text('—'));
        }
        $opts.each(function () {
          var $o = $(this);
          var val = $o.val();
          var $item = $('<div class="cd-port-menu-item" role="option"></div>')
            .attr('data-value', val)
            .text($o.text());
          if (val === currentVal) $item.addClass('cd-port-menu-item-selected');
          $menu.append($item);
        });
      } else if ($node.is('option')) {
        var v = $node.val();
        var $it = $('<div class="cd-port-menu-item" role="option"></div>')
          .attr('data-value', v)
          .text($node.text());
        if (v === currentVal) $it.addClass('cd-port-menu-item-selected');
        $menu.append($it);
      }
    });
  }

  function cdPortPositionMenu() {
    var btn = document.getElementById('cdPortButton');
    var menu = document.getElementById('cdPortMenu');
    if (!btn || !menu) return;
    var r = btn.getBoundingClientRect();
    menu.style.minWidth = r.width + 'px';
    menu.style.left = r.left + 'px';
    // Prefer below; flip above if it would overflow the viewport.
    var belowSpace = window.innerHeight - r.bottom - 8;
    menu.style.maxHeight = Math.max(160, Math.min(360, belowSpace)) + 'px';
    menu.style.top = (r.bottom + 2) + 'px';
  }

  function cdPortOpenMenu() {
    if (_cdPortMenuOpen) return;
    cdPortBuildMenu();
    _cdPortMenuOpen = true;
    var menu = document.getElementById('cdPortMenu');
    menu.hidden = false;
    $('#cdPortButton').attr('aria-expanded', 'true');
    cdPortPositionMenu();
  }

  function cdPortCloseMenu() {
    if (!_cdPortMenuOpen) return;
    _cdPortMenuOpen = false;
    document.getElementById('cdPortMenu').hidden = true;
    $('#cdPortButton').attr('aria-expanded', 'false');
    // Catch up on any sync we skipped while open.
    cdSyncPortOptions();
  }

  // Delegate from document so timing / element-recreation can't drop the
  // binding, and accept a click anywhere in the wrap (not just the inner
  // <button>) — some Electron/macOS builds have pointer-event quirks on
  // nested buttons that web Chrome doesn't.
  $(document).on('click', '#cdPortCustom', function (e) {
    e.stopPropagation();
    e.preventDefault();
    if (_cdPortMenuOpen) cdPortCloseMenu(); else cdPortOpenMenu();
  });

  $(document).on('click', '#cdPortMenu .cd-port-menu-item', function (e) {
    e.stopPropagation();
    if ($(this).hasClass('cd-port-menu-item-disabled')) return;
    var v = $(this).attr('data-value');
    var $dst = $('#cdPortSelect');
    if ($dst.val() !== v) {
      $dst.val(v).trigger('change');
    }
    cdPortUpdateLabel();
    cdPortCloseMenu();
  });

  $(document).on('mousedown', function (e) {
    if (!_cdPortMenuOpen) return;
    if ($(e.target).closest('#cdPortMenu, #cdPortCustom').length) return;
    cdPortCloseMenu();
  });
  $(document).on('keydown', function (e) {
    if (_cdPortMenuOpen && e.key === 'Escape') cdPortCloseMenu();
  });
  $(window).on('resize scroll', function () {
    if (_cdPortMenuOpen) cdPortPositionMenu();
  });

  cdSyncPortOptions();
  setTimeout(cdSyncPortOptions, 500);
  setInterval(cdSyncPortOptions, 2000);
  window.cdSyncPortOptions = cdSyncPortOptions;

  $('#cdPortSelect').on('change', function () {
    var v = $(this).val();
    cdPortUpdateLabel();
    $('#portUSB').val(v).trigger('change');
  });

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

  // ─── Pen Up / Pen Down (Z-axis based) ────────────────────────────────────
  // Not the servo/M3 "tool" logic from OpenBuilds — on a pen plotter the "pen"
  // is lifted and lowered by commanding Z to a stored absolute height.
  function cdReadPenHeights() {
    var up   = parseFloat(localStorage.getItem('penUpZ'));
    var down = parseFloat(localStorage.getItem('penDownZ'));
    var pump = parseFloat(localStorage.getItem('penPumpZ'));
    if (isNaN(up))   up   = 5;
    if (isNaN(down)) down = 0;
    if (isNaN(pump)) pump = -2;
    return { up: up, down: down, pump: pump };
  }
  window.cdRefreshPenHints = function () {
    var p = cdReadPenHeights();
    var fmt = function (v) { return v.toFixed(1); };
    $('#cdPenUpHint').text(fmt(p.up));
    $('#cdPenDownHint').text(fmt(p.down));
    $('#cdPumpHint').text(fmt(p.pump));
  };
  cdRefreshPenHints();
  $('#cdPenUpBtn').on('click', function () {
    var p = cdReadPenHeights();
    sendGcode('G90');
    sendGcode('G0 Z' + p.up);
  });
  $('#cdPenDownBtn').on('click', function () {
    var p = cdReadPenHeights();
    sendGcode('G90');
    sendGcode('G0 Z' + p.down);
  });
  $('#cdPumpBtn').on('click', function () {
    var p = cdReadPenHeights();
    sendGcode('G90');
    sendGcode('G0 Z' + p.pump);
  });

  // ─── Utility buttons ─────────────────────────────────────────────────────
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

  // ─── Settings / Machine Control tab swap in CD top bar ──────────────────
  function cdShowMachine() {
    $('#cd-position-strip').show();
    $('#cd-main').show();
    $('#cd-settings-layout').hide();
    $('#cdTabMachine').addClass('cd-tab-active');
    $('#cdTabTroubleshooting').removeClass('cd-tab-active');
  }
  function cdShowSettings() {
    if (typeof window.cdSettingsInit === 'function') window.cdSettingsInit();
    $('#cd-position-strip').hide();
    $('#cd-main').hide();
    $('#cd-settings-layout').css('display', 'flex');
    $('#cdTabTroubleshooting').addClass('cd-tab-active');
    $('#cdTabMachine').removeClass('cd-tab-active');
  }
  $('#cdTabMachine').on('click', cdShowMachine);
  $('#cdTabTroubleshooting').on('click', cdShowSettings);

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
    if (typeof window.cdSettingsOnStatus === 'function') window.cdSettingsOnStatus();

    // Alarm banner — debounce ON so transient alarm ticks during the connect
    // handshake (GRBL often boots into alarm before settling) don't flash the
    // banner; hide OFF immediately so clearing an alarm feels instant.
    if (alarm !== _lastAlarmShown) {
      _lastAlarmShown = alarm;
      if (_alarmShowTimer) { clearTimeout(_alarmShowTimer); _alarmShowTimer = null; }
      if (alarm) {
        _alarmShowTimer = setTimeout(function () {
          _alarmShowTimer = null;
          if (_lastAlarmShown) document.getElementById('cd-alarm-banner').style.display = 'flex';
        }, 700);
      } else {
        $('#cd-alarm-banner').hide();
      }
    }

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

    // Progress ticker: only tick while actively running (not paused / alarm / idle)
    if (running) {
      window.cdStartProgressTicker();
    } else {
      window.cdStopProgressTicker();
    }

    // Canvas state chip (top-right of 3D VIEW / CONSOLE / ... strip)
    var $chip = $('#cdCanvasState');
    if ($chip.length) {
      $chip.removeClass('cd-live cd-hold cd-scrub');
      if (running && !paused) {
        $chip.text('● LIVE').addClass('cd-live').show();
      } else if (paused) {
        $chip.text('❚❚ HOLD').addClass('cd-hold').show();
      } else if (hasFile) {
        $chip.text('● PREVIEW').show();
      } else {
        $chip.hide();
      }
    }

    // Utility buttons
    var canUtil = connected && !running && connectionStatus !== 5;
    $('#cdChkSizeBtn').prop('disabled', !canUtil || !hasFile);
    $('#cdGotoXY0Btn').prop('disabled', !connected || connectionStatus === 5);
    $('#cdProbeBtn').prop('disabled', !canUtil);
    $('#cdToolBtn').prop('disabled', !connected || connectionStatus === 5);
    $('#cdPenUpBtn, #cdPenDownBtn, #cdPumpBtn').prop('disabled', !connected || connectionStatus === 5);
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
    if (!isFinite(minutes) || minutes < 0) minutes = 0;
    var h = Math.floor(minutes / 60);
    var m = Math.floor(minutes % 60);
    return String(h).padStart(2, '0') + 'h:' + String(m).padStart(2, '0') + 'm';
  };

  // 1 Hz ticker: queueCount only fires on line dequeues, so elapsed/remaining
  // freeze during long moves. Recompute from the wall clock while running.
  var cdJobState = { done: 0, total: 0, totalTimeMin: NaN };
  window.cdProgressTickerState = cdJobState;
  var cdProgressTimer = null;

  window.cdStartProgressTicker = function () {
    if (cdProgressTimer) return;
    cdProgressTimer = setInterval(cdProgressTick, 1000);
    cdProgressTick();
  };
  window.cdStopProgressTicker = function () {
    if (cdProgressTimer) {
      clearInterval(cdProgressTimer);
      cdProgressTimer = null;
    }
  };
  function cdProgressTick() {
    if (typeof lastJobStartTime === 'undefined' || !lastJobStartTime) return;
    var totalMin = NaN;
    if (typeof object !== 'undefined' && object && object.userData && !isNaN(object.userData.totalTime)) {
      totalMin = object.userData.totalTime;
    } else if (!isNaN(cdJobState.totalTimeMin)) {
      totalMin = cdJobState.totalTimeMin;
    }
    var elapsedMin = (Date.now() - lastJobStartTime) / 1000 / 60;
    var remainingMin = isNaN(totalMin) ? NaN : Math.max(0, totalMin - elapsedMin);
    var pct = (cdJobState.total > 0) ? (cdJobState.done / cdJobState.total) * 100 : 0;
    $('#cdElapsed').text(cdFmtTime(elapsedMin));
    if (!isNaN(remainingMin)) $('#cdRemaining').text(cdFmtTime(remainingMin));
    if (!isNaN(pct)) {
      $('#cdProgressPct').html(pct.toFixed(1) + '<span class="cd-progress-pct-unit">%</span>');
      $('#cdProgressBar').css('width', Math.min(100, pct) + '%');
    }
  }

  // Patch cdUpdateJobProgress to stash state for the ticker.
  var _origUpdateJobProgress = window.cdUpdateJobProgress;
  window.cdUpdateJobProgress = function (pct, currentLine, totalLines, elapsed, remaining, travelMm) {
    cdJobState.done = currentLine || 0;
    cdJobState.total = totalLines || cdJobState.total;
    if (!isNaN(elapsed) && !isNaN(remaining)) cdJobState.totalTimeMin = elapsed + remaining;
    _origUpdateJobProgress.call(this, pct, currentLine, totalLines, elapsed, remaining, travelMm);
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
    var axes = [['cdXMpos', x, 'cdXPos'], ['cdYMpos', y, 'cdYPos'], ['cdZMpos', z, 'cdZPos']];
    axes.forEach(function (a) {
      var el = document.getElementById(a[0]);
      if (!el) return;
      el.textContent = 'MPos: ' + a[1];
      var wcs = parseFloat((document.getElementById(a[2]) || {}).textContent);
      var mp  = parseFloat(a[1]);
      var offset = !isNaN(wcs) && !isNaN(mp) && Math.abs(wcs - mp) > 0.0005;
      el.classList.toggle('cd-axis-mpos-offset', offset);
    });
  };

});
