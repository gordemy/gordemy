import { supabase } from "./supabase";
import { checkAndAwardAchievements, getStudentAchievements, type Achievement } from "./achievements";

export interface LeaderboardEntry {
  id: string;
  name: string;
  level: number;
  xp: number;
  streak: number;
  total_tasks_completed: number;
}

export async function getLeaderboard(): Promise<LeaderboardEntry[]> {
  const { data, error } = await supabase.from("leaderboard").select("*");
  if (error) console.error("getLeaderboard error:", error);
  return (data || []) as LeaderboardEntry[];
}

export interface Student {
  id: string;
  email: string;
  name: string;
  level: number;
  xp: number;
  streak: number;
  plan: string;
  grade: number | null;
  subjects: string[];
  target_score: number | null;
  study_time_minutes: number | null;
  onboarding_completed: boolean;
  last_active_date: string | null;
  total_tasks_completed: number;
}

export interface Task {
  id: string;
  student_id: string;
  subject: string;
  title: string;
  difficulty: string;
  xp_reward: number;
  completed: boolean;
  date: string;
  question_id: string | null;
  answer_given: number | null;
  is_correct: boolean | null;
  completed_at: string | null;
  response_time_sec?: number | null;
}

export interface Question {
  id: string;
  subject: string;
  topic: string;
  difficulty: string;
  question_text: string;
  options: string[];
  correct_answer: number;
  explanation: string | null;
}

export async function saveQuestionHistory(params: {
  userId: string;
  questionId: string;
  wasCorrect: boolean;
  mode: string;
  answerTimeSec?: number | null;
  date?: string;
}): Promise<void> {
  const day = params.date || new Date().toISOString().split("T")[0];
  await supabase.from("question_history").insert({
    user_id: params.userId,
    question_id: params.questionId,
    date: day,
    was_correct: params.wasCorrect,
    mode: params.mode,
    answer_time_sec: params.answerTimeSec ?? null,
  });
}

export async function getStudent(userId: string): Promise<Student | null> {
  const { data, error } = await supabase
    .from("students")
    .select("*")
    .eq("id", userId)
    .single();
  if (error) console.error("getStudent error:", error);
  return data;
}

export async function getTodayTasks(userId: string): Promise<(Task & { question: Question | null })[]> {
  const today = new Date().toISOString().split("T")[0];

  const { data, error } = await supabase
    .from("tasks")
    .select("*, question:questions(*)")
    .eq("student_id", userId)
    .eq("date", today)
    .order("completed", { ascending: true });

  if (error) console.error("getTodayTasks error:", error);
  return (data as any) || [];
}

export async function generateDailyTasks(userId: string, subjects: string[]): Promise<void> {
  const today = new Date().toISOString().split("T")[0];

  // Check if tasks already exist for today
  const { data: existing, error: checkError } = await supabase
    .from("tasks")
    .select("id")
    .eq("student_id", userId)
    .eq("date", today);

  if (checkError) console.error("Check tasks error:", checkError);
  if (existing && existing.length > 0) return;

  // Pick random questions from student's subjects
  const subjectsToUse = subjects.length > 0 ? subjects : ["ukr", "math", "hist", "eng"];
  const { data: questions, error: qError } = await supabase
    .from("questions")
    .select("*")
    .in("subject", subjectsToUse);

  if (qError) console.error("Fetch questions error:", qError);
  if (!questions || questions.length === 0) return;

  // Shuffle and pick 10 tasks
  const shuffled = questions.sort(() => Math.random() - 0.5);
  const selected = shuffled.slice(0, Math.min(10, shuffled.length));

  const subjectNames: Record<string, string> = {
    ukr: "Українська мова",
    math: "Математика",
    hist: "Історія України",
    eng: "Англійська мова",
    bio: "Біологія",
    phys: "Фізика",
    chem: "Хімія",
    geo: "Географія",
  };

  const xpMap: Record<string, number> = {
    easy: 10,
    medium: 20,
    hard: 30,
  };

  const tasks = selected.map((q) => ({
    student_id: userId,
    subject: q.subject,
    title: `${subjectNames[q.subject] || q.subject}: ${q.topic}`,
    difficulty: q.difficulty,
    xp_reward: xpMap[q.difficulty] || 10,
    question_id: q.id,
    date: today,
    completed: false,
  }));

  const { error: insertError } = await supabase.from("tasks").insert(tasks);
  if (insertError) console.error("Insert tasks error:", insertError);
}

export async function refreshDailyTasks(userId: string, subjects: string[]): Promise<void> {
  const today = new Date().toISOString().split("T")[0];

  // Delete only incomplete tasks for today
  const { error: deleteError } = await supabase
    .from("tasks")
    .delete()
    .eq("student_id", userId)
    .eq("date", today)
    .eq("completed", false);

  if (deleteError) console.error("Delete tasks error:", deleteError);

  // Generate fresh tasks
  await generateDailyTasks(userId, subjects);
}

export interface SubjectProgress {
  subject: string;
  total: number;
  correct: number;
  percent: number;
}

