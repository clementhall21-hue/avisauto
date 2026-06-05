import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
  Sequence,
  Easing,
} from 'remotion';
import React from 'react';

const NAVY = '#0b0f1e';
const NAVY_MID = '#111827';
const INDIGO = '#6366f1';
const GREEN = '#34d399';
const RED = '#f43f5e';
const WHITE = '#e8eaf6';
const MUTED = '#8892b0';

function useFadeUp(frame: number, delay = 0, duration = 18) {
  const opacity = interpolate(frame - delay, [0, duration], [0, 1], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
  });
  const y = interpolate(frame - delay, [0, duration], [28, 0], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
    easing: Easing.out(Easing.cubic),
  });
  return { opacity, y };
}

// ── SCÈNE 1 : Le problème (0–3s = 0–90fr) ────────────────────────────────────
// VOIX OFF : "Répondre à vos avis Google... ça vous prend combien de temps ?"
const Scene1: React.FC = () => {
  const frame = useCurrentFrame();
  const badge = useFadeUp(frame, 5);
  const big = useFadeUp(frame, 15);
  const sub = useFadeUp(frame, 30);

  const pulse = interpolate(frame % 20, [0, 10, 20], [1, 1.04, 1], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill style={{
      background: NAVY, fontFamily: 'Inter, sans-serif',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
    }}>
      <div style={{
        position: 'absolute', top: '40%', left: '50%',
        transform: 'translate(-50%, -50%)',
        width: 800, height: 800, borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(244,63,94,0.12) 0%, transparent 65%)',
      }} />

      <div style={{ opacity: badge.opacity, transform: `translateY(${badge.y}px)`, marginBottom: 40 }}>
        <div style={{
          background: 'rgba(244,63,94,0.1)', border: '1px solid rgba(244,63,94,0.3)',
          borderRadius: 50, padding: '10px 28px',
          color: RED, fontSize: 26, fontWeight: 700, letterSpacing: 1,
        }}>
          ⏱ Le problème
        </div>
      </div>

      <div style={{
        opacity: big.opacity,
        transform: `translateY(${big.y}px) scale(${pulse})`,
        textAlign: 'center',
      }}>
        <div style={{
          fontSize: 130, fontWeight: 900, lineHeight: 0.9, letterSpacing: -4,
          background: 'linear-gradient(135deg, #f43f5e, #fb923c)',
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
        }}>
          1 à 3<span style={{ fontSize: 80 }}>h</span>
        </div>
      </div>

      <div style={{
        opacity: sub.opacity, transform: `translateY(${sub.y}px)`,
        textAlign: 'center', marginTop: 24,
        fontSize: 42, color: MUTED, fontWeight: 600, lineHeight: 1.3,
      }}>
        perdues chaque semaine<br />
        <span style={{ color: WHITE }}>à répondre aux avis Google</span>
      </div>
    </AbsoluteFill>
  );
};

// ── SCÈNE 2 : Le chaos (3–7s = 90–210fr) ─────────────────────────────────────
// VOIX OFF : "Les notifications s'accumulent, vous ne savez plus où donner de la tête..."
const NotifPile: React.FC<{ name: string; stars: number; text: string; delay: number; index: number }> = ({ name, stars, text, delay, index }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame: frame - delay, fps, config: { damping: 12, stiffness: 70 }, durationInFrames: 35 });
  const ty = interpolate(s, [0, 1], [-80, 0]);
  const opacity = interpolate(s, [0, 0.3, 1], [0, 1, 1]);
  const rotate = interpolate(index, [0, 1, 2, 3], [-3, 1, -2, 2]);

  return (
    <div style={{
      position: 'absolute',
      left: 50, right: 50,
      top: 220 + index * 110,
      opacity,
      transform: `translateY(${ty}px) rotate(${rotate}deg)`,
    }}>
      <div style={{
        background: NAVY_MID,
        border: `1px solid ${index === 3 ? 'rgba(244,63,94,0.4)' : 'rgba(255,255,255,0.07)'}`,
        borderRadius: 16, padding: '16px 22px',
        display: 'flex', alignItems: 'center', gap: 14,
        boxShadow: index === 3 ? '0 0 20px rgba(244,63,94,0.2)' : 'none',
      }}>
        <div style={{
          width: 44, height: 44, borderRadius: '50%', flexShrink: 0,
          background: ['rgba(99,102,241,0.2)', 'rgba(244,63,94,0.2)', 'rgba(16,185,129,0.2)', 'rgba(245,158,11,0.2)'][index],
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: [INDIGO, RED, GREEN, '#f59e0b'][index],
          fontWeight: 800, fontSize: 15,
        }}>
          {name.split(' ').map(w => w[0]).join('')}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ color: WHITE, fontWeight: 700, fontSize: 22 }}>{name}</div>
          <div style={{ color: '#f59e0b', fontSize: 18 }}>{'★'.repeat(stars)}{'☆'.repeat(5 - stars)}</div>
        </div>
        <div style={{
          background: 'rgba(244,63,94,0.15)', borderRadius: 8, padding: '4px 10px',
          color: RED, fontSize: 18, fontWeight: 700,
        }}>
          Sans réponse
        </div>
      </div>
    </div>
  );
};

