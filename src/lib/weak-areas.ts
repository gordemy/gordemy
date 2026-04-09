import { supabase } from "./supabase";
import { saveQuestionHistory } from "./student";

export interface WeakAreaStat {
  topic_id: string;
  subject: string;
  topic: string;
  mistake_count: number;
  correct_count: number;
  last_updated?: string;
}

export function buildTopicId(subject: string, topic: string): string {
  return `${subject}::${topic}`;
}

export function calculateWeakProgress(stat: Pick<WeakAreaStat, "mistake_count" | "correct_count">): number {
  if (stat.mistake_count <= 0) return 100;
  return Math.max(0, Math.min(100, Math.round((stat.correct_count / stat.mistake_count) * 100)));
}

export function isWeakTopic(stat: Pick<WeakAreaStat, "mistake_count" | "correct_count">): boolean {
  return stat.mistake_count >= 3 && stat.correct_count < stat.mistake_count;
}

export function isWeakAreaCompleted(stat: Pick<WeakAreaStat, "mistake_count" | "correct_count">): boolean {
  return stat.mistake_count >= 3 && stat.correct_count >= stat.mistake_count;
}

export function calculateWeakAreas(stats: WeakAreaStat[]): WeakAreaStat[] {
  return stats
    .filter(s => isWeakTopic(s))
    // Prefer recent weak topics first.
    .sort((a, b) => {
      const ad = a.last_updated ? new Date(a.last_updated).getTime() : 0;
      const bd = b.last_updated ? new Date(b.last_updated).getTime() : 0;
      if (bd !== ad) return bd - ad;
      return (b.mistake_count - b.correct_count) - (a.mistake_count - a.correct_count);
    });
}

export function getWeakTopics(stats: WeakAreaStat[]): WeakAreaStat[] {
  return calculateWeakAreas(stats);
}

export async function saveUserStats(userId: string, rows: WeakAreaStat[]): Promise<void> {
  if (rows.length === 0) return;
  await supabase.from("weak_areas").upsert(
    rows.map(r => ({
      user_id: userId,
      topic_id: r.topic_id,
      subject: r.subject,
      topic: r.topic,
      wrong_count: r.mistake_count,
      correct_count: r.correct_count,
      updated_at: new Date().toISOString(),
    })),
    { onConflict: "user_id,topic_id" }
  );
}

export async function addMistake(userId: string, question: { id: string; subject: string; topic: string }, answerTimeSec?: number): Promise<void> {
  await saveQuestionHistory({
    userId,
    questionId: question.id,
    wasCorrect: false,
    mode: "weakspot",
    answerTimeSec: answerTimeSec ?? null,
  });
}

export async function recordMistake(userId: string, topic: { topic_id: string; subject: string; topic: string }): Promise<void> {
  const { data: existing } = await supabase
    .from("weak_areas")
    .select("wrong_count,correct_count")
    .eq("user_id", userId)
    .eq("topic_id", topic.topic_id)
    .maybeSingle();
  await supabase.from("weak_areas").upsert(
    {
      user_id: userId,
      topic_id: topic.topic_id,
      subject: topic.subject,
      topic: topic.topic,
      wrong_count: (existing?.wrong_count || 0) + 1,
      correct_count: existing?.correct_count || 0,
      completion_progress: 0,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,topic_id" }
  );
}

export async function recordCorrect(userId: string, topic: { topic_id: string; subject: string; topic: string }): Promise<void> {
  const { data: existing } = await supabase
    .from("weak_areas")
    .select("wrong_count,correct_count")
    .eq("user_id", userId)
    .eq("topic_id", topic.topic_id)
    .maybeSingle();
  await supabase.from("weak_areas").upsert(
    {
      user_id: userId,
      topic_id: topic.topic_id,
      subject: topic.subject,
      topic: topic.topic,
      wrong_count: existing?.wrong_count || 0,
      correct_count: (existing?.correct_count || 0) + 1,
      completion_progress: 0,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,topic_id" }
  );
}

export async function updateWeakArea(userId: string, question: { id: string; subject: string; topic: string }, result: { correct: boolean; answerTimeSec?: number }): Promise<void> {
  const topicId = buildTopicId(question.subject, question.topic);
  const { data: existing } = await supabase
    .from("weak_areas")
    .select("wrong_count,correct_count")
    .eq("user_id", userId)
    .eq("topic_id", topicId)
    .maybeSingle();

  const wrong_count = (existing?.wrong_count || 0) + (result.correct ? 0 : 1);
  const correct_count = (existing?.correct_count || 0) + (result.correct ? 1 : 0);
  const completion_progress = calculateWeakProgress({ mistake_count: wrong_count, correct_count });

  await saveQuestionHistory({
    userId,
    questionId: question.id,
    wasCorrect: result.correct,
    mode: "weakspot",
    answerTimeSec: result.answerTimeSec ?? null,
  });

  await supabase.from("weak_areas").upsert(
    {
      user_id: userId,
      topic_id: topicId,
      subject: question.subject,
      topic: question.topic,
      wrong_count,
      correct_count,
      completion_progress,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,topic_id" }
  );
}

export async function loadWeakAreaStats(userId: string): Promise<WeakAreaStat[]> {
  const { data } = await supabase
    .from("weak_areas")
    .select("topic_id,subject,topic,wrong_count,correct_count,updated_at")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false });
  return (data || []).map((r: any) => ({
    topic_id: r.topic_id,
    subject: r.subject,
    topic: r.topic,
    mistake_count: r.wrong_count || 0,
    correct_count: r.correct_count || 0,
    last_updated: r.updated_at,
  })) as WeakAreaStat[];
}
