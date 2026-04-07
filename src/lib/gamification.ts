import { supabase } from "./supabase";

// ─── Combo System ─────────────────────────────────────────────────────────────

export interface ComboState {
  count: number;
  multiplier: number;
  label: string;
  color: string;
  emoji: string;
}

export function getComboState(correctStreak: number): ComboState {
  if (correctStreak >= 10) return { count: correctStreak, multiplier: 3.0, label: "LEGENDARY",  color: "text-gordemy-orange", emoji: "🔱" };
  if (correctStreak >= 7)  return { count: correctStreak, multiplier: 2.5, label: "INSANE",     color: "text-gordemy-purple", emoji: "💥" };
  if (correctStreak >= 5)  return { count: correctStreak, multiplier: 2.0, label: "UNSTOPPABLE",color: "text-gordemy-blue",   emoji: "🚀" };
  if (correctStreak >= 3)  return { count: correctStreak, multiplier: 1.5, label: "ON FIRE",    color: "text-gordemy-orange", emoji: "🔥" };
  if (correctStreak >= 2)  return { count: correctStreak, multiplier: 1.25,label: "COMBO",      color: "text-gordemy-green",  emoji: "⚡" };
  return                         { count: correctStreak, multiplier: 1.0, label: "",            color: "text-gordemy-muted",  emoji: "" };
}

// ─── Daily Quest ──────────────────────────────────────────────────────────────

export interface DailyQuest {
  id: string;
  label: string;
  description: string;
  target: number;
  current: number;
  xpReward: number;
  gemReward: number;
  emoji: string;
  completed: boolean;
}

export async function getDailyQuests(studentId: string): Promise<DailyQuest[]> {
  const today = new Date().toISOString().split("T")[0];

  const { data: tasks } = await supabase
    .from("tasks")
    .select("completed, is_correct, subject")
    .eq("student_id", studentId)
    .eq("date", today);

  const { data: stu } = await supabase
    .from("students")
    .select("streak, daily_quest_claimed")
    .eq("id", studentId)
    .single();

  const completedToday = (tasks || []).filter((t: any) => t.completed).length;
  const correctToday = (tasks || []).filter((t: any) => t.is_correct).length;

  // Check mystery box
  const { data: mb } = await supabase
    .from("mystery_box_claims")
    .select("id")
    .eq("student_id", studentId)
    .eq("date", today)
    .single();

  const claimedIds: string[] = stu?.daily_quest_claimed
    ? (typeof stu.daily_quest_claimed === "string" ? JSON.parse(stu.daily_quest_claimed) : stu.daily_quest_claimed)
    : [];

  return [
    {
      id: "tasks_5",
      label: "Зробити 5 завдань",
      description: "Виконай 5 завдань сьогодні",
      target: 5,
      current: Math.min(completedToday, 5),
      xpReward: 50,
      gemReward: 5,
      emoji: "📋",
      completed: claimedIds.includes("tasks_5") || completedToday >= 5,
    },
    {
      id: "correct_3",
      label: "3 правильних підряд",
      description: "Дай 3 правильні відповіді",
      target: 3,
      current: Math.min(correctToday, 3),
      xpReward: 30,
      gemReward: 3,
      emoji: "🎯",
      completed: claimedIds.includes("correct_3") || correctToday >= 3,
    },
    {
      id: "mystery_box",
      label: "Відкрити Mystery Box",
      description: "Відкрий щоденний сюрприз",
      target: 1,
      current: mb ? 1 : 0,
      xpReward: 20,
      gemReward: 2,
      emoji: "🎲",
      completed: claimedIds.includes("mystery_box") || !!mb,
    },
  ];
}

// ─── First Blood ──────────────────────────────────────────────────────────────

export async function checkFirstBlood(studentId: string): Promise<boolean> {
  const today = new Date().toISOString().split("T")[0];
  const { data } = await supabase
    .from("tasks")
    .select("id")
    .eq("student_id", studentId)
    .eq("date", today)
    .eq("completed", true)
    .limit(1)
    .single();
  return !data; // true = this will be the first task today
}

// ─── Types ──────────────────────────────────────────────────────────────────

export interface GhostSnapshot {
  id: string;
  student_id: string;
  date: string;
  xp_earned: number;
  tasks_completed: number;
  correct_answers: number;
}

export interface BossFight {
  id: string;
  date: string;
  boss_name: string;
  boss_emoji: string;
  subject: string;
  difficulty: string;
  xp_reward: number;
  hp: number;
  description: string | null;
}

export interface BossAttempt {
  id: string;
  student_id: string;
  boss_id: string;
  won: boolean;
  score: number;
  damage_dealt: number;
  attempted_at: string;
}

