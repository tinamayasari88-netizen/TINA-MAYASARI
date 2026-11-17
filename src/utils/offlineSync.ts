import type { QuestionItem, StudentAnswerPayload, StudentRecord } from '../shared/levels';
import { apiFetch } from './authSession';

const QUEUE_KEY = 'ia_offline_eval_queue';
const STUDENT_CACHE_KEY = 'ia_cached_student_profile';
const QUESTIONS_CACHE_KEY = 'ia_cached_level_questions';

export interface OfflineEvaluationPayload {
  clientEvalId: string;
  levelId: number;
  mode: 'adventure' | 'session' | 'competition';
  sessionId?: string | null;
  roomId?: string | null;
  durationSeconds: number;
  answers: StudentAnswerPayload[];
  executedAt: string;
}

export function cacheStudentProfile(student: StudentRecord) {
  try {
    localStorage.setItem(STUDENT_CACHE_KEY, JSON.stringify(student));
  } catch {
    // Ignore storage quota issues
  }
}

export function getCachedStudentProfile(): StudentRecord | null {
  try {
    const raw = localStorage.getItem(STUDENT_CACHE_KEY);
    return raw ? (JSON.parse(raw) as StudentRecord) : null;
  } catch {
    return null;
  }
}

export function cacheLevelQuestions(levelId: number, questions: QuestionItem[]) {
  try {
    const raw = localStorage.getItem(QUESTIONS_CACHE_KEY);
    const map = raw ? (JSON.parse(raw) as Record<string, QuestionItem[]>) : {};
    map[String(levelId)] = questions;
    localStorage.setItem(QUESTIONS_CACHE_KEY, JSON.stringify(map));
  } catch {
    // Ignore storage errors
  }
}

export function getCachedLevelQuestions(levelId: number): QuestionItem[] | null {
  try {
    const raw = localStorage.getItem(QUESTIONS_CACHE_KEY);
    if (!raw) return null;
    const map = JSON.parse(raw) as Record<string, QuestionItem[]>;
    return map[String(levelId)] || null;
  } catch {
    return null;
  }
}

export function getOfflineQueue(): OfflineEvaluationPayload[] {
  try {
    const raw = localStorage.getItem(QUEUE_KEY);
    return raw ? (JSON.parse(raw) as OfflineEvaluationPayload[]) : [];
  } catch {
    return [];
  }
}

export function enqueueOfflineEvaluation(item: OfflineEvaluationPayload) {
  const queue = getOfflineQueue();
  if (!queue.some((q) => q.clientEvalId === item.clientEvalId)) {
    queue.push(item);
    localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  }
}

export async function flushOfflineEvaluations(): Promise<number> {
  const queue = getOfflineQueue();
  if (queue.length === 0 || !navigator.onLine) return 0;

  try {
    const res = await apiFetch('/api/student/evaluations/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items: queue }),
    });
    if (!res.ok) return 0;
    const data = (await res.json()) as { syncedIds?: string[] };
    const syncedSet = new Set(data.syncedIds || []);
    const remaining = queue.filter((q) => !syncedSet.has(q.clientEvalId));
    localStorage.setItem(QUEUE_KEY, JSON.stringify(remaining));
    return syncedSet.size;
  } catch {
    return 0;
  }
}

// Client-side offline question fallback generator if a level wasn't cached before disconnect
export function generateOfflineFallbackQuestions(levelId: number): QuestionItem[] {
  const cached = getCachedLevelQuestions(levelId);
  if (cached && cached.length >= 10) return cached;

  const items: QuestionItem[] = [];
  for (let i = 0; i < 10; i++) {
    const a = (i + 2) * (i % 2 === 0 ? 1 : -1) + 3;
    const b = (i + 3) * (i % 3 === 0 ? -1 : 1);
    let prompt = '';
    let ans = 0;
    let explanation = '';

    if (levelId === 1) {
      ans = a + b;
      prompt = `Hitung hasil dari ${a < 0 ? `(${a})` : a} + ${b < 0 ? `(${b})` : b} = ...`;
      explanation = `Jumlahkan bilangan bulat: ${a} + ${b} = ${ans}.`;
    } else if (levelId === 2) {
      ans = a - b;
      prompt = `Hitung hasil dari ${a < 0 ? `(${a})` : a} - ${b < 0 ? `(${b})` : b} = ...`;
      explanation = `Kurangkan bilangan bulat: ${a} - ${b} = ${ans}.`;
    } else if (levelId === 3) {
      ans = a * b;
      prompt = `Hitung hasil dari ${a < 0 ? `(${a})` : a} × ${b < 0 ? `(${b})` : b} = ...`;
      explanation = `Kalikan kedua bilangan sesuai aturan tanda: ${a} × ${b} = ${ans}.`;
    } else if (levelId === 4) {
      const div = b === 0 ? 2 : b;
      const q = (i % 2 === 0 ? 1 : -1) * (i + 2);
      const dividend = div * q;
      ans = q;
      prompt = `Hitung hasil dari ${dividend < 0 ? `(${dividend})` : dividend} ÷ ${div < 0 ? `(${div})` : div} = ...`;
      explanation = `Bagi bilangan sesuai aturan tanda: ${dividend} ÷ ${div} = ${ans}.`;
    } else if (levelId === 5) {
      const c = (i % 2 === 0 ? 2 : -3);
      ans = a + b * c;
      prompt = `Hitung dengan urutan operasi: ${a < 0 ? `(${a})` : a} + ${b < 0 ? `(${b})` : b} × ${c < 0 ? `(${c})` : c} = ...`;
      explanation = `Dahulukan perkalian ${b} × ${c} = ${b * c}, lalu tambah ${a} = ${ans}.`;
    } else {
      ans = 2 * a - b;
      prompt = `Jika x = ${a} dan y = ${b}, nilai dari 2x - y adalah ...`;
      explanation = `Substitusi: 2(${a}) - (${b}) = ${2 * a} - ${b} = ${ans}.`;
    }

    const opts = Array.from(new Set([ans, -ans, ans + 2, ans - 3, ans + 5])).slice(0, 4);
    while (opts.length < 4) opts.push(ans + opts.length + 1);

    items.push({
      id: `offline-${levelId}-${i}-${Date.now()}`,
      levelId,
      orderIndex: i + 1,
      prompt,
      options: opts.sort((x, y) => x - y),
      correctAnswer: ans,
      explanation,
      difficulty: i < 3 ? 'easy' : i < 7 ? 'medium' : 'hard',
    });
  }
  return items;
}
