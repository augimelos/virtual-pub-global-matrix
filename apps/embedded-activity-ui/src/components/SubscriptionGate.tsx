import { useState } from 'react';
import type { Tier } from '../hooks/useSubscription.js';

const TIERS = [
  {
    id: 'grid',
    name: 'Grid',
    emoji: 'ðŸŸ¢',
    price: 2.99,
    color: '#00e676',
    tag: 'Essential',
    features: [
      'Ultra-low latency live stream',
      'Real-time position tracker',
      'Live weather & track conditions',
      'Gap timers & lap deltas',
      'Sector time comparisons',
    ],
  },
  {
    id: 'pit_wall',
    name: 'Pit Wall',
    emoji: 'ðŸŸ¡',
    price: 3.99,
    color: '#ffab00',
    tag: 'Popular',
    features: [
      'Live team radio feeds',
      'Tyre strategy overlay',
      'Prediction engine access',
      'Advanced telemetry graphs',
      'Driver head-to-head compare',
      'Everything in Grid',
    ],
  },
  {
    id: 'paddock',
    name: 'Paddock',
    emoji: 'ðŸ”´',
    price: 4.99,
    color: '#ff1744',
    tag: 'Ultimate',
    features: [
      'AI driver persona reactions',
      'Auto incident clip generator',
      'Priority ultra-low latency',
      'Exclusive prediction leagues',
      'Priority support channel',
      'Early access to new features',
      'Everything in Pit Wall',
    ],
  },
] as const;

export function SubscriptionGate({
  tier,
  loading,
  children,
}: {
  tier: Tier;
  loading: boolean;
  children: React.ReactNode;
}) {
  const [hovered, setHovered] = useState<string | null>(null);

  if (loading)
    return (
      <div style={S.center}>
        <div style={S.loaderWrap}>
          <div style={S.spinner} />
          <div
            style={{
              ...S.spinnerTrack,
              animationDirection: 'reverse',
              width: 56,
              height: 56,
              borderTopColor: 'rgba(255,255,255,0.04)',
            }}
          />
        </div>
        <p
          style={{
            color: 'var(--text-muted)',
            fontSize: 12,
            letterSpacing: 2,
            textTransform: 'uppercase',
            marginTop: 20,
          }}
        >
          Verifying access
        </p>
      </div>
    );

  if (tier !== 'none') return <>{children}</>;

  return (
    <div className="animate-fade-in" style={S.container}>
      {/* Background effects */}
      <div style={S.bgGlow} />
      <div style={S.bgGrid} />

      {/* Content */}
      <div style={S.content}>
        <div style={S.heroSection}>
          <div style={S.logoBadge}>ðŸŽï¸</div>
          <h1 style={S.title}>Virtual Pub</h1>
          <p style={S.subtitle}>The ultimate F1 experience inside Discord</p>
          <p style={S.tagline}>Live streams Â· Real-time telemetry Â· AI-powered insights</p>
        </div>

        <div style={S.tierGrid}>
          {TIERS.map((t, i) => {
            const isHot = hovered === t.id;
            const isPop = t.tag === 'Popular';
            return (
              <div
                key={t.id}
                className="animate-slide-up"
                style={{
                  ...S.tierCard,
                  animationDelay: `${i * 0.1}s`,
                  border: `1.5px solid ${isHot ? t.color + '44' : 'var(--border-subtle)'}`,
                  transform: isHot ? 'translateY(-4px)' : 'none',
                  boxShadow: isHot ? `0 12px 40px ${t.color}15` : 'var(--shadow-card)',
                  position: 'relative' as const,
                }}
                onMouseEnter={() => setHovered(t.id)}
                onMouseLeave={() => setHovered(null)}
              >
                {isPop && (
                  <div style={{ ...S.popularBadge, background: t.color }}>MOST POPULAR</div>
                )}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                  <span style={{ fontSize: 16 }}>{t.emoji}</span>
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 600,
                      color: t.color,
                      letterSpacing: 1.5,
                      textTransform: 'uppercase' as const,
                    }}
                  >
                    {t.tag}
                  </span>
                </div>
                <div style={{ fontSize: 20, fontWeight: 700, color: '#fff', marginBottom: 2 }}>
                  {t.name}
                </div>
                <div style={{ marginBottom: 16 }}>
                  <span style={{ fontSize: 32, fontWeight: 800, color: '#fff' }}>${t.price}</span>
                  <span style={{ fontSize: 13, color: 'var(--text-muted)', marginLeft: 2 }}>
                    /mo
                  </span>
                </div>
                <div
                  style={{
                    width: '100%',
                    height: 1,
                    background: 'var(--border-subtle)',
                    marginBottom: 14,
                  }}
                />
                <ul style={{ listStyle: 'none', flex: 1, marginBottom: 18 }}>
                  {t.features.map((f, j) => (
                    <li
                      key={j}
                      style={{
                        fontSize: 12,
                        color: 'var(--text-secondary)',
                        padding: '4px 0',
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: 8,
                        lineHeight: 1.4,
                      }}
                    >
                      <span style={{ color: t.color, fontSize: 8, marginTop: 4, flexShrink: 0 }}>
                        â—
                      </span>
                      {f}
                    </li>
                  ))}
                </ul>
                <a
                  href="https://www.paypal.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    ...S.cta,
                    background: isHot ? t.color : 'var(--bg-glass-hover)',
                    color: isHot ? '#000' : '#fff',
                    border: isHot ? 'none' : `1px solid ${t.color}33`,
                  }}
                >
                  {isPop ? 'Start Free Trial' : 'Subscribe'}
                </a>
              </div>
            );
          })}
        </div>

        <div style={S.trust}>
          <span>ðŸ”’ Secure payments via PayPal</span>
          <span>Â·</span>
          <span>3-day free trial</span>
          <span>Â·</span>
          <span>Cancel anytime</span>
        </div>
      </div>
    </div>
  );
}