// ─── Boss subjects rotation ─────────────────────────────────────────────────

const BOSSES = [
  { boss_name: "Темний Диктант",     boss_emoji: "📜", subject: "ukr",  description: "Найскладніший диктант НМТ. Тільки майстри слова пройдуть!" },
  { boss_name: "Математичний Дракон",boss_emoji: "🐉", subject: "math", description: "Він дихає алгебраю і геометрією. Хто зупинить його?" },
  { boss_name: "Тіньовий Хронікер",  boss_emoji: "⚔️", subject: "hist", description: "Він знає кожну дату. Перевір свої знання з Історії України!" },
  { boss_name: "Лорд Граматики",     boss_emoji: "🧠", subject: "eng",  description: "English boss. Only the best grammar warriors shall pass." },
  { boss_name: "Біологічний Мутант", boss_emoji: "🧬", subject: "bio",  description: "Мутував через надмірне читання підручників. Зупини його!" },
  { boss_name: "Квантовий Вихор",    boss_emoji: "⚡", subject: "phys", description: "Закони Ньютона — його зброя. Ти готовий?" },
  { boss_name: "Хімічний Алхімік",   boss_emoji: "🧪", subject: "chem", description: "Перетворює знання в золото. А ти зможеш?" },
];

// ─── Ghost Race ─────────────────────────────────────────────────────────────

export async function getYesterdayGhost(studentId: string): Promise<GhostSnapshot | null> {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split("T")[0];

  const { data, error } = await supabase
    .from("ghost_snapshots")
    .select("*")
    .eq("student_id", studentId)
    .eq("date", yesterdayStr)
    .single();

  if (error) return null;
  return data;
}

export async function getTodayGhostProgress(studentId: string): Promise<GhostSnapshot | null> {
  const today = new Date().toISOString().split("T")[0];

  const { data, error } = await supabase
    .from("ghost_snapshots")
    .select("*")
    .eq("student_id", studentId)
    .eq("date", today)
    .single();

  if (error) return null;
  return data;
}

export async function updateTodayGhostSnapshot(
  studentId: string,
  xpEarned: number,
  tasksCompleted: number,
  correctAnswers: number
): Promise<void> {
  const today = new Date().toISOString().split("T")[0];

  await supabase.from("ghost_snapshots").upsert(
    {
      student_id: studentId,
      date: today,
      xp_earned: xpEarned,
      tasks_completed: tasksCompleted,
      correct_answers: correctAnswers,
    },
    { onConflict: "student_id,date" }
  );
}

// ─── Boss Fight ──────────────────────────────────────────────────────────────

export async function getTodayBoss(): Promise<BossFight | null> {
  const today = new Date().toISOString().split("T")[0];

  // Try to get today's boss
  const { data, error } = await supabase
    .from("boss_fights")
    .select("*")
    .eq("date", today)
    .single();

  if (!error && data) return data;

  // Auto-create today's boss based on day of week
  const dayOfWeek = new Date().getDay();
  const boss = BOSSES[dayOfWeek % BOSSES.length];

  const { data: newBoss, error: insertError } = await supabase
    .from("boss_fights")
    .insert({
      date: today,
      ...boss,
      difficulty: "hard",
      xp_reward: 300,
      hp: 100,
    })
    .select()
    .single();

  if (insertError) {
    console.error("Create boss error:", insertError);
    return null;
  }
  return newBoss;
}

export async function getMyBossAttempt(
  studentId: string,
  bossId: string
): Promise<BossAttempt | null> {
  const { data, error } = await supabase
    .from("boss_attempts")
    .select("*")
    .eq("student_id", studentId)
    .eq("boss_id", bossId)
    .single();

  if (error) return null;
  return data;
}

export async function getAllBossAttempts(bossId: string): Promise<(BossAttempt & { student_name: string })[]> {
  const { data, error } = await supabase
    .from("boss_attempts")
    .select("*, students(name)")
    .eq("boss_id", bossId)
    .order("score", { ascending: false })
    .limit(10);

  if (error) return [];
  return (data || []).map((d: any) => ({
    ...d,
    student_name: d.students?.name || "Герой",
  }));
}

export async function saveBossAttempt(
  studentId: string,
  bossId: string,
  won: boolean,
  score: number,
  damageDealt: number,
  xpReward: number
): Promise<void> {
  // Save attempt
  await supabase.from("boss_attempts").upsert(
    {
      student_id: studentId,
      boss_id: bossId,
      won,
      score,
      damage_dealt: damageDealt,
    },
    { onConflict: "student_id,boss_id" }
  );

  if (won) {
    // Award XP + gems for winning
    const { data: student } = await supabase
      .from("students")
      .select("xp, level, gems, weekly_xp")
      .eq("id", studentId)
      .single();

    if (student) {
      const newXp = (student.xp || 0) + xpReward;
      const newLevel = Math.floor(newXp / 100) + 1;
      const newGems = (student.gems || 0) + 10;
      const newWeeklyXp = (student.weekly_xp || 0) + xpReward;

      await supabase
        .from("students")
        .update({
          xp: newXp,
          level: newLevel,
          gems: newGems,
          weekly_xp: newWeeklyXp,
        })
        .eq("id", studentId);
    }
  }
}

