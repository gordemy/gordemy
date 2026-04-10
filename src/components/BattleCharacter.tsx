"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { SPRITE_SET, type BattleAnim } from "@/lib/battle-character-sprites";

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
// NEW: Emoji-based character + revamped Battle Demo
// ─────────────────────────────────────────────────────────────────────────────

type DemoAnim = "idle" | "attack" | "crit" | "hit" | "win";

/** Black Flash / crit chance by combo streak */
function getCritChance(combo: number): number {
  if (combo >= 5) return 100;
  if (combo >= 4) return 60;
  if (combo >= 3) return 30;
  if (combo >= 2) return 15;
  return 0;
}

// ── Floating aura particle ────────────────────────────────────────────────────
function AuraDot({
  emoji,
  delay,
  x,
  y,
}: {
  emoji: string;
  delay: number;
  x: number;
  y: number;
}) {
  return (
    <motion.span
      className="pointer-events-none absolute select-none text-xs"
      style={{ left: `${x}%`, top: `${y}%` }}
      animate={{
        y: [-7, 7, -7],
        x: [-4, 4, -4],
        opacity: [0.35, 0.95, 0.35],
        scale: [0.8, 1.1, 0.8],
      }}
      transition={{
        duration: 1.9 + delay * 0.45,
        repeat: Infinity,
        delay,
        ease: "easeInOut",
      }}
    >
      {emoji}
    </motion.span>
  );
}

// ── Emoji character ───────────────────────────────────────────────────────────
interface EmojiCharProps {
  isEnemy?: boolean;
  anim: DemoAnim;
  auraColor: string;
  flipped?: boolean;
}

function EmojiChar({ isEnemy = false, anim, auraColor }: EmojiCharProps) {
  const isAttacking = anim === "attack" || anim === "crit";
  const isHit = anim === "hit";
  const isWin = anim === "win";

  // Face changes by state
  const face = isWin
    ? isEnemy
      ? "💀"
      : "😎"
    : isHit
      ? isEnemy
        ? "😱"
        : "😵‍💫"
      : isAttacking
        ? "😤"
        : isEnemy
          ? "👹"
          : "🧑‍🎓";

  const par = isEnemy ? "🔥" : "⚡";
  const torso = isEnemy ? "🦹" : "🥼";

  // Body animation
  const bodyAnimate = isHit
    ? {
        x: [0, isEnemy ? 14 : -14, isEnemy ? -8 : 8, 0],
        y: [0, -4, 2, 0],
      }
    : isWin
      ? { y: [0, -16, 0, -10, 0], rotate: [0, -8, 8, 0] }
      : isAttacking
        ? { x: [0, isEnemy ? -15 : 15, 0], scale: [1, 1.1, 1] }
        : { y: [0, -5, 0], rotate: [0, -1.5, 1.5, 0] }; // idle float

  const bodyTransition = isHit
    ? { duration: 0.4, ease: "easeOut" as const }
    : isWin
      ? { duration: 0.7, repeat: 3 }
      : isAttacking
        ? { duration: 0.28, ease: "easeOut" as const }
        : { duration: 2.5, repeat: Infinity, ease: "easeInOut" as const };

  return (
    <div className="relative" style={{ width: 88, height: 128 }}>
      {/* Pulsing aura glow */}
      <motion.div
        className="absolute inset-0 rounded-full blur-2xl"
        style={{
          background: `radial-gradient(ellipse, ${auraColor}75, transparent 68%)`,
        }}
        animate={{
          scale: [1, 1.25, 1],
          opacity: [0.5, 0.88, 0.5],
        }}
        transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* Aura particles */}
      <AuraDot emoji={par} delay={0} x={4} y={18} />
      <AuraDot emoji={par} delay={0.45} x={70} y={12} />
      <AuraDot emoji={par} delay={0.9} x={12} y={68} />
      <AuraDot emoji={par} delay={1.35} x={62} y={72} />

      {/* Character body */}
      <motion.div
        className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-0.5"
        animate={bodyAnimate}
        transition={bodyTransition}
      >
        {/* Face */}
        <motion.span
          className="text-4xl leading-none"
          animate={
            isAttacking
              ? {
                  scale: [1, 1.2, 1],
                  rotate: [0, isEnemy ? -14 : 14, 0],
                }
              : { rotate: [0, -2.5, 2.5, 0] }
          }
          transition={
            isAttacking
              ? { duration: 0.28 }
              : { duration: 3.5, repeat: Infinity, ease: "easeInOut" }
          }
        >
          {face}
        </motion.span>

        {/* Torso row: arm · body · arm */}
        <div className="flex items-center gap-0.5 leading-none">
          <motion.span
            className="text-xl"
            style={{ display: "inline-block", transformOrigin: "50% 10%" }}
            animate={{ rotate: [-20, 20, -20] }}
            transition={{
              duration: 1.35,
              repeat: Infinity,
              ease: "easeInOut",
              delay: 0.08,
            }}
          >
            🤛
          </motion.span>

          <motion.span
            className="text-[2rem] leading-none"
            animate={isAttacking ? { scale: [1, 1.1, 1] } : {}}
            transition={{ duration: 0.28 }}
          >
            {torso}
          </motion.span>

          <motion.span
            className="text-xl"
            style={{ display: "inline-block", transformOrigin: "50% 10%" }}
            animate={{ rotate: [20, -20, 20] }}
            transition={{
              duration: 1.35,
              repeat: Infinity,
              ease: "easeInOut",
              delay: 0.32,
            }}
          >
            🤜
          </motion.span>
        </div>

        {/* Legs */}
        <motion.div
          className="flex gap-0.5 text-2xl leading-none"
          animate={{ y: [0, 2.5, 0] }}
          transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }}
        >
          <span>🦵</span>
          <span style={{ transform: "scaleX(-1)", display: "inline-block" }}>
            🦵
          </span>
        </motion.div>
      </motion.div>

      {/* Dynamic shadow */}
      <motion.div
        className="absolute bottom-0 left-1/2 -translate-x-1/2 rounded-full bg-black/45 blur-sm"
        animate={{
          width: [34, 40, 34],
          height: [6, 8, 6],
          opacity: [0.38, 0.55, 0.38],
        }}
        transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
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
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/80 px-3 py-2.5">
      <div
        className={`mb-1 flex justify-between text-[10px] font-bold uppercase tracking-wider ${labelColor}`}
      >
        <span>{label}</span>
        <span className="font-mono text-zinc-400">
          {hp}/{max}
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-black/50">
        <motion.div
          className={`h-full rounded-full bg-gradient-to-r ${gradient}`}
          animate={{ width: `${pct}%` }}
          transition={{ type: "spring", stiffness: 130, damping: 18 }}
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
}: {
  label: string;
  value: string;
  color?: string;
  pulse?: boolean;
}) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/80 p-2 text-center">
      <div className="text-[9px] uppercase tracking-wider text-zinc-500">
        {label}
      </div>
      <motion.div
        className={`text-lg font-black ${color}`}
        animate={pulse ? { scale: [1, 1.07, 1] } : {}}
        transition={{ duration: 1.1, repeat: Infinity }}
      >
        {value}
      </motion.div>
    </div>
  );
}

