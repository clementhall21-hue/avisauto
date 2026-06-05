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
const WHITE = '#e8eaf6';
const MUTED = '#8892b0';

function useFadeUp(frame: number, delay = 0) {
  const opacity = interpolate(frame - delay, [0, 20], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const y = interpolate(frame - delay, [0, 20], [30, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic) });
  return { opacity, y };
}

// ── NOTIF CARD (extracted to avoid hooks-in-map) ─────────────────────────────
const NotifCard: React.FC<{ name: string; stars: number; text: string; delay: number; index: number }> = ({ name, stars, text, delay, index }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame: frame - delay, fps, config: { damping: 14, stiffness: 80 }, durationInFrames: 40 });
  const scale = interpolate(s, [0, 1], [0.85, 1]);
  const opacity = interpolate(s, [0, 1], [0, 1]);
  const tx = interpolate(s, [0, 1], [60, 0]);

  return (
    <div style={{
      position: 'absolute',
      bottom: 320 - index * 130,
      left: 60, right: 60,
      opacity,
      transform: `scale(${scale}) translateX(${tx}px)`,
    }}>
      <div style={{
        background: NAVY_MID, border: '1px solid rgba(255,255,255,0.07)',
        borderRadius: 16, padding: '18px 24px',
        display: 'flex', alignItems: 'center', gap: 16,
      }}>
        <div style={{
          width: 46, height: 46, borderRadius: '50%',
          background: index % 2 === 0 ? 'rgba(99,102,241,0.2)' : 'rgba(244,63,94,0.2)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: index % 2 === 0 ? INDIGO : '#f43f5e', fontWeight: 800, fontSize: 16, flexShrink: 0,
        }}>
          {name.split(' ').map(w => w[0]).join('')}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ color: WHITE, fontWeight: 700, fontSize: 24 }}>{name}</div>
          <div style={{ color: '#f59e0b', fontSize: 20 }}>{'★'.repeat(stars)}{'☆'.repeat(5 - stars)}</div>
          <div style={{ color: MUTED, fontSize: 22, marginTop: 2 }}>{text}</div>
        </div>
        <div style={{ color: '#f43f5e', fontSize: 28 }}>⏳</div>
      </div>
    </div>
  );
};

// ── FEATURE ROW ───────────────────────────────────────────────────────────────
const FeatureRow: React.FC<{ icon: string; title: string; desc: string; delay: number }> = ({ icon, title, desc, delay }) => {
  const frame = useCurrentFrame();
  const anim = useFadeUp(frame, delay + 10);
  return (
    <div style={{
      opacity: anim.opacity, transform: `translateY(${anim.y}px)`,
      background: NAVY_MID, border: '1px solid rgba(255,255,255,0.07)',
      borderRadius: 20, padding: '24px 28px',
      display: 'flex', alignItems: 'center', gap: 20,
    }}>
      <div style={{
        width: 64, height: 64, borderRadius: 14, flexShrink: 0,
        background: 'rgba(99,102,241,0.12)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 30,
      }}>{icon}</div>
      <div>
        <div style={{ color: WHITE, fontWeight: 700, fontSize: 28 }}>{title}</div>
        <div style={{ color: MUTED, fontSize: 22, marginTop: 4 }}>{desc}</div>
      </div>
    </div>
  );
};

