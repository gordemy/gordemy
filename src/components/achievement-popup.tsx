"use client";

import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { RARITY_LABELS, RARITY_COLORS, type Achievement } from "@/lib/achievements";

interface AchievementPopupProps {
  achievement: Achievement | null;
  onClose: () => void;
}

export function AchievementPopup({ achievement, onClose }: AchievementPopupProps) {
  useEffect(() => {
    if (!achievement) return;
    const t = setTimeout(onClose, 4000);
    return () => clearTimeout(t);
  }, [achievement, onClose]);

  return (
    <AnimatePresence>
      {achievement && (
        <motion.div
          initial={{ opacity: 0, y: 80, scale: 0.8 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 40, scale: 0.9 }}
          transition={{ type: "spring", stiffness: 400, damping: 25 }}
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 cursor-pointer"
          onClick={onClose}
        >
          <div className={`flex items-center gap-4 px-5 py-4 rounded-2xl border shadow-2xl backdrop-blur-xl min-w-[280px] max-w-[360px] ${
            achievement.rarity === "legendary"
              ? "bg-gordemy-orange/20 border-gordemy-orange/50 shadow-gordemy-orange/20"
              : achievement.rarity === "epic"
              ? "bg-gordemy-purple/20 border-gordemy-purple/50 shadow-gordemy-purple/20"
              : achievement.rarity === "rare"
              ? "bg-gordemy-blue/20 border-gordemy-blue/50 shadow-gordemy-blue/20"
              : "bg-gordemy-card border-gordemy-border"
          }`}>
            {/* Sparkle for legendary */}
            {achievement.rarity === "legendary" && (
              <motion.div
                className="absolute inset-0 rounded-2xl"
                animate={{ boxShadow: ["0 0 20px rgba(249,115,22,0.3)", "0 0 40px rgba(249,115,22,0.6)", "0 0 20px rgba(249,115,22,0.3)"] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              />
            )}

            <motion.div
              animate={{ rotate: [0, -10, 10, -10, 10, 0], scale: [1, 1.2, 1] }}
              transition={{ duration: 0.6 }}
              className="text-4xl flex-shrink-0"
            >
              {achievement.icon}
            </motion.div>

            <div className="flex-1 min-w-0">
              <div className="text-[10px] font-bold uppercase tracking-wider text-gordemy-muted mb-0.5">
                🏆 Нове досягнення!
              </div>
              <div className="text-sm font-extrabold truncate">{achievement.name}</div>
              <div className="text-xs text-gordemy-muted leading-snug mt-0.5">{achievement.description}</div>
              <div className={`text-xs font-bold mt-1 ${RARITY_COLORS[achievement.rarity].split(" ")[1]}`}>
                +{achievement.xp_reward} XP • {RARITY_LABELS[achievement.rarity]}
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
