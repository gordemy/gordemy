"use client";

import { motion } from "framer-motion";
import {
  getPiece,
  resolveHeroVisual,
  auraColorForId,
  effectParticlesForId,
  type AvatarEquipConfig,
} from "@/lib/equipment";
import type { Rarity } from "@/lib/equipment";

const RARITY_FILTER: Record<Rarity, string> = {
  common: "none",
  uncommon: "drop-shadow(0 0 6px rgba(52,211,153,0.5))",
  rare: "drop-shadow(0 0 10px rgba(59,130,246,0.55))",
  epic: "drop-shadow(0 0 14px rgba(168,85,247,0.6))",
  legendary: "drop-shadow(0 0 18px rgba(251,191,36,0.75))",
};

export interface ModularHeroProps {
  equip: AvatarEquipConfig;
  /** Optional hat emoji above head (legacy catalog). */
  hatEmoji?: string;
  /** Bump to replay equip flash. */
  equipVersion?: number;
  className?: string;
  /** Pixel height of SVG box */
  height?: number;
}

export default function ModularHero({
  equip,
  hatEmoji,
  equipVersion = 0,
  className = "",
  height = 200,
}: ModularHeroProps) {
  const v = resolveHeroVisual(equip);
  const torsoPiece = getPiece(equip.torso);
  const rarity = torsoPiece?.rarity ?? "common";
  const bulk = v.torsoBulk ?? 0.5;
  const tw = 34 + bulk * 18;
  const th = 48 + bulk * 8;
  const tx = 50 - tw / 2;
  const ty = 52;
  const len = v.weaponLength ?? 42;
  const ang = ((v.weaponAngle ?? -38) * Math.PI) / 180;
  const wx = 50 + 22 * Math.cos(ang) - 4;
  const wy = ty + 12 + 22 * Math.sin(ang);
  const aura = auraColorForId(equip.aura);
  const showParticles = effectParticlesForId(equip.effect);
  const eye = v.eyeStyle ?? "dot";

  return (
    <motion.div
      key={equipVersion}
      initial={{ scale: 1.06, opacity: 0.88 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: "spring", stiffness: 420, damping: 22 }}
      className={`relative flex items-center justify-center ${className}`}
      style={{ height, width: Math.round(height / 1.35) }}
    >
      <svg
        viewBox="0 0 100 140"
        className="h-full w-auto overflow-visible"
        style={{ filter: RARITY_FILTER[rarity] }}
        aria-hidden
      >
        <defs>
          <radialGradient id="mhAura" cx="50%" cy="40%" r="65%">
            <stop offset="0%" stopColor={aura.glow} stopOpacity="0.55" />
            <stop offset="100%" stopColor={aura.glow} stopOpacity="0" />
          </radialGradient>
          <linearGradient id="mhTorso" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={v.torsoFill} />
            <stop offset="100%" stopColor={v.torsoStroke} />
          </linearGradient>
        </defs>

        {equip.aura !== "aura_none" && (
          <ellipse
            cx="50"
            cy="58"
            rx="46"
            ry="52"
            fill="url(#mhAura)"
            opacity="0.9"
          />
        )}

        {showParticles && (
          <g opacity="0.85">
            {[0, 1, 2, 3, 4].map((i) => (
              <circle
                key={i}
                cx={18 + i * 14}
                cy={24 + (i % 2) * 8}
                r="1.2"
                fill={aura.particles}
                className="animate-pulse"
                style={{ animationDelay: `${i * 0.15}s` }}
              />
            ))}
          </g>
        )}

        {/* Legs */}
        <rect
          x={50 - tw / 2 + 4}
          y={ty + th - 4}
          width="10"
          height="36"
          rx="4"
          fill={v.legFill}
          stroke="#0f172a"
          strokeWidth="0.8"
        />
        <rect
          x={50 + tw / 2 - 14}
          y={ty + th - 4}
          width="10"
          height="36"
          rx="4"
          fill={v.legFill}
          stroke="#0f172a"
          strokeWidth="0.8"
        />

        {/* Torso — identity */}
        <rect
          x={tx}
          y={ty}
          width={tw}
          height={th}
          rx="10"
          fill="url(#mhTorso)"
          stroke={v.torsoStroke}
          strokeWidth="2"
        />
        {v.torsoAccent && (
          <rect
            x={tx + 4}
            y={ty + 10}
            width={tw - 8}
            height="8"
            rx="3"
            fill={v.torsoAccent}
            opacity="0.85"
          />
        )}

        {/* Arms */}
        <path
          d={`M ${tx - 2} ${ty + 14} Q ${tx - 14} ${ty + 28} ${tx - 4} ${ty + 40}`}
          stroke={v.armFill}
          strokeWidth="7"
          strokeLinecap="round"
          fill="none"
        />
        <path
          d={`M ${tx + tw + 2} ${ty + 14} Q ${tx + tw + 14} ${ty + 24} ${tx + tw + 6} ${ty + 36}`}
          stroke={v.armFill}
          strokeWidth="7"
          strokeLinecap="round"
          fill="none"
        />

        {/* Weapon */}
        <g transform={`translate(${wx},${wy}) rotate(${(v.weaponAngle ?? -38) + 90})`}>
          <rect x="-3" y={-len} width="6" height={len} rx="1.5" fill="#e2e8f0" />
          <polygon
            points={`0,${-len - 2} -5,${-len + 6} 5,${-len + 6}`}
            fill="#cbd5e1"
          />
        </g>

        {/* Head */}
        <circle
          cx="50"
          cy="38"
          r="16"
          fill={v.faceTint ?? "#fde68a"}
          stroke="#0f172a"
          strokeWidth="1.5"
        />
        {eye === "dot" && (
          <>
            <circle cx="45" cy="36" r="2" fill="#1e293b" />
            <circle cx="55" cy="36" r="2" fill="#1e293b" />
          </>
        )}
        {eye === "focused" && (
          <>
            <ellipse cx="45" cy="36" rx="2.5" ry="1.8" fill="#1e293b" />
            <ellipse cx="55" cy="36" rx="2.5" ry="1.8" fill="#1e293b" />
          </>
        )}
        {eye === "glow" && (
          <>
            <circle cx="45" cy="36" r="3" fill="#38bdf8" opacity="0.9" />
            <circle cx="55" cy="36" r="3" fill="#38bdf8" opacity="0.9" />
            <circle cx="45" cy="36" r="1.2" fill="#0f172a" />
            <circle cx="55" cy="36" r="1.2" fill="#0f172a" />
          </>
        )}

        {hatEmoji ? (
          <text
            x="50"
            y={28 + (v.hatOffsetY ?? 0)}
            textAnchor="middle"
            fontSize="14"
          >
            {hatEmoji}
          </text>
        ) : null}
      </svg>
    </motion.div>
  );
}
