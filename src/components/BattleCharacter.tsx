"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { SPRITE_SET, type BattleAnim } from "@/lib/battle-character-sprites";

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
        {/* Data-URI sprites — skip next/image */}
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

/** Local demo: enemy HP, correct/wrong buttons, win on HP 0. */
export function BattleCharacterDemo() {
  const [enemyHp, setEnemyHp] = useState(60);
  const enemyMax = 60;
  const [combo, setCombo] = useState(0);
  const [cue, setCue] = useState<BattleCue | null>(null);
  const nonce = useRef(0);
  const pendingWin = useRef(false);

  const fire = (kind: BattleCue["kind"]) => {
    setCue({ kind, nonce: ++nonce.current });
  };

  const onComplete = (kind: BattleCue["kind"]) => {
    if (kind === "attack" && pendingWin.current) {
      pendingWin.current = false;
      fire("win");
    }
  };

  const onCorrect = () => {
    const dmg = 20;
    const next = Math.max(0, enemyHp - dmg);
    setEnemyHp(next);
    setCombo((c) => c + 1);
    if (next <= 0) pendingWin.current = true;
    fire("attack");
  };

  const onWrong = () => {
    setCombo(0);
    fire("hit");
  };

  const reset = () => {
    setEnemyHp(enemyMax);
    setCombo(0);
    pendingWin.current = false;
    setCue(null);
    nonce.current = 0;
  };

  const pct = Math.max(0, (enemyHp / enemyMax) * 100);

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-b from-zinc-950 via-zinc-900 to-black text-zinc-100">
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col px-4 py-8">
        <h1 className="mb-1 text-center text-xl font-black tracking-tight text-white">
          BattleCharacter
        </h1>
        <p className="mb-6 text-center text-xs text-zinc-500">
          Спрайти · 100ms/кадр · сигнал через{" "}
          <code className="text-zinc-400">cue</code>
        </p>

        <div className="mb-4 grid grid-cols-2 gap-3">
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/80 p-3">
            <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">
              Ворог
            </div>
            <div className="mt-1 h-2 overflow-hidden rounded-full bg-black/50">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-rose-600 to-orange-500"
                animate={{ width: `${pct}%` }}
                transition={{ type: "spring", stiffness: 120, damping: 18 }}
              />
            </div>
            <div className="mt-1 text-right text-xs font-mono text-zinc-400">
              {enemyHp}/{enemyMax}
            </div>
          </div>
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/80 p-3">
            <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">
              Комбо
            </div>
            <div className="mt-2 text-2xl font-black text-amber-300 tabular-nums">
              {combo}
            </div>
          </div>
        </div>

        <motion.div
          layout
          className="relative mb-8 flex min-h-[200px] flex-col items-center justify-center rounded-3xl border border-zinc-800 bg-zinc-950/80 py-8 shadow-[inset_0_0_60px_rgba(0,0,0,0.5)]"
        >
          <BattleCharacter
            cue={cue}
            onActionComplete={onComplete}
            comboCount={combo}
            className="scale-110"
          />
          {enemyHp <= 0 && (
            <p className="mt-4 text-sm font-bold text-emerald-400">
              Ворог повержено — натисни «Скинути»
            </p>
          )}
        </motion.div>

        <div className="mt-auto flex flex-col gap-2">
          <button
            type="button"
            disabled={enemyHp <= 0}
            onClick={onCorrect}
            className="rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 py-4 text-sm font-black uppercase tracking-wide text-white shadow-lg shadow-emerald-900/40 disabled:opacity-40"
          >
            Правильна відповідь (атака)
          </button>
          <button
            type="button"
            disabled={enemyHp <= 0}
            onClick={onWrong}
            className="rounded-2xl border border-rose-900/60 bg-rose-950/40 py-4 text-sm font-black uppercase tracking-wide text-rose-200 disabled:opacity-40"
          >
            Неправильна (урон по собі)
          </button>
          <button
            type="button"
            onClick={reset}
            className="rounded-xl py-3 text-xs font-semibold text-zinc-500 underline-offset-4 hover:text-zinc-300 hover:underline"
          >
            Скинути бій
          </button>
        </div>
      </div>
    </div>
  );
}
