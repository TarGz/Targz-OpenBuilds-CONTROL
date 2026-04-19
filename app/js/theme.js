// Light-only theme. Kept as a lookup table for the 3D viewer
// (SKY_BOTTOM_COLOR, LINE_COLOURS, GRID_STEP_*, etc.) consumed by
// 3dview.js, verylitegcodeviewer.js and restart-from-point.js.
// Dark-mode code paths were removed; UI is now Portrait-Cubes warm-light.

let ThemeData = {
  THEMES: {
    "light": {
      DESCRIPTION: 'Light Mode',
      ICON: 'sun',
      SPRITE_OPACITY: 0.6,
      SKY_TOP_COLOR: 0xFFFAF4,
      SKY_BOTTOM_COLOR: 0xFFFAF4,
      HEMI_LIGHT_COLOR: {
        'H': 0.6,
        'S': 1.0,
        'L': 0.6
      },
      GRID_STEP_10_COLOR: 0x888888,
      GRID_STEP_10_OPACITY: 0.15,
      GRID_STEP_100_COLOR: 0x666666,
      GRID_STEP_100_OPACITY: 0.15,
      RULER_COLOR: 0x888888,
      RULER_OPACITY: 0.15,
      X_RULER_NUMBER_COLOR: "#cc0000",
      X_RULER_LABEL_COLOR: "#ff0000",
      X_AXIS_LINE_COLOR: 0xcc0000,
      Y_RULER_NUMBER_COLOR: "#006600",
      Y_RULER_LABEL_COLOR: "#006600",
      Y_AXIS_LINE_COLOR: 0x00cc00,
      LINE_COLOURS: [
        { 'R': 0,   'G': 200, 'B': 0   },
        { 'R': 200, 'G': 0,   'B': 0   },
        { 'R': 0,   'G': 0,   'B': 200 },
        { 'R': 200, 'G': 0,   'B': 200 }
      ]
    }
  },

  currentThemeId: "light",

  init: function init() {
    $("body").addClass('theme_light');
  },

  getColor: function getColor(key) {
    return ThemeData.THEMES[ThemeData.currentThemeId][key];
  },

  get: function get() {
    return ThemeData.currentThemeId;
  },

  // Kept as no-ops so any legacy callers don't throw.
  toggle: function toggle() {},
  set: function set() {}
};

const Theme = new Proxy(ThemeData, {
  get: function(theme, key) {
    if (key == "getColor") return ThemeData.getColor;
    if (key == "lines")    return theme.getColor("LINE_COLOURS");
    if (key == "get")      return theme.get;
    if (key == "set")      return theme.set;
    if (key == "toggle")   return theme.toggle;
    return theme.getColor(key);
  }
});

ThemeData.init();
