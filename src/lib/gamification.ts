import { supabase } from "./supabase";

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

export async function useStreakShield(studentId: string): Promise<boolean> {
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