// ─── Streak Shield ───────────────────────────────────────────────────────────

export async function applyStreakShield(studentId: string): Promise<boolean> {
  const today = new Date().toISOString().split("T")[0];

  const { data: student } = await supabase
    .from("students")
    .select("streak_shields, last_active_date, streak")
    .eq("id", studentId)
    .single();

  if (!student || (student.streak_shields || 0) <= 0) return false;

  // Use shield: restore streak + mark as active today
  await supabase
    .from("students")
    .update({
      streak_shields: (student.streak_shields || 1) - 1,
      last_active_date: today,
    })
    .eq("id", studentId);

  return true;
}

// ─── XP Multiplier (hour-based) ──────────────────────────────────────────────

export function getXPMultiplier(): { multiplier: number; label: string; active: boolean; emoji: string } {
  const hour = new Date().getHours();
  if (hour >= 6 && hour < 9)  return { multiplier: 1.5, label: "Ранковий бонус",  active: true,  emoji: "🌅" };
  if (hour >= 21 && hour <= 23) return { multiplier: 1.25, label: "Нічний бонус", active: true,  emoji: "🌙" };
  if (hour >= 12 && hour <= 14) return { multiplier: 1.1, label: "Обідній бонус", active: true,  emoji: "☀️" };
  return { multiplier: 1, label: "", active: false, emoji: "" };
}

export function applyMultiplier(xp: number): number {
  return Math.round(xp * getXPMultiplier().multiplier);
}

// ─── Speed Bonus ─────────────────────────────────────────────────────────────

export function getSpeedBonus(secondsTaken: number): { bonusXP: number; label: string; emoji: string } {
  if (secondsTaken <= 8)  return { bonusXP: 20, label: "Блискавка!",  emoji: "⚡" };
  if (secondsTaken <= 15) return { bonusXP: 10, label: "Швидко!",     emoji: "🚀" };
  if (secondsTaken <= 25) return { bonusXP: 5,  label: "Непогано!",   emoji: "👍" };
  return { bonusXP: 0, label: "", emoji: "" };
}

// ─── Player Title ─────────────────────────────────────────────────────────────

export function getPlayerTitle(level: number, totalTasks: number, streak: number): { title: string; color: string } {
  if (level >= 20) return { title: "🔱 Легенда НМТ",    color: "text-gordemy-orange" };
  if (level >= 15) return { title: "💎 Майстер",         color: "text-gordemy-purple" };
  if (level >= 10) return { title: "🏆 Чемпіон",         color: "text-gordemy-blue" };
  if (level >= 7)  return { title: "⭐ Досвідчений",      color: "text-gordemy-blue" };
  if (level >= 5)  return { title: "🎓 Учень",            color: "text-gordemy-green" };
  if (streak >= 10) return { title: "🔥 Залізна воля",   color: "text-gordemy-orange" };
  if (totalTasks >= 50) return { title: "📚 Зубрило",    color: "text-gordemy-muted" };
  return { title: "🌱 Новачок",                           color: "text-gordemy-muted" };
}

// ─── Mystery Box ──────────────────────────────────────────────────────────────

type MysteryReward = { type: string; value: number; label: string; emoji: string; rarity: "common" | "rare" | "epic" };

const MYSTERY_REWARDS: MysteryReward[] = [
  { type: "xp",     value: 50,  label: "50 XP",         emoji: "💎", rarity: "common" },
  { type: "xp",     value: 100, label: "100 XP",        emoji: "💎", rarity: "rare"   },
  { type: "xp",     value: 200, label: "200 XP",        emoji: "🔮", rarity: "epic"   },
  { type: "gems",   value: 5,   label: "5 Гемів",       emoji: "💎", rarity: "common" },
  { type: "gems",   value: 15,  label: "15 Гемів",      emoji: "💎", rarity: "rare"   },
  { type: "shield", value: 1,   label: "Streak Shield", emoji: "🛡️", rarity: "rare"   },
  { type: "xp",     value: 30,  label: "30 XP",         emoji: "✨", rarity: "common" },
  { type: "gems",   value: 3,   label: "3 Гемі",        emoji: "💎", rarity: "common" },
];

