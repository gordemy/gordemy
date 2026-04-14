"use client";

import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface LevelUpPopupProps {
  level: number;
  onClose: () => void;
}

const LEVEL_TITLES: Record<number, { title: string; emoji: string; color: string }> = {
  1:  { title: "Новачок",      emoji: "🌱", color: "text-zinc-400" },
  2:  { title: "Учень",        emoji: "📚", color: "text-blue-400" },
  3:  { title: "Практик",      emoji: "✏️", color: "text-cyan-400" },
  5:  { title: "Знавець",      emoji: "🧠", color: "text-teal-400" },
  7:  { title: "Майстер",      emoji: "🔥", color: "text-green-400" },
  10: { title: "Чемпіон",      emoji: "🏆", color: "text-amber-400" },
  15: { title: "Легенда",      emoji: "💎", color: "text-purple-400" },
  20: { title: "Елітний",      emoji: "⭐", color: "text-pink-400" },
  25: { title: "НМТ Мастер",   emoji: "👑", color: "text-yellow-300" },
  30: { title: "НМТ Чемпіон",  emoji: "🌟", color: "text-yellow-300" },
};

function getTitleForLevel(level: number) {
  const keys = Object.keys(LEVEL_TITLES).map(Number).sort((a, b) => b - a);
  for (const k of keys) {
    if (level >= k) return LEVEL_TITLES[k];
  }
  return LEVEL_TITLES[1];
}

const PARTICLES = ["⭐", "✨", "💫", "⚡", "🌟", "💥"];

export function LevelUpPopup({ level, onClose }: LevelUpPopupProps) {
  const info = getTitleForLevel(level);

  useEffect(() => {
    const t = setTimeout(onClose, 4000);
    return () => clearTimeout(t);
  }, [onClose]);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      >
        {/* Particle burst */}
        {PARTICLES.map((p, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 1, scale: 0, x: 0, y: 0 }}
            animate={{
              opacity: 0,
              scale: 1.5,
              x: Math.cos((i / PARTICLES.length) * Math.PI * 2) * 120,
              y: Math.sin((i / PARTICLES.length) * Math.PI * 2) * 120,
            }}
            transition={{ duration: 0.9, delay: 0.2 + i * 0.04, ease: "easeOut" }}
            className="absolute text-2xl pointer-events-none"
          >
            {p}
          </motion.div>
        ))}

        <motion.div
          initial={{ scale: 0.4, opacity: 0, y: 60 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.8, opacity: 0 }}
          transition={{ type: "spring", stiffness: 260, damping: 18 }}
          className="relative mx-4 rounded-3xl border border-gordemy-orange/50 bg-gradient-to-b from-gordemy-card to-gordemy-bg p-8 text-center shadow-2xl shadow-gordemy-orange/20 max-w-sm w-full"
          onClick={e => e.stopPropagation()}
        >
          {/* Glow ring */}
          <div className="absolute inset-0 rounded-3xl ring-2 ring-gordemy-orange/20 ring-offset-2 ring-offset-transparent pointer-events-none" />

          {/* Level badge */}
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.15, type: "spring", stiffness: 300 }}
            className="inline-flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-gordemy-orange to-yellow-500 text-3xl font-black text-white shadow-lg shadow-gordemy-orange/40 mb-4"
          >
            {level}
          </motion.div>

          {/* Title */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <div className="text-xs font-bold tracking-widest text-gordemy-orange uppercase mb-1">
              Новий рівень!
            </div>
            <div className="text-3xl font-black text-white mb-1">
              Рівень {level}
            </div>
            <div className={`text-lg font-bold ${info.color} flex items-center justify-center gap-2`}>
              <span>{info.emoji}</span>
              <span>{info.title}</span>
            </div>
          </motion.div>

          {/* Rewards unlocked */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="mt-5 rounded-2xl bg-gordemy-bg/60 border border-gordemy-border px-4 py-3 text-sm text-gordemy-muted"
          >
            <span className="text-gordemy-green font-bold">+{level * 10} HP</span> в битвах ·
            <span className="text-gordemy-blue font-bold ml-1">Нові виклики</span> розблоковано
          </motion.div>

          {/* CTA */}
          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.7 }}
            whileTap={{ scale: 0.95 }}
            onClick={onClose}
            className="mt-5 w-full rounded-2xl bg-gradient-to-r from-gordemy-orange to-yellow-500 py-3 text-sm font-black text-white shadow-lg shadow-gordemy-orange/30"
          >
            ⚔️ Продовжити
          </motion.button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