const Scene2: React.FC = () => {
  const frame = useCurrentFrame();
  const title = useFadeUp(frame, 5);

  const notifs = [
    { name: 'Marie L.', stars: 5, text: 'Super !', delay: 5 },
    { name: 'Thomas D.', stars: 2, text: 'Décevant...', delay: 20 },
    { name: 'Sophie M.', stars: 1, text: 'Jamais je reviendrai', delay: 35 },
    { name: 'Antoine G.', stars: 4, text: 'Bien dans l\'ensemble', delay: 50 },
  ];

  return (
    <AbsoluteFill style={{ background: NAVY, fontFamily: 'Inter, sans-serif', overflow: 'hidden' }}>
      <div style={{
        position: 'absolute', top: 120, left: 60, right: 60,
        opacity: title.opacity, transform: `translateY(${title.y}px)`,
        textAlign: 'center',
      }}>
        <div style={{ fontSize: 52, fontWeight: 900, color: WHITE, lineHeight: 1.1 }}>
          Pendant ce temps,<br />
          <span style={{ color: RED }}>vos clients attendent...</span>
        </div>
      </div>

      {notifs.map((n, i) => (
        <NotifPile key={i} name={n.name} stars={n.stars} text={n.text} delay={n.delay} index={i} />
      ))}
    </AbsoluteFill>
  );
};

// ── SCÈNE 3 : La révélation (7–10s = 210–300fr) ───────────────────────────────
// VOIX OFF : "On a créé StarReviews. L'IA répond à votre place, en 2 secondes."
const Scene3: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame: frame - 5, fps, config: { damping: 12, stiffness: 60 }, durationInFrames: 50 });

  const scale = interpolate(s, [0, 1], [0.7, 1]);
  const opacity = interpolate(s, [0, 1], [0, 1]);
  const glow = interpolate(frame, [0, 45], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  const sub = useFadeUp(frame, 35);

  return (
    <AbsoluteFill style={{
      background: NAVY, fontFamily: 'Inter, sans-serif',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
    }}>
      <div style={{
        position: 'absolute', top: '40%', left: '50%', transform: 'translate(-50%,-50%)',
        width: 900, height: 900, borderRadius: '50%',
        background: `radial-gradient(circle, rgba(99,102,241,${0.2 * glow}) 0%, transparent 65%)`,
      }} />

      <div style={{ opacity, transform: `scale(${scale})`, textAlign: 'center', padding: '0 50px' }}>
        <div style={{ fontSize: 100, marginBottom: 20 }}>⚡</div>
        <div style={{
          fontSize: 90, fontWeight: 900, lineHeight: 0.95, letterSpacing: -3,
          background: 'linear-gradient(135deg, #818cf8, #06b6d4, #34d399)',
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
        }}>
          Star<br />Reviews
        </div>
      </div>

      <div style={{
        opacity: sub.opacity, transform: `translateY(${sub.y}px)`,
        marginTop: 40, textAlign: 'center', padding: '0 60px',
        fontSize: 38, color: MUTED, fontWeight: 600, lineHeight: 1.4,
      }}>
        L'IA répond à votre place<br />
        <span style={{ color: GREEN, fontWeight: 800 }}>en 2 secondes</span>
      </div>
    </AbsoluteFill>
  );
};

