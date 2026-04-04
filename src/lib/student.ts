import { supabase } from "./supabase";

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

export async function getStudent(userId: string): Promise<Student | null> {
  const { data } = await supabase
    .from("students")
    .select("*")
    .eq("id", userId)
    .single();
  return data;
}

export async function getTodayTasks(userId: string): Promise<(Task & { question: Question | null })[]> {
  const today = new Date().toISOString().split("T")[0];

  const { data } = await supabase
    .from("tasks")
    .select("*, question:questions(*)")
    .eq("student_id", userId)
    .eq("date", today)
    .order("completed", { ascending: true });

  return (data as any) || [];
}

export async function generateDailyTasks(userId: string, subjects: string[]): Promise<void> {
  const today = new Date().toISOString().split("T")[0];

  // Check if tasks already exist for today
  const { data: existing } = await supabase
    .from("tasks")
    .select("id")
    .eq("student_id", userId)
    .eq("date", today);

  if (existing && existing.length > 0) return;

  // Pick random questions from student's subjects
  const { data: questions } = await supabase
    .from("questions")
    .select("*")
    .in("subject", subjects.length > 0 ? subjects : ["ukr", "math", "hist", "eng"]);

  if (!questions || questions.length === 0) return;

  // Shuffle and pick 5 tasks
  const shuffled = questions.sort(() => Math.random() - 0.5);
  const selected = shuffled.slice(0, Math.min(5, shuffled.length));

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

  await supabase.from("tasks").insert(tasks);
}

export async function completeTask(
  userId: string,
  taskId: string,
  answerGiven: number,
  isCorrect: boolean,
  xpReward: number
): Promise<{ newXp: number; newStreak: number; levelUp: boolean }> {
  const now = new Date();
  const today = now.toISOString().split("T")[0];

  // Mark task as completed
  await supabase
    .from("tasks")
    .update({
      completed: true,
      answer_given: answerGiven,
      is_correct: isCorrect,
      completed_at: now.toISOString(),
    })
    .eq("id", taskId);

  // Get current student data
  const { data: student } = await supabase
    .from("students")
    .select("xp, streak, level, last_active_date, total_tasks_completed")
    .eq("id", userId)
    .single();

  if (!student) return { newXp: 0, newStreak: 0, levelUp: false };

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
    newStreak += 1; // Continue streak
  } else if (lastActive !== today) {
    newStreak = 1; // Reset streak
  }

  // Calculate level (every 100 XP = 1 level)
  const newLevel = Math.floor(newXp / 100) + 1;
  const levelUp = newLevel > (student.level || 1);

  // Update student
  await supabase
    .from("students")
    .update({
      xp: newXp,
      streak: newStreak,
      level: newLevel,
      last_active_date: today,
      total_tasks_completed: (student.total_tasks_completed || 0) + 1,
    })
    .eq("id", userId);

  return { newXp: earnedXp, newStreak, levelUp };
}