export function VideoViewport({ active }: { active: boolean }) {
  if (!active) return null;
  return (
    <div
      style={{
        flex: 1,
        position: 'relative',
        background: '#000',
        borderRadius: 'var(--radius-md)',
        overflow: 'hidden',
        minHeight: 300,
      }}
    >
      {/* Cinematic gradient background */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'radial-gradient(ellipse at 30% 40%, #0d0d28 0%, #050510 50%, #000 100%)',
        }}
      />

      {/* Subtle animated scan lines */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.008) 2px, rgba(255,255,255,0.008) 4px)',
          pointerEvents: 'none',
          opacity: 0.5,
        }}
      />

      {/* Center content */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 16,
          zIndex: 2,
        }}
      >
        <div
          className="animate-breathe"
          style={{
            width: 72,
            height: 72,
            borderRadius: 18,
            background: 'rgba(255,255,255,0.02)',
            border: '1px solid var(--border-subtle)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 34,
            backdropFilter: 'blur(8px)',
          }}
        >
          ðŸ“º
        </div>
        <div style={{ textAlign: 'center' }}>
          <h2
            style={{
              fontSize: 16,
              fontWeight: 600,
              color: '#fff',
              marginBottom: 4,
              letterSpacing: -0.3,
            }}
          >
            Live Stream Viewport
          </h2>
          <p style={{ fontSize: 11, color: 'var(--text-dim)', maxWidth: 260 }}>
            Ultra-low latency WHEP stream activates during live F1 sessions
          </p>
        </div>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '7px 18px',
            borderRadius: 'var(--radius-full)',
            background: 'var(--bg-glass)',
            border: '1px solid var(--border-subtle)',
            fontSize: 11,
            color: 'var(--text-muted)',
          }}
        >
          <span
            className="animate-pulse"
            style={{
              width: 6,
              height: 6,
              borderRadius: '50%',
              background: 'var(--accent-amber)',
              display: 'inline-block',
            }}
          />
          Waiting for broadcast signal...
        </div>
      </div>

      {/* Corner markers (like a viewfinder) */}
      {['top-left', 'top-right', 'bottom-left', 'bottom-right'].map(pos => {
        const [v, h] = pos.split('-');
        return (
          <div
            key={pos}
            style={{
              position: 'absolute',
              [v as string]: 16,
              [h as string]: 16,
              width: 20,
              height: 20,
              borderColor: 'rgba(255,255,255,0.08)',
              borderStyle: 'solid',
              borderWidth: 0,
              ...(v === 'top' ? { borderTopWidth: 1.5 } : { borderBottomWidth: 1.5 }),
              ...(h === 'left' ? { borderLeftWidth: 1.5 } : { borderRightWidth: 1.5 }),
              pointerEvents: 'none',
            }}
          />
        );
      })}
    </div>
  );
}