// ── Demo page ─────────────────────────────────────────────────────────────────
export function BattleCharacterDemo() {
  const P_MAX = 80;
  const E_MAX = 60;
  const BASE_DMG = 20;
  const CRIT_MULT = 1.5;
  const SELF_DMG = 10;

  const [playerHp, setPlayerHp] = useState(P_MAX);
  const [enemyHp, setEnemyHp] = useState(E_MAX);
  const [combo, setCombo] = useState(0);
  const [playerAnim, setPlayerAnim] = useState<DemoAnim>("idle");
  const [enemyAnim, setEnemyAnim] = useState<DemoAnim>("idle");
  const [dmgPop, setDmgPop] = useState<{
    text: string;
    crit: boolean;
    k: number;
  } | null>(null);
  const [blackFlash, setBlackFlash] = useState(false);
  const [lastDmg, setLastDmg] = useState(BASE_DMG);
  const popKey = useRef(0);

  const critChance = getCritChance(combo);
  const isOver = playerHp <= 0 || enemyHp <= 0;
  const playerWon = enemyHp <= 0;

  const showPop = (text: string, crit: boolean) => {
    setDmgPop({ text, crit, k: ++popKey.current });
    setTimeout(() => setDmgPop(null), 950);
  };

  const onCorrect = () => {
    if (isOver) return;
    const nc = combo + 1;
    setCombo(nc);
    const chance = getCritChance(nc);
    const isCrit = Math.random() * 100 < chance;
    const dmg = Math.round(isCrit ? BASE_DMG * CRIT_MULT : BASE_DMG);
    setLastDmg(dmg);

    if (isCrit) {
      setBlackFlash(true);
      setTimeout(() => setBlackFlash(false), 580);
    }

    setPlayerAnim(isCrit ? "crit" : "attack");
    setEnemyAnim("hit");

    const nextHp = Math.max(0, enemyHp - dmg);
    setEnemyHp(nextHp);
    showPop(isCrit ? `⚡ BLACK FLASH  -${dmg}` : `-${dmg}`, isCrit);

    setTimeout(() => {
      setPlayerAnim(nextHp <= 0 ? "win" : "idle");
      setEnemyAnim("idle");
    }, 520);
  };

  const onWrong = () => {
    if (isOver) return;
    setCombo(0);
    setPlayerAnim("hit");
    setEnemyAnim("attack");
    const nextHp = Math.max(0, playerHp - SELF_DMG);
    setPlayerHp(nextHp);
    showPop(`-${SELF_DMG}`, false);

    setTimeout(() => {
      setPlayerAnim("idle");
      setEnemyAnim(nextHp <= 0 ? "win" : "idle");
    }, 520);
  };

  const reset = () => {
    setPlayerHp(P_MAX);
    setEnemyHp(E_MAX);
    setCombo(0);
    setPlayerAnim("idle");
    setEnemyAnim("idle");
    setDmgPop(null);
    setBlackFlash(false);
    setLastDmg(BASE_DMG);
  };

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

  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-gradient-to-b from-zinc-950 via-zinc-900 to-black text-zinc-100">
      {/* ── Black Flash screen effect ─────────────────────────────────── */}
      <AnimatePresence>
        {blackFlash && (
          <motion.div
            className="pointer-events-none fixed inset-0 z-50"
            style={{ background: "#1a003a" }}
            initial={{ opacity: 0.92 }}
            animate={{ opacity: [0.92, 0.4, 0.85, 0] }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.55, ease: "easeOut" }}
          />
        )}
      </AnimatePresence>

      <div className="mx-auto flex w-full max-w-md flex-1 flex-col px-4 py-6">
        {/* Title */}
        <h1 className="mb-4 text-center text-lg font-black tracking-tight text-white">
          ⚔️ Gordemy Battle
        </h1>

        {/* HP bars */}
        <div className="mb-3 space-y-2">
          <HpBar
            label="🧑‍🎓 Ти"
            hp={playerHp}
            max={P_MAX}
            gradient="from-emerald-500 to-teal-400"
            labelColor="text-emerald-400"
          />
          <HpBar
            label="👹 Ворог"
            hp={enemyHp}
            max={E_MAX}
            gradient="from-rose-600 to-orange-500"
            labelColor="text-rose-400"
          />
        </div>

        {/* Stats row */}
        <div className="mb-4 grid grid-cols-3 gap-2">
          <StatBox label="Урон" value={`${lastDmg}`} />
          <StatBox
            label="Крит ⚡"
            value={`${critChance}%`}
            color={critColor}
            pulse={critChance > 0}
          />
          <StatBox label="Комбо" value={`×${combo}`} color="text-amber-300" />
        </div>

        {/* Battle arena */}
        <div className="relative mb-4 flex min-h-[228px] items-end justify-around rounded-3xl border border-zinc-800 bg-zinc-950/80 px-4 py-6 shadow-[inset_0_0_60px_rgba(0,0,0,0.6)]">
          {/* Player */}
          <div className="flex flex-col items-center gap-1">
            <EmojiChar anim={playerAnim} auraColor="#6366f1" />
            <span className="text-[9px] font-bold uppercase tracking-widest text-zinc-600">
              Ти
            </span>
          </div>

          <span className="mb-6 text-xs font-black text-zinc-700">VS</span>

          {/* Enemy */}
          <div className="flex flex-col items-center gap-1">
            <EmojiChar isEnemy anim={enemyAnim} auraColor="#ef4444" />
            <span className="text-[9px] font-bold uppercase tracking-widest text-zinc-600">
              Ворог
            </span>
          </div>

          {/* Floating damage pop */}
          <AnimatePresence>
            {dmgPop && (
              <motion.div
                key={dmgPop.k}
                className={`pointer-events-none absolute top-4 left-1/2 -translate-x-1/2 whitespace-nowrap font-black ${
                  dmgPop.crit ? "text-xl text-yellow-300" : "text-lg text-white"
                }`}
                initial={{ y: 0, opacity: 1, scale: dmgPop.crit ? 1.35 : 1 }}
                animate={{ y: -52, opacity: 0 }}
                transition={{ duration: 0.8, ease: "easeOut" }}
              >
                {dmgPop.text}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Game-over overlay */}
          {isOver && (
            <motion.div
              className="absolute inset-0 flex flex-col items-center justify-center gap-2 rounded-3xl bg-black/70 backdrop-blur-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.4 }}
            >
              <div className="text-5xl">{playerWon ? "🏆" : "💀"}</div>
              <div className="text-xl font-black text-white">
                {playerWon ? "Перемога!" : "Поразка..."}
              </div>
            </motion.div>
          )}
        </div>

        {/* Combo hint */}
        <AnimatePresence>
          {combo >= 2 && !isOver && (
            <motion.p
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="mb-3 text-center text-xs font-bold text-amber-400"
            >
              🔥 Combo ×{combo} — {critChance}% шанс Black Flash!
            </motion.p>
          )}
        </AnimatePresence>

        {/* Controls */}
        <div className="mt-auto flex flex-col gap-2">
          <button
            type="button"
            disabled={isOver}
            onClick={onCorrect}
            className="rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 py-4 text-sm font-black uppercase tracking-wide text-white shadow-lg shadow-emerald-900/40 active:scale-[0.98] disabled:opacity-40"
          >
            ✅ Правильна відповідь
          </button>
          <button
            type="button"
            disabled={isOver}
            onClick={onWrong}
            className="rounded-2xl border border-rose-900/60 bg-rose-950/40 py-4 text-sm font-black uppercase tracking-wide text-rose-200 active:scale-[0.98] disabled:opacity-40"
          >
            ❌ Неправильна (удар по собі)
          </button>
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
