// Direction B — "Command Deck" (notre UX, avec état complet)
// États: disconnected → idle → running → paused → alarm
// Actions distribuées dans notre layout, pas dans une toolbar copiée.

function CommandDeckDirection() {
  const m = useMachine();
  const [progress, setProgress] = React.useState(0);
  const [showAbortConfirm, setShowAbortConfirm] = React.useState(false);
  const [scrubbing, setScrubbing] = React.useState(false);
  const [scrubProgress, setScrubProgress] = React.useState(0);
  const [manualScrub, setManualScrub] = React.useState(false);

  // Animate progress + live position while running (not paused)
  React.useEffect(() => {
    if (!m.running || m.paused) return;
    const id = setInterval(() => {
      setProgress(p => {
        const next = Math.min(1, p + 0.0015);
        if (next >= 1) { m.setRunning(false); m.setPaused(false); }
        const angle = next * Math.PI * 8;
        m.setPos(pp => ({ ...pp, x: +(Math.cos(angle) * 40 + (next - 0.5) * 20).toFixed(2), y: +(Math.sin(angle) * 40).toFixed(2) }));
        return next;
      });
    }, 40);
    return () => clearInterval(id);
  }, [m.running, m.paused]);

  // Light palette — FFFAF4 base, orange accents
  const C = {
    bg: '#FFFAF4',
    panel: '#FFFFFF',
    panelAlt: '#F7F1E8',
    panelHi: '#F0E8D8',
    border: '#EADFCB',
    borderStrong: '#D4C6A8',
    text: '#1F1A12',
    textMuted: '#7A6F5B',
    textFaint: '#A89E87',
    accent: '#EA580C',
    accentHi: '#F97316',
    accentDim: '#FED7AA',
    accentSoft: '#FFEEDD',
    axisX: '#DC2626',
    axisY: '#16A34A',
    axisZ: '#2563EB',
    good: '#16A34A',
    bad: '#DC2626',
    amber: '#D97706',
  };

  const sans = '"Inter", -apple-system, system-ui, sans-serif';
  const mono = '"JetBrains Mono", ui-monospace, "SF Mono", Menlo, monospace';

  const disabled = !m.connected;
  const running = m.running;
  const paused = m.paused;
  const canJog = m.connected && !m.running && !m.alarm;
  const canRunJob = m.connected && m.fileLoaded && !m.running && !m.alarm;

  // ─── Tiny reusable pieces ───
  const JogBtn = ({ axis, dir, children, disabled: dd }) => (
    <button onClick={dd ? undefined : () => m.jog(axis, dir)} disabled={dd} style={{
      width: 40, height: 40,
      border: `1px solid ${C.border}`,
      background: dd ? C.panelAlt : C.panel,
      color: dd ? C.textFaint : axis === 'x' ? C.axisX : axis === 'y' ? C.axisY : C.axisZ,
      fontFamily: mono, fontSize: 12, fontWeight: 600,
      cursor: dd ? 'not-allowed' : 'pointer',
      opacity: dd ? 0.45 : 1,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      borderRadius: 3,
    }}
    onMouseEnter={e => { if (!dd) { e.currentTarget.style.borderColor = C.accent; e.currentTarget.style.background = C.accentSoft; } }}
    onMouseLeave={e => { if (!dd) { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.background = C.panel; } }}
    >{children}</button>
  );

  const AxisReadout = ({ axis, color }) => (
    <div style={{
      flex: 1, padding: '8px 12px',
      borderRight: `1px solid ${C.border}`,
      display: 'flex', flexDirection: 'column', gap: 1,
      position: 'relative', opacity: disabled ? 0.5 : 1,
    }}>
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: -1, height: 2, background: color }} />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontFamily: mono, fontSize: 10, fontWeight: 700, color, letterSpacing: 1 }}>{axis.toUpperCase()}</span>
        <button onClick={() => m.zero(axis)} disabled={disabled} style={{
          fontSize: 8, padding: '2px 5px', fontFamily: mono, fontWeight: 500,
          background: 'transparent', border: `1px solid ${C.border}`,
          color: C.textMuted, cursor: disabled ? 'not-allowed' : 'pointer', letterSpacing: 0.5,
          borderRadius: 2,
        }}>SET 0</button>
      </div>
      <div style={{
        fontFamily: mono, fontSize: 22, fontWeight: 500,
        color: disabled ? C.textFaint : color, letterSpacing: -0.5,
        fontVariantNumeric: 'tabular-nums',
      }}>{m.pos[axis].toFixed(3)}</div>
      <div style={{ fontFamily: mono, fontSize: 9, color: C.textFaint }}>
        WCS G54 · {m.units}
      </div>
    </div>
  );

  const VSlider = ({ label, value, onChange, color, disabled: dd }) => (
    <div style={{
      background: C.panel, border: `1px solid ${C.border}`,
      padding: '8px 6px 10px', borderRadius: 4,
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
      width: 64, flexShrink: 0, opacity: dd ? 0.55 : 1,
    }}>
      <div style={{ fontFamily: mono, fontSize: 8.5, color: C.textMuted, letterSpacing: 1, fontWeight: 600 }}>{label}</div>
      <div style={{ position: 'relative', height: 96, width: 24, display: 'flex', justifyContent: 'center' }}>
        <div style={{ position: 'absolute', top: 0, bottom: 0, width: 2, background: C.panelHi }} />
        {[0, 50, 100, 150, 200].map(t => (
          <div key={t} style={{
            position: 'absolute', left: 8,
            top: `${(1 - t / 200) * 100}%`, width: 8, height: 1,
            background: C.borderStrong,
          }} />
        ))}
        <div style={{
          position: 'absolute', left: 0, right: 0,
          top: '50%', height: 1, background: color, opacity: 0.3,
        }} />
        <div style={{
          position: 'absolute', width: 4, left: 10,
          top: value >= 100 ? `${(1 - value / 200) * 100}%` : '50%',
          bottom: value >= 100 ? '50%' : `${(value / 200) * 100}%`,
          background: color,
        }} />
        <div style={{
          position: 'absolute', top: `calc(${(1 - value / 200) * 100}% - 4px)`,
          left: 2, width: 20, height: 8,
          background: '#fff', border: `1px solid ${color}`,
          borderRadius: 2,
        }} />
        {!dd && (
          <input type="range" min={0} max={200} value={value}
            onChange={e => onChange(+e.target.value)}
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0, cursor: 'ns-resize', margin: 0 }}
          />
        )}
      </div>
      <div style={{
        fontFamily: mono, fontSize: 11, color: C.text, fontWeight: 600,
        fontVariantNumeric: 'tabular-nums',
      }}>{value}<span style={{ color: C.textFaint, fontSize: 8 }}>%</span></div>
      <button onClick={() => !dd && onChange(100)} disabled={dd} style={{
        fontFamily: mono, fontSize: 7.5, padding: '1px 4px', letterSpacing: 0.5,
        background: 'transparent', border: `1px solid ${C.border}`,
        color: C.textMuted, cursor: dd ? 'not-allowed' : 'pointer', borderRadius: 2,
      }}>RESET</button>
    </div>
  );

  const elapsed = progress * 32;
  const total = 32;
  const fmtTime = (min) => `${String(Math.floor(min / 60)).padStart(2, '0')}h:${String(Math.floor(min % 60)).padStart(2, '0')}m`;
  const liveFeed = running && !paused ? Math.round(39 * m.feedRate / 100) : 0;

  return (
    <div style={{
      width: '100%', height: '100%',
      background: C.bg, color: C.text,
      fontFamily: sans, fontSize: 12,
      display: 'flex', flexDirection: 'column',
      overflow: 'hidden', position: 'relative',
    }}>
      {/* ─── Top bar — notre design ─── */}
      <div style={{
        height: 40, background: C.panel, borderBottom: `1px solid ${C.border}`,
        display: 'flex', alignItems: 'stretch', flexShrink: 0,
      }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8, padding: '0 14px',
          borderRight: `1px solid ${C.border}`,
        }}>
          <div style={{
            width: 18, height: 18, background: C.accent,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#fff', fontWeight: 800, fontSize: 11, fontFamily: mono,
          }}>P</div>
          <div style={{ fontWeight: 600, fontSize: 12, letterSpacing: 0.3 }}>
            PENPLOTTER<span style={{ color: C.textMuted }}> · CONTROL</span>
          </div>
        </div>
        <div style={{ display: 'flex' }}>
          {['MACHINE CONTROL', 'TROUBLESHOOTING'].map((t, i) => (
            <div key={t} style={{
              padding: '0 16px', display: 'flex', alignItems: 'center',
              fontSize: 11, fontFamily: mono, fontWeight: 500, letterSpacing: 1,
              color: i === 0 ? C.accent : C.textMuted,
              borderRight: `1px solid ${C.border}`,
              borderBottom: i === 0 ? `2px solid ${C.accent}` : '2px solid transparent',
              cursor: 'pointer',
            }}>{t}</div>
          ))}
        </div>

        {/* Current file (discret, au centre) */}
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', padding: '0 16px', overflow: 'hidden', gap: 10 }}>
          {m.fileLoaded && (
            <>
              <span style={{ fontFamily: mono, fontSize: 10, color: C.textFaint, letterSpacing: 0.8 }}>FILE</span>
              <span style={{ fontFamily: mono, fontSize: 11, color: C.text, fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                hatched_flower_spiral_v3.gcode
              </span>
              <button onClick={() => { if (!running) { m.setFileLoaded(false); setProgress(0); }}} disabled={running} style={{
                fontSize: 9, fontFamily: mono, padding: '2px 6px',
                background: 'transparent', border: `1px solid ${C.border}`, color: C.textMuted,
                cursor: running ? 'not-allowed' : 'pointer', borderRadius: 2, opacity: running ? 0.4 : 1,
              }}>UNLOAD</button>
            </>
          )}
          {!m.fileLoaded && (
            <button onClick={() => m.setFileLoaded(true)} disabled={!m.connected} style={{
              fontSize: 10, fontFamily: mono, padding: '4px 10px', letterSpacing: 0.5, fontWeight: 600,
              background: 'transparent', border: `1px dashed ${C.borderStrong}`, color: m.connected ? C.accent : C.textFaint,
              cursor: m.connected ? 'pointer' : 'not-allowed', borderRadius: 3,
            }}>+ OPEN G-CODE</button>
          )}
        </div>

        <div style={{
          display: 'flex', alignItems: 'center', gap: 16, padding: '0 14px',
          borderLeft: `1px solid ${C.border}`,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontFamily: mono, fontSize: 10 }}>
            <div style={{
              width: 6, height: 6, borderRadius: '50%',
              background: m.connected ? C.good : C.textFaint,
              boxShadow: m.connected ? `0 0 6px ${C.good}` : 'none',
            }} />
            <span style={{ color: m.connected ? C.good : C.textMuted, letterSpacing: 0.8 }}>
              {m.connected ? 'LINK · /dev/ttyUSB0' : 'OFFLINE'}
            </span>
          </div>
          <button onClick={() => {
            if (m.connected) { m.setConnected(false); m.setRunning(false); m.setPaused(false); m.setFileLoaded(false); m.setAlarm(false); }
            else m.setConnected(true);
          }} style={{
            padding: '5px 14px', fontSize: 10, fontFamily: mono, fontWeight: 600, letterSpacing: 1,
            background: m.connected ? 'transparent' : C.accent,
            color: m.connected ? C.textMuted : '#fff',
            border: `1px solid ${m.connected ? C.border : C.accent}`,
            cursor: 'pointer', borderRadius: 3,
          }}>{m.connected ? 'DISCONNECT' : 'CONNECT'}</button>
        </div>
      </div>

      {/* ─── Alarm banner ─── */}
      {m.alarm && (
        <div style={{
          background: '#FEE2E2', borderBottom: `1px solid ${C.bad}`, color: C.bad,
          padding: '6px 14px', display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0,
        }}>
          <span style={{ fontFamily: mono, fontSize: 11, fontWeight: 700, letterSpacing: 1 }}>⚠ ALARM</span>
          <span style={{ fontSize: 11 }}>Controller halted. Check limits and clear before resuming.</span>
          <div style={{ flex: 1 }} />
          <button onClick={() => m.setAlarm(false)} style={{
            padding: '3px 10px', fontSize: 10, fontFamily: mono, fontWeight: 700, letterSpacing: 0.8,
            background: C.bad, color: '#fff', border: 'none', cursor: 'pointer', borderRadius: 3,
          }}>UNLOCK ALARM</button>
        </div>
      )}

      {/* ─── Position strip ─── */}
      <div style={{
        display: 'flex', background: C.panel,
        borderBottom: `1px solid ${C.border}`, flexShrink: 0,
      }}>
        <AxisReadout axis="x" color={C.axisX} />
        <AxisReadout axis="y" color={C.axisY} />
        <AxisReadout axis="z" color={C.axisZ} />
        <div style={{
          width: 180, padding: '8px 12px',
          display: 'flex', flexDirection: 'column', gap: 2,
          opacity: disabled ? 0.5 : 1,
        }}>
          <div style={{ fontFamily: mono, fontSize: 9, color: C.textMuted, letterSpacing: 1, fontWeight: 600 }}>
            FEED{running && !paused ? ' · LIVE' : ''}
          </div>
          <div style={{
            fontFamily: mono, fontSize: 20, color: running && !paused ? C.accent : C.text,
            fontVariantNumeric: 'tabular-nums', fontWeight: 500,
          }}>
            {liveFeed || (m.feedRate * 40)}
            <span style={{ fontSize: 9, color: C.textFaint, marginLeft: 4 }}>mm/min</span>
          </div>
          <div style={{ display: 'flex', gap: 10, fontFamily: mono, fontSize: 9, color: C.textFaint }}>
            <span>TOOL: {m.toolOn ? 'ON' : 'OFF'} · {m.toolRate}%</span>
            <span>JOG: {m.jogRate}%</span>
          </div>
        </div>
      </div>

      {/* ─── Main ─── */}
      <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>
        {/* Left — jog + overrides */}
        <div style={{
          width: 260, flexShrink: 0, background: C.panel,
          borderRight: `1px solid ${C.border}`,
          display: 'flex', flexDirection: 'column', overflow: 'hidden',
        }}>
          {/* Jog */}
          <div style={{ padding: 14, borderBottom: `1px solid ${C.border}`, opacity: canJog ? 1 : 0.55 }}>
            <div style={{
              fontFamily: mono, fontSize: 10, color: C.accent, letterSpacing: 1.5,
              marginBottom: 10, fontWeight: 600,
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ width: 4, height: 4, background: C.accent }} /> JOG CONTROL
              </span>
              {!canJog && (
                <span style={{ color: C.textFaint, fontSize: 8.5, letterSpacing: 0.5 }}>
                  {!m.connected ? 'OFFLINE' : m.alarm ? 'ALARM' : 'RUNNING'}
                </span>
              )}
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', justifyContent: 'center' }}>
              <div style={{
                display: 'grid', gridTemplateColumns: 'repeat(3, 40px)', gridTemplateRows: 'repeat(3, 40px)',
                gap: 2,
              }}>
                <div />
                <JogBtn axis="y" dir={1} disabled={!canJog}>Y+</JogBtn>
                <div />
                <JogBtn axis="x" dir={-1} disabled={!canJog}>X−</JogBtn>
                <button onClick={canJog ? m.home : undefined} disabled={!canJog}
                  title="Home All"
                  style={{
                  background: canJog ? C.accentSoft : C.panelAlt,
                  border: `1px solid ${canJog ? C.accent : C.border}`,
                  color: canJog ? C.accent : C.textFaint, fontSize: 10,
                  fontFamily: mono, fontWeight: 700,
                  cursor: canJog ? 'pointer' : 'not-allowed', letterSpacing: 1, borderRadius: 3,
                }}>HOME</button>
                <JogBtn axis="x" dir={1} disabled={!canJog}>X+</JogBtn>
                <div />
                <JogBtn axis="y" dir={-1} disabled={!canJog}>Y−</JogBtn>
                <div />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <JogBtn axis="z" dir={1} disabled={!canJog}>Z+</JogBtn>
                <div style={{
                  width: 40, height: 20, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontFamily: mono, fontSize: 9, color: C.textFaint, letterSpacing: 1,
                }}>Z</div>
                <JogBtn axis="z" dir={-1} disabled={!canJog}>Z−</JogBtn>
              </div>
            </div>

            {/* Step + mode */}
            <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div>
                <div style={{ fontFamily: mono, fontSize: 9, color: C.textMuted, letterSpacing: 1, marginBottom: 5, fontWeight: 600 }}>STEP ({m.units})</div>
                <div style={{ display: 'flex', gap: 2 }}>
                  {[0.01, 0.1, 1, 10].map(s => (
                    <button key={s} onClick={() => m.setJogStep(s)} disabled={!canJog} style={{
                      flex: 1, padding: '5px', fontSize: 10, fontFamily: mono, fontWeight: 500,
                      background: m.jogStep === s ? C.accent : C.panelAlt,
                      color: m.jogStep === s ? '#fff' : C.text,
                      border: `1px solid ${m.jogStep === s ? C.accent : C.border}`,
                      cursor: canJog ? 'pointer' : 'not-allowed', letterSpacing: 0.3, borderRadius: 2,
                    }}>{s}</button>
                  ))}
                </div>
              </div>
              <div>
                <div style={{ fontFamily: mono, fontSize: 9, color: C.textMuted, letterSpacing: 1, marginBottom: 5, fontWeight: 600 }}>UNITS</div>
                <div style={{ display: 'flex', gap: 2 }}>
                  {['mm', 'inch'].map(u => (
                    <button key={u} onClick={() => m.setUnits(u)} style={{
                      flex: 1, padding: '5px', fontSize: 10, fontFamily: mono, fontWeight: 500,
                      background: m.units === u ? C.panelHi : C.panelAlt,
                      color: m.units === u ? C.text : C.textMuted,
                      border: `1px solid ${m.units === u ? C.borderStrong : C.border}`,
                      cursor: 'pointer', borderRadius: 2,
                    }}>{u.toUpperCase()}</button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Utilities — Tool / Probe / Check Size */}
          <div style={{ padding: 14, borderBottom: `1px solid ${C.border}` }}>
            <div style={{
              fontFamily: mono, fontSize: 10, color: C.accent, letterSpacing: 1.5,
              marginBottom: 10, fontWeight: 600,
              display: 'flex', alignItems: 'center', gap: 6,
            }}>
              <span style={{ width: 4, height: 4, background: C.accent }} /> UTILITIES
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
              <UtilBtn
                label={m.toolOn ? 'TOOL · ON' : 'TOOL · OFF'}
                hint={m.toolOn ? 'pen down' : 'pen up'}
                active={m.toolOn}
                disabled={disabled || m.alarm}
                onClick={() => m.setToolOn(t => !t)}
                C={C} mono={mono}
              />
              <UtilBtn
                label="PROBE Z"
                hint="auto-zero"
                disabled={disabled || running || m.alarm}
                onClick={() => { m.setPos(p => ({ ...p, z: 0 })); }}
                C={C} mono={mono}
              />
              <UtilBtn
                label="CHECK SIZE"
                hint="bounds dry-run"
                disabled={!canRunJob}
                onClick={() => {}}
                C={C} mono={mono}
              />
              <UtilBtn
                label="GO TO XY0"
                hint="rapid to origin"
                disabled={!canJog}
                onClick={() => m.setPos(p => ({ ...p, x: 0, y: 0 }))}
                C={C} mono={mono}
              />
            </div>
          </div>

          {/* Overrides */}
          <div style={{ padding: 14, flex: 1, overflow: 'auto' }}>
            <div style={{
              fontFamily: mono, fontSize: 10, color: C.accent, letterSpacing: 1.5,
              marginBottom: 10, fontWeight: 600,
              display: 'flex', alignItems: 'center', gap: 6,
            }}>
              <span style={{ width: 4, height: 4, background: C.accent }} /> OVERRIDES
            </div>
            <div style={{ display: 'flex', gap: 4, justifyContent: 'space-between' }}>
              <VSlider label="JOG" value={m.jogRate} onChange={m.setJogRate} color={C.accent} disabled={!m.connected} />
              <VSlider label="FEED" value={m.feedRate} onChange={m.setFeedRate} color={C.axisY} disabled={!m.connected} />
              <VSlider label="TOOL" value={m.toolRate} onChange={m.setToolRate} color={C.axisZ} disabled={!m.connected} />
            </div>
          </div>
        </div>

        {/* Center — plot */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          <div style={{
            height: 28, background: C.panel, borderBottom: `1px solid ${C.border}`,
            display: 'flex', flexShrink: 0,
          }}>
            {[
              { id: '3d', label: '3D VIEW' },
              { id: 'log', label: 'CONSOLE' },
              { id: 'macros', label: 'MACROS' },
              { id: 'gcode', label: 'G-CODE' },
            ].map(t => (
              <button key={t.id} onClick={() => m.setActiveTab(t.id)} style={{
                padding: '0 14px', fontSize: 10, fontFamily: mono, fontWeight: m.activeTab === t.id ? 600 : 500,
                letterSpacing: 1,
                background: m.activeTab === t.id ? C.bg : 'transparent',
                color: m.activeTab === t.id ? C.accent : C.textMuted,
                border: 'none',
                borderRight: `1px solid ${C.border}`,
                borderBottom: m.activeTab === t.id ? `2px solid ${C.accent}` : '2px solid transparent',
                cursor: 'pointer',
              }}>{t.label}</button>
            ))}
            <div style={{ flex: 1 }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '0 12px', fontFamily: mono, fontSize: 9, color: C.textFaint }}>
              <span>GRID: 10{m.units}</span>
              <span>VIEW: TOP</span>
              {m.fileLoaded && !running && !scrubbing && (
                <span style={{ color: C.accent, fontWeight: 600 }}>● PREVIEW</span>
              )}
              {scrubbing && (
                <span style={{ color: '#2563EB', fontWeight: 600 }}>⟲ SCRUB</span>
              )}
              {running && !paused && (
                <span style={{ color: C.good, fontWeight: 600 }}>● LIVE</span>
              )}
              {paused && (
                <span style={{ color: C.amber, fontWeight: 600 }}>❚❚ HOLD</span>
              )}
            </div>
          </div>

          <div style={{
            flex: 1, background: C.bg, padding: 16,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            minWidth: 0, minHeight: 0, position: 'relative', overflow: 'hidden',
          }}>
            <ResponsivePlot
              progress={scrubbing ? scrubProgress : progress}
              headPos={scrubbing ? {
                x: +(Math.cos(scrubProgress * Math.PI * 8) * 40 + (scrubProgress - 0.5) * 20).toFixed(2),
                y: +(Math.sin(scrubProgress * Math.PI * 8) * 40).toFixed(2),
                z: 0,
              } : (running || progress > 0) ? m.pos : null}
              fileLoaded={m.fileLoaded}
              scrubbing={scrubbing}
              C={C} mono={mono}
            />
          </div>

          {/* Bottom info bar under plot — shows currently-executing G-code */}
          <div style={{
            padding: '6px 14px', borderTop: `1px solid ${C.border}`, background: C.panel,
            display: 'flex', gap: 10, alignItems: 'center', flexShrink: 0, minHeight: 28,
          }}>
            {running ? (
              <>
                <span style={{ fontFamily: mono, fontSize: 10, color: C.textFaint, letterSpacing: 1 }}>EXEC</span>
                <span style={{ fontFamily: mono, fontSize: 11, color: C.text }}>
                  G1 X{m.pos.x.toFixed(2)} Y{m.pos.y.toFixed(2)}
                </span>
                <span style={{ fontFamily: mono, fontSize: 11, color: C.accent }}>
                  F{liveFeed}
                </span>
                <div style={{ flex: 1 }} />
                <span style={{ fontFamily: mono, fontSize: 10, color: C.textFaint }}>
                  LINE {Math.floor(50256 * progress).toLocaleString()} / 50,256
                </span>
              </>
            ) : (
              <span style={{ fontFamily: mono, fontSize: 10, color: C.textFaint, letterSpacing: 0.5 }}>
                {m.fileLoaded ? 'Preview — tap RUN to start' : 'Load a G-code file to preview path'}
              </span>
            )}
          </div>
        </div>

        {/* Right — job + run controls */}
        <div style={{
          width: 260, flexShrink: 0, background: C.panel,
          borderLeft: `1px solid ${C.border}`,
          display: 'flex', flexDirection: 'column', overflow: 'hidden',
        }}>
          {m.fileLoaded && (
            <div style={{ padding: 14, borderBottom: `1px solid ${C.border}`, flex: 1, overflow: 'auto' }}>
              <div style={{
                fontFamily: mono, fontSize: 10, color: C.accent, letterSpacing: 1.5,
                marginBottom: 10, fontWeight: 600,
                display: 'flex', alignItems: 'center', gap: 6,
              }}>
                <span style={{ width: 4, height: 4, background: C.accent }} /> JOB
              </div>
                <div style={{ padding: 10, background: C.panelAlt, border: `1px solid ${C.border}`, marginBottom: 12, borderRadius: 3 }}>
                  <div style={{ fontSize: 11, fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    hatched_flower_spiral_v3
                  </div>
                  <div style={{ fontFamily: mono, fontSize: 9, color: C.textFaint, marginTop: 2 }}>
                    50,256 LINES · EST 00:32
                  </div>
                </div>

                {/* Progress block */}
                <div style={{
                  fontFamily: mono, fontSize: 28, fontWeight: 500, letterSpacing: -0.5,
                  fontVariantNumeric: 'tabular-nums', color: paused ? C.amber : C.text,
                }}>
                  {(progress * 100).toFixed(1)}<span style={{ fontSize: 12, color: C.textFaint }}>%</span>
                </div>
                <div style={{ marginTop: 6, position: 'relative', height: 6 }}>
                  <div style={{ position: 'absolute', inset: 0, background: C.panelAlt, borderRadius: 2 }} />
                  <div style={{
                    position: 'absolute', top: 0, bottom: 0, left: 0, width: `${progress * 100}%`,
                    background: paused ? C.amber
                      : running ? `linear-gradient(90deg, ${C.accentHi}, ${C.accent})`
                      : C.borderStrong,
                    borderRadius: 2,
                    transition: 'background 0.2s',
                  }} />
                </div>

                <div style={{ marginTop: 12, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, fontFamily: mono }}>
                  <div>
                    <div style={{ color: C.textFaint, fontSize: 8.5, letterSpacing: 0.8 }}>ELAPSED</div>
                    <div style={{ color: C.text, fontSize: 12, marginTop: 2 }}>{fmtTime(elapsed)}</div>
                  </div>
                  <div>
                    <div style={{ color: C.textFaint, fontSize: 8.5, letterSpacing: 0.8 }}>REMAINING</div>
                    <div style={{ color: paused ? C.amber : running ? C.accent : C.text, fontSize: 12, marginTop: 2 }}>
                      {fmtTime(total - elapsed)}
                    </div>
                  </div>
                  <div>
                    <div style={{ color: C.textFaint, fontSize: 8.5, letterSpacing: 0.8 }}>LINE</div>
                    <div style={{ color: C.text, fontSize: 12, marginTop: 2 }}>
                      {Math.floor(50256 * progress).toLocaleString()}
                    </div>
                  </div>
                  <div>
                    <div style={{ color: C.textFaint, fontSize: 8.5, letterSpacing: 0.8 }}>TRAVEL</div>
                    <div style={{ color: C.text, fontSize: 12, marginTop: 2 }}>
                      {Math.floor(381 * progress)}mm
                    </div>
                  </div>
                </div>
            </div>
          )}

          {/* ─── Run controls — gros, distinct, état-dépendant ─── */}
          <div style={{
            padding: 14, borderBottom: `1px solid ${C.border}`, background: C.panelAlt,
          }}>
            <div style={{
              fontFamily: mono, fontSize: 10, color: C.accent, letterSpacing: 1.5,
              marginBottom: 10, fontWeight: 600,
              display: 'flex', alignItems: 'center', gap: 6,
            }}>
              <span style={{ width: 4, height: 4, background: C.accent }} /> RUN
            </div>

            {!running ? (
              <>
                <button onClick={() => canRunJob && (m.setRunning(true), m.setPaused(false))}
                  disabled={!canRunJob}
                  style={{
                  width: '100%', padding: '12px', fontSize: 13, fontFamily: mono, fontWeight: 700,
                  letterSpacing: 1.5,
                  background: canRunJob ? C.accent : C.panelHi,
                  color: canRunJob ? '#fff' : C.textFaint,
                  border: 'none', borderRadius: 3, cursor: canRunJob ? 'pointer' : 'not-allowed',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                }}>
                  <span style={{ fontSize: 15 }}>▶</span> START
                </button>
                <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
                  <button disabled style={{
                    flex: 1, padding: '7px', fontSize: 10, fontFamily: mono, fontWeight: 600, letterSpacing: 0.8,
                    background: C.panelHi, color: C.textFaint,
                    border: `1px solid ${C.border}`, borderRadius: 3, cursor: 'not-allowed',
                  }}>❚❚ PAUSE</button>
                  <button disabled style={{
                    flex: 1, padding: '7px', fontSize: 10, fontFamily: mono, fontWeight: 600, letterSpacing: 0.8,
                    background: C.panelHi, color: C.textFaint,
                    border: `1px solid ${C.border}`, borderRadius: 3, cursor: 'not-allowed',
                  }}>■ STOP</button>
                </div>
                {/* Manual "Restart from…" — always available when a file is loaded */}
                {m.fileLoaded && progress === 0 && (
                  <button onClick={() => {
                    setManualScrub(s => !s);
                    if (!manualScrub) setScrubProgress(0);
                  }} style={{
                    width: '100%', padding: '7px', marginTop: 6,
                    fontSize: 10, fontFamily: mono, fontWeight: 600, letterSpacing: 0.8,
                    background: manualScrub ? C.accentSoft : 'transparent',
                    border: `1px solid ${manualScrub ? C.accent : C.border}`,
                    color: manualScrub ? C.accent : C.textMuted,
                    cursor: 'pointer', borderRadius: 3,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                  }}>
                    <span>⟲</span> {manualScrub ? 'HIDE SCRUBBER' : 'RESTART FROM LINE…'}
                  </button>
                )}
                {/* Scrubber — visible when job was stopped mid-way OR user asked to restart from a line */}
                {((progress > 0 && !running) || manualScrub) && (
                  <ScrubToRestart
                    progress={scrubProgress || progress}
                    setProgress={setScrubProgress}
                    defaultProgress={progress}
                    C={C} mono={mono}
                    onRestart={() => {
                      const p = scrubProgress || progress;
                      setProgress(p);
                      m.setRunning(true);
                      m.setPaused(false);
                      m.setAlarm(false);
                      setScrubbing(false);
                      setManualScrub(false);
                    }}
                    onScrubStart={() => setScrubbing(true)}
                    onScrubEnd={() => setScrubbing(false)}
                  />
                )}
              </>
            ) : (
              <>
                <button onClick={() => m.setPaused(p => !p)} style={{
                  width: '100%', padding: '12px', fontSize: 13, fontFamily: mono, fontWeight: 700,
                  letterSpacing: 1.5,
                  background: paused ? C.accent : C.amber,
                  color: '#fff',
                  border: 'none', borderRadius: 3, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                }}>
                  <span style={{ fontSize: 15 }}>{paused ? '▶' : '❚❚'}</span>
                  {paused ? 'RESUME' : 'PAUSE'}
                </button>
                <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
                  <button onClick={() => { m.setRunning(false); m.setPaused(false); m.setToolOn(false); }} style={{
                    flex: 1, padding: '7px', fontSize: 10, fontFamily: mono, fontWeight: 600, letterSpacing: 0.8,
                    background: C.panel, color: C.bad,
                    border: `1px solid ${C.bad}`, borderRadius: 3, cursor: 'pointer',
                  }}>■ STOP</button>
                  <button onClick={() => setShowAbortConfirm(true)} style={{
                    flex: 1, padding: '7px', fontSize: 10, fontFamily: mono, fontWeight: 700, letterSpacing: 0.8,
                    background: C.bad, color: '#fff',
                    border: `1px solid ${C.bad}`, borderRadius: 3, cursor: 'pointer',
                  }}>⊗ ABORT</button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ─── Status bar (notre style) ─── */}
      <div style={{
        height: 22, background: C.panel, borderTop: `1px solid ${C.border}`,
        display: 'flex', alignItems: 'center', fontFamily: mono, fontSize: 10,
        letterSpacing: 0.3, flexShrink: 0, color: C.textMuted,
      }}>
        <div style={{ padding: '0 10px', display: 'flex', alignItems: 'center', gap: 6, borderRight: `1px solid ${C.border}`, height: '100%' }}>
          <span style={{
            width: 6, height: 6, borderRadius: '50%',
            background: m.alarm ? C.bad : (running && !paused) ? C.good : paused ? C.amber : m.connected ? C.accent : C.textFaint,
            boxShadow: (running && !paused) ? `0 0 5px ${C.good}` : 'none',
          }} />
          <span style={{ color: C.text, fontWeight: 600 }}>
            {m.controllerState.toUpperCase()}
          </span>
          {running && (
            <span style={{ color: C.textFaint }}>· {fmtTime(elapsed)}/{fmtTime(total)}</span>
          )}
        </div>
        <div style={{ padding: '0 10px', borderRight: `1px solid ${C.border}`, height: '100%', display: 'flex', alignItems: 'center' }}>
          <span style={{ color: m.connected ? C.good : C.bad }}>●</span>
          <span style={{ marginLeft: 6 }}>{m.connected ? 'PORT: Connected' : 'PORT: Not Connected'}</span>
        </div>
        <div style={{ padding: '0 10px', borderRight: `1px solid ${C.border}`, height: '100%', display: 'flex', alignItems: 'center' }}>
          <span>BAUD 115200</span>
        </div>
        <div style={{ padding: '0 10px', borderRight: `1px solid ${C.border}`, height: '100%', display: 'flex', alignItems: 'center' }}>
          <span>QUEUE {running ? Math.floor(50256 * progress).toLocaleString() : '0'}</span>
        </div>
        <div style={{ flex: 1 }} />
        <div style={{ padding: '0 10px' }}>
          MPos X{m.pos.x.toFixed(2)} Y{m.pos.y.toFixed(2)} Z{m.pos.z.toFixed(2)}
        </div>
      </div>

      {/* Abort modal */}
      {showAbortConfirm && (
        <div style={{
          position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.3)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10,
        }} onClick={() => setShowAbortConfirm(false)}>
          <div onClick={e => e.stopPropagation()} style={{
            background: C.panel, border: `1px solid ${C.bad}`, padding: 20, borderRadius: 4,
            maxWidth: 340, boxShadow: '0 10px 30px rgba(0,0,0,0.15)',
          }}>
            <div style={{ fontFamily: mono, fontWeight: 700, color: C.bad, letterSpacing: 1, marginBottom: 8 }}>
              ⊗ ABORT JOB?
            </div>
            <div style={{ fontSize: 12, color: C.textMuted, marginBottom: 14, lineHeight: 1.5 }}>
              This will halt motion immediately and put the controller into <strong>ALARM</strong>.
              You'll need to unlock before running again.
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button onClick={() => setShowAbortConfirm(false)} style={{
                padding: '6px 14px', fontSize: 11, fontFamily: mono, fontWeight: 500,
                background: 'transparent', border: `1px solid ${C.border}`, color: C.text,
                cursor: 'pointer', borderRadius: 3,
              }}>CANCEL</button>
              <button onClick={() => {
                m.setRunning(false); m.setPaused(false); m.setAlarm(true); m.setToolOn(false);
                setShowAbortConfirm(false);
              }} style={{
                padding: '6px 14px', fontSize: 11, fontFamily: mono, fontWeight: 700, letterSpacing: 0.5,
                background: C.bad, border: `1px solid ${C.bad}`, color: '#fff',
                cursor: 'pointer', borderRadius: 3,
              }}>ABORT</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Small utility button (Tool / Probe / Check Size / Go to 0)
function UtilBtn({ label, hint, active, disabled, onClick, C, mono }) {
  return (
    <button onClick={disabled ? undefined : onClick} disabled={disabled} style={{
      padding: '7px 8px',
      background: active ? C.accentSoft : C.panelAlt,
      border: `1px solid ${active ? C.accent : C.border}`,
      color: disabled ? C.textFaint : active ? C.accent : C.text,
      cursor: disabled ? 'not-allowed' : 'pointer',
      opacity: disabled ? 0.5 : 1,
      display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 1,
      borderRadius: 3, textAlign: 'left',
    }}>
      <span style={{ fontFamily: mono, fontSize: 10, fontWeight: 600, letterSpacing: 0.5 }}>{label}</span>
      <span style={{ fontFamily: mono, fontSize: 8.5, color: C.textFaint, letterSpacing: 0.3 }}>{hint}</span>
    </button>
  );
}

// Scrub-to-restart — always visible when job was stopped mid-way.
// Scrubber defaults to the exact point where job was stopped (progress).
// Drag the handle → plot head live-previews the restart position (blue marker).
function ScrubToRestart({ progress, setProgress, defaultProgress, onRestart, onScrubStart, onScrubEnd, C, mono }) {
  const line = Math.floor(50256 * progress);
  const x = +(Math.cos(progress * Math.PI * 8) * 40 + (progress - 0.5) * 20).toFixed(2);
  const y = +(Math.sin(progress * Math.PI * 8) * 40).toFixed(2);
  const z = -30 + progress * 12;
  const nudge = (delta) => setProgress(Math.max(0, Math.min(1, progress + delta)));
  return (
    <div style={{
      marginTop: 10, padding: 12, background: C.panel,
      border: `1px solid ${C.accent}`, borderRadius: 4,
      boxShadow: '0 2px 8px rgba(234,88,12,0.10)',
    }}>
      <div style={{
        fontFamily: mono, fontSize: 9.5, color: C.textMuted, letterSpacing: 1,
        fontWeight: 600, marginBottom: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ color: C.accent }}>⟲</span> SCRUB TO RESTART POINT
        </span>
        <button onClick={() => setProgress(defaultProgress)} style={{
          fontFamily: mono, fontSize: 8.5, padding: '2px 6px', letterSpacing: 0.5,
          background: 'transparent', border: `1px solid ${C.border}`,
          color: C.textMuted, cursor: 'pointer', borderRadius: 2, fontWeight: 500,
        }}>↺ STOP PT</button>
      </div>

      {/* Slider */}
      <div style={{ position: 'relative', height: 24, marginBottom: 4 }}>
        <div style={{
          position: 'absolute', top: 11, left: 0, right: 0, height: 3,
          background: C.panelHi, borderRadius: 2,
        }} />
        <div style={{
          position: 'absolute', top: 11, left: 0, height: 3,
          width: `${progress * 100}%`, background: C.accent, borderRadius: 2,
        }} />
        {/* stop-point tick */}
        <div style={{
          position: 'absolute', top: 7, width: 2, height: 11,
          left: `calc(${defaultProgress * 100}% - 1px)`,
          background: C.textFaint, opacity: 0.6,
        }} title="Where job was stopped" />
        <div style={{
          position: 'absolute', top: 5, width: 14, height: 14,
          left: `calc(${progress * 100}% - 7px)`,
          background: '#fff', border: `2px solid ${C.accent}`,
          borderRadius: '50%', boxShadow: '0 1px 3px rgba(0,0,0,0.15)',
          pointerEvents: 'none',
        }} />
        <input type="range" min={0} max={1000} value={Math.round(progress * 1000)}
          onChange={e => setProgress(+e.target.value / 1000)}
          onMouseDown={onScrubStart}
          onMouseUp={onScrubEnd}
          onTouchStart={onScrubStart}
          onTouchEnd={onScrubEnd}
          style={{
            position: 'absolute', inset: 0, width: '100%', height: '100%',
            opacity: 0, cursor: 'ew-resize', margin: 0,
          }}
        />
      </div>

      {/* Step nudge buttons */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 10, justifyContent: 'center' }}>
        {[
          { l: '−100', v: -100 / 50256 },
          { l: '−10', v: -10 / 50256 },
          { l: '−1', v: -1 / 50256 },
          { l: '+1', v: 1 / 50256 },
          { l: '+10', v: 10 / 50256 },
          { l: '+100', v: 100 / 50256 },
        ].map(b => (
          <button key={b.l} onClick={() => nudge(b.v)} style={{
            flex: 1, padding: '3px 0', fontSize: 9, fontFamily: mono, fontWeight: 600,
            background: C.panelAlt, border: `1px solid ${C.border}`,
            color: C.textMuted, cursor: 'pointer', borderRadius: 2,
          }}>{b.l}</button>
        ))}
      </div>

      {/* Line pill + coords */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
        <span style={{
          padding: '3px 8px', background: C.panelHi, borderRadius: 3,
          fontFamily: mono, fontSize: 10, fontWeight: 700, color: C.text,
        }}>Line {line.toLocaleString()}</span>
        <span style={{ fontFamily: mono, fontSize: 10, color: C.text, fontVariantNumeric: 'tabular-nums' }}>
          <span style={{ color: C.axisX }}>X</span>:{x.toFixed(2)} <span style={{ color: C.axisY }}>Y</span>:{y.toFixed(2)} <span style={{ color: C.axisZ }}>Z</span>:{z.toFixed(2)}
        </span>
      </div>

      {/* G-code echo */}
      <div style={{
        fontFamily: mono, fontSize: 9.5, color: C.textMuted, marginBottom: 10,
        fontVariantNumeric: 'tabular-nums',
      }}>
        G1 X{x.toFixed(4)} Y{y.toFixed(4)} F40000
      </div>

      {/* Restart action */}
      <button onClick={onRestart} style={{
        width: '100%', padding: '9px', fontSize: 11, fontFamily: mono, fontWeight: 700, letterSpacing: 1,
        background: C.accent, color: '#fff', border: 'none', borderRadius: 3,
        cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
      }}>
        <span style={{ fontSize: 13 }}>▶</span> RESTART FROM HERE
      </button>
    </div>
  );
}

// Responsive plot
function ResponsivePlot({ progress, headPos, fileLoaded, scrubbing, C, mono }) {
  const ref = React.useRef(null);
  const [size, setSize] = React.useState(400);
  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(entries => {
      for (const e of entries) {
        const { width, height } = e.contentRect;
        setSize(Math.max(240, Math.min(width, height)));
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return (
    <div ref={ref} style={{
      flex: 1, height: '100%', display: 'flex',
      alignItems: 'center', justifyContent: 'center', minWidth: 0,
    }}>
      <div style={{
        background: C.panel, border: `1px solid ${C.border}`,
        padding: 8, position: 'relative',
        boxShadow: '0 1px 2px rgba(0,0,0,0.04)', borderRadius: 2,
      }}>
        {fileLoaded ? (
          <PlotView width={size - 16} height={size - 16} progress={progress} headPos={headPos} theme={{
            bg: C.panel, grid: '#F2EADB', gridMajor: '#E2D4B8',
            draw: '#E85D3A', move: '#4BB568', border: C.border,
            axis: C.textMuted, axisText: C.textFaint,
            head: scrubbing ? '#2563EB' : C.accent,
          }} />
        ) : (
          <EmptyPlot size={size - 16} C={C} mono={mono} />
        )}
      </div>
    </div>
  );
}

function EmptyPlot({ size, C, mono }) {
  const margin = 20;
  const plot = size - margin * 2;
  const lines = [];
  for (let i = 0; i <= 30; i++) {
    const major = i % 5 === 0;
    const v = margin + (i / 30) * plot;
    lines.push(<line key={`v${i}`} x1={v} y1={margin} x2={v} y2={margin + plot}
      stroke={major ? '#E2D4B8' : '#F2EADB'} strokeWidth={major ? 0.6 : 0.3} />);
    lines.push(<line key={`h${i}`} x1={margin} y1={v} x2={margin + plot} y2={v}
      stroke={major ? '#E2D4B8' : '#F2EADB'} strokeWidth={major ? 0.6 : 0.3} />);
  }
  return (
    <svg width={size} height={size} style={{ display: 'block', background: C.panel }}>
      <rect x={margin} y={margin} width={plot} height={plot} fill={C.panel} stroke={C.border} />
      {lines}
      <line x1={margin} y1={margin + plot} x2={margin + plot} y2={margin + plot} stroke="#DC2626" strokeWidth={1.5} />
      <polygon points={`${margin + plot},${margin + plot} ${margin + plot - 8},${margin + plot - 4} ${margin + plot - 8},${margin + plot + 4}`} fill="#DC2626" />
      <text x={margin + plot - 10} y={margin + plot + 14} fontSize={9} fill="#DC2626" fontFamily={mono}>X</text>
      <line x1={margin} y1={margin + plot} x2={margin} y2={margin} stroke="#16A34A" strokeWidth={1.5} />
      <polygon points={`${margin},${margin} ${margin - 4},${margin + 8} ${margin + 4},${margin + 8}`} fill="#16A34A" />
      <text x={margin - 12} y={margin + 10} fontSize={9} fill="#16A34A" fontFamily={mono}>Y</text>
      <circle cx={margin} cy={margin + plot} r={5} fill="#2563EB" />
      <text x={size / 2} y={size / 2 - 4} fontSize={12} fill={C.textFaint} fontFamily={mono} textAnchor="middle" letterSpacing={1.5}>NO FILE LOADED</text>
      <text x={size / 2} y={size / 2 + 12} fontSize={10} fill={C.textFaint} fontFamily={mono} textAnchor="middle" opacity={0.6}>Open a G-code file to preview</text>
    </svg>
  );
}

window.CommandDeckDirection = CommandDeckDirection;
window.ResponsivePlot = ResponsivePlot;
