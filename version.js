module.exports = {
  version: require('./package.json').version,
  CHANGELOG: [
    {
      date: '2026-04-17',
      version: '1.3.1',
      changes: [
        'Replace app icon with new Targz Pen Plotter Ctrl logo (mac .icns, win .ico, linux .png, favicon)'
      ]
    },
    {
      date: '2026-04-17',
      version: '1.3.0',
      changes: [
        'Restyle restart-from-point scrubber, editor banner and 3D-view floating toolbar with Portrait-Cubes design language',
        'Fix toolpath ghosting before scrub head so already-drawn lines blend toward the viewer background instead of darkening'
      ]
    },
    {
      date: '2026-04-15',
      version: '1.2.1',
      changes: [
        'Update app logo',
        'Simplify README with build & install instructions',
        'Build arm64 only'
      ]
    },
    {
      date: '2026-04-15',
      version: '1.2.0',
      changes: [
        'Rebrand to Targz Pen Plotter Ctrl',
        'Add local macOS build script (build-mac)',
        'Add version.js with changelog'
      ]
    },
    {
      date: '2025-01-01',
      version: '1.1.0',
      changes: [
        'Add visual restart-from-point feature with 3D scrubber'
      ]
    }
  ]
};
