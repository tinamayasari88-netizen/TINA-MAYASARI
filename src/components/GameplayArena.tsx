import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Award,
  CheckCircle2,
  Clock,
  CloudOff,
  Compass,
  Flame,
  HelpCircle,
  Loader2,
  RotateCcw,
  Star,
  Trophy,
  Users,
  XCircle,
} from 'lucide-react';
import {
  LEVELS,
  getAvatarImage,
  type CompetitionRoomRecord,
  type GameType,
  type LevelConfig,
  type QuestionItem,
  type StudentAnswerPayload,
  type StudentRecord,
} from '../shared/levels';
import { getBadgeDefinition, type StudentBadgeRecord } from '../shared/badges';
import { BadgeCard } from './BadgeCard';
import { MiniGameBoard } from './MiniGameBoards';
import { apiFetch } from '../utils/authSession';
import { formatDuration } from '../utils/exportReports';
import {
  cacheLevelQuestions,
  enqueueOfflineEvaluation,
  generateOfflineFallbackQuestions,
} from '../utils/offlineSync';
import { playCorrectSound, playVictorySound, playWrongSound } from '../utils/sound';

interface GameplayArenaProps {
  student: StudentRecord;
  mode: 'adventure' | 'session' | 'competition';
  level: LevelConfig;
  gameType?: GameType;
  sessionId?: string;
  durationMinutes?: number;
  initialRoom?: CompetitionRoomRecord;
  alreadyFinishedCompetition?: boolean;
  isOnline: boolean;
  onExit: () => void;
  onStudentProgressUpdated: (unlockedLevel: number, totalStars: number) => void;
}