export async function getTodayMysteryBox(studentId: string): Promise<MysteryReward | null> {
  const today = new Date().toISOString().split("T")[0];
  const { data } = await supabase
    .from("mystery_box_claims")
    .select("*")
    .eq("student_id", studentId)
    .eq("date", today)
    .single();
  if (!data) return null;
  return {
    type: data.reward_type,
    value: data.reward_value,
    label: data.reward_label || data.reward_type,
    emoji: data.reward_type === "shield" ? "🛡️" : data.reward_type === "gems" ? "💎" : "✨",
    rarity: data.reward_value >= 200 ? "epic" : data.reward_value >= 100 ? "rare" : "common",
  };
}

export async function claimMysteryBox(studentId: string): Promise<MysteryReward> {
  const today = new Date().toISOString().split("T")[0];

  // Weighted random
  const weights = MYSTERY_REWARDS.map(r => r.rarity === "epic" ? 5 : r.rarity === "rare" ? 20 : 40);
  const total = weights.reduce((a, b) => a + b, 0);
  let rand = Math.random() * total;
  let reward = MYSTERY_REWARDS[0];
  for (let i = 0; i < MYSTERY_REWARDS.length; i++) {
    rand -= weights[i];
    if (rand <= 0) { reward = MYSTERY_REWARDS[i]; break; }
  }

  // Save claim
  await supabase.from("mystery_box_claims").upsert({
    student_id: studentId,
    date: today,
    reward_type: reward.type,
    reward_value: reward.value,
    reward_label: reward.label,
  }, { onConflict: "student_id,date" });

  // Apply reward
  const { data: student } = await supabase
    .from("students")
    .select("xp, level, gems, streak_shields")
    .eq("id", studentId)
    .single();

  if (student) {
    const updates: Record<string, number> = {};
    if (reward.type === "xp")     { updates.xp = (student.xp || 0) + reward.value; updates.level = Math.floor(updates.xp / 100) + 1; }
    if (reward.type === "gems")   { updates.gems = (student.gems || 0) + reward.value; }
    if (reward.type === "shield") { updates.streak_shields = Math.min((student.streak_shields || 0) + 1, 3); }
    if (Object.keys(updates).length) {
      await supabase.from("students").update(updates).eq("id", studentId);
    }
  }

  return reward;
}

// ─── Night Challenge ──────────────────────────────────────────────────────────

export function isNightTime(): boolean {
  const hour = new Date().getHours();
  return hour >= 21 && hour <= 23;
}

export async function getTodayNightChallenge(studentId: string): Promise<{ attempted: boolean; won: boolean | null; xpEarned: number }> {
  const today = new Date().toISOString().split("T")[0];
  const { data } = await supabase
    .from("night_challenge_attempts")
    .select("won, xp_earned")
    .eq("student_id", studentId)
    .eq("date", today)
    .single();
  if (!data) return { attempted: false, won: null, xpEarned: 0 };
  return { attempted: true, won: data.won, xpEarned: data.xp_earned };
}

export async function saveNightChallengeResult(studentId: string, questionId: string, won: boolean): Promise<number> {
  const today = new Date().toISOString().split("T")[0];
  const xpEarned = won ? 150 : 30;

  await supabase.from("night_challenge_attempts").upsert({
    student_id: studentId,
    date: today,
    question_id: questionId,
    won,
    xp_earned: xpEarned,
  }, { onConflict: "student_id,date" });

  if (won) {
    const { data: s } = await supabase.from("students").select("xp, level, gems").eq("id", studentId).single();
    if (s) {
      const newXp = (s.xp || 0) + xpEarned;
      await supabase.from("students").update({
        xp: newXp,
        level: Math.floor(newXp / 100) + 1,
        gems: (s.gems || 0) + 5,
      }).eq("id", studentId);
    }
  }

  return xpEarned;
}

// ─── Weekly XP Reset ─────────────────────────────────────────────────────────

export async function checkWeeklyReset(studentId: string): Promise<void> {
  const { data: student } = await supabase
    .from("students")
    .select("last_weekly_reset, streak_shields, streak")
    .eq("id", studentId)
    .single();

  if (!student) return;

  const now = new Date();
  const dayOfWeek = now.getDay(); // 0 = Sunday
  const lastReset = student.last_weekly_reset;

  // Reset on Monday (dayOfWeek === 1)
  if (dayOfWeek === 1) {
    const today = now.toISOString().split("T")[0];
    if (lastReset !== today) {
      // Give a streak shield every week
      const newShields = Math.min((student.streak_shields || 0) + 1, 3);
      await supabase
        .from("students")
        .update({
          weekly_xp: 0,
          last_weekly_reset: today,
          streak_shields: newShields,
        })
        .eq("id", studentId);
    }
  }
}
