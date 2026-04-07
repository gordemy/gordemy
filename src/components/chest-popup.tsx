"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/lib/supabase";

// ─── Chest reward types ───────────────────────────────────────────────────────

export type ChestTier = "bronze" | "silver" | "gold" | "legendary";

interface ChestReward {
  type: "xp" | "gems" | "shield" | "xp_boost";
  value: number;
  label: string;
  emoji: string;
  color: string;
}

const CHEST_CONFIGS: Record<ChestTier, {
  emoji: string;
  name: string;
  color: string;
  glow: string;
  border: string;
  particles: string;
  rewards: ChestReward[];
  weights: number[];
}> = {
  bronze: {
    emoji: "📦", name: "Бронзовий сундук", color: "text-gordemy-orange",
    glow: "shadow-gordemy-orange/30 shadow-xl", border: "border-gordemy-orange/40",
    particles: "bg-gordemy-orange",
    rewards: [
      { type: "xp",    value: 30,  label: "+30 XP",        emoji: "✨", color: "text-gordemy-blue"   },
      { type: "xp",    value: 50,  label: "+50 XP",        emoji: "💫", color: "text-gordemy-blue"   },
      { type: "gems",  value: 3,   label: "+3 💎",          emoji: "💎", color: "text-gordemy-purple" },
      { type: "gems",  value: 5,   label: "+5 💎",          emoji: "💎", color: "text-gordemy-purple" },
    ],
    weights: [40, 30, 20, 10],
  },
  silver: {
    emoji: "🎁", name: "Срібний сундук", color: "text-gordemy-muted",
    glow: "shadow-gordemy-muted/30 shadow-xl", border: "border-gordemy-muted/50",
    particles: "bg-gray-300",
    rewards: [
      { type: "xp",    value: 75,  label: "+75 XP",        emoji: "✨", color: "text-gordemy-blue"   },
      { type: "xp",    value: 100, label: "+100 XP",       emoji: "💫", color: "text-gordemy-blue"   },
      { type: "gems",  value: 8,   label: "+8 💎",          emoji: "💎", color: "text-gordemy-purple" },
      { type: "shield",value: 1,   label: "🛡️ Streak Shield",emoji: "🛡️",color: "text-gordemy-green"  },
    ],
    weights: [35, 35, 20, 10],
  },
  gold: {
    emoji: "🏆", name: "Золотий сундук!", color: "text-gordemy-orange",
    glow: "shadow-gordemy-orange/50 shadow-2xl", border: "border-gordemy-orange/70",
    particles: "bg-gordemy-orange",
    rewards: [
      { type: "xp",      value: 150, label: "+150 XP",      emoji: "⚡", color: "text-gordemy-orange" },
      { type: "xp",      value: 200, label: "+200 XP",      emoji: "🔥", color: "text-gordemy-orange" },
      { type: "gems",    value: 15,  label: "+15 💎",        emoji: "💎", color: "text-gordemy-purple" },
      { type: "xp_boost",value: 2,   label: "x2 XP 30хв!",  emoji: "⚡", color: "text-gordemy-orange" },
      { type: "shield",  value: 1,   label: "🛡️ Shield",    emoji: "🛡️", color: "text-gordemy-green"  },
    ],
    weights: [25, 30, 25, 10, 10],
  },
  legendary: {
    emoji: "💠", name: "LEGENDARY CHEST!!!", color: "text-gordemy-purple",
    glow: "shadow-gordemy-purple/60 shadow-2xl", border: "border-gordemy-purple/80",
    particles: "bg-gordemy-purple",
    rewards: [
      { type: "xp",   value: 300, label: "+300 XP",       emoji: "🔱", color: "text-gordemy-orange" },
      { type: "xp",   value: 500, label: "+500 XP",       emoji: "⚔️", color: "text-gordemy-orange" },
      { type: "gems", value: 30,  label: "+30 💎",         emoji: "💎", color: "text-gordemy-purple" },
      { type: "gems", value: 50,  label: "+50 💎",         emoji: "👑", color: "text-gordemy-orange" },
    ],
    weights: [20, 20, 30, 30],
  },
};

// ─── Roll chance by session score ─────────────────────────────────────────────

