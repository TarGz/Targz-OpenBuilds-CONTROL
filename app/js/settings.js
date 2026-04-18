/* Settings view — V2 design, replaces legacy troubleshootingPanel modal.
   Bridges to existing globals: laststatus, grblParams, sendGcode, diagnostics flags. */

(function () {
  'use strict';

  var PC_APP_VERSION = '1.5.2';
  var initialised = false;

  // ─── Public bootstrap ─────────────────────────────────────────────────────
  window.cdSettingsInit = function () {
    if (initialised) return;
    initialised = true;

    var $content = $('#cdSetContent');
    $content.empty()
      .append(buildParametersSection())
      .append(buildCalibrationSection())
      .append(buildToolsSection())
      .append(buildShortcutsSection())
      .append(buildDiagnosticsSection())
      .append(buildJobLogSection())
      .append(buildAboutSection());

    // Nav clicks
    $('#cd-settings-layout').on('click', '.cd-set-nav-item', function () {
      cdSettingsShow($(this).data('target'));
    });

    bindParameters();
    bindDiagnostics();
    bindTools();
    renderAbout();
    refreshDiagnostics();
    refreshParameters();

    // Default panel
    cdSettingsShow('diagnostics');
  };

  window.cdSettingsShow = function (target) {
    var $layout = $('#cd-settings-layout');
    $layout.attr('data-active', target);
    $layout.find('.cd-set-nav-item').removeClass('active')
      .filter('[data-target="' + target + '"]').addClass('active');
    $layout.find('.cd-set-section').removeClass('active')
      .filter('[data-section="' + target + '"]').addClass('active');

    if (target === 'parameters') refreshParameters();
    if (target === 'diagnostics') refreshDiagnostics();
    if (target === 'about') renderAbout();
  };

  // Hooked from websocket.js status updates so live data stays in sync.
  window.cdSettingsOnStatus = function () {
    if (!initialised) return;
    if ($('#cd-settings-layout').is(':visible')) {
      refreshDiagnostics();
    }
  };

  // ═══ Section: Parameters ═══════════════════════════════════════════════════
  var GRBL_BASIC_KEYS = ['$0','$1','$10','$11','$12','$13','$20','$21','$22','$100','$101','$102','$110','$111','$112'];
  var GRBL_ADV_KEYS   = ['$2','$3','$4','$5','$6','$23','$24','$25','$26','$27','$30','$31','$32','$33','$34','$35','$36','$120','$121','$122','$130','$131','$132'];
  var GRBL_META = {
    '$0':   { name: 'Step pulse time',           unit: 'µs',      step: 1 },
    '$1':   { name: 'Step idle delay',           unit: 'ms',      step: 1 },
    '$2':   { name: 'Step pulse invert',         unit: 'mask',    step: 1 },
    '$3':   { name: 'Step direction invert',     unit: 'mask',    step: 1 },
    '$4':   { name: 'Invert step enable pin',    unit: 'mask',    step: 1 },
    '$5':   { name: 'Invert limit pins',         unit: 'mask',    step: 1 },
    '$6':   { name: 'Invert probe pin',          unit: 'bool',    step: 1 },
    '$10':  { name: 'Status report options',     unit: 'mask',    step: 1 },
    '$11':  { name: 'Junction deviation',        unit: 'mm',      step: 0.001 },
    '$12':  { name: 'Arc tolerance',             unit: 'mm',      step: 0.001 },
    '$13':  { name: 'Report in inches',          unit: 'bool',    step: 1 },
    '$20':  { name: 'Soft limits enable',        unit: 'bool',    step: 1 },
    '$21':  { name: 'Hard limits enable',        unit: 'bool',    step: 1 },
    '$22':  { name: 'Homing cycle enable',       unit: 'mask',    step: 1 },
    '$23':  { name: 'Homing direction invert',   unit: 'mask',    step: 1 },
    '$24':  { name: 'Homing locate feed rate',   unit: 'mm/min',  step: 1 },
    '$25':  { name: 'Homing search seek rate',   unit: 'mm/min',  step: 1 },
    '$26':  { name: 'Homing switch debounce',    unit: 'ms',      step: 1 },
    '$27':  { name: 'Homing switch pull-off',    unit: 'mm',      step: 0.1 },
    '$30':  { name: 'Max spindle speed',         unit: 'rpm',     step: 1 },
    '$31':  { name: 'Min spindle speed',         unit: 'rpm',     step: 1 },
    '$32':  { name: 'Laser-mode enable',         unit: 'bool',    step: 1 },
    '$33':  { name: 'Spindle PWM frequency',     unit: 'Hz',      step: 1 },
    '$34':  { name: 'Spindle PWM off value',     unit: '%',       step: 0.1 },
    '$35':  { name: 'Spindle PWM min value',     unit: '%',       step: 0.1 },
    '$36':  { name: 'Spindle PWM max value',     unit: '%',       step: 0.1 },
    '$100': { name: 'X steps per mm',            unit: 'step/mm', step: 0.001 },
    '$101': { name: 'Y steps per mm',            unit: 'step/mm', step: 0.001 },
    '$102': { name: 'Z steps per mm',            unit: 'step/mm', step: 0.001 },
    '$110': { name: 'X max rate',                unit: 'mm/min',  step: 1 },
    '$111': { name: 'Y max rate',                unit: 'mm/min',  step: 1 },
    '$112': { name: 'Z max rate',                unit: 'mm/min',  step: 1 },
    '$120': { name: 'X acceleration',            unit: 'mm/s²',   step: 1 },
    '$121': { name: 'Y acceleration',            unit: 'mm/s²',   step: 1 },
    '$122': { name: 'Z acceleration',            unit: 'mm/s²',   step: 1 },
    '$130': { name: 'X max travel',              unit: 'mm',      step: 0.1 },
    '$131': { name: 'Y max travel',              unit: 'mm',      step: 0.1 },
    '$132': { name: 'Z max travel',              unit: 'mm',      step: 0.1 }
  };

  var paramDirty = {}; // key -> new value
  var paramAdvanced = false;
  var paramQuery = '';

  function buildParametersSection() {
    return $(
      '<section class="cd-set-section" data-section="parameters">' +
        '<div class="cd-set-header">' +
          '<div class="cd-set-header-main">' +
            '<div class="cd-set-header-title">GRBL PARAMETERS</div>' +
            '<div class="cd-set-header-hint">Firmware configuration · $-keys sent to controller on APPLY</div>' +
          '</div>' +
        '</div>' +
        '<div class="cd-set-tabs">' +
          '<button class="cd-set-tab active" data-adv="false">✦ BASIC SETTINGS</button>' +
          '<button class="cd-set-tab" data-adv="true">⚙ ADVANCED SETTINGS</button>' +
        '</div>' +
        '<div class="cd-set-toolbar">' +
          '<input type="text" class="cd-set-search" id="cdSetParamSearch" placeholder="Search by name or $-key…" />' +
          '<button class="cd-set-btn" id="cdSetParamRefresh">↻ REFRESH</button>' +
          '<button class="cd-set-btn" id="cdSetParamExport">↓ EXPORT</button>' +
        '</div>' +
        '<div class="cd-set-thead">' +
          '<span style="flex:0 0 60px;">KEY</span>' +
          '<span style="flex:1;">PARAMETER</span>' +
          '<span style="flex:0 0 240px;">VALUE</span>' +
          '<span style="flex:0 0 80px; text-align:right;">UNIT</span>' +
        '</div>' +
        '<div class="cd-set-tbody" id="cdSetParamBody"></div>' +
        '<div class="cd-set-footer-actions">' +
          '<span class="cd-set-footer-actions-spacer">Changes are sent to controller on <strong>APPLY</strong>.</span>' +
          '<button class="cd-set-btn" id="cdSetParamDiscard">DISCARD</button>' +
          '<button class="cd-set-btn cd-set-btn-primary" id="cdSetParamApply">APPLY TO CONTROLLER</button>' +
        '</div>' +
      '</section>'
    );
  }

  function bindParameters() {
    $('#cd-settings-layout').on('click', '.cd-set-tab', function () {
      paramAdvanced = $(this).data('adv') === true || $(this).data('adv') === 'true';
      $(this).siblings().removeClass('active');
      $(this).addClass('active');
      refreshParameters();
    });
    $('#cdSetParamSearch').on('input', function () {
      paramQuery = $(this).val().toLowerCase();
      refreshParameters();
    });
    $('#cdSetParamRefresh').on('click', function () {
      if (typeof sendGcode === 'function') sendGcode('$$');
      paramDirty = {};
      setTimeout(refreshParameters, 300);
    });
    $('#cdSetParamExport').on('click', function () {
      if (typeof grblBackup === 'function') {
        grblBackup();
      } else {
        exportParamsFallback();
      }
    });
    $('#cdSetParamDiscard').on('click', function () {
      paramDirty = {};
      refreshParameters();
    });
    $('#cdSetParamApply').on('click', applyParameters);
    $('#cdSetParamBody').on('input', 'input[data-pkey]', function () {
      var k = $(this).data('pkey');
      paramDirty[k] = $(this).val();
      $(this).closest('.cd-set-row').addClass('dirty');
    });
  }

  function refreshParameters() {
    var keys = paramAdvanced ? GRBL_ADV_KEYS : GRBL_BASIC_KEYS;
    var rows = '';
    keys.forEach(function (k) {
      var meta = GRBL_META[k] || { name: k, unit: '', step: 1 };
      if (paramQuery) {
        if (k.toLowerCase().indexOf(paramQuery) === -1 && meta.name.toLowerCase().indexOf(paramQuery) === -1) return;
      }
      var live = (typeof grblParams !== 'undefined' && grblParams[k] !== undefined) ? grblParams[k] : '';
      var val = paramDirty[k] !== undefined ? paramDirty[k] : live;
      var dirty = paramDirty[k] !== undefined ? ' dirty' : '';
      rows +=
        '<div class="cd-set-row' + dirty + '">' +
          '<span class="cd-set-row-key">' + k + '</span>' +
          '<span class="cd-set-row-name">' + meta.name + '</span>' +
          '<span class="cd-set-row-val">' +
            '<input type="number" data-pkey="' + k + '" step="' + meta.step + '" value="' + val + '" />' +
          '</span>' +
          '<span class="cd-set-row-unit">' + meta.unit + '</span>' +
        '</div>';
    });
    var $body = $('#cdSetParamBody');
    if (!rows) {
      $body.html('<div class="cd-set-empty">' +
        (typeof grblParams !== 'undefined' && Object.keys(grblParams).length === 0
          ? 'No parameters loaded — connect to a controller, then click ↻ REFRESH.'
          : 'No parameters match "' + paramQuery + '"') +
        '</div>');
    } else {
      $body.html(rows);
    }
  }

  function applyParameters() {
    var keys = Object.keys(paramDirty);
    if (!keys.length) return;
    if (typeof sendGcode !== 'function') {
      alert('Not connected to controller.');
      return;
    }
    keys.forEach(function (k) {
      sendGcode(k + '=' + paramDirty[k] + '\n');
    });
    paramDirty = {};
    setTimeout(function () {
      if (typeof sendGcode === 'function') sendGcode('$$');
      setTimeout(refreshParameters, 300);
    }, 200);
  }

  function exportParamsFallback() {
    if (typeof grblParams === 'undefined') return;
    var lines = Object.keys(grblParams).map(function (k) { return k + '=' + grblParams[k]; }).join('\n');
    var blob = new Blob([lines], { type: 'text/plain' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'grbl-settings.txt';
    a.click();
  }

  // ═══ Section: Calibration ══════════════════════════════════════════════════
  function buildCalibrationSection() {
    var cards = [
      { id: 'x',     title: 'CALIBRATE X-AXIS STEPS/MM',  desc: 'Jog a known distance, measure, compute $100.', icon: '↔', axis: 'var(--cd-axis-x)' },
      { id: 'y',     title: 'CALIBRATE Y-AXIS STEPS/MM',  desc: 'Jog a known distance, measure, compute $101.', icon: '↕', axis: 'var(--cd-axis-y)' },
      { id: 'z',     title: 'CALIBRATE Z-AXIS STEPS/MM',  desc: 'Jog a known distance, measure, compute $102.', icon: '⇅', axis: 'var(--cd-axis-z)' },
      { id: 'servo', title: 'CALIBRATE SERVO PEN UP/DOWN', desc: 'Set servo angles for pen up and pen down.',   icon: '✎', axis: 'var(--cd-accent)' }
    ];
    var html = '<section class="cd-set-section" data-section="calibration">' +
      '<div class="cd-set-header">' +
        '<div class="cd-set-header-main">' +
          '<div class="cd-set-header-title">CALIBRATION</div>' +
          '<div class="cd-set-header-hint">Run a wizard to compute accurate firmware values for each axis</div>' +
        '</div>' +
      '</div>' +
      '<div class="cd-set-banner cd-set-banner-warn" id="cdSetCalibBanner" style="display:none;">' +
        '<span class="cd-set-banner-icon">⚠</span>' +
        '<span>Connect to a controller before calibrating.</span>' +
      '</div>' +
      '<div class="cd-set-cards">';
    cards.forEach(function (c) {
      html +=
        '<button class="cd-set-cal-card" data-cal="' + c.id + '" style="border-left-color:' + c.axis + ';" disabled title="Coming soon">' +
          '<div class="cd-set-cal-head">' +
            '<span class="cd-set-cal-icon" style="color:' + c.axis + ';">' + c.icon + '</span>' +
            '<span class="cd-set-cal-title">' + c.title + '</span>' +
          '</div>' +
          '<span class="cd-set-cal-desc">' + c.desc + '</span>' +
        '</button>';
    });
    html += '</div></section>';
    return $(html);
  }

  // ═══ Section: Tools ═══════════════════════════════════════════════════════
  function buildToolsSection() {
    var tools = [
      { id: 'surfacing', title: 'SURFACING / FLATTENING WIZARD',          desc: 'Generate a raster g-code path to flatten a workpiece surface.', icon: '⇌', danger: false },
      { id: 'mobileJog', title: 'MOBILE JOG WIDGET',                      desc: 'Open a full-screen jog pad optimized for phone / tablet.',     icon: '▢', danger: false },
      { id: 'firmware',  title: 'FIRMWARE FLASHING TOOL',                 desc: 'Flash new GRBL firmware to the controller. Use with care.',     icon: '⚡', danger: true  },
      { id: 'usb',       title: 'PREPARE USB FLASHDRIVE FOR INTERFACE',   desc: 'Write the CONTROL interface to a USB drive for offline install.', icon: '↑', danger: false }
    ];
    var html = '<section class="cd-set-section" data-section="tools">' +
      '<div class="cd-set-header">' +
        '<div class="cd-set-header-main">' +
          '<div class="cd-set-header-title">TOOLS &amp; WIZARDS</div>' +
          '<div class="cd-set-header-hint">Utilities that don\'t fit in the main control surface</div>' +
        '</div>' +
      '</div>' +
      '<div class="cd-set-tools-list">';
    tools.forEach(function (t) {
      html +=
        '<div class="cd-set-tool' + (t.danger ? ' danger' : '') + '">' +
          '<span class="cd-set-tool-icon">' + t.icon + '</span>' +
          '<div class="cd-set-tool-body">' +
            '<div class="cd-set-tool-title">' + t.title + '</div>' +
            '<div class="cd-set-tool-desc">' + t.desc + '</div>' +
          '</div>' +
          '<button class="cd-set-btn ' + (t.danger ? 'cd-set-btn-danger' : 'cd-set-btn-primary') + '" data-tool="' + t.id + '">' +
            (t.danger ? 'OPEN ⚠' : 'OPEN →') +
          '</button>' +
        '</div>';
    });
    html += '</div></section>';
    return $(html);
  }

  function bindTools() {
    $('#cd-settings-layout').on('click', '[data-tool]', function () {
      var t = $(this).data('tool');
      switch (t) {
        case 'surfacing':
          if (typeof surfacingWizard === 'function') return surfacingWizard();
          if ($('#surfacingWizardBtn').length) return $('#surfacingWizardBtn').click();
          alert('Surfacing wizard not available.');
          break;
        case 'mobileJog':
          window.open('jog/index.html', '_blank');
          break;
        case 'firmware':
          if (typeof flashFirmware === 'function') return flashFirmware();
          if ($('#flashFirmwareBtn').length) return $('#flashFirmwareBtn').click();
          alert('Firmware flashing tool not available in this build.');
          break;
        case 'usb':
          window.open('upload.html', '_blank');
          break;
      }
    });
  }

  // ═══ Section: Shortcuts ═══════════════════════════════════════════════════
  var SHORTCUTS = [
    { action: 'Jog X−',         keys: ['←'] },
    { action: 'Jog X+',         keys: ['→'] },
    { action: 'Jog Y+',         keys: ['↑'] },
    { action: 'Jog Y−',         keys: ['↓'] },
    { action: 'Jog Z+',         keys: ['Page Up'] },
    { action: 'Jog Z−',         keys: ['Page Down'] },
    { action: 'Home All',       keys: ['Ctrl', 'H'] },
    { action: 'Start / Resume', keys: ['Space'] },
    { action: 'Pause',          keys: ['P'] },
    { action: 'Stop',           keys: ['S'] },
    { action: 'Abort / E-Stop', keys: ['Esc'] },
    { action: 'Tool On / Off',  keys: ['T'] },
    { action: 'Go to XY0',      keys: ['G', '0'] },
    { action: 'Open G-code',    keys: ['Ctrl', 'O'] },
    { action: 'Step ×10',       keys: ['Shift'] },
    { action: 'Step ÷10',       keys: ['Alt'] }
  ];

  function buildShortcutsSection() {
    var html = '<section class="cd-set-section" data-section="shortcuts">' +
      '<div class="cd-set-header">' +
        '<div class="cd-set-header-main">' +
          '<div class="cd-set-header-title">KEYBOARD SHORTCUTS</div>' +
          '<div class="cd-set-header-hint">Reference list of current shortcuts. Rebinding coming soon.</div>' +
        '</div>' +
      '</div>' +
      '<div class="cd-set-thead">' +
        '<span style="flex:1;">ACTION</span>' +
        '<span style="flex:0 0 240px;">SHORTCUT</span>' +
        '<span style="flex:0 0 80px; text-align:right;">EDIT</span>' +
      '</div>' +
      '<div class="cd-set-tbody">';
    SHORTCUTS.forEach(function (s) {
      html +=
        '<div class="cd-set-row">' +
          '<span style="flex:1;">' + s.action + '</span>' +
          '<span style="flex:0 0 240px;">' +
            s.keys.map(function (k) { return '<span class="cd-set-kbd">' + k + '</span>'; })
                  .join('<span class="cd-set-kbd-plus">+</span>') +
          '</span>' +
          '<span style="flex:0 0 80px; text-align:right;">' +
            '<button class="cd-set-btn" disabled title="Coming soon">REBIND</button>' +
          '</span>' +
        '</div>';
    });
    html += '</div></section>';
    return $(html);
  }

  // ═══ Section: Diagnostics ═════════════════════════════════════════════════
  var DIAG_TOGGLES = [
    { var: 'disable3Dviewer',       label: 'Enable 3D Viewer System',         hint: 'Disable on slower computers',      invert: true },
    { var: 'disable3Dcontrols',     label: 'Enable 3D Interactions',          hint: '',                                  invert: true },
    { var: 'disable3Dskybox',       label: 'Enable 3D Skybox / Fog',          hint: '',                                  invert: true },
    { var: 'disable3Drealtimepos',  label: 'Realtime Job Position Indicator', hint: '',                                  invert: true },
    { var: 'disable3Dgcodepreview', label: 'GCODE Preview',                   hint: '',                                  invert: true },
    { var: 'disableSerialLog',      label: 'Serial Log',                      hint: 'Console tab output',               invert: true },
    { var: 'disableDROupdates',     label: 'DRO / Status Updates',            hint: 'Live X/Y/Z readout',               invert: true },
    { var: 'showGpuInfo',           label: 'Show GPU Information',            hint: 'Report adapter in diagnostics',    invert: false }
  ];

  function buildDiagnosticsSection() {
    var html = '<section class="cd-set-section" data-section="diagnostics">' +
      '<div class="cd-set-header">' +
        '<div class="cd-set-header-main">' +
          '<div class="cd-set-header-title">DIAGNOSTICS</div>' +
          '<div class="cd-set-header-hint">Inspect inputs, communications, and disable viewer subsystems on slow machines.</div>' +
        '</div>' +
      '</div>' +
      '<div class="cd-set-cards">' +
        '<div class="cd-set-card">' +
          '<div class="cd-set-card-header">INPUTS / ENDSTOPS <span class="cd-set-card-hint">Manually activate inputs you want to test</span></div>' +
          '<div class="cd-set-card-body" id="cdSetPinsBody"></div>' +
        '</div>' +
        '<div class="cd-set-card">' +
          '<div class="cd-set-card-header">COMMUNICATIONS <span class="cd-set-card-hint">Live controller + websocket status</span></div>' +
          '<div class="cd-set-card-body" id="cdSetCommsBody"></div>' +
        '</div>' +
        '<div class="cd-set-card cd-set-card-span">' +
          '<div class="cd-set-card-header">3D VIEWER &amp; UI <span class="cd-set-card-hint">Disable subsystems on slower computers (reload required)</span></div>' +
          '<div class="cd-set-card-body" id="cdSetTogglesBody" style="display:grid; grid-template-columns:1fr 1fr; gap:0;"></div>' +
        '</div>' +
        '<div class="cd-set-card cd-set-card-span" id="cdSetComputerCard" style="display:none;">' +
          '<div class="cd-set-card-header">COMPUTER <span class="cd-set-card-hint">Host machine report</span></div>' +
          '<div class="cd-set-card-body" id="cdSetComputerBody" style="display:grid; grid-template-columns:1fr 1fr; gap:0;"></div>' +
        '</div>' +
      '</div>' +
    '</section>';
    return $(html);
  }

  function bindDiagnostics() {
    // Render toggle rows once
    var $tg = $('#cdSetTogglesBody');
    DIAG_TOGGLES.forEach(function (t) {
      $tg.append(
        '<label class="cd-set-toggle-row" data-diag-var="' + t.var + '" data-diag-invert="' + t.invert + '">' +
          '<button type="button" class="cd-set-toggle"></button>' +
          '<div class="cd-set-toggle-text">' +
            '<div class="cd-set-toggle-label">' + t.label + '</div>' +
            (t.hint ? '<div class="cd-set-toggle-hint">' + t.hint + '</div>' : '') +
          '</div>' +
        '</label>'
      );
    });
    $tg.on('click', '.cd-set-toggle-row', function (e) {
      e.preventDefault();
      var name = $(this).data('diag-var');
      var invert = $(this).data('diag-invert') === true || $(this).data('diag-invert') === 'true';
      var current = !!window[name];
      window[name] = !current;
      if (typeof saveDiagnostics === 'function') saveDiagnostics();
      refreshDiagnostics();
      // Effective UI changes (3D viewer subsystems, serial log) require reload — flag once per session.
      if (!window.__cdSetReloadHinted) {
        window.__cdSetReloadHinted = true;
        setTimeout(function () {
          if (confirm('A reload is required for this change to take effect. Reload now?')) location.reload();
        }, 50);
      }
    });
  }

  function refreshDiagnostics() {
    // Toggles
    DIAG_TOGGLES.forEach(function (t) {
      var on = t.invert ? !window[t.var] : !!window[t.var];
      $('#cdSetTogglesBody [data-diag-var="' + t.var + '"] .cd-set-toggle').toggleClass('on', on);
    });

    // Pins
    var pins = [
      { name: 'X-Limit',     key: 'X' },
      { name: 'Y-Limit',     key: 'Y' },
      { name: 'Z-Limit',     key: 'Z' },
      { name: 'Probe',       key: 'P' },
      { name: 'Door Sensor', key: 'D' }
    ];
    var pinsHtml = '';
    var ls = window.laststatus;
    var pinStr = (ls && ls.machine && ls.machine.inputs && ls.machine.inputs.pins) || '';
    pins.forEach(function (p) {
      var on = pinStr && pinStr.indexOf(p.key) !== -1;
      var connected = !!(ls && ls.comms && ls.comms.connectionStatus >= 1);
      var lampClass = !connected ? 'nocomm' : (on ? 'on' : '');
      var label = !connected ? 'NOCOMM' : (on ? 'ON' : 'OFF');
      pinsHtml +=
        '<div class="cd-set-pin-row">' +
          '<span class="cd-set-pin-name">' + p.name + '</span>' +
          '<span class="cd-set-pin-lamp ' + lampClass + '">' + label + '</span>' +
        '</div>';
    });
    $('#cdSetPinsBody').html(pinsHtml);

    // Communications
    var connected = !!(ls && ls.comms && ls.comms.connectionStatus >= 1);
    var port = (ls && ls.comms && ls.comms.interfaces && ls.comms.interfaces.activePort) || '—';
    var driverVer = (ls && ls.driver && ls.driver.version) ? 'v' + ls.driver.version : '—';
    var fw = (ls && ls.machine && ls.machine.firmware) ? (ls.machine.firmware.platform || '') + ' ' + (ls.machine.firmware.version || '') : '—';
    var serialQ = (ls && ls.comms && ls.comms.queue !== undefined) ? ls.comms.queue : '—';
    var commsHtml = '' +
      kvHtml('Installed Version',  driverVer) +
      kvHtml('Connection Status',  connected ? 'Connected' : 'Not Connected', connected ? 'ok' : 'bad') +
      kvHtml('Connected To',       port) +
      kvHtml('Serial Queue',       String(serialQ)) +
      kvHtml('Websocket Status',   connected ? 'Connected' : 'Disconnected', connected ? 'ok' : 'bad') +
      kvHtml('Firmware',           fw);
    $('#cdSetCommsBody').html(commsHtml);

    // Footer firmware version
    $('#cdSetNavFwVer').text(fw === '—' ? 'grbl —' : fw);

    // Computer card (gated by showGpuInfo)
    if (window.showGpuInfo && ls && ls.driver) {
      var d = ls.driver;
      var os = d.operatingsystem || '';
      var compHtml = '' +
        kvHtml('OS',          os) +
        kvHtml('CPU',         (d.cpu && d.cpu.brand) || '—') +
        kvHtml('GPU',         (d.gpu && d.gpu.controllers && d.gpu.controllers[0] && d.gpu.controllers[0].model) || '—') +
        kvHtml('Motherboard', (d.system && d.system.model) || '—') +
        kvHtml('Memory',      (d.mem && ('Free: ' + (d.mem.free || '?') + ' / Total: ' + (d.mem.total || '?'))) || '—') +
        kvHtml('Host',        (d.os && d.os.hostname) || '—');
      $('#cdSetComputerBody').html(compHtml);
      $('#cdSetComputerCard').show();
    } else {
      $('#cdSetComputerCard').hide();
    }
  }

  function kvHtml(k, v, cls) {
    return '<div class="cd-set-kv">' +
      '<span class="cd-set-kv-key">' + k + '</span>' +
      '<span class="cd-set-kv-val' + (cls ? ' ' + cls : '') + '" title="' + escAttr(v) + '">' + v + '</span>' +
    '</div>';
  }

  function escAttr(s) { return String(s).replace(/"/g, '&quot;'); }

  // ═══ Section: Job Log ══════════════════════════════════════════════════════
  function buildJobLogSection() {
    var raw = [];
    try { raw = JSON.parse(localStorage.getItem('jobLog') || '[]'); } catch (e) { raw = []; }
    var html = '<section class="cd-set-section" data-section="joblog">' +
      '<div class="cd-set-header">' +
        '<div class="cd-set-header-main">' +
          '<div class="cd-set-header-title">JOB LOG</div>' +
          '<div class="cd-set-header-hint">History of every job. Resume interrupted jobs from their last line.</div>' +
        '</div>' +
        '<button class="cd-set-btn" disabled title="Coming soon">↓ EXPORT CSV</button>' +
      '</div>';
    if (!raw.length) {
      html += '<div class="cd-set-empty" style="padding:32px; border:1px dashed var(--cd-border); border-radius:3px;">' +
        'No jobs logged yet. Job history is recorded after the first run.' +
      '</div>';
    } else {
      html += '<div class="cd-set-thead">' +
        '<span style="flex:0 0 140px;">WHEN</span>' +
        '<span style="flex:1;">FILE</span>' +
        '<span style="flex:0 0 90px; text-align:right;">LINES</span>' +
        '<span style="flex:0 0 80px; text-align:right;">DURATION</span>' +
        '<span style="flex:0 0 110px;">STATUS</span>' +
      '</div><div class="cd-set-tbody">';
      raw.slice().reverse().forEach(function (log) {
        var statusCls = 'cd-set-status-' + (log.status || 'completed');
        html += '<div class="cd-set-row">' +
          '<span style="flex:0 0 140px; font-family:var(--cd-mono); color:var(--cd-text-muted); font-size:10px;">' + (log.when || '') + '</span>' +
          '<span style="flex:1; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">' + (log.file || '') + '</span>' +
          '<span style="flex:0 0 90px; font-family:var(--cd-mono); text-align:right;">' + (log.lines || 0) + '</span>' +
          '<span style="flex:0 0 80px; font-family:var(--cd-mono); text-align:right;">' + (log.duration || '') + '</span>' +
          '<span style="flex:0 0 110px;" class="' + statusCls + '">' +
            '<span class="cd-set-status-dot"></span>' +
            '<span style="font-family:var(--cd-mono); font-size:10px; font-weight:600; letter-spacing:0.5px;">' + (log.status || '').toUpperCase() + '</span>' +
          '</span>' +
        '</div>';
      });
      html += '</div>';
    }
    html += '</section>';
    return $(html);
  }

  // ═══ Section: About ════════════════════════════════════════════════════════
  function buildAboutSection() {
    return $(
      '<section class="cd-set-section" data-section="about">' +
        '<div class="cd-set-header">' +
          '<div class="cd-set-header-main">' +
            '<div class="cd-set-header-title">ABOUT</div>' +
            '<div class="cd-set-header-hint">Version, credits and links</div>' +
          '</div>' +
        '</div>' +
        '<div class="cd-set-cards">' +
          '<div class="cd-set-card">' +
            '<div class="cd-set-card-header">APPLICATION</div>' +
            '<div class="cd-set-card-body" id="cdSetAboutApp"></div>' +
          '</div>' +
          '<div class="cd-set-card">' +
            '<div class="cd-set-card-header">CHANGELOG</div>' +
            '<div class="cd-set-card-body cd-set-changelog" id="cdSetAboutChangelog"></div>' +
          '</div>' +
        '</div>' +
      '</section>'
    );
  }

  function renderAbout() {
    var ls = window.laststatus;
    var driverVer = (ls && ls.driver && ls.driver.version) ? 'v' + ls.driver.version : '—';
    $('#cdSetAboutApp').html(
      kvHtml('Name',          'PenPlotter Control') +
      kvHtml('App Version',   'v' + PC_APP_VERSION) +
      kvHtml('Driver',        driverVer) +
      kvHtml('License',       'AGPL-3.0') +
      '<div style="padding:10px; display:flex; gap:6px;">' +
        '<button class="cd-set-btn" onclick="window.open(\'https://github.com/Targz/TargzPenPlotterCtrl\',\'_blank\')">REPO →</button>' +
        '<button class="cd-set-btn" onclick="window.open(\'https://software.openbuilds.com/\',\'_blank\')">OPENBUILDS →</button>' +
      '</div>'
    );

    // Changelog from version.js if exposed; else best-effort fetch via require.
    var changelog = window.CHANGELOG || (function () {
      try { return require('../../version.js').CHANGELOG; } catch (e) { return null; }
    })();
    if (!changelog || !changelog.length) {
      $('#cdSetAboutChangelog').html('<div class="cd-set-empty">Changelog not loaded.</div>');
      return;
    }
    var html = '';
    changelog.slice(0, 30).forEach(function (c) {
      html += '<div class="cd-set-changelog-entry">' +
        '<span class="cd-set-changelog-ver">v' + (c.version || '?') + '</span>' +
        (c.date ? '<span class="cd-set-changelog-date">' + c.date + '</span>' : '') +
        '<ul>' + (c.changes || []).map(function (x) { return '<li>' + x + '</li>'; }).join('') + '</ul>' +
      '</div>';
    });
    $('#cdSetAboutChangelog').html(html);
  }

  // Try to expose CHANGELOG to renderer scope (Electron main exposes via require if nodeIntegration).
  try {
    var v = require('../../version.js');
    if (v && v.CHANGELOG) window.CHANGELOG = v.CHANGELOG;
  } catch (e) { /* renderer without nodeIntegration — handled in renderAbout */ }
})();