export async function getSubjectProgress(userId: string): Promise<SubjectProgress[]> {
  const { data, error } = await supabase
    .from("tasks")
    .select("subject, is_correct")
    .eq("student_id", userId)
    .eq("completed", true);

  if (error) console.error("getSubjectProgress error:", error);
  if (!data || data.length === 0) return [];

  const map: Record<string, { total: number; correct: number }> = {};
  for (const t of data) {
    if (!map[t.subject]) map[t.subject] = { total: 0, correct: 0 };
    map[t.subject].total += 1;
    if (t.is_correct) map[t.subject].correct += 1;
  }

  return Object.entries(map).map(([subject, { total, correct }]) => ({
    subject,
    total,
    correct,
    percent: Math.round((correct / total) * 100),
  })).sort((a, b) => b.total - a.total);
}

export async function completeTask(
  userId: string,
  taskId: string,
  answerGiven: number,
  isCorrect: boolean,
  xpReward: number,
  secondsTaken?: number
): Promise<{ newXp: number; newStreak: number; levelUp: boolean; newAchievements: Achievement[] }> {
  const now = new Date();
  const today = now.toISOString().split("T")[0];

  // Mark task as completed
  const { error: taskError } = await supabase
    .from("tasks")
    .update({
      completed: true,
      answer_given: answerGiven,
      is_correct: isCorrect,
      completed_at: now.toISOString(),
      response_time_sec: typeof secondsTaken === "number" ? secondsTaken : null,
    })
    .eq("id", taskId);

  if (taskError) console.error("Complete task error:", taskError);

  const { data: taskRow } = await supabase
    .from("tasks")
    .select("question_id")
    .eq("id", taskId)
    .single();
  if (taskRow?.question_id) {
    await saveQuestionHistory({
      userId,
      questionId: taskRow.question_id,
      wasCorrect: isCorrect,
      mode: "learn",
      answerTimeSec: typeof secondsTaken === "number" ? secondsTaken : null,
      date: today,
    });
  }

  // Get current student data
  const { data: student } = await supabase
    .from("students")
    .select("xp, streak, level, last_active_date, total_tasks_completed")
    .eq("id", userId)
    .single();

  if (!student) return { newXp: 0, newStreak: 0, levelUp: false, newAchievements: [] };

  // Calculate XP (bonus for correct answer)
  const earnedXp = isCorrect ? xpReward : Math.floor(xpReward / 2);
  const newXp = (student.xp || 0) + earnedXp;

  // Calculate streak
  const lastActive = student.last_active_date;
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split("T")[0];

  let newStreak = student.streak || 0;
  if (lastActive === yesterdayStr) {
    newStreak += 1;
  } else if (lastActive !== today) {
    newStreak = 1;
  }

  // Calculate level (every 100 XP = 1 level)
  const newLevel = Math.floor(newXp / 100) + 1;
  const levelUp = newLevel > (student.level || 1);

  // Update student
  const { error: updateError } = await supabase
    .from("students")
    .update({
      xp: newXp,
      streak: newStreak,
      level: newLevel,
      last_active_date: today,
      total_tasks_completed: (student.total_tasks_completed || 0) + 1,
    })
    .eq("id", userId);

  if (updateError) console.error("Update student error:", updateError);

  // Get today's tasks for context
  const { data: todayTasksData } = await supabase
    .from("tasks")
    .select("subject, is_correct, completed")
    .eq("student_id", userId)
    .eq("date", today)
    .eq("completed", true);

  const todayDone = todayTasksData || [];
  const todaySubjects = Array.from(new Set(todayDone.map((t: any) => t.subject)));
  const todayCorrect = todayDone.filter((t: any) => t.is_correct).length;

  // Keep a simple daily ghost snapshot in sync (MVP)
  const { data: todayMetrics } = await supabase
    .from("tasks")
    .select("is_correct, response_time_sec")
    .eq("student_id", userId)
    .eq("date", today)
    .eq("completed", true);
  const completedMetrics = todayMetrics || [];
  const answersCount = completedMetrics.length;
  const correctAnswers = completedMetrics.filter((t: any) => t.is_correct).length;
  const speedValues = completedMetrics
    .map((t: any) => Number(t.response_time_sec))
    .filter((v: number) => Number.isFinite(v) && v > 0);
  const avgResponseSec = speedValues.length
    ? Math.round(speedValues.reduce((a: number, b: number) => a + b, 0) / speedValues.length)
    : null;
  const dayXpEarned = completedMetrics.reduce((sum: number, t: any) => {
    const base = t.is_correct ? 20 : 10;
    return sum + base;
  }, 0);

  await supabase.from("ghost_snapshots").upsert(
    {
      student_id: userId,
      date: today,
      xp_earned: dayXpEarned,
      tasks_completed: answersCount,
      correct_answers: correctAnswers,
      avg_response_sec: avgResponseSec,
      answers_count: answersCount,
    },
    { onConflict: "student_id,date" }
  );

  // Check and award achievements
  const earnedKeys = await getStudentAchievements(userId);
  const newAchievements = await checkAndAwardAchievements(userId, {
    totalTasksCompleted: (student.total_tasks_completed || 0) + 1,
    xp: newXp,
    streak: newStreak,
    level: newLevel,
    isCorrect,
    todayCorrect,
    todayTotal: todayDone.length,
    todaySubjects,
    earnedKeys,
  });

  return { newXp: earnedXp, newStreak, levelUp, newAchievements };
}