const IntegerHelperPad: React.FC<{ questionKey: string }> = ({ questionKey }) => {
  const [posCount, setPosCount] = useState(0);
  const [negCount, setNegCount] = useState(0);

  useEffect(() => {
    setPosCount(0);
    setNegCount(0);
  }, [questionKey]);

  const helperTotal = posCount - negCount;
  const pairCount = Math.min(posCount, negCount);
  const remPos = Math.max(0, posCount - pairCount);
  const remNeg = Math.max(0, negCount - pairCount);

  return (
    <div className="mt-4 space-y-2.5 rounded-2xl border-2 border-slate-200 bg-slate-50/90 p-3.5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-bold text-slate-700">
          Papan Hitung: <span className="text-blue-700">Biru (+)</span> ·{' '}
          <span className="text-red-600">Merah (−)</span> · Pasangan = 0, Sisanya = Hasil
        </p>
        <div
          className={`font-mono-num rounded-lg px-2.5 py-0.5 text-sm font-extrabold ${
            helperTotal > 0
              ? 'bg-blue-600 text-white'
              : helperTotal < 0
                ? 'bg-red-600 text-white'
                : 'bg-slate-200 text-slate-800'
          }`}
        >
          Sisa: {helperTotal > 0 ? `+${helperTotal}` : helperTotal}
        </div>
      </div>

      {(posCount > 0 || negCount > 0) && (
        <div className="flex flex-wrap items-center gap-1.5 rounded-xl border border-slate-200 bg-white p-2.5">
          {pairCount > 0 && (
            <span className="mr-1 rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-slate-600">
              {pairCount} pasang (− + = 0)
            </span>
          )}
          {Array.from({ length: Math.min(remPos, 15) }, (_, idx) => (
            <span
              key={`hp-${idx}`}
              className="font-mono-num inline-flex h-7 w-7 items-center justify-center rounded-lg bg-blue-600 text-xs font-extrabold text-white"
            >
              +
            </span>
          ))}
          {remPos > 15 && (
            <span className="text-xs font-bold text-blue-700">+{remPos - 15} (+)</span>
          )}
          {Array.from({ length: Math.min(remNeg, 15) }, (_, idx) => (
            <span
              key={`hn-${idx}`}
              className="font-mono-num inline-flex h-7 w-7 items-center justify-center rounded-lg bg-red-600 text-xs font-extrabold text-white"
            >
              −
            </span>
          ))}
          {remNeg > 15 && (
            <span className="text-xs font-bold text-red-600">+{remNeg - 15} (−)</span>
          )}
          {remPos === 0 && remNeg === 0 && (
            <span className="text-xs font-bold text-slate-500">Habis berpasangan = 0</span>
          )}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        {[1, 5, 10].map((v) => (
          <button
            key={`pos-${v}`}
            type="button"
            onClick={() => setPosCount((prev) => Math.min(60, prev + v))}
            className="font-mono-num min-h-[38px] rounded-xl border-2 border-blue-700 bg-blue-600 px-3 py-1 text-xs font-extrabold text-white shadow-[0_2px_0_#1e40af] hover:bg-blue-500 active:translate-y-0.5"
          >
            +{v}
          </button>
        ))}
        {[1, 5, 10].map((v) => (
          <button
            key={`neg-${v}`}
            type="button"
            onClick={() => setNegCount((prev) => Math.min(60, prev + v))}
            className="font-mono-num min-h-[38px] rounded-xl border-2 border-red-700 bg-red-600 px-3 py-1 text-xs font-extrabold text-white shadow-[0_2px_0_#991b1b] hover:bg-red-500 active:translate-y-0.5"
          >
            −{v}
          </button>
        ))}
        <button
          type="button"
          onClick={() => {
            setPosCount(0);
            setNegCount(0);
          }}
          className="ml-auto inline-flex min-h-[38px] items-center gap-1 rounded-xl border border-slate-300 bg-white px-3 py-1 text-xs font-bold text-slate-700 hover:bg-slate-100"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          <span>Reset 0</span>
        </button>
      </div>
    </div>
  );
};

export const GameplayArena: React.FC<GameplayArenaProps> = ({
  student,
  mode,
  level,
  gameType,
  sessionId,
  durationMinutes,
  initialRoom,
  alreadyFinishedCompetition = false,
  isOnline,
  onExit,
  onStudentProgressUpdated,
}) => {
  const [questions, setQuestions] = useState<QuestionItem[]>([]);
  const [loadingQuestions, setLoadingQuestions] = useState(true);
  const [room, setRoom] = useState<CompetitionRoomRecord | null>(initialRoom || null);

  const [currentIdx, setCurrentIdx] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [answers, setAnswers] = useState<StudentAnswerPayload[]>([]);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [showNumberLineHint, setShowNumberLineHint] = useState(false);

  const [phase, setPhase] = useState<'waiting' | 'playing' | 'submitting' | 'finished'>(() => {
    if (mode === 'competition' && initialRoom) {
      if (alreadyFinishedCompetition || initialRoom.status === 'ended') return 'finished';
      if (initialRoom.status === 'waiting') return 'waiting';
      return 'playing';
    }
    return 'playing';
  });

  const [resultSummary, setResultSummary] = useState<{
    score: number;
    correctCount: number;
    wrongCount: number;
    totalQuestions: number;
    starsEarned: number;
    isPassed: boolean;
    savedOffline: boolean;
    newlyUnlockedBadges?: StudentBadgeRecord[];
  } | null>(null);
  const [submitError, setSubmitError] = useState('');

  const startTimeRef = useRef<number>(Date.now());
  const hasSubmittedRef = useRef(false);

  // Fetch questions (for adventure/session immediately, or when competition becomes active)
  const loadQuestions = async (targetSessionId?: string) => {
    setLoadingQuestions(true);
    try {
      const qsUrl = targetSessionId
        ? `/api/student/questions/${level.id}?sessionId=${encodeURIComponent(targetSessionId)}`
        : `/api/student/questions/${level.id}`;
      const res = await apiFetch(qsUrl);
      if (res.ok) {
        const data = (await res.json()) as { questions: QuestionItem[] };
        if (data.questions?.length > 0) {
          setQuestions(data.questions);
          if (!targetSessionId) {
            cacheLevelQuestions(level.id, data.questions);
          }
          startTimeRef.current = Date.now();
          setLoadingQuestions(false);
          return;
        }
      }
      throw new Error('Fallback offline');
    } catch {
      const fallback = generateOfflineFallbackQuestions(level.id);
      setQuestions(fallback);
      startTimeRef.current = Date.now();
    } finally {
      setLoadingQuestions(false);
    }
  };

  useEffect(() => {
    if (mode !== 'competition') {
      loadQuestions(sessionId);
    } else if (initialRoom && initialRoom.status === 'active' && !alreadyFinishedCompetition) {
      apiFetch(`/api/student/competitions/${initialRoom.id}`)
        .then((r) => r.json())
        .then((data: { room?: CompetitionRoomRecord; questions?: QuestionItem[] }) => {
          if (data.room) setRoom(data.room);
          if (data.questions && data.questions.length > 0) {
            setQuestions(data.questions);
            startTimeRef.current = Date.now();
          }
          setLoadingQuestions(false);
        })
        .catch(() => setLoadingQuestions(false));
    } else {
      setLoadingQuestions(false);
    }
  }, []);

  // WebSocket live connection for Competition Mode
  useEffect(() => {
    if (mode !== 'competition' || !room?.id) return;

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const ws = new WebSocket(`${protocol}//${window.location.host}/ws`);

    ws.onopen = () => {
      ws.send(JSON.stringify({ type: 'subscribe', roomId: room.id }));
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data) as { type?: string; room?: CompetitionRoomRecord };
        if (msg.type === 'room_state' && msg.room) {
          const nextRoom = msg.room;
          setRoom(nextRoom);

          // If teacher starts the competition while student is waiting
          if (nextRoom.status === 'active' && phase === 'waiting') {
            setPhase('playing');
            setLoadingQuestions(true);
            apiFetch(`/api/student/competitions/${nextRoom.id}`)
              .then((r) => r.json())
              .then((data: { questions?: QuestionItem[] }) => {
                if (data.questions) setQuestions(data.questions);
                startTimeRef.current = Date.now();
                setElapsedSeconds(0);
              })
              .finally(() => setLoadingQuestions(false));
          }

          // If teacher ends the competition while student is playing
          if (nextRoom.status === 'ended' && phase === 'playing' && !hasSubmittedRef.current) {
            finishGame(answers);
          }
        }
      } catch {
        // Ignore malformed socket messages
      }
    };

    return () => {
      ws.close();
    };
  }, [mode, room?.id, phase]);

  // Timer tick during active play
  useEffect(() => {
    if (phase !== 'playing' || loadingQuestions || questions.length === 0) return;

    const timer = window.setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
      setElapsedSeconds(elapsed);

      const limitSeconds = (durationMinutes || 0) * 60;
      if (limitSeconds > 0 && elapsed >= limitSeconds && !hasSubmittedRef.current) {
        finishGame(answers);
      }
    }, 1000);

    return () => window.clearInterval(timer);
  }, [phase, loadingQuestions, questions.length, durationMinutes, answers]);

  const activeGameType: GameType = gameType || level.gameType;
  const activeGameMeta = LEVELS.find((l) => l.gameType === activeGameType) || level;

  const currentQuestion = questions[currentIdx];

  const correctCountSoFar = useMemo(() => answers.filter((a) => a.isCorrect).length, [answers]);
  const wrongCountSoFar = useMemo(() => answers.filter((a) => !a.isCorrect).length, [answers]);

  const liveScore = useMemo(() => {
    if (questions.length === 0) return 0;
    return Math.round((correctCountSoFar / questions.length) * 100);
  }, [correctCountSoFar, questions.length]);

  const currentStreak = useMemo(() => {
    let streak = 0;
    for (let i = answers.length - 1; i >= 0; i--) {
      if (answers[i].isCorrect) streak += 1;
      else break;
    }
    return streak;
  }, [answers]);

  const handleSelectOption = (optionValue: number) => {
    if (selectedOption !== null || !currentQuestion) return;
    setSelectedOption(optionValue);
    const isCorrect = optionValue === currentQuestion.correctAnswer;
    if (isCorrect) playCorrectSound();
    else playWrongSound();

    const record: StudentAnswerPayload = {
      questionId: currentQuestion.id,
      questionPrompt: currentQuestion.prompt,
      selectedAnswer: optionValue,
      correctAnswer: currentQuestion.correctAnswer,
      isCorrect,
      explanation: currentQuestion.explanation,
    };
    setAnswers((prev) => [...prev, record]);
  };

  const finishGame = async (finalAnswers: StudentAnswerPayload[]) => {
    if (hasSubmittedRef.current) return;
    hasSubmittedRef.current = true;
    setPhase('submitting');
    playVictorySound();

    // Fill any unanswered questions as wrong if timer expired
    const paddedAnswers = [...finalAnswers];
    if (paddedAnswers.length < questions.length) {
      for (let i = paddedAnswers.length; i < questions.length; i++) {
        const q = questions[i];
        paddedAnswers.push({
          questionId: q.id,
          questionPrompt: q.prompt,
          selectedAnswer: q.options[0] === q.correctAnswer ? q.options[1] : q.options[0],
          correctAnswer: q.correctAnswer,
          isCorrect: false,
          explanation: q.explanation,
        });
      }
    }

    const totalQ = Math.max(1, paddedAnswers.length);
    const correctCnt = paddedAnswers.filter((a) => a.isCorrect).length;
    const wrongCnt = totalQ - correctCnt;
    const computedScore = Math.round((correctCnt / totalQ) * 100);
    const stars = computedScore >= 85 ? 3 : computedScore >= 65 ? 2 : computedScore >= 40 ? 1 : 0;
    const durationSec = Math.max(1, Math.floor((Date.now() - startTimeRef.current) / 1000));
    const passingGrade = student.passingGrade ?? 75;
    const clientEvalId = crypto.randomUUID();
    const executedAt = new Date().toISOString();

    const payload = {
      clientEvalId,
      levelId: level.id,
      mode,
      sessionId: sessionId || room?.sessionId || null,
      roomId: room?.id || null,
      durationSeconds: durationSec,
      answers: paddedAnswers,
      executedAt,
    };

    try {
      const res = await apiFetch('/api/student/evaluations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        const data = (await res.json()) as {
          score: number;
          correctCount: number;
          wrongCount: number;
          totalQuestions: number;
          starsEarned: number;
          isPassed: boolean;
          unlockedLevel: number;
          totalStars: number;
          newlyUnlockedBadges?: StudentBadgeRecord[];
        };
        onStudentProgressUpdated(data.unlockedLevel, data.totalStars);
        setResultSummary({
          score: data.score,
          correctCount: data.correctCount,
          wrongCount: data.wrongCount,
          totalQuestions: data.totalQuestions,
          starsEarned: data.starsEarned,
          isPassed: data.isPassed,
          savedOffline: false,
          newlyUnlockedBadges: data.newlyUnlockedBadges || [],
        });
        setPhase('finished');
        return;
      }
      const errData = (await res.json()) as { error?: string };
      setSubmitError(errData.error || 'Gagal menyimpan hasil.');
    } catch {
      // Offline fallback queue
      if (mode !== 'competition') {
        enqueueOfflineEvaluation(payload);
        const nextUnlocked =
          computedScore >= 60 && level.id >= student.unlockedLevel && level.id < 6
            ? level.id + 1
            : student.unlockedLevel;
        onStudentProgressUpdated(nextUnlocked, student.totalStars + stars);
        setResultSummary({
          score: computedScore,
          correctCount: correctCnt,
          wrongCount: wrongCnt,
          totalQuestions: totalQ,
          starsEarned: stars,
          isPassed: computedScore >= passingGrade,
          savedOffline: true,
        });
        setPhase('finished');
        return;
      }
      setSubmitError('Koneksi terputus saat mengirim hasil kompetisi.');
    }

    setResultSummary({
      score: computedScore,
      correctCount: correctCnt,
      wrongCount: wrongCnt,
      totalQuestions: totalQ,
      starsEarned: stars,
      isPassed: computedScore >= passingGrade,
      savedOffline: false,
    });
    setPhase('finished');
  };

  const handleNextQuestion = () => {
    if (currentIdx + 1 < questions.length) {
      setCurrentIdx((i) => i + 1);
      setSelectedOption(null);
    } else {
      finishGame(answers);
    }
  };

  // Keyboard shortcuts: 1-4 for choice-based mini-games, Enter to advance
  useEffect(() => {
    const isChoiceBoard = ['lantern', 'bridge', 'castle', 'boss'].includes(activeGameType);
    const onKeyDown = (e: KeyboardEvent) => {
      if (phase !== 'playing' || !currentQuestion) return;
      if (selectedOption === null && isChoiceBoard) {
        const idx = ['1', '2', '3', '4'].indexOf(e.key);
        if (idx !== -1 && currentQuestion.options[idx] !== undefined) {
          handleSelectOption(currentQuestion.options[idx]);
        }
      } else if (selectedOption !== null && e.key === 'Enter') {
        e.preventDefault();
        handleNextQuestion();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [phase, currentQuestion, selectedOption, answers, activeGameType]);

  const handleReplay = () => {
    hasSubmittedRef.current = false;
    setAnswers([]);
    setCurrentIdx(0);
    setSelectedOption(null);
    setElapsedSeconds(0);
    setResultSummary(null);
    setSubmitError('');
    setPhase('playing');
    loadQuestions(sessionId);
  };

  // WAITING ROOM (Competition)
  if (phase === 'waiting' && room) {
    return (
      <div className="game-canvas min-h-screen px-4 py-8 sm:px-6">
        <div className="mx-auto max-w-3xl">
          <button
            type="button"
            onClick={onExit}
            className="game-btn-back inline-flex min-h-[42px] items-center gap-2 rounded-xl px-4 py-2 text-sm font-extrabold"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Kembali ke Peta</span>
          </button>

          <div className="game-card mt-5 p-6 sm:p-8">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-5">
              <div>
                <p className="text-xs font-extrabold uppercase tracking-wider text-purple-700">
                  Ruang Tunggu Kompetisi Kelas
                </p>
                <h1 className="font-display mt-1 text-2xl font-extrabold text-slate-900">{room.title}</h1>
                <p className="mt-1 text-sm text-slate-600">
                  {room.topic} · {room.questionCount} soal · {room.durationMinutes} menit
                </p>
              </div>
              <div className="rounded-2xl border-2 border-purple-200 bg-purple-50 px-4 py-2.5 text-center">
                <p className="text-[11px] font-bold uppercase text-purple-700">Kode Ruang</p>
                <p className="font-mono-num text-xl font-extrabold text-purple-900">{room.roomCode}</p>
              </div>
            </div>

            <div className="mt-6 flex items-center gap-3 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-medium text-blue-900">
              <Loader2 className="h-5 w-5 animate-spin text-blue-600 shrink-0" />
              <span>Menunggu guru menekan tombol MULAI KOMPETISI. Permainan akan dimulai otomatis!</span>
            </div>

            <div className="mt-6">
              <div className="flex items-center justify-between">
                <h2 className="flex items-center gap-2 text-sm font-bold text-slate-800">
                  <Users className="h-4 w-4 text-purple-600" />
                  <span>Peserta yang Sudah Bergabung ({room.participants.length})</span>
                </h2>
              </div>

              <div className="mt-3 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                {room.participants.map((p) => (
                  <div
                    key={p.id}
                    className={`flex items-center gap-3 rounded-xl border px-3.5 py-2.5 ${
                      p.studentId === student.id ? 'border-blue-400 bg-blue-50/70' : 'border-slate-200 bg-slate-50'
                    }`}
                  >
                    <img
                      src={getAvatarImage(p.avatarId)}
                      alt={p.studentName}
                      referrerPolicy="no-referrer"
                      className="h-9 w-9 rounded-lg object-cover"
                    />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-slate-900">
                        {p.studentName} {p.studentId === student.id ? '(Kamu)' : ''}
                      </p>
                      <p className="text-xs text-slate-500">Siap bertanding</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // FINISHED / RESULT SCREEN
  if (phase === 'finished') {
    const myParticipant = room?.participants.find((p) => p.studentId === student.id);
    const displayScore = resultSummary?.score ?? myParticipant?.score ?? 0;
    const displayCorrect = resultSummary?.correctCount ?? myParticipant?.correctCount ?? 0;
    const displayTotal = resultSummary?.totalQuestions ?? room?.questionCount ?? questions.length;
    const displayWrong = resultSummary?.wrongCount ?? myParticipant?.wrongCount ?? Math.max(0, displayTotal - displayCorrect);
    const displayStars =
      resultSummary?.starsEarned ?? (displayScore >= 85 ? 3 : displayScore >= 65 ? 2 : displayScore >= 40 ? 1 : 0);
    const displayDuration = myParticipant?.durationSeconds ?? elapsedSeconds;

    const motivation =
      displayScore >= 85
        ? 'Luar biasa! Penguasaan bilangan bulatmu sangat tajam. Teruskan prestasimu!'
        : displayScore >= 65
          ? 'Kerja bagus! Kamu sudah memahami sebagian besar konsep dengan baik.'
          : 'Tetap semangat! Pelajari kembali pembahasan konsep dan coba lagi untuk bintang lebih banyak!';

    return (
      <div className="game-canvas min-h-screen px-4 py-8 sm:px-6">
        <div className="mx-auto max-w-3xl">
          <button
            type="button"
            onClick={onExit}
            className="game-btn-back mb-5 inline-flex min-h-[42px] items-center gap-2 rounded-xl px-4 py-2 text-sm font-extrabold"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Kembali ke Peta</span>
          </button>

          <div className="game-card p-6 sm:p-8">
            <div className="text-center">
              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-[0_4px_0_#b45309]">
                <Award className="h-10 w-10" />
              </div>
              <p className="mt-4 text-xs font-extrabold uppercase tracking-wider text-blue-700">
                {mode === 'competition' ? 'Hasil Kompetisi Kelas' : 'Misi Selesai!'}
              </p>
              <h1 className="font-display mt-1 text-2xl font-extrabold text-slate-900 sm:text-3xl">
                {level.title}
              </h1>
              <p className="mt-1 text-sm font-semibold text-slate-600">
                {student.fullName} · {student.className}
              </p>

              {/* Stars */}
              <div className="mt-5 flex items-center justify-center gap-3">
                {[1, 2, 3].map((s) => (
                  <Star
                    key={s}
                    className={`h-11 w-11 transition-transform ${
                      s <= displayStars ? 'fill-amber-400 text-amber-500 scale-110' : 'text-slate-200'
                    }`}
                  />
                ))}
              </div>
            </div>

            {resultSummary?.savedOffline && (
              <div className="mt-5 flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs font-medium text-amber-900">
                <CloudOff className="h-4 w-4 shrink-0" />
                <span>Hasil disimpan offline di perangkat dan akan tersinkronisasi ke dashboard guru secara otomatis saat online.</span>
              </div>
            )}

            {submitError && (
              <div className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs font-medium text-red-700">
                {submitError}
              </div>
            )}

            {/* Stats Grid */}
            <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5 text-center">
                <p className="text-xs font-medium text-slate-500">Nilai Akhir</p>
                <p className="font-mono-num mt-1 text-2xl font-extrabold text-blue-700">{displayScore}</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5 text-center">
                <p className="text-xs font-medium text-slate-500">Jawaban Benar</p>
                <p className="font-mono-num mt-1 text-2xl font-extrabold text-emerald-700">
                  {displayCorrect}/{displayTotal}
                </p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5 text-center">
                <p className="text-xs font-medium text-slate-500">Jawaban Salah</p>
                <p className="font-mono-num mt-1 text-2xl font-extrabold text-rose-600">{displayWrong}</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5 text-center">
                <p className="text-xs font-medium text-slate-500">Waktu</p>
                <p className="font-mono-num mt-1 text-lg font-bold text-slate-800">
                  {formatDuration(displayDuration)}
                </p>
              </div>
            </div>

            <div className="mt-5 flex items-center gap-3.5 rounded-2xl border-2 border-sky-200 bg-sky-50 px-4 py-3.5 text-sm font-semibold text-sky-950">
              <img
                src="/src/assets/images/avatar_owl_mentor_1794558987496.jpg"
                alt="Mentor Burung Hantu"
                referrerPolicy="no-referrer"
                className="h-11 w-11 shrink-0 rounded-2xl border-2 border-white object-cover shadow-xs"
              />
              <p>{motivation}</p>
            </div>

            {resultSummary?.newlyUnlockedBadges && resultSummary.newlyUnlockedBadges.length > 0 && (
              <div className="mt-6 rounded-2xl border-2 border-amber-300 bg-amber-50/70 p-5">
                <p className="text-xs font-extrabold uppercase tracking-wider text-amber-800">
                  Lencana Pencapaian Baru Diraih!
                </p>
                <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {resultSummary.newlyUnlockedBadges.map((ub) => {
                    const def = getBadgeDefinition(ub.badgeId);
                    if (!def) return null;
                    return <BadgeCard key={ub.id} badge={def} unlocked unlockedAt={ub.unlockedAt} />;
                  })}
                </div>
              </div>
            )}

            {/* Live Competition Leaderboard */}
            {mode === 'competition' && room && (
              <div className="mt-7 border-t border-slate-200 pt-6">
                <div className="flex items-center justify-between">
                  <h2 className="font-display flex items-center gap-2 text-lg font-extrabold text-slate-900">
                    <Trophy className="h-5 w-5 text-amber-500" />
                    <span>Leaderboard Kompetisi ({room.roomCode})</span>
                  </h2>
                  <span className="text-xs font-semibold text-slate-500">
                    Status: {room.status === 'ended' ? 'Selesai' : 'Berlangsung'}
                  </span>
                </div>

                <div className="mt-3 overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 text-xs font-semibold text-slate-500">
                        <th className="py-2 pr-3">Peringkat</th>
                        <th className="py-2 px-3">Nama Siswa</th>
                        <th className="py-2 px-3 text-right">Skor</th>
                        <th className="py-2 px-3 text-right">Benar</th>
                        <th className="py-2 pl-3 text-right">Waktu</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {room.participants.map((p, idx) => (
                        <tr
                          key={p.id}
                          className={p.studentId === student.id ? 'bg-blue-50/70 font-semibold' : ''}
                        >
                          <td className="font-mono-num py-2.5 pr-3 font-bold text-slate-700">#{idx + 1}</td>
                          <td className="py-2.5 px-3 text-slate-900">
                            {p.studentName} {p.studentId === student.id ? '(Kamu)' : ''}
                          </td>
                          <td className="font-mono-num py-2.5 px-3 text-right font-bold text-blue-700">
                            {p.status === 'finished' ? p.score : '—'}
                          </td>
                          <td className="font-mono-num py-2.5 px-3 text-right text-slate-700">
                            {p.status === 'finished' ? p.correctCount : 'Mengerjakan'}
                          </td>
                          <td className="font-mono-num py-2.5 pl-3 text-right text-slate-600">
                            {p.status === 'finished' ? formatDuration(p.durationSeconds) : '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:justify-center">
              <button
                type="button"
                onClick={onExit}
                className="game-btn-blue inline-flex min-h-[48px] items-center justify-center gap-2 rounded-2xl px-6 py-3 text-sm font-extrabold"
              >
                <Compass className="h-4 w-4" />
                <span>Kembali ke Peta Petualangan</span>
              </button>
              {mode === 'adventure' && (
                <button
                  type="button"
                  onClick={handleReplay}
                  className="game-btn-back inline-flex min-h-[48px] items-center justify-center gap-2 rounded-2xl px-6 py-3 text-sm font-extrabold"
                >
                  <RotateCcw className="h-4 w-4" />
                  <span>Mainkan Ulang</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // LOADING OR SUBMITTING
  if (loadingQuestions || phase === 'submitting' || !currentQuestion) {
    return (
      <div className="game-canvas flex min-h-screen flex-col items-center justify-center px-4">
        <Loader2 className="h-10 w-10 animate-spin text-blue-600" />
        <p className="mt-3 text-sm font-bold text-slate-700">
          {phase === 'submitting' ? 'Menyimpan hasil & menghitung bintang...' : 'Menyiapkan tantangan soal...'}
        </p>
        <button
          type="button"
          onClick={onExit}
          className="game-btn-back mt-6 inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-extrabold"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Kembali ke Peta</span>
        </button>
      </div>
    );
  }

  // ACTIVE GAMEPLAY ARENA
  const progressPct = ((currentIdx + (selectedOption !== null ? 1 : 0)) / questions.length) * 100;
  const remainingSeconds =
    durationMinutes && durationMinutes > 0 ? Math.max(0, durationMinutes * 60 - elapsedSeconds) : null;
  const isSelectedCorrect = selectedOption !== null && selectedOption === currentQuestion.correctAnswer;

  return (
    <div className="game-canvas min-h-screen pb-12 text-slate-900">
      {/* Top Game HUD */}
      <header className="sticky top-0 z-20 border-b-2 border-slate-200/80 bg-white/95 backdrop-blur-sm">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <button
            type="button"
            onClick={onExit}
            className="game-btn-back inline-flex h-10 items-center gap-1.5 rounded-xl px-3.5 text-xs font-extrabold whitespace-nowrap shrink-0"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Kembali</span>
          </button>

          <div className="min-w-0 text-center">
            <p className="truncate text-xs font-extrabold text-blue-700">
              {mode === 'competition'
                ? `Kompetisi · ${room?.roomCode} · ${activeGameMeta.gameName}`
                : `Level ${level.id} · ${activeGameMeta.gameName}`}
            </p>
            <p className="font-mono-num text-xs font-bold text-slate-500">
              Ronde {currentIdx + 1} dari {questions.length} · {level.topic}
            </p>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            {currentStreak >= 2 && (
              <div className="hidden items-center gap-1 rounded-xl border border-orange-200 bg-orange-50 px-2.5 py-1.5 text-xs font-extrabold text-orange-700 sm:flex">
                <Flame className="h-3.5 w-3.5 fill-orange-500 text-orange-600" />
                <span className="font-mono-num">{currentStreak}x</span>
              </div>
            )}
            <div className="rounded-xl border border-blue-200 bg-blue-50 px-2.5 py-1 text-right">
              <p className="text-[10px] font-bold uppercase text-blue-700">Skor</p>
              <p className="font-mono-num text-sm font-extrabold text-blue-800">{liveScore}</p>
            </div>
            <div className="flex items-center gap-1 rounded-xl border border-slate-200 bg-slate-100 px-2.5 py-2 text-xs font-extrabold text-slate-800">
              <Clock className="h-3.5 w-3.5 text-orange-600" />
              <span className="font-mono-num">
                {remainingSeconds !== null ? formatDuration(remainingSeconds) : formatDuration(elapsedSeconds)}
              </span>
            </div>
          </div>
        </div>
        {/* Progress bar */}
        <div className="h-2 w-full bg-slate-100">
          <div
            className="h-full rounded-r-full bg-gradient-to-r from-blue-600 via-purple-600 to-orange-500 transition-all duration-300"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 pt-6 sm:px-6 sm:pt-10">
        {!isOnline && mode === 'adventure' && (
          <div className="mb-4 flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-2 text-xs font-semibold text-amber-900">
            <CloudOff className="h-4 w-4 shrink-0" />
            <span>Bermain dalam Mode Offline — Progres tetap tersimpan.</span>
          </div>
        )}

        <div className="game-card p-6 sm:p-8">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <img
                src={getAvatarImage(student.avatarId)}
                alt={student.fullName}
                referrerPolicy="no-referrer"
                className="h-8 w-8 rounded-xl border border-amber-300 object-cover"
              />
              <span className="text-xs font-extrabold uppercase tracking-wider text-purple-700">
                {currentQuestion.difficulty === 'easy'
                  ? 'Tingkat Dasar'
                  : currentQuestion.difficulty === 'medium'
                    ? 'Tingkat Menengah'
                    : 'Tantangan Lanjut'}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setShowNumberLineHint((v) => !v)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-sky-200 bg-sky-50 px-3 py-1.5 text-xs font-bold text-blue-700 hover:bg-sky-100"
            >
              <HelpCircle className="h-4 w-4" />
              <span>{showNumberLineHint ? 'Tutup Papan Hitung' : 'Bantuan Tombol (+/-)'}</span>
            </button>
          </div>

          {showNumberLineHint && (
            <IntegerHelperPad questionKey={currentQuestion.id} />
          )}

          {/* Question Prompt */}
          <div className="mt-5 rounded-2xl border-2 border-slate-100 bg-slate-50/70 p-5 text-center sm:p-6">
            <h2 className="font-display text-2xl font-extrabold leading-snug text-slate-900 sm:text-3xl">
              {currentQuestion.prompt}
            </h2>
          </div>

          {/* Interactive Mini-Game Stage */}
          <div className="mt-6">
            <MiniGameBoard
              gameType={activeGameType}
              question={currentQuestion}
              studentAvatarId={student.avatarId}
              studentName={student.fullName}
              revealed={selectedOption !== null}
              selectedAnswer={selectedOption}
              correctCountSoFar={correctCountSoFar}
              wrongCountSoFar={wrongCountSoFar}
              currentIdx={currentIdx}
              totalQuestions={questions.length}
              onSubmitAnswer={handleSelectOption}
            />
          </div>

          {/* Feedback & Concept Explanation after answering */}
          {selectedOption !== null && (
            <div
              className={`mt-6 rounded-2xl border-2 p-4 sm:p-5 ${
                isSelectedCorrect ? 'border-emerald-300 bg-emerald-50' : 'border-amber-300 bg-amber-50'
              }`}
            >
              <div className="flex items-start gap-3.5">
                <img
                  src="/src/assets/images/avatar_owl_mentor_1794558987496.jpg"
                  alt="Prof. Burung Hantu"
                  referrerPolicy="no-referrer"
                  className="h-12 w-12 shrink-0 rounded-2xl border-2 border-white object-cover shadow-xs"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    {isSelectedCorrect ? (
                      <CheckCircle2 className="h-5 w-5 text-emerald-700 shrink-0" />
                    ) : (
                      <XCircle className="h-5 w-5 text-rose-600 shrink-0" />
                    )}
                    <p className={`text-sm font-extrabold ${isSelectedCorrect ? 'text-emerald-900' : 'text-slate-900'}`}>
                      {isSelectedCorrect
                        ? currentStreak >= 3
                          ? `Keren banget! ${currentStreak} jawaban benar berturut-turut!`
                          : 'Mantap! Jawabanmu tepat sekali!'
                        : `Hampir tepat! Jawaban yang benar adalah ${currentQuestion.correctAnswer}.`}
                    </p>
                  </div>
                  <p className="mt-1.5 text-sm leading-relaxed text-slate-700">
                    <span className="font-bold">Kata Prof. Burung Hantu:</span> {currentQuestion.explanation}
                  </p>
                </div>
              </div>

              <div className="mt-4 flex justify-end">
                <button
                  type="button"
                  onClick={handleNextQuestion}
                  className="game-btn-orange inline-flex min-h-[46px] items-center gap-2 rounded-2xl px-6 py-2.5 text-sm font-extrabold"
                >
                  <span>{currentIdx + 1 < questions.length ? 'Lanjut ke Soal Berikutnya' : 'Lihat Hasil Akhir'}</span>
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};