// ── SCÈNE 4 : La démo (10–18s = 300–540fr) ────────────────────────────────────
// VOIX OFF : "Regardez — un avis arrive, l'IA génère une réponse personnalisée, et c'est publié automatiquement."
const Scene4: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const card = useFadeUp(frame, 5);

  const typingProgress = interpolate(frame, [40, 120], [0, 1], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
    easing: Easing.out(Easing.cubic),
  });

  const fullReply = "Merci infiniment Marie pour ce retour chaleureux ! Toute notre équipe est ravie de vous avoir accueillie dans les meilleures conditions. Nous espérons vous revoir très bientôt !";
  const visibleReply = fullReply.slice(0, Math.floor(typingProgress * fullReply.length));

  const badge = spring({ frame: frame - 130, fps, config: { damping: 12, stiffness: 80 }, durationInFrames: 30 });
  const badgeScale = interpolate(badge, [0, 1], [0.5, 1]);
  const badgeOpacity = interpolate(badge, [0, 1], [0, 1]);

  const pulse = interpolate(frame % 25, [0, 12, 25], [1, 1.03, 1], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill style={{ background: NAVY, fontFamily: 'Inter, sans-serif', overflow: 'hidden' }}>
      <div style={{
        position: 'absolute', top: 80, left: 60, right: 60,
        opacity: card.opacity, transform: `translateY(${card.y}px)`,
      }}>
        <div style={{ fontSize: 36, fontWeight: 800, color: MUTED, marginBottom: 20 }}>
          StarReviews · Dashboard
        </div>

        {/* Review card */}
        <div style={{
          background: NAVY_MID, border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 20, padding: 28,
          boxShadow: '0 20px 60px rgba(0,0,0,0.4)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16 }}>
            <div style={{
              width: 52, height: 52, borderRadius: '50%', flexShrink: 0,
              background: '#dbeafe', color: '#1e40af',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontWeight: 800, fontSize: 18,
            }}>ML</div>
            <div>
              <div style={{ color: WHITE, fontWeight: 700, fontSize: 28 }}>Marie Laurent</div>
              <div style={{ color: '#f59e0b', fontSize: 24 }}>★★★★★</div>
            </div>
            <div style={{
              marginLeft: 'auto',
              background: 'rgba(244,63,94,0.1)', border: '1px solid rgba(244,63,94,0.2)',
              borderRadius: 8, padding: '6px 14px',
              color: RED, fontSize: 20, fontWeight: 600,
            }}>
              Il y a 2 min
            </div>
          </div>
          <div style={{ color: MUTED, fontSize: 26, fontStyle: 'italic', lineHeight: 1.4 }}>
            "Service impeccable, équipe très professionnelle. Je recommande vivement !"
          </div>
        </div>

        {/* AI Reply */}
        <div style={{
          marginTop: 16,
          background: 'rgba(52,211,153,0.05)', border: '1px solid rgba(52,211,153,0.2)',
          borderRadius: 20, padding: 28,
          borderLeft: `4px solid ${GREEN}`,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
            <div style={{
              background: 'rgba(52,211,153,0.1)', border: '1px solid rgba(52,211,153,0.3)',
              borderRadius: 8, padding: '6px 16px',
              color: GREEN, fontSize: 22, fontWeight: 700,
            }}>
              🤖 IA · Chaleureux
            </div>
            {typingProgress > 0 && typingProgress < 1 && (
              <div style={{ color: GREEN, fontSize: 20, opacity: 0.7 }}>rédaction en cours...</div>
            )}
          </div>
          <div style={{ color: GREEN, fontSize: 24, lineHeight: 1.6, minHeight: 80 }}>
            {visibleReply}
            {typingProgress < 1 && (
              <span style={{ opacity: frame % 10 < 5 ? 1 : 0, color: GREEN }}>|</span>
            )}
          </div>
        </div>

        {/* Published badge */}
        <div style={{
          marginTop: 20, textAlign: 'center',
          opacity: badgeOpacity, transform: `scale(${badgeScale * pulse})`,
        }}>
          <div style={{
            display: 'inline-block',
            background: 'linear-gradient(135deg, rgba(52,211,153,0.2), rgba(6,182,212,0.2))',
            border: '2px solid rgba(52,211,153,0.5)',
            borderRadius: 50, padding: '18px 48px',
            color: GREEN, fontSize: 34, fontWeight: 900,
            boxShadow: '0 0 40px rgba(52,211,153,0.2)',
          }}>
            ✅ Publié sur Google automatiquement
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};

// ── SCÈNE 5 : Les avantages rapides (18–22s = 540–660fr) ──────────────────────
// VOIX OFF : "Personnalisez le ton, la longueur, votre signature. Zéro effort."
const Pill: React.FC<{ icon: string; text: string; delay: number; color: string }> = ({ icon, text, delay, color }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame: frame - delay, fps, config: { damping: 14, stiffness: 90 }, durationInFrames: 30 });
  const scale = interpolate(s, [0, 1], [0.6, 1]);
  const opacity = interpolate(s, [0, 1], [0, 1]);

  return (
    <div style={{ opacity, transform: `scale(${scale})` }}>
      <div style={{
        background: `rgba(${color}, 0.08)`,
        border: `1px solid rgba(${color}, 0.3)`,
        borderRadius: 20, padding: '28px 36px',
        display: 'flex', alignItems: 'center', gap: 20,
      }}>
        <div style={{
          width: 70, height: 70, borderRadius: 16, flexShrink: 0,
          background: `rgba(${color}, 0.12)`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 34,
        }}>{icon}</div>
        <div style={{ color: WHITE, fontWeight: 700, fontSize: 32 }}>{text}</div>
      </div>
    </div>
  );
};

const Scene5: React.FC = () => {
  const frame = useCurrentFrame();
  const title = useFadeUp(frame, 0);

  const pills = [
    { icon: '🎨', text: '4 tons IA différents', delay: 15, color: '99,102,241' },
    { icon: '📏', text: 'Court / Normal / Développé', delay: 30, color: '52,211,153' },
    { icon: '✍️', text: 'Votre signature personnalisée', delay: 45, color: '6,182,212' },
    { icon: '🤖', text: 'Mode 100% automatique', delay: 60, color: '245,158,11' },
  ];

  return (
    <AbsoluteFill style={{ background: NAVY, fontFamily: 'Inter, sans-serif', overflow: 'hidden' }}>
      <div style={{
        position: 'absolute', top: 100, left: 60, right: 60,
        opacity: title.opacity, transform: `translateY(${title.y}px)`,
        fontSize: 58, fontWeight: 900, color: WHITE, lineHeight: 1.1, textAlign: 'center',
      }}>
        Tout est<br />
        <span style={{
          background: 'linear-gradient(135deg, #818cf8, #06b6d4)',
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
        }}>personnalisable</span>
      </div>

      <div style={{
        position: 'absolute', top: 380, left: 40, right: 40,
        display: 'flex', flexDirection: 'column', gap: 18,
      }}>
        {pills.map((p, i) => (
          <Pill key={i} icon={p.icon} text={p.text} delay={p.delay} color={p.color} />
        ))}
      </div>
    </AbsoluteFill>
  );
};

// ── SCÈNE 6 : CTA final (22–30s = 660–900fr) ─────────────────────────────────
// VOIX OFF : "14 jours gratuits, sans carte bancaire. Rejoignez StarReviews maintenant."
const Scene6: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const logo = useFadeUp(frame, 5);
  const title = useFadeUp(frame, 20);
  const free = useFadeUp(frame, 40);

  const btnSpring = spring({ frame: frame - 55, fps, config: { damping: 10, stiffness: 80 }, durationInFrames: 35 });
  const btnScale = interpolate(btnSpring, [0, 1], [0.7, 1]);
  const btnOpacity = interpolate(btnSpring, [0, 1], [0, 1]);
  const pulse = interpolate(frame % 30, [0, 15, 30], [1, 1.04, 1], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
  });

  const url = useFadeUp(frame, 100);

  const stars = [0, 1, 2, 3, 4, 5, 6];

  return (
    <AbsoluteFill style={{
      background: `linear-gradient(160deg, ${NAVY} 0%, #0d1130 50%, ${NAVY} 100%)`,
      fontFamily: 'Inter, sans-serif',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
    }}>
      <div style={{
        position: 'absolute', top: '35%', left: '50%', transform: 'translate(-50%,-50%)',
        width: 1000, height: 1000, borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(99,102,241,0.18) 0%, transparent 60%)',
      }} />

      {stars.map(i => (
        <div key={i} style={{
          position: 'absolute',
          top: `${8 + i * 12}%`, left: `${8 + (i % 3) * 36}%`,
          color: 'rgba(245,158,11,0.12)', fontSize: 44 + (i % 3) * 16,
          transform: `rotate(${i * 15}deg)`,
        }}>★</div>
      ))}

      <div style={{ opacity: logo.opacity, transform: `translateY(${logo.y}px)`, marginBottom: 30 }}>
        <div style={{
          fontSize: 56, fontWeight: 900,
          background: 'linear-gradient(135deg, #818cf8, #06b6d4)',
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
        }}>
          ⭐ StarReviews
        </div>
      </div>

      <div style={{
        opacity: title.opacity, transform: `translateY(${title.y}px)`,
        textAlign: 'center', padding: '0 50px', marginBottom: 40,
        fontSize: 76, fontWeight: 900, color: WHITE, lineHeight: 1.0, letterSpacing: -2,
      }}>
        Arrêtez de<br />perdre du temps.<br />
        <span style={{
          background: 'linear-gradient(135deg, #34d399, #06b6d4)',
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
        }}>Automatisez.</span>
      </div>

      <div style={{
        opacity: free.opacity, transform: `translateY(${free.y}px)`,
        marginBottom: 40, textAlign: 'center',
      }}>
        <div style={{
          background: 'rgba(52,211,153,0.08)', border: '1px solid rgba(52,211,153,0.3)',
          borderRadius: 50, padding: '14px 40px',
          color: GREEN, fontSize: 30, fontWeight: 700,
        }}>
          ✨ 14 jours gratuits · Sans carte bancaire
        </div>
      </div>

      <div style={{
        opacity: btnOpacity,
        transform: `scale(${btnScale * pulse})`,
        marginBottom: 30,
      }}>
        <div style={{
          background: 'linear-gradient(135deg, #6366f1, #7c3aed)',
          borderRadius: 22, padding: '34px 90px',
          color: WHITE, fontSize: 44, fontWeight: 900,
          boxShadow: '0 0 80px rgba(99,102,241,0.45)',
          textAlign: 'center',
        }}>
          Essayer gratuitement →
        </div>
      </div>

      <div style={{
        opacity: url.opacity, transform: `translateY(${url.y}px)`,
        textAlign: 'center', marginTop: 10,
      }}>
        <div style={{
          background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.3)',
          borderRadius: 50, padding: '12px 32px',
          color: '#818cf8', fontSize: 28, fontWeight: 700,
        }}>
          💬 Contactez-moi en DM pour plus d'infos
        </div>
      </div>
    </AbsoluteFill>
  );
};

// ── MAIN ──────────────────────────────────────────────────────────────────────
export const StarReviewsVideo: React.FC = () => {
  return (
    <AbsoluteFill style={{ background: NAVY }}>
      {/* Scène 1 : Le problème — 0 à 3s */}
      <Sequence from={0} durationInFrames={90}><Scene1 /></Sequence>
      {/* Scène 2 : Le chaos — 3s à 7s */}
      <Sequence from={90} durationInFrames={120}><Scene2 /></Sequence>
      {/* Scène 3 : La révélation — 7s à 10s */}
      <Sequence from={210} durationInFrames={90}><Scene3 /></Sequence>
      {/* Scène 4 : La démo — 10s à 18s */}
      <Sequence from={300} durationInFrames={240}><Scene4 /></Sequence>
      {/* Scène 5 : Les avantages — 18s à 22s */}
      <Sequence from={540} durationInFrames={120}><Scene5 /></Sequence>
      {/* Scène 6 : CTA final — 22s à 30s */}
      <Sequence from={660} durationInFrames={240}><Scene6 /></Sequence>
    </AbsoluteFill>
  );
};
