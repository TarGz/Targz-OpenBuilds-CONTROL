// Direction A — "Studio"
// Clean, airy, light-mode. Linear/Figma polish. Generous whitespace,
// strong hierarchy, monospace numerics, warm off-white background.

function StudioDirection() {
  const m = useMachine();
  const [progress, setProgress] = React.useState(0.45);

  // Animate progress when "running"
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

  // Warm off-white theme matching the original screenshot
  const C = {
    bg: '#FAF8F4',
    surface: '#FFFFFF',
    surfaceAlt: '#F4F1EC',
    border: '#E8E3DB',
    borderStrong: '#D5CEC1',
    text: '#1A1613',
    textMuted: '#6B635A',
    textFaint: '#9A9288',
    accent: '#EA580C',      // orange, matches your theme
    accentSoft: '#FED7AA',
    accentText: '#9A3412',
    axisX: '#DC2626',
    axisY: '#16A34A',
    axisZ: '#2563EB',
    good: '#16A34A',
    bad: '#DC2626',
  };

  const sans = '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif';
  const mono = '"JetBrains Mono", ui-monospace, "SF Mono", Menlo, monospace';

  const tabs = [
    { id: '3d', label: '3D View' },
    { id: 'log', label: 'Log / Console' },
    { id: 'macros', label: 'Macros' },
    { id: 'gcode', label: 'G-code' },
  ];

  const JogBtn = ({ axis, dir, children, small }) => (
    <button
      onClick={() => m.jog(axis, dir)}
      style={{
        width: small ? 34 : 42, height: small ? 34 : 42,
        border: `1px solid ${C.border}`,
        background: C.surface,
        borderRadius: 8,
        color: C.text,
        fontFamily: sans, fontSize: 13, fontWeight: 500,
        cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        transition: 'all 0.12s',
      }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = C.accent; e.currentTarget.style.color = C.accent; }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.color = C.text; }}
    >{children}</button>
  );

  const AxisRow = ({ axis, color }) => (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10,
      padding: '10px 12px',
      borderBottom: `1px solid ${C.border}`,
    }}>
      <div style={{
        width: 22, height: 22, borderRadius: 6,
        background: C.surfaceAlt,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: mono, fontSize: 11, fontWeight: 600,
        color,
      }}>{axis.toUpperCase()}</div>
      <div style={{
        flex: 1, fontFamily: mono, fontSize: 18, fontWeight: 500,
        color: C.text, letterSpacing: -0.3,
        fontVariantNumeric: 'tabular-nums',
      }}>{m.pos[axis].toFixed(3)}</div>
      <div style={{ fontFamily: mono, fontSize: 10, color: C.textFaint }}>{m.units}</div>
      <button onClick={() => m.zero(axis)} style={{
        padding: '4px 8px', fontSize: 10, fontFamily: sans, fontWeight: 500,
        background: 'transparent', border: `1px solid ${C.border}`,
        borderRadius: 5, color: C.textMuted, cursor: 'pointer',
      }}>set 0</button>
    </div>
  );

  const OverrideSlider = ({ label, value, onChange, unit }) => (
    <div style={{
      background: C.surface, border: `1px solid ${C.border}`,
      borderRadius: 8, padding: '8px 12px',
      display: 'flex', alignItems: 'center', gap: 10,
    }}>
      <div style={{ fontSize: 10, color: C.textMuted, textTransform: 'uppercase', letterSpacing: 0.8, fontWeight: 500, width: 52, flexShrink: 0 }}>{label}</div>
      <div style={{ position: 'relative', height: 16, flex: 1, display: 'flex', alignItems: 'center' }}>
        <div style={{ position: 'absolute', inset: '7px 0', background: C.surfaceAlt, borderRadius: 2 }} />
        <div style={{
          position: 'absolute', left: 0, height: 2, top: 7,
          width: `${(value / 200) * 100}%`,
          background: C.accent, borderRadius: 2,
        }} />
        <div style={{
          position: 'absolute', left: `calc(${(value / 200) * 100}% - 7px)`,
          width: 14, height: 14, background: C.surface,
          border: `2px solid ${C.accent}`, borderRadius: '50%',
        }} />
        <input type="range" min={0} max={200} step={1}
          value={value} onChange={e => onChange(+e.target.value)}
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer', margin: 0 }}
        />
      </div>
      <div style={{ fontFamily: mono, fontSize: 12, fontWeight: 500, color: C.text, fontVariantNumeric: 'tabular-nums', width: 42, textAlign: 'right', flexShrink: 0 }}>
        {value}<span style={{ fontSize: 9, color: C.textFaint }}>{unit}</span>
      </div>
    </div>
  );

  return (
    <div style={{
      width: '100%', height: '100%',
      background: C.bg, color: C.text,
      fontFamily: sans, fontSize: 13,
      display: 'flex', flexDirection: 'column',
      overflow: 'hidden',
    }}>
      {/* ─── Top bar ─── */}
      <div style={{
        height: 52, background: C.surface, borderBottom: `1px solid ${C.border}`,
        display: 'flex', alignItems: 'center', padding: '0 20px', gap: 24, flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 26, height: 26, borderRadius: 7, background: C.accent,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#fff', fontWeight: 700, fontSize: 13, fontFamily: mono,
          }}>P</div>
          <div style={{ fontWeight: 600, fontSize: 14 }}>PenPlotter<span style={{ color: C.textMuted, fontWeight: 400 }}>/Control</span></div>
        </div>
        <div style={{ width: 1, height: 20, background: C.border }} />
        <div style={{ display: 'flex', gap: 2 }}>
          {['Machine Control', 'Troubleshooting'].map((t, i) => (
            <div key={t} style={{
              padding: '6px 12px', fontSize: 13, fontWeight: 500,
              borderRadius: 6, cursor: 'pointer',
              background: i === 0 ? C.accentSoft : 'transparent',
              color: i === 0 ? C.accentText : C.textMuted,
            }}>{t}</div>
          ))}
        </div>
        <div style={{ flex: 1 }} />
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          fontSize: 12, color: C.textMuted,
        }}>
          <div style={{
            width: 7, height: 7, borderRadius: '50%',
            background: m.connected ? C.good : C.textFaint,
            boxShadow: m.connected ? `0 0 0 3px ${C.good}22` : 'none',
          }} />
          <span style={{ fontFamily: mono, fontSize: 11 }}>
            {m.connected ? 'CONNECTED · /dev/ttyUSB0' : 'NOT CONNECTED'}
          </span>
        </div>
        <button onClick={() => m.setConnected(c => !c)} style={{
          padding: '6px 14px', fontSize: 12, fontWeight: 600,
          background: m.connected ? C.surfaceAlt : C.accent,
          color: m.connected ? C.text : '#fff',
          border: 'none', borderRadius: 6, cursor: 'pointer',
        }}>{m.connected ? 'Disconnect' : 'Connect'}</button>
      </div>

      {/* ─── Main split ─── */}
      <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>
        {/* Left column */}
        <div style={{
          width: 320, background: C.surface, borderRight: `1px solid ${C.border}`,
          display: 'flex', flexDirection: 'column', overflow: 'hidden',
        }}>
          {/* File section */}
          <div style={{ padding: '16px 16px 14px', borderBottom: `1px solid ${C.border}` }}>
            <div style={{ fontSize: 10, color: C.textFaint, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8, fontWeight: 500 }}>Active File</div>
            <div style={{
              padding: '10px 12px', background: C.surfaceAlt, borderRadius: 8,
              display: 'flex', alignItems: 'center', gap: 10,
            }}>
              <div style={{ fontSize: 16 }}>📄</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>hatched_flower_v3.gcode</div>
                <div style={{ fontSize: 10, color: C.textFaint, fontFamily: mono }}>14,832 lines · 42 min est.</div>
              </div>
            </div>
          </div>

          {/* Position */}
          <div style={{ borderBottom: `1px solid ${C.border}` }}>
            <div style={{
              padding: '12px 16px 8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
              <div style={{ fontSize: 10, color: C.textFaint, textTransform: 'uppercase', letterSpacing: 1, fontWeight: 500 }}>Position</div>
              <div style={{ display: 'flex', gap: 2, padding: 2, background: C.surfaceAlt, borderRadius: 6 }}>
                {['mm', 'inch'].map(u => (
                  <button key={u} onClick={() => m.setUnits(u)} style={{
                    padding: '3px 8px', fontSize: 10, fontWeight: 500,
                    background: m.units === u ? C.surface : 'transparent',
                    color: m.units === u ? C.text : C.textMuted,
                    border: 'none', borderRadius: 4, cursor: 'pointer',
                    boxShadow: m.units === u ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
                  }}>{u}</button>
                ))}
              </div>
            </div>
            <AxisRow axis="x" color={C.axisX} />
            <AxisRow axis="y" color={C.axisY} />
            <AxisRow axis="z" color={C.axisZ} />
            <div style={{ padding: '10px 12px', display: 'flex', gap: 6 }}>
              <button onClick={m.zeroAll} style={{
                flex: 1, padding: '8px', fontSize: 11, fontWeight: 500,
                background: C.surfaceAlt, border: `1px solid ${C.border}`,
                borderRadius: 6, color: C.text, cursor: 'pointer', fontFamily: sans,
              }}>Set all zero</button>
              <button onClick={m.home} style={{
                flex: 1, padding: '8px', fontSize: 11, fontWeight: 500,
                background: C.surfaceAlt, border: `1px solid ${C.border}`,
                borderRadius: 6, color: C.text, cursor: 'pointer', fontFamily: sans,
              }}>Go to 0,0,0</button>
            </div>
          </div>

          {/* Jog */}
          <div style={{ padding: '14px 16px', borderBottom: `1px solid ${C.border}` }}>
            <div style={{ fontSize: 10, color: C.textFaint, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12, fontWeight: 500 }}>Jog</div>
            <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
              {/* XY pad */}
              <div style={{
                display: 'grid', gridTemplateColumns: 'repeat(3, 42px)', gridTemplateRows: 'repeat(3, 42px)',
                gap: 4,
              }}>
                <div />
                <JogBtn axis="y" dir={1}>↑</JogBtn>
                <div />
                <JogBtn axis="x" dir={-1}>←</JogBtn>
                <button onClick={m.home} style={{
                  background: C.accentSoft, border: `1px solid ${C.accent}`,
                  borderRadius: 8, color: C.accent, fontSize: 14, cursor: 'pointer',
                  fontFamily: sans, fontWeight: 600,
                }}>⌂</button>
                <JogBtn axis="x" dir={1}>→</JogBtn>
                <div />
                <JogBtn axis="y" dir={-1}>↓</JogBtn>
                <div />
              </div>
              {/* Z column */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'center' }}>
                <JogBtn axis="z" dir={1}>Z+</JogBtn>
                <div style={{ fontSize: 10, color: C.textFaint, fontFamily: mono }}>Z</div>
                <JogBtn axis="z" dir={-1}>Z−</JogBtn>
              </div>
            </div>
            {/* Step size */}
            <div style={{ marginTop: 14 }}>
              <div style={{ fontSize: 10, color: C.textFaint, marginBottom: 6, fontFamily: mono }}>STEP SIZE ({m.units})</div>
              <div style={{ display: 'flex', gap: 4 }}>
                {[0.01, 0.1, 1, 10].map(s => (
                  <button key={s} onClick={() => m.setJogStep(s)} style={{
                    flex: 1, padding: '6px', fontSize: 11, fontFamily: mono, fontWeight: 500,
                    background: m.jogStep === s ? C.text : C.surface,
                    color: m.jogStep === s ? C.surface : C.text,
                    border: `1px solid ${m.jogStep === s ? C.text : C.border}`,
                    borderRadius: 6, cursor: 'pointer',
                  }}>{s}</button>
                ))}
              </div>
            </div>
          </div>

          {/* Overrides */}
          <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
            <OverrideSlider label="Jog Rate" value={m.jogRate} onChange={m.setJogRate} unit="%" />
            <OverrideSlider label="Feed Rate" value={m.feedRate} onChange={m.setFeedRate} unit="%" />
            <OverrideSlider label="Tool Power" value={m.toolRate} onChange={m.setToolRate} unit="%" />
          </div>
        </div>

        {/* Right column — preview */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          {/* Tabs */}
          <div style={{
            height: 44, borderBottom: `1px solid ${C.border}`, background: C.surface,
            display: 'flex', alignItems: 'center', padding: '0 16px', gap: 4, flexShrink: 0,
          }}>
            {tabs.map(t => (
              <button key={t.id} onClick={() => m.setActiveTab(t.id)} style={{
                padding: '6px 12px', fontSize: 13, fontWeight: 500,
                background: m.activeTab === t.id ? C.surfaceAlt : 'transparent',
                color: m.activeTab === t.id ? C.text : C.textMuted,
                border: 'none', borderRadius: 6, cursor: 'pointer', fontFamily: sans,
              }}>{t.label}</button>
            ))}
            <div style={{ flex: 1 }} />
            <div style={{ display: 'flex', gap: 4 }}>
              {['1×', '2×', '4×'].map(z => (
                <button key={z} style={{
                  padding: '4px 8px', fontSize: 11, fontFamily: mono, fontWeight: 500,
                  background: z === '1×' ? C.surfaceAlt : 'transparent',
                  color: C.textMuted, border: `1px solid ${C.border}`,
                  borderRadius: 5, cursor: 'pointer',
                }}>{z}</button>
              ))}
            </div>
          </div>

          {/* Plot + right rail */}
          <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>
            <div style={{
              flex: 1, padding: 16, display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: C.bg, minWidth: 0,
            }}>
              <div style={{
                background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10,
                padding: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
              }}>
                <PlotView width={380} height={360} progress={progress} headPos={m.pos} theme={{
                  bg: C.surface, grid: '#F0ECE4', gridMajor: '#E0D8CA',
                  draw: '#E85D3A', move: '#4BB568', border: C.border,
                  axis: C.textMuted, axisText: C.textFaint, head: '#F59E0B',
                }} />
              </div>
            </div>

            {/* Right rail — run control */}
            <div style={{
              width: 260, borderLeft: `1px solid ${C.border}`,
              background: C.surface, padding: 16,
              display: 'flex', flexDirection: 'column', gap: 14,
            }}>
              <div>
                <div style={{ fontSize: 10, color: C.textFaint, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10, fontWeight: 500 }}>Job Progress</div>
                <div style={{
                  fontFamily: mono, fontSize: 24, fontWeight: 500,
                  fontVariantNumeric: 'tabular-nums', letterSpacing: -0.5,
                }}>{(progress * 100).toFixed(1)}<span style={{ fontSize: 13, color: C.textFaint }}>%</span></div>
                <div style={{
                  height: 4, background: C.surfaceAlt, borderRadius: 2,
                  marginTop: 8, overflow: 'hidden',
                }}>
                  <div style={{
                    height: '100%', width: `${progress * 100}%`,
                    background: C.accent, transition: 'width 0.2s',
                  }} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, fontFamily: mono, fontSize: 10, color: C.textFaint }}>
                  <span>Line {Math.floor(14832 * progress).toLocaleString()}</span>
                  <span>of 14,832</span>
                </div>
              </div>

              <div style={{
                padding: 12, background: C.surfaceAlt, borderRadius: 8,
                fontFamily: mono, fontSize: 11, color: C.textMuted,
                lineHeight: 1.6,
              }}>
                <div>G1 X{(150 + m.pos.x).toFixed(4)} Y{(150 + m.pos.y).toFixed(4)}</div>
                <div>F4000 <span style={{ color: C.textFaint }}>; draw</span></div>
              </div>

              <div style={{ display: 'flex', gap: 6 }}>
                <button onClick={() => m.setRunning(r => !r)} style={{
                  flex: 1, padding: '10px', fontSize: 13, fontWeight: 600,
                  background: m.running ? C.surfaceAlt : C.accent,
                  color: m.running ? C.text : '#fff',
                  border: m.running ? `1px solid ${C.border}` : 'none',
                  borderRadius: 8, cursor: 'pointer', fontFamily: sans,
                }}>{m.running ? '⏸ Pause' : '▶ Start'}</button>
                <button style={{
                  padding: '10px 12px', fontSize: 13, fontWeight: 500,
                  background: C.surface, color: C.text,
                  border: `1px solid ${C.border}`,
                  borderRadius: 8, cursor: 'pointer', fontFamily: sans,
                }}>⏹</button>
              </div>

              <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 14 }}>
                <div style={{ fontSize: 10, color: C.textFaint, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10, fontWeight: 500 }}>Timing</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 6 }}>
                  <span style={{ color: C.textMuted }}>Elapsed</span>
                  <span style={{ fontFamily: mono, fontVariantNumeric: 'tabular-nums' }}>00:19:{String(Math.floor(progress * 60)).padStart(2, '0')}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 6 }}>
                  <span style={{ color: C.textMuted }}>Remaining</span>
                  <span style={{ fontFamily: mono, fontVariantNumeric: 'tabular-nums' }}>00:{String(Math.floor((1 - progress) * 42)).padStart(2, '0')}:12</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                  <span style={{ color: C.textMuted }}>Feed</span>
                  <span style={{ fontFamily: mono, fontVariantNumeric: 'tabular-nums' }}>{(m.feedRate * 40).toLocaleString()} mm/min</span>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div style={{
            height: 28, borderTop: `1px solid ${C.border}`, background: C.surface,
            display: 'flex', alignItems: 'center', padding: '0 16px', gap: 16,
            fontFamily: mono, fontSize: 10, color: C.textMuted, flexShrink: 0,
          }}>
            <span>Port: {m.connected ? '/dev/ttyUSB0' : '—'}</span>
            <span>Baud: 115200</span>
            <span>Controller: {m.connected ? 'GRBL 1.1h · IDLE' : 'Pending'}</span>
            <div style={{ flex: 1 }} />
            <span>Queue: 0</span>
          </div>
        </div>
      </div>
    </div>
  );
}

window.StudioDirection = StudioDirection;
