// Direction C — "Workbench"
// Warm cream paper + tactile instrument-panel feel.
// Inspired by mechanical test equipment, lab instruments, analog meters.
// Keeps the orange theme but frames it in a more artisanal, crafted way.

function WorkbenchDirection() {
  const m = useMachine();
  const [progress, setProgress] = React.useState(0.45);

  React.useEffect(() => {
    if (!m.running) return;
    const id = setInterval(() => {
      setProgress(p => {
        const next = Math.min(1, p + 0.002);
        if (next >= 1) m.setRunning(false);
        return next;
      });
    }, 50);
    return () => clearInterval(id);
  }, [m.running]);

  // Warm paper + walnut + brass accents, orange pen signal
  const C = {
    bg: '#F2EDE1',           // warm cream paper
    bgDeep: '#E8E1D1',
    panel: '#FAF6EC',
    panelAlt: '#EDE6D3',
    ink: '#1F1A14',
    inkMuted: '#5C5342',
    inkFaint: '#8A8371',
    rule: '#C9BFA8',
    ruleSoft: '#DDD4BC',
    accent: '#D2581C',       // burnt orange — warmer than studio
    accentSoft: '#F0C89B',
    brass: '#A88640',
    axisX: '#B93A2B',
    axisY: '#4F7A3A',
    axisZ: '#2D5A8A',
    good: '#4F7A3A',
    bad: '#B93A2B',
  };

  const serif = '"Fraunces", "Iowan Old Style", Georgia, serif';
  const sans = '"Inter", -apple-system, system-ui, sans-serif';
  const mono = '"JetBrains Mono", ui-monospace, Menlo, monospace';

  // Tactile rounded button
  const TBtn = ({ onClick, children, w = 44, h = 44, variant = 'default', title }) => {
    const base = variant === 'accent'
      ? { bg: C.accent, color: '#fff', border: '#9A3D0E' }
      : { bg: C.panel, color: C.ink, border: C.rule };
    return (
      <button onClick={onClick} title={title} style={{
        width: w, height: h,
        background: `linear-gradient(180deg, ${base.bg} 0%, ${base.bg} 60%, ${base.bg}dd 100%)`,
        color: base.color,
        border: `1px solid ${base.border}`,
        borderTop: `1px solid ${variant === 'accent' ? '#E87A3C' : '#fff'}`,
        borderBottom: `2px solid ${base.border}`,
        borderRadius: 6,
        boxShadow: variant === 'accent'
          ? 'inset 0 1px 0 rgba(255,255,255,0.3), 0 1px 2px rgba(0,0,0,0.08)'
          : 'inset 0 1px 0 rgba(255,255,255,0.6), 0 1px 2px rgba(0,0,0,0.06)',
        cursor: 'pointer',
        fontFamily: sans, fontSize: 13, fontWeight: 500,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        transition: 'transform 0.05s',
      }}
      onMouseDown={e => e.currentTarget.style.transform = 'translateY(1px)'}
      onMouseUp={e => e.currentTarget.style.transform = 'translateY(0)'}
      onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
      >{children}</button>
    );
  };

  // Analog-style gauge for overrides (semicircle dial)
  const Gauge = ({ label, value, onChange, unit = '%' }) => {
    const angle = (value / 200) * 180 - 90; // -90 to +90
    const size = 108;
    const cx = size / 2, cy = size * 0.75;
    const r = size * 0.42;
    return (
      <div style={{
        background: C.panel, border: `1px solid ${C.rule}`,
        borderRadius: 8, padding: '10px 10px 12px',
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.6)',
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        flex: 1, minWidth: 0,
      }}>
        <div style={{
          fontFamily: serif, fontSize: 11, color: C.inkMuted,
          fontWeight: 500, fontStyle: 'italic', letterSpacing: 0.3,
        }}>{label}</div>
        <svg width={size} height={size * 0.85} viewBox={`0 0 ${size} ${size * 0.85}`}>
          {/* arc */}
          <path d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`}
            fill="none" stroke={C.ruleSoft} strokeWidth={6} strokeLinecap="round" />
          {/* zone markers */}
          {[-90, -45, 0, 45, 90].map(a => {
            const rad = (a - 90) * Math.PI / 180;
            const x1 = cx + Math.cos(rad) * (r - 8);
            const y1 = cy + Math.sin(rad) * (r - 8);
            const x2 = cx + Math.cos(rad) * (r + 2);
            const y2 = cy + Math.sin(rad) * (r + 2);
            return <line key={a} x1={x1} y1={y1} x2={x2} y2={y2} stroke={C.inkFaint} strokeWidth={0.8} />;
          })}
          {/* 100% sweet spot marker */}
          <path d={`M ${cx} ${cy - r - 4} L ${cx - 3} ${cy - r + 2} L ${cx + 3} ${cy - r + 2} Z`} fill={C.good} />
          {/* needle */}
          <g transform={`rotate(${angle}, ${cx}, ${cy})`}>
            <line x1={cx} y1={cy} x2={cx} y2={cy - r + 2}
              stroke={C.accent} strokeWidth={2} strokeLinecap="round" />
            <circle cx={cx} cy={cy} r={4} fill={C.brass} stroke={C.ink} strokeWidth={0.5} />
          </g>
          {/* labels */}
          <text x={cx - r} y={cy + 12} fontSize={8} fill={C.inkFaint} fontFamily={mono} textAnchor="middle">0</text>
          <text x={cx} y={cy - r - 8} fontSize={8} fill={C.good} fontFamily={mono} textAnchor="middle" fontWeight={600}>100</text>
          <text x={cx + r} y={cy + 12} fontSize={8} fill={C.inkFaint} fontFamily={mono} textAnchor="middle">200</text>
        </svg>
        <div style={{
          fontFamily: mono, fontSize: 14, fontWeight: 600, color: C.ink,
          fontVariantNumeric: 'tabular-nums', marginTop: -6,
        }}>{value}<span style={{ color: C.inkFaint, fontSize: 10 }}>{unit}</span></div>
        <input type="range" min={0} max={200} value={value}
          onChange={e => onChange(+e.target.value)}
          style={{ width: '100%', marginTop: 4, accentColor: C.accent }}
        />
      </div>
    );
  };

  // Position readout in brass-inset style
  const PositionCard = () => (
    <div style={{
      background: '#1A1612', color: C.panel,
      borderRadius: 8, padding: '14px 16px',
      boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.4), 0 1px 2px rgba(0,0,0,0.15)',
      border: `1px solid ${C.brass}`,
      position: 'relative',
    }}>
      <div style={{
        position: 'absolute', top: 8, right: 12,
        fontFamily: serif, fontStyle: 'italic', fontSize: 10,
        color: '#A88640', letterSpacing: 0.5,
      }}>WCS · G54</div>
      {[
        { a: 'X', c: C.axisX, v: m.pos.x },
        { a: 'Y', c: '#6FA351', v: m.pos.y },
        { a: 'Z', c: '#5A9ED8', v: m.pos.z },
      ].map(r => (
        <div key={r.a} style={{
          display: 'flex', alignItems: 'baseline', gap: 10,
          padding: '4px 0', borderBottom: r.a !== 'Z' ? '1px dashed rgba(255,255,255,0.08)' : 'none',
        }}>
          <div style={{
            fontFamily: serif, fontSize: 16, fontWeight: 700, color: r.c,
            width: 20,
          }}>{r.a}</div>
          <div style={{
            flex: 1, fontFamily: mono, fontSize: 22, fontWeight: 400,
            letterSpacing: -0.3, fontVariantNumeric: 'tabular-nums',
            textShadow: `0 0 8px ${r.c}33`,
            color: r.c,
          }}>{r.v >= 0 ? '+' : ''}{r.v.toFixed(3)}</div>
          <div style={{ fontFamily: mono, fontSize: 10, color: '#A88640' }}>{m.units}</div>
          <button onClick={() => m.zero(r.a.toLowerCase())} style={{
            fontFamily: mono, fontSize: 9, padding: '2px 6px',
            background: 'transparent', border: '1px solid rgba(168,134,64,0.4)',
            color: '#A88640', cursor: 'pointer', borderRadius: 3, letterSpacing: 0.5,
          }}>∅</button>
        </div>
      ))}
    </div>
  );

  const tabs = [
    { id: '3d', label: 'Preview' },
    { id: 'log', label: 'Console' },
    { id: 'macros', label: 'Macros' },
    { id: 'gcode', label: 'G-code' },
  ];

  return (
    <div style={{
      width: '100%', height: '100%',
      background: `radial-gradient(ellipse at top, ${C.bg} 0%, ${C.bgDeep} 100%)`,
      color: C.ink, fontFamily: sans, fontSize: 13,
      display: 'flex', flexDirection: 'column',
      overflow: 'hidden',
    }}>
      {/* ─── Top header — newspaper-style masthead ─── */}
      <div style={{
        padding: '10px 20px', borderBottom: `2px solid ${C.ink}`,
        background: C.panel, flexShrink: 0,
        display: 'flex', alignItems: 'center', gap: 16,
      }}>
        <div style={{
          display: 'flex', flexDirection: 'column', gap: 0,
          borderRight: `1px solid ${C.rule}`, paddingRight: 16,
        }}>
          <div style={{
            fontFamily: serif, fontSize: 22, fontWeight: 700,
            letterSpacing: -0.5, lineHeight: 1,
          }}>Pen<span style={{ color: C.accent, fontStyle: 'italic' }}>Plotter</span></div>
          <div style={{
            fontFamily: serif, fontStyle: 'italic', fontSize: 10,
            color: C.inkMuted, letterSpacing: 0.8,
          }}>— Est. Workshop Control —</div>
        </div>
        <div style={{ display: 'flex', gap: 2 }}>
          {['Machine Control', 'Troubleshooting'].map((t, i) => (
            <div key={t} style={{
              padding: '6px 14px', fontFamily: serif, fontSize: 13,
              fontWeight: i === 0 ? 600 : 400,
              fontStyle: i === 0 ? 'normal' : 'italic',
              color: i === 0 ? C.ink : C.inkMuted,
              borderBottom: i === 0 ? `2px solid ${C.accent}` : 'none',
              cursor: 'pointer',
            }}>{t}</div>
          ))}
        </div>
        <div style={{ flex: 1 }} />
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '5px 12px', background: C.panelAlt,
          border: `1px solid ${C.rule}`, borderRadius: 20,
          fontFamily: mono, fontSize: 10,
        }}>
          <div style={{
            width: 8, height: 8, borderRadius: '50%',
            background: m.connected ? C.good : C.inkFaint,
            boxShadow: m.connected ? `0 0 0 3px ${C.good}33` : 'none',
          }} />
          <span style={{ color: m.connected ? C.good : C.inkMuted }}>
            {m.connected ? 'Connected · ttyUSB0' : 'Disconnected'}
          </span>
        </div>
        <TBtn w={110} h={34} variant={m.connected ? 'default' : 'accent'}
          onClick={() => m.setConnected(c => !c)}>
          {m.connected ? 'Disconnect' : 'Connect'}
        </TBtn>
      </div>

      {/* ─── Two columns ─── */}
      <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>
        {/* Left — instrument panel */}
        <div style={{
          width: 340, padding: 16, gap: 14,
          display: 'flex', flexDirection: 'column',
          borderRight: `1px solid ${C.rule}`,
          background: `linear-gradient(180deg, transparent, ${C.bgDeep} 100%)`,
          overflow: 'auto',
        }}>
          {/* Section: File */}
          <div>
            <div style={{
              fontFamily: serif, fontSize: 11, fontStyle: 'italic',
              color: C.inkMuted, marginBottom: 6, letterSpacing: 0.5,
            }}>— Active Drawing —</div>
            <div style={{
              padding: 12, background: C.panel, border: `1px solid ${C.rule}`,
              borderRadius: 8, display: 'flex', alignItems: 'center', gap: 10,
              boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.6)',
            }}>
              <div style={{
                width: 36, height: 44, background: C.accentSoft,
                border: `1px solid ${C.accent}`, borderRadius: 3,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: serif, fontSize: 18, color: C.accent,
              }}>✎</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: serif, fontWeight: 600, fontSize: 14, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  hatched_flower_v3
                </div>
                <div style={{ fontFamily: mono, fontSize: 10, color: C.inkFaint }}>
                  14,832 lines · 42:00 est.
                </div>
              </div>
            </div>
          </div>

          {/* Section: Position */}
          <div>
            <div style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
              marginBottom: 6,
            }}>
              <div style={{ fontFamily: serif, fontSize: 11, fontStyle: 'italic', color: C.inkMuted, letterSpacing: 0.5 }}>— Position —</div>
              <div style={{ display: 'flex', gap: 2 }}>
                {['mm', 'inch'].map(u => (
                  <button key={u} onClick={() => m.setUnits(u)} style={{
                    padding: '2px 8px', fontSize: 10, fontFamily: mono,
                    background: m.units === u ? C.ink : 'transparent',
                    color: m.units === u ? C.panel : C.inkMuted,
                    border: `1px solid ${m.units === u ? C.ink : C.rule}`,
                    borderRadius: 3, cursor: 'pointer',
                  }}>{u}</button>
                ))}
              </div>
            </div>
            <PositionCard />
            <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
              <button onClick={m.zeroAll} style={{
                flex: 1, padding: '6px', fontFamily: serif, fontSize: 12,
                fontStyle: 'italic', color: C.inkMuted,
                background: C.panel, border: `1px solid ${C.rule}`, borderRadius: 5,
                cursor: 'pointer',
              }}>Set all to zero</button>
              <button onClick={m.home} style={{
                flex: 1, padding: '6px', fontFamily: serif, fontSize: 12,
                fontStyle: 'italic', color: C.inkMuted,
                background: C.panel, border: `1px solid ${C.rule}`, borderRadius: 5,
                cursor: 'pointer',
              }}>Go to origin</button>
            </div>
          </div>

          {/* Section: Jog */}
          <div>
            <div style={{ fontFamily: serif, fontSize: 11, fontStyle: 'italic', color: C.inkMuted, letterSpacing: 0.5, marginBottom: 6 }}>— Manual Jog —</div>
            <div style={{
              padding: 14, background: C.panel, border: `1px solid ${C.rule}`,
              borderRadius: 8, display: 'flex', gap: 14, alignItems: 'center',
              justifyContent: 'center',
              boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.6)',
            }}>
              <div style={{
                display: 'grid', gridTemplateColumns: 'repeat(3, 44px)',
                gridTemplateRows: 'repeat(3, 44px)', gap: 4,
              }}>
                <div />
                <TBtn onClick={() => m.jog('y', 1)} title="Y+">▲</TBtn>
                <div />
                <TBtn onClick={() => m.jog('x', -1)} title="X−">◀</TBtn>
                <TBtn onClick={m.home} variant="accent" title="Home">⌂</TBtn>
                <TBtn onClick={() => m.jog('x', 1)} title="X+">▶</TBtn>
                <div />
                <TBtn onClick={() => m.jog('y', -1)} title="Y−">▼</TBtn>
                <div />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'center' }}>
                <TBtn onClick={() => m.jog('z', 1)} w={44} h={34} title="Z+">Z+</TBtn>
                <div style={{ fontFamily: serif, fontSize: 10, fontStyle: 'italic', color: C.inkFaint }}>up · down</div>
                <TBtn onClick={() => m.jog('z', -1)} w={44} h={34} title="Z−">Z−</TBtn>
              </div>
            </div>
            {/* Step size */}
            <div style={{ marginTop: 10 }}>
              <div style={{ fontFamily: mono, fontSize: 9, color: C.inkFaint, letterSpacing: 0.8, marginBottom: 5 }}>STEP SIZE · {m.units}</div>
              <div style={{ display: 'flex', gap: 4 }}>
                {[0.01, 0.1, 1, 10].map(s => (
                  <button key={s} onClick={() => m.setJogStep(s)} style={{
                    flex: 1, padding: '7px', fontFamily: mono, fontSize: 11, fontWeight: 500,
                    background: m.jogStep === s
                      ? `linear-gradient(180deg, ${C.accent} 0%, #B84A10 100%)` : C.panel,
                    color: m.jogStep === s ? '#fff' : C.ink,
                    border: `1px solid ${m.jogStep === s ? '#9A3D0E' : C.rule}`,
                    borderRadius: 5, cursor: 'pointer',
                    boxShadow: m.jogStep === s
                      ? 'inset 0 1px 0 rgba(255,255,255,0.25)'
                      : 'inset 0 1px 0 rgba(255,255,255,0.6)',
                  }}>{s}</button>
                ))}
              </div>
            </div>
          </div>

          {/* Gauges */}
          <div>
            <div style={{ fontFamily: serif, fontSize: 11, fontStyle: 'italic', color: C.inkMuted, letterSpacing: 0.5, marginBottom: 6 }}>— Overrides —</div>
            <div style={{ display: 'flex', gap: 6 }}>
              <Gauge label="Jog" value={m.jogRate} onChange={m.setJogRate} />
              <Gauge label="Feed" value={m.feedRate} onChange={m.setFeedRate} />
              <Gauge label="Tool" value={m.toolRate} onChange={m.setToolRate} />
            </div>
          </div>
        </div>

        {/* Right — plot + job */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          {/* Tabs */}
          <div style={{
            padding: '10px 20px 0', background: C.panel,
            borderBottom: `1px solid ${C.rule}`,
            display: 'flex', alignItems: 'flex-end', gap: 2, flexShrink: 0,
          }}>
            {tabs.map(t => (
              <button key={t.id} onClick={() => m.setActiveTab(t.id)} style={{
                padding: '8px 16px',
                fontFamily: serif, fontSize: 13,
                fontWeight: m.activeTab === t.id ? 600 : 400,
                fontStyle: m.activeTab === t.id ? 'normal' : 'italic',
                color: m.activeTab === t.id ? C.ink : C.inkMuted,
                background: m.activeTab === t.id ? C.bg : 'transparent',
                border: `1px solid ${m.activeTab === t.id ? C.rule : 'transparent'}`,
                borderBottom: 'none',
                borderRadius: '6px 6px 0 0',
                cursor: 'pointer',
                marginBottom: -1,
              }}>{t.label}</button>
            ))}
            <div style={{ flex: 1 }} />
            <div style={{ paddingBottom: 8, display: 'flex', gap: 4 }}>
              {['Simulate', 'Reset view', 'Restart…'].map(a => (
                <button key={a} style={{
                  padding: '5px 10px', fontFamily: serif, fontStyle: 'italic', fontSize: 11,
                  color: C.inkMuted, background: 'transparent',
                  border: `1px solid ${C.ruleSoft}`, borderRadius: 14, cursor: 'pointer',
                }}>{a}</button>
              ))}
            </div>
          </div>

          {/* Plot + job */}
          <div style={{ flex: 1, display: 'flex', minHeight: 0, padding: 20, gap: 20 }}>
            {/* Plot */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
              <div style={{
                flex: 1, background: C.panel, border: `1px solid ${C.rule}`,
                borderRadius: 8, padding: 12, display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.6), 0 1px 2px rgba(0,0,0,0.04)',
                position: 'relative',
              }}>
                {/* Corner flourishes */}
                <div style={{ position: 'absolute', top: 10, left: 14, fontFamily: serif, fontStyle: 'italic', fontSize: 11, color: C.inkMuted }}>Paper · 300 × 300 mm</div>
                <div style={{ position: 'absolute', top: 10, right: 14, fontFamily: mono, fontSize: 10, color: C.inkFaint }}>F{(m.feedRate * 40).toLocaleString()}</div>
                <PlotView width={420} height={390} progress={progress} headPos={m.pos} theme={{
                  bg: '#FBF7EC', grid: '#E8DFC8', gridMajor: '#D0C4A5',
                  draw: '#C94A2E', move: '#6FA351', border: C.ruleSoft,
                  axis: C.inkMuted, axisText: C.inkFaint, head: C.accent,
                }} />
              </div>
              {/* scrub bar */}
              <div style={{
                marginTop: 10, padding: '10px 14px',
                background: C.panel, border: `1px solid ${C.rule}`, borderRadius: 8,
                display: 'flex', alignItems: 'center', gap: 12,
                boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.6)',
              }}>
                <div style={{ fontFamily: serif, fontStyle: 'italic', fontSize: 11, color: C.inkMuted }}>Scrub</div>
                <div style={{ flex: 1, position: 'relative', height: 18 }}>
                  <div style={{ position: 'absolute', inset: '8px 0', background: C.ruleSoft, borderRadius: 2 }} />
                  <div style={{
                    position: 'absolute', left: 0, top: 8, height: 2,
                    width: `${progress * 100}%`, background: C.accent, borderRadius: 2,
                  }} />
                  <div style={{
                    position: 'absolute', top: 2, left: `calc(${progress * 100}% - 7px)`,
                    width: 14, height: 14, borderRadius: '50%',
                    background: C.panel, border: `2px solid ${C.accent}`,
                    boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
                  }} />
                  <input type="range" min={0} max={100} value={progress * 100}
                    onChange={e => setProgress(+e.target.value / 100)}
                    style={{ position: 'absolute', inset: 0, width: '100%', opacity: 0, cursor: 'pointer', margin: 0 }}
                  />
                </div>
                <div style={{ fontFamily: mono, fontSize: 11, color: C.inkMuted, fontVariantNumeric: 'tabular-nums' }}>
                  Line {Math.floor(14832 * progress).toLocaleString()} / 14,832
                </div>
              </div>
            </div>

            {/* Job card */}
            <div style={{
              width: 240, background: C.panel, border: `1px solid ${C.rule}`, borderRadius: 8,
              padding: 16, display: 'flex', flexDirection: 'column', gap: 14,
              boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.6), 0 1px 2px rgba(0,0,0,0.04)',
            }}>
              <div>
                <div style={{ fontFamily: serif, fontStyle: 'italic', fontSize: 12, color: C.inkMuted, marginBottom: 4 }}>Progress</div>
                <div style={{
                  fontFamily: serif, fontSize: 40, fontWeight: 600,
                  color: C.ink, letterSpacing: -1,
                  fontVariantNumeric: 'tabular-nums', lineHeight: 1,
                }}>
                  {(progress * 100).toFixed(0)}<span style={{ fontSize: 20, color: C.inkFaint, fontStyle: 'italic', fontWeight: 400 }}>%</span>
                </div>
                <div style={{
                  marginTop: 8, height: 8, background: C.bgDeep, borderRadius: 4,
                  overflow: 'hidden', border: `1px solid ${C.rule}`,
                  boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.1)',
                }}>
                  <div style={{
                    height: '100%', width: `${progress * 100}%`,
                    background: `linear-gradient(90deg, ${C.accent}, ${C.brass})`,
                  }} />
                </div>
              </div>

              <div style={{ borderTop: `1px dashed ${C.rule}`, paddingTop: 12, display: 'flex', flexDirection: 'column', gap: 6 }}>
                {[
                  { k: 'Elapsed', v: `00:19:${String(Math.floor(progress * 60)).padStart(2, '0')}` },
                  { k: 'Remaining', v: `00:${String(Math.floor((1 - progress) * 42)).padStart(2, '0')}:12` },
                  { k: 'Feed', v: `${(m.feedRate * 40).toLocaleString()} mm/min` },
                  { k: 'Travel', v: `${(progress * 847).toFixed(0)} mm` },
                ].map(r => (
                  <div key={r.k} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', fontSize: 12 }}>
                    <span style={{ fontFamily: serif, fontStyle: 'italic', color: C.inkMuted }}>{r.k}</span>
                    <span style={{ fontFamily: mono, color: C.ink, fontVariantNumeric: 'tabular-nums' }}>{r.v}</span>
                  </div>
                ))}
              </div>

              <div style={{ display: 'flex', gap: 6, marginTop: 'auto' }}>
                <button onClick={() => m.setRunning(r => !r)} style={{
                  flex: 1, padding: '12px', fontFamily: serif, fontSize: 15, fontWeight: 600,
                  background: m.running
                    ? `linear-gradient(180deg, ${C.panel}, ${C.panelAlt})`
                    : `linear-gradient(180deg, ${C.accent}, #B84A10)`,
                  color: m.running ? C.ink : '#fff',
                  border: `1px solid ${m.running ? C.rule : '#9A3D0E'}`,
                  borderTop: `1px solid ${m.running ? '#fff' : '#E87A3C'}`,
                  borderRadius: 6, cursor: 'pointer',
                  boxShadow: m.running
                    ? 'inset 0 1px 0 rgba(255,255,255,0.6)'
                    : 'inset 0 1px 0 rgba(255,255,255,0.3), 0 2px 4px rgba(210,88,28,0.25)',
                }}>{m.running ? '⏸ Pause' : '▶ Begin'}</button>
                <button style={{
                  padding: '12px 14px', fontFamily: serif, fontSize: 15,
                  background: C.panel, color: C.bad,
                  border: `1px solid ${C.rule}`, borderRadius: 6, cursor: 'pointer',
                  boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.6)',
                }}>■</button>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div style={{
            padding: '6px 20px', borderTop: `1px solid ${C.rule}`,
            background: C.panelAlt, display: 'flex', gap: 20,
            fontFamily: mono, fontSize: 10, color: C.inkMuted, flexShrink: 0,
          }}>
            <span>Port: {m.connected ? '/dev/ttyUSB0' : '—'}</span>
            <span>Baud: 115200</span>
            <span>Controller: {m.connected ? 'GRBL 1.1h · Idle' : 'Pending'}</span>
            <div style={{ flex: 1 }} />
            <span style={{ fontFamily: serif, fontStyle: 'italic' }}>Queue: empty</span>
          </div>
        </div>
      </div>
    </div>
  );
}

window.WorkbenchDirection = WorkbenchDirection;
