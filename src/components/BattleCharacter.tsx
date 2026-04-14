"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { SPRITE_SET, type BattleAnim } from "@/lib/battle-character-sprites";
import { ChestPopup, type ChestTier } from "@/components/chest-popup";

// ─────────────────────────────────────────────────────────────────────────────
// EXISTING BattleCharacter — used by /boss and /ghost. API is frozen.
// ─────────────────────────────────────────────────────────────────────────────

export interface BattleCue {
  kind: "attack" | "hit" | "win";
  nonce: number;
}

const FRAME_MS = 100;

export interface BattleCharacterProps {
  /** Fire-and-forget: bump `nonce` to replay the same kind. */
  cue?: BattleCue | null;
  onActionComplete?: (kind: BattleCue["kind"]) => void;
  comboCount?: number;
  className?: string;
  flipped?: boolean;
  frameMs?: number;
}

export default function BattleCharacter({
  cue,
  onActionComplete,
  comboCount = 0,
  className = "",
  flipped = false,
  frameMs = FRAME_MS,
}: BattleCharacterProps) {
  const [anim, setAnim] = useState<BattleAnim>("idle");
  const [frame, setFrame] = useState(0);
  const [screenShake, setScreenShake] = useState(false);
  const lastCueNonce = useRef<number | null>(null);
  const onCompleteRef = useRef(onActionComplete);
  const animRef = useRef<BattleAnim>("idle");
  onCompleteRef.current = onActionComplete;
  animRef.current = anim;

  useEffect(() => {
    if (!cue || lastCueNonce.current === cue.nonce) return;
    lastCueNonce.current = cue.nonce;
    setAnim(cue.kind);
    setFrame(0);
    if (cue.kind === "hit") {
      setScreenShake(true);
      const t = window.setTimeout(() => setScreenShake(false), 420);
      return () => clearTimeout(t);
    }
  }, [cue]);

  useEffect(() => {
    const id = window.setInterval(() => {
      const current = animRef.current;
      const strip = SPRITE_SET[current];
      setFrame((f) => {
        const next = f + 1;
        if (next < strip.length) return next;
        if (current !== "idle") {
          const finished = current as BattleCue["kind"];
          setAnim("idle");
          window.setTimeout(() => onCompleteRef.current?.(finished), 0);
          return 0;
        }
        return 0;
      });
    }, frameMs);
    return () => clearInterval(id);
  }, [frameMs]);

  const frames = SPRITE_SET[anim];
  const src = frames[Math.min(frame, frames.length - 1)] ?? frames[0];
  const attacking = anim === "attack";

  return (
    <div className={`relative flex flex-col items-center ${className}`}>
      <motion.div
        animate={
          screenShake
            ? { x: [0, -10, 10, -7, 7, -3, 3, 0], y: [0, 4, -2, 3, -3, 0] }
            : { x: 0, y: 0 }
        }
        transition={{ duration: 0.38, ease: "easeOut" }}
        className="relative"
        style={{ transform: flipped ? "scaleX(-1)" : undefined }}
      >
        {attacking && (
          <motion.div
            className="pointer-events-none absolute -inset-3 rounded-2xl bg-fuchsia-500/35 blur-xl"
            initial={{ opacity: 0.25, scale: 0.85 }}
            animate={{ opacity: [0.35, 0.85, 0.4], scale: [0.9, 1.15, 1] }}
            transition={{ duration: 0.35, repeat: 2 }}
          />
        )}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt=""
          width={112}
          height={160}
          draggable={false}
          className="relative z-10 mx-auto h-28 w-auto select-none object-contain drop-shadow-[0_6px_12px_rgba(0,0,0,0.55)] transition-opacity duration-75 [image-rendering:pixelated]"
        />
      </motion.div>

      <AnimatePresence>
        {comboCount >= 2 && (
          <motion.div
            key={comboCount}
            initial={{ opacity: 0, y: 6, scale: 0.8 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.6 }}
            className="mt-1 rounded-full border border-amber-500/40 bg-amber-500/15 px-2.5 py-0.5 text-[10px] font-black tracking-wide text-amber-200 shadow-[0_0_12px_rgba(251,191,36,0.35)]"
          >
            COMBO ×{comboCount}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// NEW: BlobChar — SVG sprite base + emoji equipment + alive animations
// Used by /battle-demo only. Existing BattleCharacter above is untouched.
// ─────────────────────────────────────────────────────────────────────────────

type DemoAnim = "idle" | "attack" | "crit" | "hit" | "win";

/** Crit chance doubles each combo step: 2→15%, 3→30%, 4→60%, 5+→100% */
function getCritChance(combo: number): number {
  if (combo >= 5) return 100;
  if (combo >= 4) return 60;
  if (combo >= 3) return 30;
  if (combo >= 2) return 15;
  return 0;
}

// ── Floating aura particle ────────────────────────────────────────────────────
function AuraParticle({
  emoji,
  delay,
  x,
  y,
  size = "text-xs",
}: {
  emoji: string;
  delay: number;
  x: number;
  y: number;
  size?: string;
}) {
  return (
    <motion.span
      className={`pointer-events-none absolute select-none ${size} z-20`}
      style={{ left: `${x}%`, top: `${y}%` }}
      animate={{
        y: [-9, 9, -9],
        x: [-5, 5, -5],
        opacity: [0.25, 0.95, 0.25],
        scale: [0.7, 1.15, 0.7],
      }}
      transition={{
        duration: 1.7 + delay * 0.55,
        repeat: Infinity,
        delay,
        ease: "easeInOut",
      }}
    >
      {emoji}
    </motion.span>
  );
}

// ── Equipment slot types ──────────────────────────────────────────────────────
interface Equipment {
  head?: string;    // hat / crown emoji — displayed above head
  torso?: string;   // armor / coat emoji — displayed on chest
  weapon?: string;  // weapon emoji — held in right hand
  aura?: string;    // aura particle emoji (floats around body)
}

// ── BlobChar ──────────────────────────────────────────────────────────────────
// SVG sprite-sheet character (same blob as /battle-sprites) with
// emoji equipment overlaid at precise body positions.
// Every element animates — nothing is static.
function BlobChar({
  isEnemy = false,
  anim,
  auraColor,
  equipment = {},
  flipped = false,
}: {
  isEnemy?: boolean;
  anim: DemoAnim;
  auraColor: string;
  equipment?: Equipment;
  flipped?: boolean;
}) {
  const [frame, setFrame] = useState(0);
  const prevAnim = useRef(anim);

  // Reset frame on anim change
  useEffect(() => {
    if (prevAnim.current !== anim) {
      setFrame(0);
      prevAnim.current = anim;
    }
  }, [anim]);

  // Frame ticker — 115 ms per frame
  const spriteKey: BattleAnim =
    anim === "crit"
      ? "attack"
      : anim === "idle" || anim === "attack" || anim === "hit" || anim === "win"
      ? anim
      : "idle";

  useEffect(() => {
    const frames = SPRITE_SET[spriteKey];
    const id = window.setInterval(() => {
      setFrame((f) => (f + 1) % frames.length);
    }, 115);
    return () => clearInterval(id);
  }, [spriteKey]);

  const frames = SPRITE_SET[spriteKey];
  const src = frames[Math.min(frame, frames.length - 1)] ?? frames[0];

  const isAttacking = anim === "attack" || anim === "crit";
  const isHit = anim === "hit";
  const isWin = anim === "win";
  const auraEmoji = equipment.aura ?? (isEnemy ? "🔥" : "⚡");

  // Framer Motion body animation (layered on top of sprite frames)
  const bodyAnimate = isHit
    ? { x: [0, isEnemy ? 24 : -24, isEnemy ? -14 : 14, 0], y: [0, -6, 3, 0] }
    : isWin
    ? { y: [0, -22, 0, -15, 0], rotate: [0, -7, 7, -3, 0] }
    : isAttacking
    ? { x: [0, isEnemy ? -28 : 28, 0], scale: [1, 1.12, 1] }
    : { y: [0, -5, 0] }; // breathing idle float

  const bodyTransition = isHit
    ? { duration: 0.42, ease: "easeOut" as const }
    : isWin
    ? { duration: 0.75, repeat: 3 }
    : isAttacking
    ? { duration: 0.3, ease: "easeOut" as const }
    : { duration: 2.7, repeat: Infinity, ease: "easeInOut" as const };

  // Sprite display: viewBox 56×80 → h-28 = 112px → w ≈ 78px
  // Equipment positions are relative to the 78×112 sprite container
  return (
    <div
      className="relative flex flex-col items-center"
      style={{ width: 104, height: 150 }}
    >
      {/* Pulsing aura glow behind character */}
      <motion.div
        className="pointer-events-none absolute rounded-full blur-3xl"
        style={{
          background: `radial-gradient(ellipse, ${auraColor}65, transparent 68%)`,
          inset: "-20px",
          zIndex: 0,
        }}
        animate={{ scale: [1, 1.4, 1], opacity: [0.38, 0.82, 0.38] }}
        transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* Aura particles floating around body */}
      <AuraParticle emoji={auraEmoji} delay={0}    x={3}  y={8}  />
      <AuraParticle emoji={auraEmoji} delay={0.55} x={74} y={4}  />
      <AuraParticle emoji={auraEmoji} delay={1.1}  x={6}  y={68} />
      <AuraParticle emoji={auraEmoji} delay={1.65} x={70} y={60} />

      {/* Attack glow ring */}
      <AnimatePresence>
        {isAttacking && (
          <motion.div
            key="atk-ring"
            className="pointer-events-none absolute rounded-full"
            style={{
              background: `radial-gradient(ellipse, ${auraColor}55, transparent 70%)`,
              inset: "-10px",
              zIndex: 8,
            }}
            initial={{ opacity: 0.4, scale: 0.85 }}
            animate={{ opacity: [0.55, 1, 0.35], scale: [0.9, 1.25, 1.05] }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.38, repeat: 2 }}
          />
        )}
      </AnimatePresence>

      {/* ── Character body + equipment ── */}
      <motion.div
        className="relative z-10"
        animate={bodyAnimate}
        transition={bodyTransition}
        style={{
          marginTop: 14, // breathing room for head equipment
          transformOrigin: "center bottom",
          transform: flipped ? "scaleX(-1)" : "none",
        }}
      >
        {/* HEAD EQUIPMENT — floats gently above head */}
        {equipment.head && (
          <motion.span
            className="pointer-events-none absolute select-none"
            style={{
              fontSize: 24,
              left: "50%",
              top: -26,
              transform: "translateX(-50%)",
              zIndex: 22,
              display: "inline-block",
            }}
            animate={{ y: [0, -4, 0], rotate: [-6, 6, -6] }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
          >
            {equipment.head}
          </motion.span>
        )}

        {/* BASE SVG SPRITE */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt=""
          width={78}
          height={112}
          draggable={false}
          style={{ imageRendering: "pixelated", display: "block" }}
          className="relative z-10 select-none drop-shadow-[0_8px_18px_rgba(0,0,0,0.75)]"
        />

        {/* TORSO EQUIPMENT — centered on chest, breathes with body */}
        {equipment.torso && (
          <motion.span
            className="pointer-events-none absolute select-none"
            style={{
              fontSize: 22,
              left: "50%",
              top: 50,
              transform: "translateX(-50%)",
              zIndex: 14,
              display: "inline-block",
            }}
            animate={
              isAttacking
                ? { scale: [1, 1.18, 1], rotate: [0, isEnemy ? -10 : 10, 0] }
                : { scale: [1, 1.04, 1] }
            }
            transition={{
              duration: isAttacking ? 0.3 : 2.6,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          >
            {equipment.torso}
          </motion.span>
        )}

        {/* WEAPON — right hand, swings on attack */}
        {equipment.weapon && (
          <motion.span
            className="pointer-events-none absolute select-none"
            style={{
              fontSize: 26,
              right: -18,
              top: 48,
              zIndex: 22,
              display: "inline-block",
              transformOrigin: "20% 85%",
            }}
            animate={
              isAttacking
                ? {
                    rotate: [-45, 35, -20, 5],
                    scale: [1, 1.45, 1.1, 1],
                    x: [0, isEnemy ? -8 : 8, 0],
                  }
                : { rotate: [-8, 8, -8] }
            }
            transition={
              isAttacking
                ? { duration: 0.35, ease: "easeOut" }
                : {
                    duration: 2,
                    repeat: Infinity,
                    ease: "easeInOut",
                    delay: 0.15,
                  }
            }
          >
            {equipment.weapon}
          </motion.span>
        )}

        {/* CRIT overlay flash on character */}
        <AnimatePresence>
          {anim === "crit" && (
            <motion.div
              key="crit-flash"
              className="pointer-events-none absolute inset-0 rounded-2xl z-30"
              style={{
                background: "rgba(168,85,247,0.65)",
                mixBlendMode: "screen",
              }}
              initial={{ opacity: 1 }}
              animate={{ opacity: [1, 0.7, 1, 0] }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.52 }}
            />
          )}
        </AnimatePresence>

        {/* HIT flash */}
        <AnimatePresence>
          {isHit && (
            <motion.div
              key="hit-flash"
              className="pointer-events-none absolute inset-0 rounded-2xl z-30"
              style={{ background: "rgba(239,68,68,0.5)", mixBlendMode: "screen" }}
              initial={{ opacity: 1 }}
              animate={{ opacity: [1, 0.5, 0] }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.38 }}
            />
          )}
        </AnimatePresence>
      </motion.div>

      {/* Dynamic shadow on the ground */}
      <motion.div
        className="pointer-events-none rounded-full bg-black/45 blur-sm"
        style={{ width: 38, height: 7, marginTop: -2 }}
        animate={{ width: [34, 44, 34], opacity: [0.32, 0.58, 0.32] }}
        transition={{ duration: 2.7, repeat: Infinity, ease: "easeInOut" }}
      />
    </div>
  );
}

// ── HP bar ────────────────────────────────────────────────────────────────────
function HpBar({
  label,
  hp,
  max,
  gradient,
  labelColor,
}: {
  label: string;
  hp: number;
  max: number;
  gradient: string;
  labelColor: string;
}) {
  const pct = Math.max(0, (hp / max) * 100);
  const danger = pct < 30;
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/80 px-3 py-2.5">
      <div
        className={`mb-1.5 flex justify-between text-[10px] font-bold uppercase tracking-wider ${labelColor}`}
      >
        <span>{label}</span>
        <span className="font-mono text-zinc-400">
          {hp}/{max}
        </span>
      </div>
      <div className="h-2.5 overflow-hidden rounded-full bg-black/50">
        <motion.div
          className={`h-full rounded-full bg-gradient-to-r ${gradient}`}
          animate={{
            width: `${pct}%`,
            ...(danger ? { opacity: [1, 0.65, 1] } : {}),
          }}
          transition={
            danger
              ? { width: { type: "spring", stiffness: 130, damping: 18 }, opacity: { duration: 0.7, repeat: Infinity } }
              : { type: "spring", stiffness: 130, damping: 18 }
          }
        />
      </div>
    </div>
  );
}

// ── Stat box ──────────────────────────────────────────────────────────────────
function StatBox({
  label,
  value,
  color = "text-white",
  pulse = false,
  glow,
}: {
  label: string;
  value: string;
  color?: string;
  pulse?: boolean;
  glow?: string;
}) {
  return (
    <div
      className="rounded-xl border border-zinc-800 bg-zinc-900/80 p-2.5 text-center"
      style={glow ? { boxShadow: `0 0 14px ${glow}` } : {}}
    >
      <div className="mb-0.5 text-[9px] uppercase tracking-wider text-zinc-500">
        {label}
      </div>
      <motion.div
        className={`text-lg font-black ${color}`}
        animate={pulse ? { scale: [1, 1.1, 1] } : {}}
        transition={{ duration: 0.9, repeat: Infinity }}
      >
        {value}
      </motion.div>
    </div>
  );
}

/** Choose chest tier based on max combo reached during battle */
function comboToChestTier(maxCombo: number): ChestTier {
  if (maxCombo >= 5) return "legendary";
  if (maxCombo >= 4) return "gold";
  if (maxCombo >= 3) return "silver";
  return "bronze";
}

// ── Battle Demo page ──────────────────────────────────────────────────────────
export function BattleCharacterDemo() {
  const P_MAX = 100;
  const E_MAX = 80;
  const BASE_DMG = 18;
  const CRIT_MULT = 1.5;
  const SELF_DMG = 12;

  const QUESTION_TIME = 15; // seconds per question

  const [playerHp, setPlayerHp] = useState(P_MAX);
  const [enemyHp, setEnemyHp] = useState(E_MAX);
  const [combo, setCombo] = useState(0);
  const [maxCombo, setMaxCombo] = useState(0);
  const [playerAnim, setPlayerAnim] = useState<DemoAnim>("idle");
  const [enemyAnim, setEnemyAnim] = useState<DemoAnim>("idle");
  const [dmgPop, setDmgPop] = useState<{ text: string; crit: boolean; side: "enemy" | "player"; k: number } | null>(null);
  const [blackFlash, setBlackFlash] = useState(false);
  const [lastDmg, setLastDmg] = useState(BASE_DMG);
  const [chestTier, setChestTier] = useState<ChestTier | null>(null);
  const [timeLeft, setTimeLeft] = useState(QUESTION_TIME);
  const timedOutRef = useRef(false);
  const popKey = useRef(0);

  const critChance = getCritChance(combo);
  const isOver = playerHp <= 0 || enemyHp <= 0;
  const playerWon = enemyHp <= 0;

  const showPop = (text: string, crit: boolean, side: "enemy" | "player") => {
    setDmgPop({ text, crit, side, k: ++popKey.current });
    setTimeout(() => setDmgPop(null), 1000);
  };

  const onCorrect = () => {
    if (isOver) return;
    setTimeLeft(QUESTION_TIME); // reset timer
    timedOutRef.current = false;
    const nc = combo + 1;
    setCombo(nc);
    setMaxCombo(prev => Math.max(prev, nc));
    const chance = getCritChance(nc);
    const isCrit = Math.random() * 100 < chance;
    const dmg = Math.round(isCrit ? BASE_DMG * CRIT_MULT : BASE_DMG);
    setLastDmg(dmg);

    if (isCrit) {
      setBlackFlash(true);
      setTimeout(() => setBlackFlash(false), 600);
    }

    setPlayerAnim(isCrit ? "crit" : "attack");
    setEnemyAnim("hit");
    const nextEnemyHp = Math.max(0, enemyHp - dmg);
    setEnemyHp(nextEnemyHp);
    showPop(isCrit ? `⚡ BLACK FLASH  -${dmg}` : `-${dmg}`, isCrit, "enemy");

    setTimeout(() => {
      setPlayerAnim(nextEnemyHp <= 0 ? "win" : "idle");
      setEnemyAnim("idle");
      // 🎁 Show chest after victory — tier depends on max combo
      if (nextEnemyHp <= 0) {
        setTimeout(() => setChestTier(comboToChestTier(Math.max(maxCombo, nc))), 1400);
      }
    }, 530);
  };

  const onWrong = () => {
    if (isOver) return;
    setTimeLeft(QUESTION_TIME); // reset timer
    timedOutRef.current = false;
    setCombo(0);
    setPlayerAnim("hit");
    setEnemyAnim("attack");
    const nextPlayerHp = Math.max(0, playerHp - SELF_DMG);
    setPlayerHp(nextPlayerHp);
    showPop(`-${SELF_DMG}`, false, "player");

    setTimeout(() => {
      setPlayerAnim("idle");
      setEnemyAnim(nextPlayerHp <= 0 ? "win" : "idle");
    }, 530);
  };

  const reset = () => {
    setPlayerHp(P_MAX);
    setEnemyHp(E_MAX);
    setCombo(0);
    setMaxCombo(0);
    setPlayerAnim("idle");
    setEnemyAnim("idle");
    setDmgPop(null);
    setBlackFlash(false);
    setLastDmg(BASE_DMG);
    setChestTier(null);
    setTimeLeft(QUESTION_TIME);
    timedOutRef.current = false;
  };

  // ── Question countdown timer ──
  useEffect(() => {
    if (isOver) return;
    const id = window.setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) {
          // Time's up — trigger wrong answer once
          if (!timedOutRef.current) {
            timedOutRef.current = true;
            // Use setters directly to avoid stale closure referencing onWrong
            setCombo(0);
            setPlayerAnim("hit");
            setEnemyAnim("attack");
            setPlayerHp(prev => Math.max(0, prev - SELF_DMG));
            showPop(`⏰ -${SELF_DMG}`, false, "player");
            setTimeout(() => {
              setPlayerAnim("idle");
              setEnemyAnim("idle");
              timedOutRef.current = false;
            }, 530);
          }
          return QUESTION_TIME;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOver]);

  // Crit color escalates with combo
  const critColor =
    critChance >= 100
      ? "text-yellow-300"
      : critChance >= 60
      ? "text-orange-400"
      : critChance >= 30
      ? "text-violet-400"
      : critChance > 0
      ? "text-violet-500"
      : "text-zinc-500";

  const critGlow =
    critChance >= 100
      ? "rgba(253,224,71,0.55)"
      : critChance >= 60
      ? "rgba(251,146,60,0.45)"
      : critChance >= 30
      ? "rgba(167,139,250,0.4)"
      : critChance > 0
      ? "rgba(139,92,246,0.3)"
      : undefined;

  // Equipment definitions
  const playerEquipment: Equipment = {
    head: "⛑️",
    torso: "🥼",
    weapon: "⚔️",
    aura: "⚡",
  };

  const enemyEquipment: Equipment = {
    head: "💀",
    torso: "🦹",
    weapon: "🔱",
    aura: "🔥",
  };

  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-gradient-to-b from-zinc-950 via-zinc-900 to-black text-zinc-100">
      {/* 🎁 Chest popup after win */}
      <AnimatePresence>
        {chestTier && (
          <ChestPopup
            tier={chestTier}
            userId=""
            onClose={() => { setChestTier(null); reset(); }}
          />
        )}
      </AnimatePresence>

      {/* ── Black Flash screen effect ── */}
      <AnimatePresence>
        {blackFlash && (
          <motion.div
            key="black-flash"
            className="pointer-events-none fixed inset-0 z-50"
            style={{ background: "radial-gradient(ellipse at center, #2a0050, #0a0010)" }}
            initial={{ opacity: 0.95 }}
            animate={{ opacity: [0.95, 0.5, 0.9, 0] }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.58, ease: "easeOut" }}
          />
        )}
      </AnimatePresence>

      {/* Ambient background grid */}
      <div
        className="pointer-events-none fixed inset-0 opacity-[0.04]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(99,102,241,0.8) 1px, transparent 1px), linear-gradient(90deg, rgba(99,102,241,0.8) 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      />

      <div className="mx-auto flex w-full max-w-md flex-1 flex-col px-4 py-6">
        {/* Title */}
        <h1 className="mb-5 text-center text-xl font-black tracking-tight text-white">
          ⚔️ Gordemy Battle
        </h1>

        {/* HP bars */}
        <div className="mb-3 space-y-2">
          <HpBar label="🧑‍🎓 Ти"    hp={playerHp} max={P_MAX} gradient="from-emerald-500 to-teal-400" labelColor="text-emerald-400" />
          <HpBar label="👹 Ворог" hp={enemyHp}  max={E_MAX} gradient="from-rose-600 to-orange-500"   labelColor="text-rose-400" />
        </div>

        {/* Question timer bar */}
        {!isOver && (
          <div className="mb-3">
            <div className="flex justify-between items-center mb-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">⏱ Час</span>
              <motion.span
                className={`text-xs font-black ${timeLeft <= 5 ? "text-rose-400" : timeLeft <= 9 ? "text-amber-400" : "text-zinc-400"}`}
                animate={timeLeft <= 5 ? { scale: [1, 1.15, 1] } : {}}
                transition={{ duration: 0.5, repeat: Infinity }}
              >
                {timeLeft}с
              </motion.span>
            </div>
            <div className="h-2 rounded-full bg-zinc-900 border border-zinc-800 overflow-hidden">
              <motion.div
                className={`h-full rounded-full transition-colors ${
                  timeLeft <= 5
                    ? "bg-gradient-to-r from-rose-600 to-red-500"
                    : timeLeft <= 9
                    ? "bg-gradient-to-r from-amber-500 to-orange-400"
                    : "bg-gradient-to-r from-emerald-500 to-teal-400"
                }`}
                animate={{ width: `${(timeLeft / QUESTION_TIME) * 100}%` }}
                transition={{ duration: 0.4 }}
              />
            </div>
          </div>
        )}

        {/* Stats row — HP shown as bars above, so here: Damage + Crit only */}
        <div className="mb-4 grid grid-cols-2 gap-2">
          <StatBox label="⚔️ Урон" value={`${lastDmg}`} />
          <StatBox
            label="⚡ Крит шанс"
            value={`${critChance}%`}
            color={critColor}
            pulse={critChance > 0}
            glow={critGlow}
          />
        </div>

        {/* Battle arena */}
        <div className="relative mb-4 flex min-h-[240px] items-end justify-around rounded-3xl border border-zinc-800/60 bg-zinc-950/80 px-4 py-6 shadow-[inset_0_0_80px_rgba(0,0,0,0.7)]">
          {/* Arena floor glow */}
          <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-16 rounded-b-3xl bg-gradient-to-t from-indigo-950/40 to-transparent" />

          {/* Player */}
          <div className="relative flex flex-col items-center gap-1">
            <BlobChar
              anim={playerAnim}
              auraColor="#6366f1"
              equipment={playerEquipment}
            />
            <span className="text-[9px] font-bold uppercase tracking-widest text-zinc-600">
              Ти
            </span>
          </div>

          {/* VS */}
          <div className="mb-8 flex flex-col items-center gap-1">
            <motion.span
              className="text-xs font-black text-zinc-700"
              animate={{ scale: [1, 1.08, 1], opacity: [0.6, 1, 0.6] }}
              transition={{ duration: 2.2, repeat: Infinity }}
            >
              VS
            </motion.span>
          </div>

          {/* Enemy (flipped to face player) */}
          <div className="relative flex flex-col items-center gap-1">
            <BlobChar
              isEnemy
              anim={enemyAnim}
              auraColor="#ef4444"
              equipment={enemyEquipment}
              flipped
            />
            <span className="text-[9px] font-bold uppercase tracking-widest text-zinc-600">
              Ворог
            </span>
          </div>

          {/* Floating damage pop */}
          <AnimatePresence>
            {dmgPop && (
              <motion.div
                key={dmgPop.k}
                className={`pointer-events-none absolute whitespace-nowrap font-black ${
                  dmgPop.crit ? "text-2xl text-yellow-300" : "text-xl text-white"
                } ${dmgPop.side === "enemy" ? "right-8" : "left-8"} top-6`}
                initial={{ y: 0, opacity: 1, scale: dmgPop.crit ? 1.4 : 1 }}
                animate={{ y: -60, opacity: 0 }}
                transition={{ duration: 0.85, ease: "easeOut" }}
                style={
                  dmgPop.crit
                    ? { textShadow: "0 0 20px rgba(253,224,71,0.9)" }
                    : {}
                }
              >
                {dmgPop.text}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Game-over overlay */}
          <AnimatePresence>
            {isOver && (
              <motion.div
                className="absolute inset-0 flex flex-col items-center justify-center gap-3 rounded-3xl bg-black/75 backdrop-blur-sm"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.4 }}
              >
                <motion.div
                  className="text-6xl"
                  animate={{ scale: [1, 1.15, 1], rotate: [0, -5, 5, 0] }}
                  transition={{ duration: 0.8, repeat: Infinity }}
                >
                  {playerWon ? "🏆" : "💀"}
                </motion.div>
                <div className="text-2xl font-black text-white">
                  {playerWon ? "Перемога!" : "Поразка..."}
                </div>
                {playerWon && (
                  <div className="text-xs text-amber-400 font-bold">
                    Комбо: ×{combo} | Крит шанс досягнув {critChance}%
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Combo streak hint */}
        <AnimatePresence>
          {combo >= 2 && !isOver && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="mb-3 rounded-xl border border-amber-500/30 bg-amber-950/30 px-3 py-2 text-center"
            >
              <span className="text-sm font-black text-amber-400">
                🔥 Комбо ×{combo}
              </span>
              <span className="ml-2 text-xs text-amber-300/80">
                — {critChance}% шанс Black Flash ⚡
              </span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Controls */}
        <div className="mt-auto flex flex-col gap-2">
          <motion.button
            type="button"
            disabled={isOver}
            onClick={onCorrect}
            whileTap={{ scale: 0.97 }}
            className="rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 py-4 text-sm font-black uppercase tracking-wide text-white shadow-lg shadow-emerald-900/40 disabled:opacity-40"
          >
            ✅ Правильна відповідь
          </motion.button>
          <motion.button
            type="button"
            disabled={isOver}
            onClick={onWrong}
            whileTap={{ scale: 0.97 }}
            className="rounded-2xl border border-rose-900/60 bg-rose-950/40 py-4 text-sm font-black uppercase tracking-wide text-rose-200 disabled:opacity-40"
          >
            ❌ Неправильна (удар по собі)
          </motion.button>
          <button
            type="button"
            onClick={reset}
            className="rounded-xl py-3 text-xs font-semibold text-zinc-500 underline-offset-4 hover:text-zinc-300 hover:underline"
          >
            🔄 Скинути бій
          </button>
        </div>
      </div>
    </div>
  );
}