export function rollChest(score: number, totalQ: number): ChestTier | null {
  const accuracy = totalQ > 0 ? score / totalQ : 0;
  // Base 30% chance, higher accuracy = better chest
  const rand = Math.random();
  if (rand > 0.30) return null; // 70% no chest

  const tierRand = Math.random();
  if (accuracy >= 0.8) {
    // High scorer: 5% legendary, 25% gold, 40% silver, 30% bronze
    if (tierRand < 0.05) return "legendary";
    if (tierRand < 0.30) return "gold";
    if (tierRand < 0.70) return "silver";
    return "bronze";
  } else if (accuracy >= 0.6) {
    if (tierRand < 0.02) return "legendary";
    if (tierRand < 0.15) return "gold";
    if (tierRand < 0.55) return "silver";
    return "bronze";
  } else {
    if (tierRand < 0.40) return "silver";
    return "bronze";
  }
}

function weightedRandom<T>(items: T[], weights: number[]): T {
  const total = weights.reduce((a, b) => a + b, 0);
  let r = Math.random() * total;
  for (let i = 0; i < items.length; i++) {
    r -= weights[i];
    if (r <= 0) return items[i];
  }
  return items[items.length - 1];
}

// ─── Particle effect ──────────────────────────────────────────────────────────

function Particles({ color }: { color: string }) {
  const particles = Array.from({ length: 16 }, (_, i) => ({
    id: i,
    angle: (i / 16) * 360 + (Math.random() - 0.5) * 30,
    distance: 60 + Math.random() * 60,
    size: 4 + Math.random() * 6,
    delay: Math.random() * 0.3,
  }));

  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
      {particles.map(p => (
        <motion.div
          key={p.id}
          className={`absolute rounded-full ${color} opacity-80`}
          style={{ width: p.size, height: p.size }}
          initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
          animate={{
            x: Math.cos((p.angle * Math.PI) / 180) * p.distance,
            y: Math.sin((p.angle * Math.PI) / 180) * p.distance,
            opacity: 0,
            scale: 0,
          }}
          transition={{ duration: 0.8, delay: p.delay, ease: "easeOut" }}
        />
      ))}
    </div>
  );
}

// ─── Main ChestPopup ──────────────────────────────────────────────────────────

interface ChestPopupProps {
  tier: ChestTier;
  userId: string;
  onClose: () => void;
}

