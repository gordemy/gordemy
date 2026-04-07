"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/lib/supabase";
import Link from "next/link";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Clan {
  id: string;
  name: string;
  emoji: string;
  description: string;
  owner_id: string;
  member_count: number;
  total_xp: number;
  weekly_xp: number;
  created_at: string;
  rank?: number;
}

interface ClanMember {
  id: string;
  name: string;
  level: number;
  xp: number;
  weekly_xp: number;
  streak: number;
  role: "owner" | "elder" | "member";
}

const CLAN_EMOJIS = ["🔥", "⚡", "💎", "🐉", "🦁", "🌙", "⭐", "🏔️", "🌊", "🎯", "🚀", "👑", "🛡️", "🗡️", "🦅"];

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function ClanPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [myClan, setMyClan] = useState<Clan | null>(null);
  const [members, setMembers] = useState<ClanMember[]>([]);
  const [allClans, setAllClans] = useState<Clan[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"clan" | "ranking">("clan");

  // Create clan modal
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [newEmoji, setNewEmoji] = useState("🔥");
  const [newDesc, setNewDesc] = useState("");
  const [creating, setCreating] = useState(false);
  const [joining, setJoining] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { router.push("/login"); return; }
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, authLoading]);

  async function loadData() {
    setLoading(true);

    // Get my clan membership
    const { data: membership } = await supabase
      .from("clan_members")
      .select("clan_id, role")
      .eq("student_id", user!.id)
      .single();

    if (membership) {
      // Load clan + members
      const { data: clan } = await supabase
        .from("clans")
        .select("*")
        .eq("id", membership.clan_id)
        .single();
      setMyClan(clan as Clan);

      const { data: mems } = await supabase
        .from("clan_members")
        .select("student_id, role, students(id, name, level, xp, weekly_xp, streak)")
        .eq("clan_id", membership.clan_id);

      setMembers(
        ((mems || []) as any[]).map(m => ({
          id: m.students?.id,
          name: m.students?.name || "?",
          level: m.students?.level || 1,
          xp: m.students?.xp || 0,
          weekly_xp: m.students?.weekly_xp || 0,
          streak: m.students?.streak || 0,
          role: m.role,
        }))
      );
    }

    // Load all clans for ranking
    const { data: clans } = await supabase
      .from("clans")
      .select("*")
      .order("weekly_xp", { ascending: false })
      .limit(20);
    setAllClans(
      ((clans || []) as Clan[]).map((c, i) => ({ ...c, rank: i + 1 }))
    );

    setLoading(false);
  }

  async function createClan() {
    if (!newName.trim()) return;
    setCreating(true);
    try {
      const { data: clan, error } = await supabase
        .from("clans")
        .insert({
          name:       newName.trim(),
          emoji:      newEmoji,
          description:newDesc.trim(),
          creator_id: user!.id,
          owner_id:   user!.id,
          member_count: 1,
          total_xp:   0,
          weekly_xp:  0,
        })
        .select()
        .single();

      if (error) throw error;

      await supabase.from("clan_members").insert({
        clan_id: clan.id,
        student_id: user!.id,
        role: "owner",
      });

      await supabase.from("students").update({ clan_id: clan.id }).eq("id", user!.id);

      setShowCreate(false);
      await loadData();
    } catch (e: any) {
      if (e.code === "23505") alert("Клан з такою назвою вже існує!");
      else console.error(e);
    }
    setCreating(false);
  }

  async function joinClan(clanId: string) {
    setJoining(clanId);
    try {
      await supabase.from("clan_members").insert({
        clan_id: clanId,
        student_id: user!.id,
        role: "member",
      });
      await supabase.from("students").update({ clan_id: clanId }).eq("id", user!.id);
      await supabase.from("clans").update({ member_count: supabase.rpc("increment", { x: 1 }) }).eq("id", clanId);
      await loadData();
    } catch (e) {
      console.error(e);
    }
    setJoining(null);
  }

  async function leaveClan() {
    if (!myClan) return;
    if (!confirm("Ти точно хочеш покинути клан?")) return;
    await supabase.from("clan_members").delete().eq("student_id", user!.id).eq("clan_id", myClan.id);
    await supabase.from("students").update({ clan_id: null }).eq("id", user!.id);
    setMyClan(null);
    setMembers([]);
    await loadData();
  }

  // ─── Loading ──────────────────────────────────────────────────────────────

  if (authLoading || loading) {
    return (
      <div className="max-w-[600px] mx-auto px-6 py-12 text-center">
        <div className="text-5xl mb-4 animate-bounce">🏘️</div>
        <p className="text-gordemy-muted text-lg">Завантаження кланів...</p>
      </div>
    );
  }

  // ─── No clan — join or create ─────────────────────────────────────────────

  if (!myClan) {
    return (
      <div className="max-w-[600px] mx-auto px-6 py-8">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-8 text-center">
          <div className="text-6xl mb-4">🏘️</div>
          <h1 className="text-3xl font-black text-white">Клани</h1>
          <p className="text-gordemy-muted mt-2">Приєднуйся до команди і змагайтесь разом за вершину рейтингу!</p>
        </motion.div>

        <div className="flex gap-3 mb-8">
          <button
            onClick={() => setShowCreate(true)}
            className="flex-1 py-4 rounded-2xl bg-gradient-to-r from-gordemy-blue to-gordemy-purple text-white font-black text-lg hover:opacity-90 transition-all"
          >
            + Створити клан
          </button>
        </div>

        {/* Clan list */}
        <h2 className="text-gordemy-muted font-bold mb-4 uppercase text-sm tracking-wider">Топ кланів тижня</h2>
        <div className="space-y-3">
          {allClans.map((clan, i) => (
            <motion.div
              key={clan.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.04 }}
              className="bg-gordemy-card border border-gordemy-border rounded-2xl p-5 hover:border-gordemy-blue/30 transition-all"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-gordemy-purple/20 flex items-center justify-center text-2xl">
                    {clan.emoji}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-black text-white">{clan.name}</span>
                      {i === 0 && <span className="text-xs bg-gordemy-orange/20 text-gordemy-orange px-2 py-0.5 rounded-full">👑 Топ</span>}
                    </div>
                    <div className="text-xs text-gordemy-muted">{clan.member_count} учасників · {clan.total_xp} XP всього</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-gordemy-blue font-bold">{clan.weekly_xp}</div>
                  <div className="text-xs text-gordemy-muted">XP цього тижня</div>
                </div>
              </div>
              {clan.description && (
                <p className="text-gordemy-muted text-sm mb-3">{clan.description}</p>
              )}
              <button
                onClick={() => joinClan(clan.id)}
                disabled={joining === clan.id}
                className="w-full py-2.5 rounded-xl border border-gordemy-blue/40 text-gordemy-blue font-bold text-sm hover:bg-gordemy-blue/10 disabled:opacity-50 transition-all"
              >
                {joining === clan.id ? "Приєднання..." : "🏘️ Приєднатись"}
              </button>
            </motion.div>
          ))}
        </div>

        {/* Create clan modal */}
        <AnimatePresence>
          {showCreate && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/70 z-50 flex items-end sm:items-center justify-center p-4"
              onClick={e => e.target === e.currentTarget && setShowCreate(false)}
            >
              <motion.div
                initial={{ y: 80, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 80, opacity: 0 }}
                className="w-full max-w-[480px] bg-gordemy-card border border-gordemy-border rounded-3xl p-6"
              >
                <h2 className="text-xl font-black text-white mb-5">🏘️ Створити клан</h2>

                <div className="mb-4">
                  <label className="text-gordemy-muted text-sm mb-2 block">Emoji клану</label>
                  <div className="flex flex-wrap gap-2">
                    {CLAN_EMOJIS.map(e => (
                      <button
                        key={e}
                        onClick={() => setNewEmoji(e)}
                        className={`text-2xl p-2 rounded-lg transition-all ${newEmoji === e ? "bg-gordemy-blue/20 border-2 border-gordemy-blue" : "hover:bg-gordemy-border"}`}
                      >
                        {e}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="mb-4">
                  <label className="text-gordemy-muted text-sm mb-2 block">Назва клану *</label>
                  <input
                    value={newName}
                    onChange={e => setNewName(e.target.value)}
                    placeholder="Наприклад: Математичні Дракони"
                    className="w-full bg-gordemy-bg border border-gordemy-border rounded-xl px-4 py-3 text-white placeholder-gordemy-muted focus:outline-none focus:border-gordemy-blue/50"
                    maxLength={30}
                  />
                </div>

                <div className="mb-6">
                  <label className="text-gordemy-muted text-sm mb-2 block">Опис (необов&apos;язково)</label>
                  <textarea
                    value={newDesc}
                    onChange={e => setNewDesc(e.target.value)}
                    placeholder="Ваша місія..."
                    rows={2}
                    className="w-full bg-gordemy-bg border border-gordemy-border rounded-xl px-4 py-3 text-white placeholder-gordemy-muted focus:outline-none focus:border-gordemy-blue/50 resize-none"
                    maxLength={100}
                  />
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => setShowCreate(false)}
                    className="flex-1 py-3 rounded-xl border border-gordemy-border text-gordemy-muted font-bold hover:text-white transition-all"
                  >
                    Скасувати
                  </button>
                  <button
                    onClick={createClan}
                    disabled={!newName.trim() || creating}
                    className="flex-1 py-3 rounded-xl bg-gradient-to-r from-gordemy-blue to-gordemy-purple text-white font-black hover:opacity-90 disabled:opacity-40 transition-all"
                  >
                    {creating ? "Створення..." : `${newEmoji} Створити`}
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  // ─── My Clan ──────────────────────────────────────────────────────────────

  const myMember = members.find(m => m.id === user?.id);
  const isOwner  = myMember?.role === "owner" || (myClan as any).creator_id === user?.id;
  const totalWeeklyXP = members.reduce((sum, m) => sum + (m.weekly_xp || 0), 0);
  const myClanRank = allClans.findIndex(c => c.id === myClan.id) + 1;

  return (
    <div className="max-w-[600px] mx-auto px-6 py-8">
      {/* Clan header */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
        <div className="bg-gordemy-card border border-gordemy-purple/30 rounded-3xl p-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-gordemy-purple/10 rounded-full -translate-y-1/2 translate-x-1/2" />

          <div className="flex items-start gap-4 mb-5">
            <div className="w-16 h-16 rounded-2xl bg-gordemy-purple/20 flex items-center justify-center text-4xl shrink-0">
              {myClan.emoji}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h1 className="text-2xl font-black text-white">{myClan.name}</h1>
                {myClanRank > 0 && (
                  <span className="text-xs bg-gordemy-orange/20 text-gordemy-orange px-2 py-0.5 rounded-full font-bold">
                    #{myClanRank} тижня
                  </span>
                )}
              </div>
              {myClan.description && <p className="text-gordemy-muted text-sm">{myClan.description}</p>}
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-gordemy-bg/60 rounded-2xl p-3 text-center">
              <div className="text-xl font-black text-gordemy-blue">{members.length}</div>
              <div className="text-xs text-gordemy-muted">Учасників</div>
            </div>
            <div className="bg-gordemy-bg/60 rounded-2xl p-3 text-center">
              <div className="text-xl font-black text-gordemy-green">{totalWeeklyXP}</div>
              <div className="text-xs text-gordemy-muted">XP цього тижня</div>
            </div>
            <div className="bg-gordemy-bg/60 rounded-2xl p-3 text-center">
              <div className="text-xl font-black text-gordemy-orange">{myClan.total_xp}</div>
              <div className="text-xs text-gordemy-muted">Всього XP</div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Tabs */}
      <div className="flex gap-2 mb-5">
        {[
          { id: "clan", label: "👥 Учасники" },
          { id: "ranking", label: "🏆 Рейтинг кланів" },
        ].map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id as any)}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
              tab === t.id
                ? "bg-gordemy-purple/20 border border-gordemy-purple/40 text-gordemy-purple"
                : "border border-gordemy-border text-gordemy-muted hover:text-white"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Members */}
      {tab === "clan" && (
        <div className="space-y-2">
          {members.map((m, i) => (
            <motion.div
              key={m.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.04 }}
              className={`flex items-center gap-4 p-4 rounded-xl border transition-all ${
                m.id === user?.id
                  ? "border-gordemy-purple/40 bg-gordemy-purple/5"
                  : "border-gordemy-border bg-gordemy-card"
              }`}
            >
              <div className="font-black text-gordemy-muted w-6 text-center">{i + 1}</div>
              <div className="w-10 h-10 rounded-full bg-gordemy-purple/20 flex items-center justify-center font-black text-gordemy-purple">
                {m.name[0]?.toUpperCase()}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-white text-sm">{m.name}</span>
                  {m.role === "owner" && <span className="text-xs text-gordemy-orange">👑</span>}
                  {m.role === "elder" && <span className="text-xs text-gordemy-blue">⭐</span>}
                  {m.id === user?.id && <span className="text-xs text-gordemy-purple bg-gordemy-purple/10 px-1.5 py-0.5 rounded">Я</span>}
                </div>
                <div className="text-xs text-gordemy-muted">Lvl {m.level} · 🔥 {m.streak} днів</div>
              </div>
              <div className="text-right">
                <div className="font-bold text-gordemy-green text-sm">{m.weekly_xp} XP</div>
                <div className="text-xs text-gordemy-muted">цього тижня</div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Clan ranking */}
      {tab === "ranking" && (
        <div className="space-y-3">
          {allClans.map((clan, i) => {
            const isMe = clan.id === myClan.id;
            const medals = ["🥇", "🥈", "🥉"];
            return (
              <motion.div
                key={clan.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                className={`flex items-center gap-4 p-4 rounded-2xl border transition-all ${
                  isMe
                    ? "border-gordemy-purple/50 bg-gordemy-purple/10"
                    : "border-gordemy-border bg-gordemy-card"
                }`}
              >
                <div className="text-xl font-black w-8 text-center">
                  {i < 3 ? medals[i] : <span className="text-gordemy-muted text-base">#{i + 1}</span>}
                </div>
                <div className="text-2xl">{clan.emoji}</div>
                <div className="flex-1">
                  <div className="font-bold text-white text-sm flex items-center gap-2">
                    {clan.name}
                    {isMe && <span className="text-xs text-gordemy-purple">← Твій</span>}
                  </div>
                  <div className="text-xs text-gordemy-muted">{clan.member_count} учасників</div>
                </div>
                <div className="text-right">
                  <div className="font-black text-gordemy-blue">{clan.weekly_xp}</div>
                  <div className="text-xs text-gordemy-muted">XP/тиждень</div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Leave clan */}
      <div className="mt-8 pt-6 border-t border-gordemy-border">
        <button
          onClick={leaveClan}
          className="text-sm text-gordemy-muted hover:text-red-400 transition-colors"
        >
          Покинути клан
        </button>
      </div>
    </div>
  );
}