const S: Record<string, React.CSSProperties> = {
  center: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    background: 'var(--bg-void)',
  },
  loaderWrap: {
    position: 'relative',
    width: 60,
    height: 60,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  spinner: {
    width: 44,
    height: 44,
    border: '2.5px solid transparent',
    borderTopColor: 'var(--accent-green)',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
    position: 'absolute',
  },
  spinnerTrack: {
    width: 56,
    height: 56,
    border: '2px solid transparent',
    borderTopColor: 'rgba(255,255,255,0.04)',
    borderRadius: '50%',
    animation: 'spin 2.5s linear infinite',
    position: 'absolute',
  },
  container: {
    position: 'relative',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    overflow: 'auto',
    padding: '32px 20px',
    background: 'var(--bg-void)',
  },
  bgGlow: {
    position: 'absolute',
    top: '-20%',
    left: '50%',
    transform: 'translateX(-50%)',
    width: '120%',
    height: '50%',
    background: 'radial-gradient(ellipse, rgba(225,6,0,0.06) 0%, transparent 70%)',
    pointerEvents: 'none',
  },
  bgGrid: {
    position: 'absolute',
    inset: 0,
    backgroundImage:
      'linear-gradient(rgba(255,255,255,0.015) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.015) 1px, transparent 1px)',
    backgroundSize: '60px 60px',
    pointerEvents: 'none',
  },
  content: { position: 'relative', zIndex: 1, maxWidth: 860, width: '100%' },
  heroSection: { textAlign: 'center', marginBottom: 36 },
  logoBadge: { fontSize: 40, marginBottom: 12, filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.5))' },
  title: { fontSize: 30, fontWeight: 800, color: '#fff', letterSpacing: -0.8, marginBottom: 6 },
  subtitle: { fontSize: 15, color: 'var(--text-secondary)', marginBottom: 4, fontWeight: 400 },
  tagline: { fontSize: 12, color: 'var(--text-muted)', letterSpacing: 0.5 },
  tierGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))',
    gap: 14,
  },
  tierCard: {
    background: 'var(--bg-secondary)',
    borderRadius: 'var(--radius-lg)',
    padding: '22px 20px',
    display: 'flex',
    flexDirection: 'column',
    transition: 'all 0.3s var(--ease-out)',
    cursor: 'default',
  },
  popularBadge: {
    position: 'absolute',
    top: -1,
    left: '50%',
    transform: 'translateX(-50%) translateY(-50%)',
    padding: '3px 12px',
    borderRadius: 'var(--radius-full)',
    fontSize: 9,
    fontWeight: 700,
    letterSpacing: 1.2,
    color: '#000',
  },
  cta: {
    display: 'block',
    textAlign: 'center',
    padding: '11px 0',
    borderRadius: 'var(--radius-md)',
    fontWeight: 600,
    fontSize: 13,
    textDecoration: 'none',
    transition: 'all 0.2s ease',
    letterSpacing: 0.2,
  },
  trust: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
    marginTop: 28,
    fontSize: 11,
    color: 'var(--text-muted)',
  },
};
