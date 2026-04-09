import { supabase } from "./supabase";

type HistoryRow = {
  question_id: string;
  date: string;
  was_correct: boolean;
};

function uniqueByQuestion(rows: HistoryRow[]): HistoryRow[] {
  const seen = new Set<string>();
  const out: HistoryRow[] = [];
  for (const row of rows) {
    if (seen.has(row.question_id)) continue;
    seen.add(row.question_id);
    out.push(row);
  }
  return out;
}

// Select wrong-history questions with priority:
// yesterday mistakes first, then older mistakes (recent first).
export async function getWrongHistoryQuestions(userId: string, yesterday: string): Promise<string[]> {
  const { data } = await supabase
    .from("question_history")
    .select("question_id,date,was_correct")
    .eq("user_id", userId)
    .eq("was_correct", false)
    .order("date", { ascending: false })
    .limit(300);

  const rows = (data || []) as HistoryRow[];
  const yesterdayRows = uniqueByQuestion(rows.filter(r => r.date === yesterday));
  const olderRows = uniqueByQuestion(rows.filter(r => r.date !== yesterday));
  return [...yesterdayRows, ...olderRows].map(r => r.question_id);
}

// Select correct-history questions (recent first), excluding any banned IDs.
export async function getCorrectHistoryQuestions(userId: string, bannedIds: string[]): Promise<string[]> {
  const { data } = await supabase
    .from("question_history")
    .select("question_id,date,was_correct")
    .eq("user_id", userId)
    .eq("was_correct", true)
    .order("date", { ascending: false })
    .limit(500);

  const banned = new Set(bannedIds);
  const rows = uniqueByQuestion((data || []) as HistoryRow[]);
  return rows.map(r => r.question_id).filter(id => !banned.has(id));
}

// Build mixed ghost pool:
// - up to 2 from wrong history (if available)
// - remaining from correct history
// - no duplicates, recent history preferred
export async function buildGhostQuestionPool(userId: string, totalCount: number): Promise<string[]> {
  const yesterday = new Date(Date.now() - 24 * 3600 * 1000).toISOString().split("T")[0];
  const wrongIds = await getWrongHistoryQuestions(userId, yesterday);
  const wrongPick = wrongIds.slice(0, 2);
  const correctIds = await getCorrectHistoryQuestions(userId, wrongPick);
  const remaining = Math.max(0, totalCount - wrongPick.length);
  return [...wrongPick, ...correctIds.slice(0, remaining)];
}
