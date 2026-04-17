// Shared state hooks and plot geometry used by all three directions
// Each artboard gets its OWN isolated state instance.

function useMachine() {
  const [pos, setPos] = React.useState({ x: 0, y: 0, z: 0 });
  const [units, setUnits] = React.useState('mm');
  const [jogStep, setJogStep] = React.useState(1);
  const [jogRate, setJogRate] = React.useState(100);
  const [feedRate, setFeedRate] = React.useState(100);
  const [toolRate, setToolRate] = React.useState(100);
  const [connected, setConnected] = React.useState(false);
  const [activeTab, setActiveTab] = React.useState('3d');
  const [running, setRunning] = React.useState(false);
  const [paused, setPaused] = React.useState(false);
  const [toolOn, setToolOn] = React.useState(false);
  const [fileLoaded, setFileLoaded] = React.useState(false);
  const [alarm, setAlarm] = React.useState(false);
  const [currentLine, setCurrentLine] = React.useState(10977);

  // Derived controller state — matches the reference app's status bar
  let controllerState = 'Pending';
  if (connected) {
    if (alarm) controllerState = 'Alarm';
    else if (running && !paused) controllerState = 'Run';
    else if (running && paused) controllerState = 'Hold';
    else controllerState = 'Idle';
  }

  const jog = (axis, dir) => {
    setPos(p => ({ ...p, [axis]: +(p[axis] + dir * jogStep).toFixed(2) }));
  };
  const zero = (axis) => setPos(p => ({ ...p, [axis]: 0 }));
  const zeroAll = () => setPos({ x: 0, y: 0, z: 0 });
  const home = () => setPos({ x: 0, y: 0, z: 0 });

  return {
    pos, setPos, units, setUnits, jogStep, setJogStep,
    jogRate, setJogRate, feedRate, setFeedRate, toolRate, setToolRate,
    connected, setConnected, activeTab, setActiveTab,
    running, setRunning, paused, setPaused,
    toolOn, setToolOn, fileLoaded, setFileLoaded,
    alarm, setAlarm, currentLine, setCurrentLine,
    controllerState,
    jog, zero, zeroAll, home,
  };
}

// Deterministic pseudo-random plot geometry — a hatched flower-ish pattern
// that matches the feel of the screenshot (red dashes, green moves).
function generatePlotPaths(seed = 7) {
  let s = seed;
  const rand = () => { s = (s * 9301 + 49297) % 233280; return s / 233280; };
  const draws = [];   // red pen-down strokes
  const moves = [];   // green travel moves
  const cx = 150, cy = 150;
  let lastX = cx, lastY = cy;

  // radial hatched bursts
  for (let i = 0; i < 120; i++) {
    const angle = rand() * Math.PI * 2;
    const r0 = 20 + rand() * 110;
    const r1 = r0 + 4 + rand() * 18;
    const x0 = cx + Math.cos(angle) * r0;
    const y0 = cy + Math.sin(angle) * r0;
    const x1 = cx + Math.cos(angle) * r1;
    const y1 = cy + Math.sin(angle) * r1;
    moves.push({ x0: lastX, y0: lastY, x1: x0, y1: y0 });
    draws.push({ x0, y0, x1, y1 });
    lastX = x1; lastY = y1;
  }
  // scattered short strokes
  for (let i = 0; i < 60; i++) {
    const x0 = 20 + rand() * 260;
    const y0 = 20 + rand() * 260;
    const len = 6 + rand() * 14;
    const a = rand() * Math.PI * 2;
    const x1 = x0 + Math.cos(a) * len;
    const y1 = y0 + Math.sin(a) * len;
    moves.push({ x0: lastX, y0: lastY, x1: x0, y1: y0 });
    draws.push({ x0, y0, x1, y1 });
    lastX = x1; lastY = y1;
  }
  return { draws, moves };
}

const PLOT = generatePlotPaths();

