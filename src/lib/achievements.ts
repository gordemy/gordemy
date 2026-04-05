import { supabase } from "./supabase";

export interface Achievement {
  key: string;
  name: string;
  description: string;
  icon: string;
  rarity: "common" | "rare" | "epic" | "legendary";
  xp_reward: number;
  secret: boolean;
  earned_at?: string;
}

export const RARITY_COLORS: Record<string, string> = {
  common:    "border-gordemy-border text-gordemy-muted",
  rare:      "border-gordemy-blue/50 text-gordemy-blue",
  epic:      "border-gordemy-purple/60 text-gordemy-purple",
  legendary: "border-gordemy-orange/60 text-gordemy-orange",
};

export const RARITY_BG: Record<string, string> = {
  common:    "bg-gordemy-card",
  rare:      "bg-gordemy-blue/5",
  epic:      "bg-gordemy-purple/10",
  legendary: "bg-gordemy-orange/10",
};

export const RARITY_LABELS: Record<string, string> = {
  common:    "Звичайне",
  rare:      "Рідкісне",
  epic:      "Епічне",
  legendary: "Легендарне",
};

export function getLeague(xp: number) {
  if (xp >= 5000) return { name: "Легенда",  icon: "👑", color: "text-gordemy-orange", bg: "bg-gordemy-orange/15 border-gordemy-orange/40", minXp: 5000 };
  if (xp >= 2000) return { name: "Діамант",  icon: "💠", color: "text-gordemy-blue",   bg: "bg-gordemy-blue/15 border-gordemy-blue/40",     minXp: 2000 };
  if (xp >= 1000) return { name: "Платина",  icon: "💎", color: "text-gordemy-purple", bg: "bg-gordemy-purple/15 border-gordemy-purple/40", minXp: 1000 };
  if (xp >= 500)  return { name: "Золото",   icon: "🥇", color: "text-gordemy-orange", bg: "bg-gordemy-orange/10 border-gordemy-orange/30", minXp: 500  };
  if (xp >= 200)  return { name: "Срібло",   icon: "🥈", color: "text-gordemy-muted",  bg: "bg-gordemy-bg border-gordemy-border",           minXp: 200  };
  return            { name: "Бронза",   icon: "🥉", color: "text-gordemy-orange", bg: "bg-gordemy-orange/5 border-gordemy-orange/20",  minXp: 0    };
}

export async function getAllAchievements(): Promise<Achievement[]> {
  const { data, error } = await supabase.from("achievements").select("*").order("rarity");
  if (error) console.error("getAllAchievements error:", error);
  return (data || []) as Achievement[];
}

export async function getStudentAchievements(userId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from("student_achievements")
    .select("achievement_key")
    .eq("student_id", userId);
  if (error) console.error("getStudentAchievements error:", error);
  return (data || []).map((r: any) => r.achievement_key);
}

interface AchievementContext {
  totalTasksCompleted: number;
  xp: number;
  streak: number;
  level: number;
  isCorrect: boolean;
  todayCorrect: number;
  todayTotal: number;
  todaySubjects: string[];
  earnedKeys: string[];
}

export async function checkAndAwardAchievements(
  userId: string,
  ctx: AchievementContext
): Promise<Achievement[]> {
  const toAward: string[] = [];
  const hour = new Date().getHours();

  // Tasks milestones
  if (ctx.totalTasksCompleted >= 1   && !ctx.earnedKeys.includes("first_task"))   toAward.push("first_task");
  if (ctx.totalTasksCompleted >= 10  && !ctx.earnedKeys.includes("tasks_10"))     toAward.push("tasks_10");
  if (ctx.totalTasksCompleted >= 50  && !ctx.earnedKeys.includes("tasks_50"))     toAward.push("tasks_50");
  if (ctx.totalTasksCompleted >= 100 && !ctx.earnedKeys.includes("tasks_100"))    toAward.push("tasks_100");
  if (ctx.totalTasksCompleted >= 500 && !ctx.earnedKeys.includes("tasks_500"))    toAward.push("tasks_500");

  // Streak milestones
  if (ctx.streak >= 3  && !ctx.earnedKeys.includes("streak_3"))   toAward.push("streak_3");
  if (ctx.streak >= 7  && !ctx.earnedKeys.includes("streak_7"))   toAward.push("streak_7");
  if (ctx.streak >= 14 && !ctx.earnedKeys.includes("streak_14"))  toAward.push("streak_14");
  if (ctx.streak >= 30 && !ctx.earnedKeys.includes("streak_30"))  toAward.push("streak_30");

  // Level milestones
  if (ctx.level >= 5  && !ctx.earnedKeys.includes("level_5"))   toAward.push("level_5");
  if (ctx.level >= 10 && !ctx.earnedKeys.includes("level_10"))  toAward.push("level_10");
  if (ctx.level >= 20 && !ctx.earnedKeys.includes("level_20"))  toAward.push("level_20");

  // XP milestones
  if (ctx.xp >= 100  && !ctx.earnedKeys.includes("xp_100"))   toAward.push("xp_100");
  if (ctx.xp >= 500  && !ctx.earnedKeys.includes("xp_500"))   toAward.push("xp_500");
  if (ctx.xp >= 1000 && !ctx.earnedKeys.includes("xp_1000"))  toAward.push("xp_1000");

  // Perfect day
  if (ctx.todayTotal >= 5 && ctx.todayCorrect === ctx.todayTotal && !ctx.earnedKeys.includes("perfect_day")) {
    toAward.push("perfect_day");
  }

  // Speed 5 tasks today
  if (ctx.todayTotal >= 5 && !ctx.earnedKeys.includes("speed_5")) toAward.push("speed_5");

  // Multi-subject
  if (ctx.todaySubjects.length >= 3 && !ctx.earnedKeys.includes("multisubject")) toAward.push("multisubject");

  // Secret: night owl
  if (hour >= 23 && !ctx.earnedKeys.includes("night_owl")) toAward.push("night_owl");

  // Secret: early bird
  if (hour < 7 && !ctx.earnedKeys.includes("early_bird")) toAward.push("early_bird");

  if (toAward.length === 0) return [];

  // Insert all new achievements
  const rows = toAward.map((key) => ({ student_id: userId, achievement_key: key }));
  const { error } = await supabase.from("student_achievements").insert(rows);
  if (error) console.error("Award achievements error:", error);

  // Fetch full definitions to return
  const { data } = await supabase
    .from("achievements")
    .select("*")
    .in("key", toAward);

  return (data || []) as Achievement[];
}
