import './styles/globals.css';
import { useDiscordSdk } from './hooks/useDiscordSdk.js';
import { useSubscription } from './hooks/useSubscription.js';
import { useTelemetry } from './hooks/useTelemetry.js';
import { SubscriptionGate } from './components/SubscriptionGate.js';
import { VideoViewport } from './components/VideoViewport.js';
import { TelemetryOverlay } from './components/TelemetryOverlay.js';
import { WebGLCanvas } from './components/WebGLCanvas.js';

const TIER_BADGE: Record<string, [string, string]> = {
  grid: ['Grid', '#00e676'],
  pit_wall: ['Pit Wall', '#ffab00'],
  paddock: ['Paddock', '#ff1744'],
};

export default function App() {
  const { auth, loading: sdkLoad, error: sdkErr, retry } = useDiscordSdk();
  const { tier, loading: subLoad } = useSubscription(
    auth?.accessToken ?? null,
    auth?.user.id ?? null,
  );
  const sub = tier !== 'none';
  const { positions, isLive, lastUpdate } = useTelemetry(sub);

  // Loading state
  if (sdkLoad)
    return (
      <div style={S.fullCenter}>
        <div style={{ position: 'relative', width: 60, height: 60 }}>
          <div
            style={{ ...S.spinRing, width: 44, height: 44, borderTopColor: 'var(--accent-green)' }}
          />
          <div
            style={{
              ...S.spinRing,
              width: 58,
              height: 58,
              borderTopColor: 'rgba(255,255,255,0.03)',
              animationDuration: '2.5s',
              animationDirection: 'reverse',
            }}
          />
        </div>
        <p
          className="mono"
          style={{
            color: 'var(--text-dim)',
            fontSize: 10,
            letterSpacing: 3,
            textTransform: 'uppercase',
            marginTop: 20,
          }}
        >
          Connecting
        </p>
      </div>
    );

  // Error state
  if (sdkErr || !auth)
    return (
      <div style={S.fullCenter}>
        <div style={{ textAlign: 'center', maxWidth: 340 }}>
          <div style={{ fontSize: 36, marginBottom: 12, opacity: 0.6 }}>⚠️</div>
          <h2
            style={{ fontSize: 17, fontWeight: 600, color: 'var(--accent-red)', marginBottom: 8 }}
          >
            Connection Failed
          </h2>
          <p
            style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.5, marginBottom: 20 }}
          >
            {sdkErr ?? 'Unable to authenticate with Discord'}
          </p>
          <button onClick={retry} style={S.retryBtn}>
            Retry Connection
          </button>
        </div>
      </div>
    );

  const [badgeText, badgeColor] = TIER_BADGE[tier] ?? [tier, '#fff'];

  // Main app
  return (
    <SubscriptionGate tier={tier} loading={subLoad}>
      <div
        className="animate-fade-in"
        style={{
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
          background: 'var(--bg-void)',
        }}
      >
        {/* Header */}
        <header
          className="glass no-select"
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '0 16px',
            height: 44,
            borderBottom: '1px solid var(--border-subtle)',
            zIndex: 30,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 18 }}>ðŸŽï¸</span>
            <h1 style={{ fontSize: 14, fontWeight: 700, color: '#fff', letterSpacing: -0.4 }}>
              Virtual Pub
            </h1>
            <div
              style={{ width: 1, height: 16, background: 'var(--border-light)', margin: '0 4px' }}
            />
            <span
              className="mono"
              style={{ fontSize: 9, color: 'var(--text-dim)', letterSpacing: 1 }}
            >
              F1 COMMAND CENTER
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '4px 10px',
                borderRadius: 'var(--radius-full)',
                background: 'var(--bg-glass)',
              }}
            >
              {auth.user.avatar ? (
                <img
                  src={`https://cdn.discordapp.com/avatars/${auth.user.id}/${auth.user.avatar}.png?size=32`}
                  alt=""
                  style={{ width: 18, height: 18, borderRadius: '50%' }}
                />
              ) : (
                <div
                  style={{
                    width: 18,
                    height: 18,
                    borderRadius: '50%',
                    background: 'var(--accent-purple)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 10,
                    fontWeight: 700,
                  }}
                >
                  {(auth.user.global_name ?? auth.user.username).charAt(0).toUpperCase()}
                </div>
              )}
              <span
                className="truncate"
                style={{ fontSize: 12, color: 'var(--text-secondary)', maxWidth: 100 }}
              >
                {auth.user.global_name ?? auth.user.username}
              </span>
            </div>
            <div
              style={{
                padding: '4px 10px',
                borderRadius: 'var(--radius-full)',
                background: `${badgeColor}15`,
                border: `1px solid ${badgeColor}25`,
                fontSize: 11,
                fontWeight: 600,
                color: badgeColor,
              }}
            >
              {badgeText}
            </div>
          </div>
        </header>

        {/* Main viewport */}
        <main style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
          <VideoViewport active={sub} />
          <WebGLCanvas width={1920} height={1080} active={sub} />
          <TelemetryOverlay positions={positions} isLive={isLive} lastUpdate={lastUpdate} />
        </main>

        {/* Status bar */}
        <footer
          className="glass no-select mono"
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '0 16px',
            height: 28,
            borderTop: '1px solid var(--border-subtle)',
            fontSize: 9,
            color: 'var(--text-dim)',
            zIndex: 30,
            letterSpacing: 0.5,
          }}
        >
          <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <span
              className={isLive ? 'animate-live-pulse' : ''}
              style={{
                width: 5,
                height: 5,
                borderRadius: '50%',
                background: isLive ? 'var(--accent-green)' : 'var(--text-dim)',
                display: 'inline-block',
              }}
            />
            {isLive ? 'LIVE SESSION' : 'NO ACTIVE SESSION'}
          </span>
          <span>{positions.length} DRIVERS</span>
          <span>GUILD {auth.guildId?.slice(-4) ?? 'DM'}</span>
          <span>v1.0.0</span>
        </footer>
      </div>
    </SubscriptionGate>
  );
}

const S: Record<string, React.CSSProperties> = {
  fullCenter: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    background: 'var(--bg-void)',
  },
  spinRing: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%,-50%)',
    border: '2px solid transparent',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
  },
  retryBtn: {
    padding: '10px 28px',
    borderRadius: 'var(--radius-md)',
    background: 'var(--accent-green)',
    color: '#000',
    fontWeight: 600,
    border: 'none',
    cursor: 'pointer',
    fontSize: 13,
    transition: 'opacity 0.2s',
    letterSpacing: 0.3,
  },
};