export function ChestPopup({ tier, userId, onClose }: ChestPopupProps) {
  const cfg = CHEST_CONFIGS[tier];
  const [phase, setPhase] = useState<"closed" | "opening" | "open">("closed");
  const [reward, setReward] = useState<ChestReward | null>(null);
  const [showParticles, setShowParticles] = useState(false);

  function openChest() {
    setPhase("opening");
    setShowParticles(true);

    setTimeout(() => {
      const r = weightedRandom(cfg.rewards, cfg.weights);
      setReward(r);
      setPhase("open");
      applyReward(r);
    }, 700);

    setTimeout(() => setShowParticles(false), 1200);
  }

  async function applyReward(r: ChestReward) {
    const { data: stu } = await supabase.from("students").select("xp, level, gems, streak_shields").eq("id", userId).single();
    if (!stu) return;

    if (r.type === "xp") {
      const newXp = (stu.xp || 0) + r.value;
      await supabase.from("students").update({ xp: newXp, level: Math.floor(newXp / 100) + 1 }).eq("id", userId);
    } else if (r.type === "gems") {
      await supabase.from("students").update({ gems: (stu.gems || 0) + r.value }).eq("id", userId);
    } else if (r.type === "shield") {
      await supabase.from("students").update({ streak_shields: Math.min((stu.streak_shields || 0) + 1, 3) }).eq("id", userId);
    }
    // xp_boost would need a temporary state — for MVP just give extra XP
    if (r.type === "xp_boost") {
      const bonus = 100;
      const newXp = (stu.xp || 0) + bonus;
      await supabase.from("students").update({ xp: newXp, level: Math.floor(newXp / 100) + 1 }).eq("id", userId);
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm px-6"
      onClick={phase === "open" ? onClose : undefined}
    >
      <motion.div
        initial={{ scale: 0.6, opacity: 0, y: 40 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.8, opacity: 0 }}
        transition={{ type: "spring", damping: 14 }}
        className={`relative w-full max-w-[360px] bg-gordemy-card border-2 ${cfg.border} rounded-3xl p-8 text-center overflow-hidden ${cfg.glow}`}
        onClick={e => e.stopPropagation()}
      >
        {/* Background shimmer */}
        <div className="absolute inset-0 opacity-10">
          <div className={`absolute inset-0 bg-gradient-to-br ${
            tier === "legendary" ? "from-gordemy-purple via-gordemy-blue to-gordemy-orange" :
            tier === "gold" ? "from-gordemy-orange to-yellow-600" :
            tier === "silver" ? "from-gray-400 to-gray-600" :
            "from-gordemy-orange/50 to-gordemy-orange/20"
          }`} />
        </div>

        {/* Particles */}
        <AnimatePresence>
          {showParticles && <Particles color={cfg.particles} />}
        </AnimatePresence>

        {/* Tier label */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className={`text-xs font-black uppercase tracking-widest mb-3 ${cfg.color}`}
        >
          {cfg.name}
        </motion.div>

        {/* Chest emoji */}
        <motion.div
          className="relative text-8xl mb-6 inline-block cursor-pointer select-none"
          animate={phase === "closed"
            ? { scale: [1, 1.05, 1], rotate: [0, -3, 3, 0] }
            : phase === "opening"
            ? { scale: [1, 1.3, 0.9, 1.15], rotate: [0, -10, 10, 0] }
            : { scale: 1 }
          }
          transition={phase === "closed"
            ? { repeat: Infinity, duration: 2 }
            : { duration: 0.6 }
          }
          onClick={phase === "closed" ? openChest : undefined}
        >
          {phase === "open" ? (reward?.emoji || "🎉") : cfg.emoji}

          {phase === "closed" && (
            <motion.div
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ repeat: Infinity, duration: 1.5 }}
              className="absolute -bottom-8 left-1/2 -translate-x-1/2 text-xs text-gordemy-muted whitespace-nowrap font-bold"
            >
              👆 Натисни щоб відкрити
            </motion.div>
          )}
        </motion.div>

        {/* Reward reveal */}
        <AnimatePresence mode="wait">
          {phase === "open" && reward && (
            <motion.div
              key="reward"
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", delay: 0.1 }}
              className="mb-6"
            >
              <div className={`text-4xl font-black mb-1 ${reward.color}`}>{reward.label}</div>
              {reward.type === "xp_boost" && (
                <div className="text-gordemy-muted text-sm">Бонус зараховано як +100 XP!</div>
              )}
              {reward.type === "shield" && (
                <div className="text-gordemy-muted text-sm">Захищає твою серію на 1 день!</div>
              )}
            </motion.div>
          )}
          {phase !== "open" && <div key="placeholder" className="h-10 mb-6" />}
        </AnimatePresence>

        {/* Action buttons */}
        {phase === "open" ? (
          <motion.button
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            onClick={onClose}
            className="w-full py-3.5 rounded-2xl font-black text-white bg-gradient-to-r from-gordemy-blue to-gordemy-purple hover:opacity-90 transition-opacity"
          >
            🎉 Забрати нагороду!
          </motion.button>
        ) : phase === "closed" ? (
          <button
            onClick={openChest}
            className={`w-full py-3.5 rounded-2xl font-black text-white bg-gradient-to-r ${
              tier === "legendary" ? "from-gordemy-purple to-gordemy-orange" :
              tier === "gold" ? "from-gordemy-orange to-yellow-600" :
              "from-gordemy-blue to-gordemy-purple"
            } hover:opacity-90 transition-opacity animate-pulse`}
          >
            ✨ Відкрити!
          </button>
        ) : (
          <div className="w-full py-3.5 rounded-2xl font-black text-white bg-gordemy-border text-center">
            Відкриваємо...
          </div>
        )}

        {/* Skip */}
        {phase !== "open" && (
          <button onClick={onClose} className="mt-3 text-xs text-gordemy-muted hover:text-white transition-colors">
            Пропустити
          </button>
        )}
      </motion.div>
    </motion.div>
  );
}