// Generic plot canvas — themed via props
function PlotView({
  width, height, theme, progress = 0.6, headPos = null,
}) {
  const {
    bg = '#fff', grid = '#e5e5e5', gridMajor = '#d4d4d4',
    draw = '#ef4444', move = '#10b981', border = '#ddd',
    axis = '#9ca3af', axisText = '#6b7280', head = '#fbbf24',
    margin = 20,
  } = theme;
  // Visible drawable area in plot coords: 0..300
  const plotSize = 300;
  const scale = (Math.min(width, height) - margin * 2) / plotSize;
  const ox = (width - plotSize * scale) / 2;
  const oy = (height - plotSize * scale) / 2;

  const p = (v) => v * scale;
  const drawCount = Math.floor(PLOT.draws.length * progress);
  const moveCount = Math.floor(PLOT.moves.length * progress);

  const gridLines = [];
  for (let i = 0; i <= 30; i++) {
    const major = i % 5 === 0;
    const x = ox + p(i * 10);
    const y = oy + p(i * 10);
    gridLines.push(
      <line key={`v${i}`} x1={x} y1={oy} x2={x} y2={oy + p(plotSize)}
        stroke={major ? gridMajor : grid} strokeWidth={major ? 0.6 : 0.3} />
    );
    gridLines.push(
      <line key={`h${i}`} x1={ox} y1={y} x2={ox + p(plotSize)} y2={y}
        stroke={major ? gridMajor : grid} strokeWidth={major ? 0.6 : 0.3} />
    );
  }

  // Axis labels every 50mm
  const labels = [];
  for (let i = 0; i <= 300; i += 50) {
    labels.push(
      <text key={`xl${i}`} x={ox + p(i)} y={oy + p(plotSize) + 12}
        fontSize="8" fill={axisText} textAnchor="middle"
        fontFamily="ui-monospace, monospace">{i}</text>
    );
    labels.push(
      <text key={`yl${i}`} x={ox - 6} y={oy + p(plotSize - i) + 3}
        fontSize="8" fill={axisText} textAnchor="end"
        fontFamily="ui-monospace, monospace">{i}</text>
    );
  }

  // Head indicator — follows live X/Y if provided
  const hx = headPos ? ox + p(150 + headPos.x) : null;
  const hy = headPos ? oy + p(150 - headPos.y) : null;

  return (
    <svg width={width} height={height} style={{ background: bg, display: 'block' }}>
      <rect x={ox} y={oy} width={p(plotSize)} height={p(plotSize)} fill={bg} stroke={border} />
      {gridLines}
      {labels}
      {/* travel moves (done) */}
      {PLOT.moves.slice(0, moveCount).map((m, i) => (
        <line key={`m${i}`} x1={ox + p(m.x0)} y1={oy + p(m.y0)}
          x2={ox + p(m.x1)} y2={oy + p(m.y1)}
          stroke={move} strokeWidth={0.6} opacity={0.8} />
      ))}
      {/* pen-down draws (done) */}
      {PLOT.draws.slice(0, drawCount).map((d, i) => (
        <line key={`d${i}`} x1={ox + p(d.x0)} y1={oy + p(d.y0)}
          x2={ox + p(d.x1)} y2={oy + p(d.y1)}
          stroke={draw} strokeWidth={1.4} strokeLinecap="round" />
      ))}
      {/* remaining as faint preview */}
      {PLOT.draws.slice(drawCount).map((d, i) => (
        <line key={`dp${i}`} x1={ox + p(d.x0)} y1={oy + p(d.y0)}
          x2={ox + p(d.x1)} y2={oy + p(d.y1)}
          stroke={draw} strokeWidth={1} opacity={0.15} />
      ))}
      {/* origin */}
      <circle cx={ox + p(150)} cy={oy + p(150)} r={2} fill={axis} />
      {/* live head */}
      {hx !== null && (
        <g>
          <circle cx={hx} cy={hy} r={5} fill={head} stroke="#000" strokeWidth={0.8} />
          <line x1={hx - 9} y1={hy} x2={hx + 9} y2={hy} stroke={head} strokeWidth={1} />
          <line x1={hx} y1={hy - 9} x2={hx} y2={hy + 9} stroke={head} strokeWidth={1} />
        </g>
      )}
    </svg>
  );
}

Object.assign(window, { useMachine, PlotView, generatePlotPaths, PLOT });
