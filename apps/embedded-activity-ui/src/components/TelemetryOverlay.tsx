import { useState } from 'react';
import type { DriverPosition } from '../hooks/useTelemetry.js';

const TEAM_COLORS: Record<string, string> = {
  'Red Bull Racing': '#3671C6',
  McLaren: '#FF8000',
  Ferrari: '#E8002D',
  Mercedes: '#27F4D2',
  'Aston Martin': '#229971',
  Alpine: '#FF87BC',
  Williams: '#64C4FF',
  'Haas F1 Team': '#B6BABD',
  RB: '#6692FF',
  'Kick Sauber': '#52E252',
};
const TIRE: Record<string, [string, string]> = {
  SOFT: ['ðŸ”´', '#ff1744'],
  MEDIUM: ['ðŸŸ¡', '#ffab00'],
  HARD: ['âšª', '#ccc'],
  INTERMEDIATE: ['ðŸŸ¢', '#00e676'],
  WET: ['ðŸ”µ', '#2979ff'],
};

export function TelemetryOverlay({
  positions,
  isLive,
  lastUpdate,
}: {
  positions: DriverPosition[];
  isLive: boolean;
  lastUpdate: Date | null;
}) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div
      className="animate-slide-down glass"
      style={{
        position: 'absolute',
        top: 10,
        right: 10,
        width: collapsed ? 140 : 280,
        maxHeight: 'calc(100% - 20px)',
        borderRadius: 'var(--radius-lg)',
        overflow: 'hidden',
        border: '1px solid var(--border-subtle)',
        transition: 'width 0.3s var(--ease-out)',
        zIndex: 20,
        boxShadow: 'var(--shadow-float)',
      }}
    >
      {/* Header */}
      <div
        onClick={() => setCollapsed(!collapsed)}
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '9px 12px',
          borderBottom: '1px solid var(--border-subtle)',
          cursor: 'pointer',
          userSelect: 'none',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
          <div
            className={isLive ? 'animate-live-pulse' : ''}
            style={{
              width: 7,
              height: 7,
              borderRadius: '50%',
              background: isLive ? 'var(--accent-green)' : 'var(--text-dim)',
              flexShrink: 0,
            }}
          />
          <span
            className="mono"
            style={{
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: 2,
              color: isLive ? '#fff' : 'var(--text-muted)',
            }}
          >
            {isLive ? 'LIVE' : 'IDLE'}
          </span>
          {isLive && !collapsed && (
            <span style={{ fontSize: 9, color: 'var(--accent-green)', fontWeight: 600 }}>
              â— {positions.length}D
            </span>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {lastUpdate && !collapsed && (
            <span className="mono" style={{ fontSize: 8, color: 'var(--text-dim)' }}>
              {lastUpdate.toLocaleTimeString()}
            </span>
          )}
          <span
            style={{
              fontSize: 10,
              color: 'var(--text-muted)',
              transition: 'transform 0.2s',
              transform: collapsed ? 'rotate(180deg)' : 'none',
            }}
          >
            â–¼
          </span>
        </div>
      </div>

      {/* Position list */}
      {!collapsed && (
        <div style={{ overflowY: 'auto', maxHeight: 520, padding: '2px 0' }}>
          {positions.length === 0 ? (
            <div style={{ padding: '32px 16px', textAlign: 'center' }}>
              <div
                className="animate-breathe"
                style={{ fontSize: 28, marginBottom: 10, opacity: 0.4 }}
              >
                ðŸ
              </div>
              <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>
                No live timing data
              </p>
              <p style={{ fontSize: 10, color: 'var(--text-dim)' }}>
                Data appears during F1 sessions
              </p>
            </div>
          ) : (
            positions.slice(0, 20).map((d, i) => {
              const teamColor = TEAM_COLORS[d.team] ?? 'var(--text-dim)';
              const [tireEmoji] = TIRE[d.tire_compound.toUpperCase()] ?? ['âš«', '#555'];
              const isTop3 = d.position <= 3;
              return (
                <div
                  key={d.driver_number}
                  className={i < 5 ? 'animate-slide-up' : ''}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    padding: '5px 11px',
                    gap: 7,
                    borderBottom: '1px solid var(--border-subtle)',
                    transition: 'background 0.15s',
                    animationDelay: `${i * 0.03}s`,
                    background: 'transparent',
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.background = 'var(--bg-glass-hover)';
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.background = 'transparent';
                  }}
                >
                  <span
                    className="mono"
                    style={{
                      width: 16,
                      fontSize: 10,
                      fontWeight: 700,
                      color: isTop3 ? '#fff' : 'var(--text-muted)',
                      textAlign: 'right',
                    }}
                  >
                    {d.position}
                  </span>
                  <span
                    style={{
                      width: 3,
                      height: 18,
                      borderRadius: 2,
                      background: teamColor,
                      flexShrink: 0,
                      boxShadow: isTop3 ? `0 0 6px ${teamColor}44` : 'none',
                    }}
                  />
                  <span
                    className="mono"
                    style={{
                      fontSize: 11,
                      fontWeight: isTop3 ? 700 : 500,
                      color: isTop3 ? '#fff' : 'var(--text-secondary)',
                      width: 34,
                    }}
                  >
                    {d.driver_code}
                  </span>
                  <span
                    className="mono"
                    style={{
                      flex: 1,
                      textAlign: 'right',
                      fontSize: 10,
                      color:
                        d.gap_to_leader === 'LEADER' || d.position === 1
                          ? 'var(--accent-green)'
                          : 'var(--text-muted)',
                      fontWeight: d.position === 1 ? 600 : 400,
                    }}
                  >
                    {d.position === 1 ? 'LEADER' : d.gap_to_leader}
                  </span>
                  <span
                    style={{
                      fontSize: 9,
                      color: 'var(--text-dim)',
                      width: 40,
                      textAlign: 'right',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'flex-end',
                      gap: 3,
                    }}
                  >
                    <span style={{ fontSize: 8 }}>{tireEmoji}</span>
                    {d.tire_age}L
                  </span>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