// ── SCENE 1: Hook (0–8s = 0–240fr) ──────────────────────────────────────────
const Scene1: React.FC = () => {
  const frame = useCurrentFrame();
  const title = useFadeUp(frame, 10);
  const sub = useFadeUp(frame, 25);
  const badge = useFadeUp(frame, 5);

  const notifs = [
    { name: 'Marie L.', stars: 5, text: 'Service impeccable ! 5 étoiles', delay: 30 },
    { name: 'Thomas D.', stars: 4, text: 'Très bon restaurant...', delay: 60 },
    { name: 'Sophie M.', stars: 2, text: "Chambre pas propre à l'arrivée.", delay: 90 },
    { name: 'Antoine G.', stars: 1, text: "Une heure d'attente au check-in !", delay: 120 },
  ];

  return (
    <AbsoluteFill style={{ background: NAVY, fontFamily: 'Inter, sans-serif', overflow: 'hidden' }}>
      <div style={{
        position: 'absolute', top: -200, left: '50%', transform: 'translateX(-50%)',
        width: 800, height: 800, borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(99,102,241,0.15) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />

      <div style={{ position: 'absolute', top: 180, left: '50%', transform: 'translateX(-50%)', opacity: badge.opacity }}>
        <div style={{
          background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.3)',
          borderRadius: 50, padding: '8px 20px',
          color: '#818cf8', fontSize: 22, fontWeight: 700,
          letterSpacing: 2, textTransform: 'uppercase', whiteSpace: 'nowrap',
        }}>
          ⭐ Pour les pros des avis Google
        </div>
      </div>

      <div style={{
        position: 'absolute', top: 280, left: 60, right: 60,
        opacity: title.opacity, transform: `translateY(${title.y}px)`,
      }}>
        <div style={{ fontSize: 88, fontWeight: 900, color: WHITE, lineHeight: 1.05, letterSpacing: -3 }}>
          Vous ignorez<br />vos avis<br />
          <span style={{
            background: 'linear-gradient(135deg, #818cf8, #06b6d4, #34d399)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          }}>Google ?</span>
        </div>
      </div>

      <div style={{
        position: 'absolute', top: 640, left: 60, right: 60,
        opacity: sub.opacity, transform: `translateY(${sub.y}px)`,
        fontSize: 34, color: MUTED, lineHeight: 1.5,
      }}>
        Chaque avis sans réponse,<br />c'est un client perdu.
      </div>

      {notifs.map((n, i) => (
        <NotifCard key={i} name={n.name} stars={n.stars} text={n.text} delay={n.delay} index={i} />
      ))}
    </AbsoluteFill>
  );
};

// ── SCENE 2: Solution (8–18s = 240–540fr) ────────────────────────────────────
const Scene2: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const title = useFadeUp(frame, 5);
  const dash = useFadeUp(frame, 20);
  const reply = useFadeUp(frame, 60);
  const badge = useFadeUp(frame, 80);

  const btnScale = spring({ frame: frame - 80, fps, config: { damping: 10, stiffness: 100 }, durationInFrames: 30 });
  const pulse = interpolate(frame % 30, [0, 15, 30], [1, 1.04, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  return (
    <AbsoluteFill style={{ background: NAVY, fontFamily: 'Inter, sans-serif', overflow: 'hidden' }}>
      <div style={{
        position: 'absolute', top: -100, right: -100,
        width: 600, height: 600, borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(52,211,153,0.12) 0%, transparent 70%)',
      }} />

      <div style={{
        position: 'absolute', top: 120, left: 60, right: 60,
        opacity: title.opacity, transform: `translateY(${title.y}px)`,
      }}>
        <div style={{ fontSize: 72, fontWeight: 900, color: WHITE, lineHeight: 1.1, letterSpacing: -2 }}>
          L'IA répond<br />
          <span style={{ color: GREEN }}>à votre place</span><br />
          en 2 secondes
        </div>
        <div style={{ fontSize: 32, color: MUTED, marginTop: 20, lineHeight: 1.5 }}>
          Avec votre ton, votre signature,<br />publiée automatiquement.
        </div>
      </div>

      <div style={{
        position: 'absolute', top: 520, left: 40, right: 40,
        opacity: dash.opacity, transform: `translateY(${dash.y}px)`,
      }}>
        <div style={{
          background: NAVY_MID, border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 24, overflow: 'hidden',
          boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
        }}>
          <div style={{
            background: '#1a2340', padding: '14px 20px',
            borderBottom: '1px solid rgba(255,255,255,0.07)',
          }}>
            <span style={{ color: MUTED, fontSize: 22 }}>StarReviews · Dashboard</span>
          </div>
          <div style={{ padding: 24 }}>
            <div style={{
              background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)',
              borderRadius: 14, padding: 20, marginBottom: 16,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
                <div style={{
                  width: 42, height: 42, borderRadius: '50%',
                  background: '#dbeafe', color: '#1e40af',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontWeight: 800, fontSize: 16,
                }}>ML</div>
                <div>
                  <div style={{ color: WHITE, fontWeight: 700, fontSize: 24 }}>Marie Laurent</div>
                  <div style={{ color: '#f59e0b', fontSize: 22 }}>★★★★★</div>
                </div>
              </div>
              <div style={{ color: MUTED, fontSize: 22, fontStyle: 'italic' }}>
                "Service impeccable, équipe très professionnelle !"
              </div>
            </div>

            <div style={{
              opacity: reply.opacity,
              transform: `translateY(${reply.y}px)`,
              borderLeft: `3px solid ${GREEN}`, paddingLeft: 16,
            }}>
              <div style={{
                background: 'rgba(52,211,153,0.08)', border: '1px solid rgba(52,211,153,0.2)',
                borderRadius: 10, padding: '6px 14px', display: 'inline-block',
                color: GREEN, fontSize: 20, fontWeight: 700, marginBottom: 10,
              }}>
                🤖 IA · Chaleureux
              </div>
              <div style={{ color: GREEN, fontSize: 22, lineHeight: 1.5 }}>
                "Merci infiniment Marie ! Toute l'équipe est ravie de vous avoir accueillie. À très bientôt !"
              </div>
            </div>
          </div>
        </div>
      </div>

      <div style={{
        position: 'absolute', bottom: 160, left: '50%',
        transform: `translateX(-50%) scale(${interpolate(btnScale, [0, 1], [0.8, 1]) * pulse})`,
        opacity: badge.opacity,
      }}>
        <div style={{
          background: 'rgba(52,211,153,0.15)', border: '2px solid rgba(52,211,153,0.4)',
          borderRadius: 50, padding: '16px 40px',
          color: GREEN, fontSize: 32, fontWeight: 800, whiteSpace: 'nowrap',
        }}>
          ✅ Publié automatiquement
        </div>
      </div>
    </AbsoluteFill>
  );
};

// ── SCENE 3: Features (18–24s = 540–720fr) ───────────────────────────────────
const Scene3: React.FC = () => {
  const frame = useCurrentFrame();
  const title = useFadeUp(frame, 5);

  const features = [
    { icon: '🎨', title: '4 tons IA', desc: 'Professionnel, Chaleureux, Empathique, Décontracté', delay: 0 },
    { icon: '📏', title: 'Court · Normal · Développé', desc: 'Choisissez la longueur de chaque réponse', delay: 15 },
    { icon: '✍️', title: 'Votre signature', desc: "L'IA signe avec le nom de votre choix", delay: 30 },
    { icon: '🤖', title: 'Mode automatique', desc: 'Publication sans intervention, 24h/24', delay: 45 },
  ];

  return (
    <AbsoluteFill style={{ background: NAVY, fontFamily: 'Inter, sans-serif', overflow: 'hidden' }}>
      <div style={{
        position: 'absolute', top: -200, left: -200,
        width: 700, height: 700, borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(99,102,241,0.1) 0%, transparent 70%)',
      }} />

      <div style={{
        position: 'absolute', top: 120, left: 60, right: 60,
        opacity: title.opacity, transform: `translateY(${title.y}px)`,
      }}>
        <div style={{ fontSize: 72, fontWeight: 900, color: WHITE, lineHeight: 1.1, letterSpacing: -2 }}>
          Tout ce qu'il<br />vous faut pour<br />
          <span style={{
            background: 'linear-gradient(135deg, #818cf8, #06b6d4)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          }}>briller sur Google</span>
        </div>
      </div>

      <div style={{ position: 'absolute', top: 500, left: 40, right: 40, display: 'flex', flexDirection: 'column', gap: 20 }}>
        {features.map((f, i) => (
          <FeatureRow key={i} icon={f.icon} title={f.title} desc={f.desc} delay={f.delay} />
        ))}
      </div>
    </AbsoluteFill>
  );
};

// ── SCENE 4: CTA (24–30s = 720–900fr) ────────────────────────────────────────
const Scene4: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const logo = useFadeUp(frame, 5);
  const title = useFadeUp(frame, 20);
  const sub = useFadeUp(frame, 35);
  const btn = useFadeUp(frame, 50);
  const free = useFadeUp(frame, 65);

  const btnScale = spring({ frame: frame - 50, fps, config: { damping: 10, stiffness: 100 }, durationInFrames: 30 });
  const pulse = interpolate(frame % 30, [0, 15, 30], [1, 1.03, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  const stars = [0,1,2,3,4,5,6,7];

  return (
    <AbsoluteFill style={{
      background: `linear-gradient(160deg, ${NAVY} 0%, #0f1628 50%, #0b0f1e 100%)`,
      fontFamily: 'Inter, sans-serif',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      overflow: 'hidden',
    }}>
      <div style={{
        position: 'absolute', top: '30%', left: '50%', transform: 'translate(-50%, -50%)',
        width: 900, height: 900, borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(99,102,241,0.18) 0%, transparent 65%)',
      }} />

      {stars.map((i) => (
        <div key={i} style={{
          position: 'absolute',
          top: `${10 + i * 11}%`,
          left: `${5 + (i % 3) * 35}%`,
          color: 'rgba(245,158,11,0.15)',
          fontSize: 40 + (i % 3) * 20,
        }}>★</div>
      ))}

      <div style={{ opacity: logo.opacity, transform: `translateY(${logo.y}px)`, marginBottom: 60 }}>
        <div style={{ fontSize: 64, fontWeight: 900, letterSpacing: -2 }}>
          <span style={{
            background: 'linear-gradient(135deg, #818cf8, #06b6d4)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          }}>StarReviews</span>
        </div>
      </div>

      <div style={{
        opacity: title.opacity, transform: `translateY(${title.y}px)`,
        textAlign: 'center', padding: '0 60px', marginBottom: 30,
      }}>
        <div style={{ fontSize: 80, fontWeight: 900, color: WHITE, lineHeight: 1.05, letterSpacing: -2 }}>
          Prêt à répondre<br />à tous vos avis ?
        </div>
      </div>

      <div style={{
        opacity: sub.opacity, transform: `translateY(${sub.y}px)`,
        textAlign: 'center', padding: '0 80px', marginBottom: 70,
        fontSize: 34, color: MUTED, lineHeight: 1.5,
      }}>
        Rejoignez les établissements qui ont automatisé leur réputation Google.
      </div>

      <div style={{
        opacity: btn.opacity,
        transform: `translateY(${btn.y}px) scale(${interpolate(btnScale, [0, 1], [0.8, 1]) * pulse})`,
        marginBottom: 30,
      }}>
        <div style={{
          background: 'linear-gradient(135deg, #6366f1, #7c3aed)',
          borderRadius: 20, padding: '32px 80px',
          color: WHITE, fontSize: 42, fontWeight: 900,
          boxShadow: '0 0 60px rgba(99,102,241,0.4)',
        }}>
          Essayer gratuitement →
        </div>
      </div>

      <div style={{ opacity: free.opacity, transform: `translateY(${free.y}px)`, textAlign: 'center' }}>
        <div style={{
          background: 'rgba(52,211,153,0.1)', border: '1px solid rgba(52,211,153,0.3)',
          borderRadius: 50, padding: '14px 36px',
          color: GREEN, fontSize: 30, fontWeight: 700,
        }}>
          ✨ 14 jours gratuits · Sans carte bancaire
        </div>
        <div style={{ color: MUTED, fontSize: 26, marginTop: 20 }}>avisauto.vercel.app</div>
      </div>
    </AbsoluteFill>
  );
};

// ── MAIN ──────────────────────────────────────────────────────────────────────
export const StarReviewsVideo: React.FC = () => {
  return (
    <AbsoluteFill style={{ background: NAVY }}>
      <Sequence from={0} durationInFrames={240}><Scene1 /></Sequence>
      <Sequence from={240} durationInFrames={300}><Scene2 /></Sequence>
      <Sequence from={540} durationInFrames={180}><Scene3 /></Sequence>
      <Sequence from={720} durationInFrames={180}><Scene4 /></Sequence>
    </AbsoluteFill>
  );
};
