"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { claimMysteryBox } from "@/lib/gamification";

type Rarity = "common" | "rare" | "epic";

interface Reward {
  type: string;
  value: number;
  label: string;
  emoji: string;
  rarity: Rarity;
}

const RARITY_CFG: Record<Rarity, { color: string; glow: string; border: string; label: string }> = {
  common: { color: "text-zinc-300",   glow: "shadow-zinc-500/30",   border: "border-zinc-500/60",   label: "Звичайна"  },
  rare:   { color: "text-blue-300",   glow: "shadow-blue-500/50",   border: "border-blue-400/70",   label: "Рідкісна"  },
  epic:   { color: "text-purple-300", glow: "shadow-purple-500/60", border: "border-purple-400/80", label: "Епічна"    },
};

// Slot machine symbols that spin before landing
const SYMBOLS = ["💎", "✨", "🔮", "⚡", "🛡️", "🎯", "🔥", "👑"];

interface MysteryBoxPopupProps {
  userId: string;
  alreadyClaimed: boolean;
  onClose: () => void;
  onClaimed: (reward: Reward) => void;
}

export function MysteryBoxPopup({ userId, alreadyClaimed, onClose, onClaimed }: MysteryBoxPopupProps) {
  const [phase, setPhase] = useState<"idle" | "spinning" | "reveal">("idle");
  const [reward, setReward] = useState<Reward | null>(null);
  const [slotSymbol, setSlotSymbol] = useState("🎲");
  const [spinIdx, setSpinIdx] = useState(0);

  const open = async () => {
    if (alreadyClaimed || phase !== "idle") return;
    setPhase("spinning");

    // Slot machine spin animation
    let tick = 0;
    const spinInterval = setInterval(() => {
      setSlotSymbol(SYMBOLS[tick % SYMBOLS.length]);
      setSpinIdx(tick);
      tick++;
    }, 80);

    // Claim from backend
    const r = await claimMysteryBox(userId);

    // Stop spinning after 1.8s
    setTimeout(() => {
      clearInterval(spinInterval);
      setSlotSymbol(r.emoji);
      setReward(r);
      setPhase("reveal");
      onClaimed(r);
    }, 1800);
  };

  const rarityColor = reward ? RARITY_CFG[reward.rarity].color : "text-white";
  const rarityGlow  = reward ? RARITY_CFG[reward.rarity].glow  : "";
  const rarityBorder= reward ? RARITY_CFG[reward.rarity].border : "border-gordemy-border";

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm px-5"
      onClick={phase === "reveal" ? onClose : undefined}
    >
      <motion.div
        initial={{ scale: 0.5, opacity: 0, y: 50 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.8, opacity: 0 }}
        transition={{ type: "spring", damping: 15 }}
        className={`relative w-full max-w-[340px] rounded-3xl border-2 ${rarityBorder} bg-zinc-950 p-8 text-center overflow-hidden shadow-2xl ${rarityGlow}`}
        onClick={e => e.stopPropagation()}
      >
        {/* Background glow */}
        <motion.div
          className="absolute inset-0 pointer-events-none"
          animate={{
            background: phase === "reveal" && reward?.rarity === "epic"
              ? ["radial-gradient(ellipse at center, rgba(168,85,247,0.2), transparent 70%)",
                 "radial-gradient(ellipse at center, rgba(168,85,247,0.35), transparent 70%)"]
              : "radial-gradient(ellipse at center, rgba(99,102,241,0.1), transparent 70%)",
          }}
          transition={{ duration: 1.2, repeat: Infinity, repeatType: "reverse" }}
        />

        {/* Title */}
        <div className="mb-2 text-xs font-black uppercase tracking-widest text-zinc-500">
          🎲 Mystery Box
        </div>

        {phase === "reveal" && reward && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className={`mb-2 text-xs font-black uppercase tracking-wider ${rarityColor}`}
          >
            {RARITY_CFG[reward.rarity].label} нагорода!
          </motion.div>
        )}

        {/* Main symbol / slot machine */}
        <div className="relative flex items-center justify-center my-6">
          {/* Slot machine border */}
          <div className="relative w-36 h-36 rounded-3xl border-2 border-zinc-800 bg-zinc-900 flex items-center justify-center overflow-hidden">
            {/* Spinning effect */}
            {phase === "spinning" && (
              <motion.div
                className="absolute inset-0 bg-gradient-to-b from-transparent via-indigo-500/20 to-transparent"
                animate={{ y: ["-100%", "100%"] }}
                transition={{ duration: 0.15, repeat: Infinity, ease: "linear" }}
              />
            )}

            <motion.span
              key={phase === "spinning" ? spinIdx : "final"}
              className="text-7xl select-none"
              initial={phase === "spinning" ? { y: -20, opacity: 0 } : { scale: 0.5, opacity: 0 }}
              animate={
                phase === "reveal"
                  ? { scale: [0.5, 1.3, 1], opacity: 1, rotate: [0, -10, 10, 0] }
                  : { y: 0, opacity: 1 }
              }
              transition={phase === "reveal" ? { duration: 0.6, type: "spring" } : { duration: 0.07 }}
            >
              {slotSymbol}
            </motion.span>

            {/* Scan lines for effect */}
            <div className="pointer-events-none absolute inset-0 bg-[repeating-linear-gradient(0deg,transparent,transparent_3px,rgba(0,0,0,0.15)_3px,rgba(0,0,0,0.15)_4px)]" />
          </div>

          {/* Reveal particles */}
          <AnimatePresence>
            {phase === "reveal" && (
              <>
                {Array.from({ length: 12 }).map((_, i) => {
                  const angle = (i / 12) * 360;
                  const dist = 70 + Math.random() * 40;
                  return (
                    <motion.div
                      key={i}
                      className="pointer-events-none absolute w-2 h-2 rounded-full bg-indigo-400"
                      initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
                      animate={{
                        x: Math.cos((angle * Math.PI) / 180) * dist,
                        y: Math.sin((angle * Math.PI) / 180) * dist,
                        opacity: 0,
                        scale: 0,
                      }}
                      transition={{ duration: 0.7, delay: 0.1 }}
                    />
                  );
                })}
              </>
            )}
          </AnimatePresence>
        </div>

        {/* Reward text */}
        <AnimatePresence mode="wait">
          {phase === "reveal" && reward ? (
            <motion.div
              key="reward"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3, type: "spring" }}
              className="mb-6"
            >
              <div className={`text-3xl font-black ${rarityColor}`}>
                +{reward.label}
              </div>
              <div className="text-xs text-zinc-500 mt-1">
                {reward.type === "xp" && "Досвід зараховано!"}
                {reward.type === "gems" && "Геми додано до гаманця!"}
                {reward.type === "shield" && "Захищає твою серію на 1 день!"}
              </div>
            </motion.div>
          ) : phase === "idle" ? (
            <motion.div key="hint" className="mb-6 text-sm text-zinc-400">
              {alreadyClaimed
                ? "Вже відкрито сьогодні 🕐"
                : "Щоденний сюрприз тебе чекає!"}
            </motion.div>
          ) : (
            <div key="spinning-text" className="mb-6 text-sm text-zinc-400 animate-pulse">
              Визначаємо нагороду...
            </div>
          )}
        </AnimatePresence>

        {/* CTA Button */}
        {phase === "reveal" ? (
          <motion.button
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            onClick={onClose}
            className="w-full py-3.5 rounded-2xl font-black text-white bg-gradient-to-r from-indigo-600 to-purple-600 shadow-lg"
          >
            🎉 Забрати!
          </motion.button>
        ) : phase === "idle" && !alreadyClaimed ? (
          <motion.button
            whileTap={{ scale: 0.96 }}
            onClick={open}
            className="w-full py-3.5 rounded-2xl font-black text-white bg-gradient-to-r from-indigo-600 to-purple-600 shadow-lg animate-pulse"
          >
            🎲 Відкрити Mystery Box!
          </motion.button>
        ) : phase === "idle" && alreadyClaimed ? (
          <button
            onClick={onClose}
            className="w-full py-3.5 rounded-2xl font-bold text-zinc-400 border border-zinc-800"
          >
            Повернутись завтра 🌙
          </button>
        ) : null}

        {/* Skip */}
        {phase !== "reveal" && (
          <button onClick={onClose} className="mt-3 text-xs text-zinc-600 hover:text-zinc-400 transition-colors">
            Закрити
          </button>
        )}
      </motion.div>
    </motion.div>
  );
}
