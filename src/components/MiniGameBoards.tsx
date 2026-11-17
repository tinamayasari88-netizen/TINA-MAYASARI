import React, { useEffect, useState } from 'react';
import {
  Backpack,
  Castle,
  CheckCircle2,
  Crown,
  Delete,
  Flame,
  KeyRound,
  Lock,
  Mountain,
  Radar,
  RotateCcw,
  ShieldAlert,
  Sparkles,
  Swords,
  Target,
  Unlock,
  XCircle,
  Zap,
} from 'lucide-react';
import { getAvatarImage, type GameType, type QuestionItem } from '../shared/levels';

export interface MiniGameBoardProps {
  gameType: GameType;
  question: QuestionItem;
  studentAvatarId: string;
  studentName: string;
  revealed: boolean;
  selectedAnswer: number | null;
  correctCountSoFar: number;
  wrongCountSoFar: number;
  currentIdx: number;
  totalQuestions: number;
  onSubmitAnswer: (value: number) => void;
}

function getOrderOfOperationsTip(prompt: string): string {
  if (prompt.includes('(') && (prompt.includes('+') || prompt.includes('-')) && (prompt.includes('×') || prompt.includes('÷'))) {
    const parenMatch = prompt.match(/\(([^)]+)\)/);
    if (parenMatch && (parenMatch[1].includes('+') || parenMatch[1].includes('-'))) {
      return `Radar Kurung: Kerjakan operasi di dalam tanda kurung (${parenMatch[1]}) terlebih dahulu!`;
    }
  }
  if (prompt.includes('×') || prompt.includes('÷')) {
    if (prompt.includes('+') || prompt.includes('-')) {
      return 'Radar Prioritas: Kerjakan perkalian (×) atau pembagian (÷) lebih dulu sebelum penjumlahan/pengurangan!';
    }
    return 'Radar Arah: Karena setara (× dan ÷), kerjakan urut dari sebelah kiri ke kanan!';
  }
  return 'Radar Arah: Kerjakan operasi dari kiri ke kanan dengan memperhatikan tanda bilangan bulat!';
}

/* =========================================================
   GAME 1: SUSUN TOMBOL BILANGAN (Positif Biru & Negatif Merah)
========================================================= */
const JumperGameBoard: React.FC<MiniGameBoardProps> = ({
  question,
  studentAvatarId,
  revealed,
  selectedAnswer,
  onSubmitAnswer,
}) => {
  const [posCount, setPosCount] = useState(0);
  const [negCount, setNegCount] = useState(0);
  const [animKey, setAnimKey] = useState(0);

  useEffect(() => {
    setPosCount(0);
    setNegCount(0);
  }, [question.id]);

  const totalValue = posCount - negCount;
  const pairCount = Math.min(posCount, negCount);
  const remPos = Math.max(0, posCount - pairCount);
  const remNeg = Math.max(0, negCount - pairCount);

  const addPositive = (amount: number) => {
    if (revealed) return;
    setPosCount((prev) => Math.min(60, prev + amount));
    setAnimKey((k) => k + 1);
  };

  const addNegative = (amount: number) => {
    if (revealed) return;
    setNegCount((prev) => Math.min(60, prev + amount));
    setAnimKey((k) => k + 1);
  };

  const resetTokens = () => {
    if (revealed) return;
    setPosCount(0);
    setNegCount(0);
  };

  useEffect(() => {
    if (revealed) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === '+') {
        e.preventDefault();
        addPositive(e.shiftKey ? 5 : 1);
      } else if (e.key === 'ArrowLeft' || e.key === '-') {
        e.preventDefault();
        addNegative(e.shiftKey ? 5 : 1);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        onSubmitAnswer(totalValue);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [revealed, totalValue, question.id]);

  const isCorrect = revealed && selectedAnswer === question.correctAnswer;
  const shownValue = revealed && selectedAnswer !== null ? selectedAnswer : totalValue;

  return (
    <div className="space-y-5">
      {/* Interactive Token Cancellation Stage */}
      <div className="relative overflow-hidden rounded-2xl border-2 border-slate-200 bg-gradient-to-b from-sky-50/70 via-white to-slate-50 p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <img
              key={animKey}
              src={getAvatarImage(studentAvatarId)}
              alt="Penjelajah"
              referrerPolicy="no-referrer"
              className="h-11 w-11 rounded-xl border-2 border-amber-300 object-cover shadow-sm"
            />
            <div>
              <p className="text-xs font-extrabold text-slate-600">Pasangkan Tombol (+) &amp; (−) Menjadi 0</p>
              <p className="text-xs font-semibold text-slate-500">
                <span className="font-extrabold text-blue-700">Biru (+) Positif</span>
                <span aria-hidden="true"> · </span>
                <span className="font-extrabold text-red-600">Merah (−) Negatif</span>
                <span aria-hidden="true"> · </span>
                <span>Hasil = Sisanya!</span>
              </p>
            </div>
          </div>

          <div
            className={`flex items-center gap-2 rounded-2xl border-2 px-4 py-2 ${
              shownValue > 0
                ? 'border-blue-600 bg-blue-600 text-white'
                : shownValue < 0
                  ? 'border-red-600 bg-red-600 text-white'
                  : 'border-slate-300 bg-slate-100 text-slate-800'
            }`}
          >
            <span className="text-xs font-bold opacity-90">Sisa / Hasil:</span>
            <span className="font-mono-num text-2xl font-extrabold">
              {shownValue > 0 ? `+${shownValue}` : shownValue}
            </span>
          </div>
        </div>

        {/* Individual Tokens & Pairing View */}
        <div className="mt-4 space-y-3 rounded-xl border-2 border-dashed border-slate-300 bg-white/95 p-3.5">
          {posCount === 0 && negCount === 0 ? (
            <div className="flex min-h-[60px] items-center justify-center text-center text-xs font-semibold text-slate-500">
              Ketuk tombol <span className="mx-1 font-extrabold text-red-600">Merah (−)</span> atau{' '}
              <span className="mx-1 font-extrabold text-blue-700">Biru (+)</span> sebanyak bilangan pada soal, lalu lihat
              sisanya!
            </div>
          ) : (
            <>
              {/* Paired 0 groups */}
              {pairCount > 0 && (
                <div>
                  <p className="mb-1.5 text-[11px] font-bold text-slate-500">
                    Pasangan Saling Menghilangkan ({pairCount} pasang = 0):
                  </p>
                  <div className="flex flex-wrap items-center gap-2">
                    {Array.from({ length: Math.min(pairCount, 10) }, (_, idx) => (
                      <div
                        key={`pair-${idx}`}
                        className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-slate-50 px-2 py-1 opacity-75"
                      >
                        <button
                          type="button"
                          disabled={revealed}
                          onClick={() => setNegCount((c) => Math.max(0, c - 1))}
                          title="Kurangi 1 tombol (−)"
                          className="font-mono-num inline-flex h-7 w-7 items-center justify-center rounded-md bg-red-600 text-xs font-extrabold text-white"
                        >
                          −
                        </button>
                        <button
                          type="button"
                          disabled={revealed}
                          onClick={() => setPosCount((c) => Math.max(0, c - 1))}
                          title="Kurangi 1 tombol (+)"
                          className="font-mono-num inline-flex h-7 w-7 items-center justify-center rounded-md bg-blue-600 text-xs font-extrabold text-white"
                        >
                          +
                        </button>
                        <span className="font-mono-num text-[11px] font-extrabold text-slate-500">=0</span>
                      </div>
                    ))}
                    {pairCount > 10 && (
                      <span className="text-xs font-bold text-slate-500">+{pairCount - 10} pasang (=0)</span>
                    )}
                  </div>
                </div>
              )}

              {/* Unpaired Remaining Tokens */}
              <div>
                <p className="mb-1.5 text-[11px] font-extrabold text-slate-700">
                  Sisa Tombol ({remPos > 0 ? `${remPos} Biru (+)` : remNeg > 0 ? `${remNeg} Merah (−)` : 'Habis = 0'}):
                </p>
                {remPos === 0 && remNeg === 0 ? (
                  <span className="font-mono-num inline-block rounded-xl border border-slate-300 bg-slate-100 px-3 py-1.5 text-xs font-extrabold text-slate-700">
                    0 (Tidak ada sisa)
                  </span>
                ) : (
                  <div className="flex flex-wrap items-center gap-2">
                    {Array.from({ length: Math.min(remPos, 20) }, (_, idx) => (
                      <button
                        key={`rem-pos-${idx}`}
                        type="button"
                        disabled={revealed}
                        onClick={() => setPosCount((c) => Math.max(0, c - 1))}
                        title="Ketuk untuk kurangi 1 tombol (+)"
                        className="font-mono-num inline-flex h-10 w-10 items-center justify-center rounded-xl border-2 border-blue-700 bg-blue-600 text-base font-extrabold text-white shadow-[0_2px_0_#1d4ed8] transition hover:scale-95"
                      >
                        +
                      </button>
                    ))}
                    {remPos > 20 && (
                      <span className="font-mono-num rounded-xl bg-blue-600 px-3 py-2 text-xs font-extrabold text-white">
                        +{remPos - 20} tombol (+) lagi
                      </span>
                    )}

                    {Array.from({ length: Math.min(remNeg, 20) }, (_, idx) => (
                      <button
                        key={`rem-neg-${idx}`}
                        type="button"
                        disabled={revealed}
                        onClick={() => setNegCount((c) => Math.max(0, c - 1))}
                        title="Ketuk untuk kurangi 1 tombol (−)"
                        className="font-mono-num inline-flex h-10 w-10 items-center justify-center rounded-xl border-2 border-red-700 bg-red-600 text-base font-extrabold text-white shadow-[0_2px_0_#b91c1c] transition hover:scale-95"
                      >
                        −
                      </button>
                    ))}
                    {remNeg > 20 && (
                      <span className="font-mono-num rounded-xl bg-red-600 px-3 py-2 text-xs font-extrabold text-white">
                        +{remNeg - 20} tombol (−) lagi
                      </span>
                    )}
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {(posCount > 0 || negCount > 0) && (
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs font-bold">
            <span className="text-slate-600">
              Terpasang: <span className="font-mono-num text-red-600">{negCount} tombol (−)</span> &amp;{' '}
              <span className="font-mono-num text-blue-700">{posCount} tombol (+)</span>
              <span aria-hidden="true"> · </span>
              Sisa ={' '}
              <span
                className={`font-mono-num ${
                  totalValue > 0 ? 'text-blue-700' : totalValue < 0 ? 'text-red-600' : 'text-slate-800'
                }`}
              >
                {totalValue > 0 ? `+${totalValue}` : totalValue}
              </span>
            </span>
            {revealed && (
              <span className={isCorrect ? 'text-emerald-700' : 'text-red-600'}>
                {isCorrect ? 'Susunan Tepat!' : `Jawaban benar: ${question.correctAnswer}`}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Blue Positive & Red Negative Button Decks */}
      {!revealed && (
        <div className="space-y-3.5">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {/* Positive = Blue */}
            <div className="rounded-2xl border-2 border-blue-200 bg-blue-50/70 p-3">
              <p className="mb-2 text-xs font-extrabold uppercase tracking-wider text-blue-800">
                Tambah Tombol Positif (+) · Biru
              </p>
              <div className="grid grid-cols-3 gap-2">
                {[1, 5, 10].map((step) => (
                  <button
                    key={step}
                    type="button"
                    onClick={() => addPositive(step)}
                    className="font-mono-num flex min-h-[48px] items-center justify-center rounded-xl border-2 border-blue-700 bg-blue-600 text-sm font-extrabold text-white shadow-[0_3px_0_#1e40af] transition hover:-translate-y-0.5 hover:bg-blue-500 active:translate-y-0.5"
                  >
                    +{step} ({step}×+)
                  </button>
                ))}
              </div>
            </div>

            {/* Negative = Red */}
            <div className="rounded-2xl border-2 border-red-200 bg-red-50/70 p-3">
              <p className="mb-2 text-xs font-extrabold uppercase tracking-wider text-red-800">
                Tambah Tombol Negatif (−) · Merah
              </p>
              <div className="grid grid-cols-3 gap-2">
                {[1, 5, 10].map((step) => (
                  <button
                    key={step}
                    type="button"
                    onClick={() => addNegative(step)}
                    className="font-mono-num flex min-h-[48px] items-center justify-center rounded-xl border-2 border-red-700 bg-red-600 text-sm font-extrabold text-white shadow-[0_3px_0_#991b1b] transition hover:-translate-y-0.5 hover:bg-red-500 active:translate-y-0.5"
                  >
                    −{step} ({step}×−)
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-2.5 sm:flex-row">
            <button
              type="button"
              onClick={resetTokens}
              className="flex min-h-[52px] items-center justify-center gap-1.5 rounded-2xl border-2 border-slate-200 bg-slate-100 px-5 text-sm font-extrabold text-slate-700 hover:bg-slate-200"
            >
              <RotateCcw className="h-4 w-4" />
              <span>Reset ke 0</span>
            </button>
            <button
              type="button"
              onClick={() => onSubmitAnswer(totalValue)}
              className="game-btn-orange flex min-h-[52px] flex-1 items-center justify-center gap-2 rounded-2xl px-6 py-3 text-base font-extrabold"
            >
              <CheckCircle2 className="h-5 w-5" />
              <span>Kunci Jawaban ({totalValue > 0 ? `+${totalValue}` : totalValue})</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

/* =========================================================
   GAME 2: TANGKAP LENTERA HUTAN (Forest Target Catcher)
========================================================= */
const LanternGameBoard: React.FC<MiniGameBoardProps> = ({
  question,
  revealed,
  selectedAnswer,
  onSubmitAnswer,
}) => {
  const [speedBonusPct, setSpeedBonusPct] = useState(100);

  useEffect(() => {
    setSpeedBonusPct(100);
    if (revealed) return;
    const start = Date.now();
    const timer = window.setInterval(() => {
      const elapsed = Date.now() - start;
      const pct = Math.max(0, 100 - (elapsed / 12000) * 100);
      setSpeedBonusPct(pct);
    }, 150);
    return () => window.clearInterval(timer);
  }, [question.id, revealed]);

  const slotOffsets = ['pt-2', 'pt-8', 'pt-1', 'pt-7'];

  return (
    <div className="space-y-4">
      <div className="relative overflow-hidden rounded-2xl border-2 border-emerald-800 bg-gradient-to-b from-slate-900 via-emerald-950 to-teal-950 p-5 text-white shadow-inner">
        {/* Speed Bonus Bar */}
        <div className="flex items-center justify-between gap-3 text-xs font-bold">
          <span className="inline-flex items-center gap-1.5 text-amber-300">
            <Sparkles className="h-4 w-4" />
            <span>Tangkap Lentera yang Bercahaya Benar!</span>
          </span>
          <span className="font-mono-num text-emerald-300">
            {speedBonusPct > 0 ? 'Bonus Cepat Aktif' : 'Mode Santai'}
          </span>
        </div>
        <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-emerald-900">
          <div
            className="h-full rounded-full bg-gradient-to-r from-amber-400 to-emerald-400 transition-all duration-150"
            style={{ width: `${speedBonusPct}%` }}
          />
        </div>

        {/* Floating Lantern Arena */}
        <div className="mt-5 grid min-h-[210px] grid-cols-2 gap-4 sm:grid-cols-4">
          {question.options.map((opt, idx) => {
            const isChosen = selectedAnswer === opt;
            const isAnswer = opt === question.correctAnswer;
            const driftClass = idx % 2 === 0 ? 'animate-lantern-a' : 'animate-lantern-b';

            let lanternStyle =
              'border-amber-300/80 bg-gradient-to-b from-amber-300/25 to-orange-500/25 text-white shadow-[0_0_24px_rgba(251,191,36,0.28)] hover:scale-105 hover:border-amber-200';
            if (revealed) {
              if (isAnswer) {
                lanternStyle =
                  'border-emerald-400 bg-emerald-500/35 text-emerald-100 shadow-[0_0_28px_rgba(16,185,129,0.5)] scale-105';
              } else if (isChosen && !isAnswer) {
                lanternStyle = 'border-rose-400 bg-rose-500/35 text-rose-100 opacity-90';
              } else {
                lanternStyle = 'border-emerald-800 bg-emerald-900/40 text-emerald-400 opacity-50';
              }
            }

            return (
              <div key={opt} className={`flex justify-center ${slotOffsets[idx % 4]}`}>
                <button
                  type="button"
                  disabled={revealed}
                  onClick={() => onSubmitAnswer(opt)}
                  className={`group relative flex h-32 w-full max-w-[140px] flex-col items-center justify-center rounded-3xl border-2 px-3 py-3 transition-transform ${
                    !revealed ? driftClass : ''
                  } ${lanternStyle}`}
                >
                  {/* Lantern hanging string */}
                  <span className="mb-1 text-[10px] font-extrabold uppercase tracking-wider text-amber-200/90">
                    Lentera {['1', '2', '3', '4'][idx]}
                  </span>
                  <div className="flex h-14 w-14 items-center justify-center rounded-full border-2 border-amber-200/70 bg-amber-400/20">
                    <span className="font-mono-num text-2xl font-extrabold text-white">{opt}</span>
                  </div>
                  {revealed && isAnswer && (
                    <span className="mt-1.5 inline-flex items-center gap-1 text-[11px] font-bold text-emerald-300">
                      <CheckCircle2 className="h-3.5 w-3.5" /> Tepat!
                    </span>
                  )}
                  {revealed && isChosen && !isAnswer && (
                    <span className="mt-1.5 inline-flex items-center gap-1 text-[11px] font-bold text-rose-300">
                      <XCircle className="h-3.5 w-3.5" /> Melayang
                    </span>
                  )}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

/* =========================================================
   GAME 3: BRANKAS GUNUNG ES (Ice Safe Cracker Keypad)
========================================================= */
const SafeCrackerGameBoard: React.FC<MiniGameBoardProps> = ({
  question,
  revealed,
  selectedAnswer,
  currentIdx,
  totalQuestions,
  onSubmitAnswer,
}) => {
  const [isNegative, setIsNegative] = useState(false);
  const [digits, setDigits] = useState('');

  useEffect(() => {
    setIsNegative(false);
    setDigits('');
  }, [question.id]);

  const parsedValue = digits.length > 0 ? Number(digits) * (isNegative && Number(digits) !== 0 ? -1 : 1) : null;

  const pushDigit = (d: string) => {
    if (revealed) return;
    setDigits((prev) => {
      if (prev.length >= 4) return prev;
      if (prev === '0') return d;
      return prev + d;
    });
  };

  const handleBackspace = () => {
    if (revealed) return;
    setDigits((prev) => prev.slice(0, -1));
  };

  const handleSubmit = () => {
    if (revealed || parsedValue === null) return;
    onSubmitAnswer(parsedValue);
  };

  useEffect(() => {
    if (revealed) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (/^[0-9]$/.test(e.key)) {
        e.preventDefault();
        pushDigit(e.key);
      } else if (e.key === '-') {
        e.preventDefault();
        setIsNegative(true);
      } else if (e.key === '+') {
        e.preventDefault();
        setIsNegative(false);
      } else if (e.key === 'Backspace') {
        e.preventDefault();
        handleBackspace();
      } else if (e.key === 'Enter' && parsedValue !== null) {
        e.preventDefault();
        onSubmitAnswer(parsedValue);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [revealed, parsedValue, question.id]);

  const displayStr = digits.length === 0 ? '?' : `${isNegative && digits !== '0' ? '-' : ''}${digits}`;
  const isCorrect = revealed && selectedAnswer === question.correctAnswer;

  return (
    <div className="space-y-4">
      {/* Mountain Camp Climber Progress */}
      <div className="rounded-2xl border-2 border-amber-200 bg-gradient-to-r from-amber-50 via-sky-50 to-indigo-50 p-4">
        <div className="flex items-center justify-between text-xs font-extrabold text-slate-700">
          <span className="inline-flex items-center gap-1.5 text-amber-800">
            <Mountain className="h-4 w-4 text-amber-600" />
            <span>Pendakian Pos {currentIdx + 1} / {totalQuestions}</span>
          </span>
          <span className="text-slate-500">Ketik angka atau gunakan papan tombol</span>
        </div>

        {/* Vault Display Screen */}
        <div
          className={`mt-3 flex items-center justify-between rounded-2xl border-3 px-5 py-4 ${
            revealed
              ? isCorrect
                ? 'border-emerald-500 bg-emerald-950 text-emerald-300'
                : 'border-rose-500 bg-rose-950 text-rose-200'
              : 'border-slate-700 bg-slate-900 text-amber-300'
          }`}
        >
          <div className="flex items-center gap-3">
            {revealed && isCorrect ? (
              <Unlock className="h-6 w-6 text-emerald-400" />
            ) : (
              <Lock className="h-6 w-6 text-amber-400" />
            )}
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Kode Brankas</p>
              <p className="font-mono-num text-3xl font-extrabold tracking-wider">
                {revealed ? selectedAnswer : displayStr}
              </p>
            </div>
          </div>

          {!revealed && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsNegative(false)}
                className={`min-h-[42px] rounded-xl border-2 px-3 py-1.5 text-xs font-extrabold transition-colors ${
                  !isNegative
                    ? 'border-blue-400 bg-blue-600 text-white'
                    : 'border-slate-600 bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                Positif (+)
              </button>
              <button
                type="button"
                onClick={() => setIsNegative(true)}
                className={`min-h-[42px] rounded-xl border-2 px-3 py-1.5 text-xs font-extrabold transition-colors ${
                  isNegative
                    ? 'border-red-400 bg-red-600 text-white'
                    : 'border-slate-600 bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                Negatif (−)
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Numeric Keypad */}
      {!revealed && (
        <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-6">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'].map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => pushDigit(d)}
              className="font-mono-num flex min-h-[52px] items-center justify-center rounded-xl border-2 border-slate-200 bg-white text-xl font-extrabold text-slate-900 shadow-[0_3px_0_#cbd5e1] hover:border-blue-400 hover:bg-blue-50 active:translate-y-0.5"
            >
              {d}
            </button>
          ))}
          <button
            type="button"
            onClick={handleBackspace}
            className="flex min-h-[52px] items-center justify-center gap-1 rounded-xl border-2 border-slate-200 bg-slate-100 text-sm font-extrabold text-slate-700 shadow-[0_3px_0_#cbd5e1] hover:bg-slate-200 active:translate-y-0.5"
          >
            <Delete className="h-4 w-4" />
            <span>Hapus</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setDigits('');
              setIsNegative(false);
            }}
            className="flex min-h-[52px] items-center justify-center rounded-xl border-2 border-slate-200 bg-slate-100 text-sm font-extrabold text-slate-700 shadow-[0_3px_0_#cbd5e1] hover:bg-slate-200 active:translate-y-0.5"
          >
            Ulang
          </button>
          <button
            type="button"
            disabled={parsedValue === null}
            onClick={handleSubmit}
            className="game-btn-orange col-span-3 flex min-h-[52px] items-center justify-center gap-2 rounded-2xl px-5 text-base font-extrabold disabled:opacity-50 sm:col-span-6"
          >
            <KeyRound className="h-5 w-5" />
            <span>Buka Brankas ({displayStr})</span>
          </button>
        </div>
      )}
    </div>
  );
};

/* =========================================================
   GAME 4: JEMBATAN KARGO LEMBAH (Drag & Drop Bridge Builder)
========================================================= */
const BridgeGameBoard: React.FC<MiniGameBoardProps> = ({
  question,
  studentAvatarId,
  revealed,
  selectedAnswer,
  onSubmitAnswer,
}) => {
  const [dragOverSlot, setDragOverSlot] = useState(false);

  const handleDragStart = (e: React.DragEvent, value: number) => {
    e.dataTransfer.setData('text/plain', String(value));
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOverSlot(false);
    if (revealed) return;
    const raw = e.dataTransfer.getData('text/plain');
    const num = Number(raw);
    if (Number.isInteger(num)) {
      onSubmitAnswer(num);
    }
  };

  const isCorrect = revealed && selectedAnswer === question.correctAnswer;

  return (
    <div className="space-y-5">
      {/* Canyon Bridge Scene */}
      <div className="relative overflow-hidden rounded-2xl border-2 border-sky-300 bg-gradient-to-b from-sky-100 via-sky-50 to-cyan-200 p-5">
        <div className="flex items-center justify-between text-xs font-extrabold text-sky-900">
          <span className="inline-flex items-center gap-1.5">
            <Backpack className="h-4 w-4 text-sky-700" />
            <span>Seret atau ketuk peti kargo untuk menutup celah jembatan!</span>
          </span>
        </div>

        {/* Bridge Graphic */}
        <div className="mt-6 grid grid-cols-3 items-center gap-2">
          {/* Left Cliff & Explorer */}
          <div className="flex items-center justify-end gap-2 rounded-l-xl border-b-4 border-amber-700 bg-amber-600/20 px-3 py-3">
            <img
              src={getAvatarImage(studentAvatarId)}
              alt="Penjelajah"
              referrerPolicy="no-referrer"
              className="h-11 w-11 rounded-xl border-2 border-white object-cover shadow"
            />
            <div className="hidden h-3 flex-1 rounded bg-amber-800 sm:block" />
          </div>

          {/* Target Bridge Drop Slot */}
          <div
            onDragOver={(e) => {
              e.preventDefault();
              if (!revealed) setDragOverSlot(true);
            }}
            onDragLeave={() => setDragOverSlot(false)}
            onDrop={handleDrop}
            className={`flex min-h-[76px] flex-col items-center justify-center rounded-2xl border-3 border-dashed px-3 py-2 text-center transition-all ${
              revealed
                ? isCorrect
                  ? 'border-emerald-600 bg-emerald-100 text-emerald-900'
                  : 'border-rose-500 bg-rose-100 text-rose-900'
                : dragOverSlot
                  ? 'scale-105 border-blue-600 bg-blue-100 text-blue-900'
                  : 'border-amber-500 bg-amber-50/90 text-amber-900'
            }`}
          >
            {revealed ? (
              <>
                <span className="text-[10px] font-bold uppercase">
                  {isCorrect ? 'Jembatan Kokoh!' : 'Celah Belum Pas'}
                </span>
                <span className="font-mono-num text-2xl font-extrabold">{selectedAnswer}</span>
              </>
            ) : (
              <>
                <span className="text-[11px] font-extrabold uppercase tracking-wide">Papan Kosong</span>
                <span className="text-xs font-semibold text-amber-700">Lepas peti di sini</span>
              </>
            )}
          </div>

          {/* Right Cliff */}
          <div className="flex items-center justify-start gap-2 rounded-r-xl border-b-4 border-amber-700 bg-amber-600/20 px-3 py-3">
            <div className="hidden h-3 flex-1 rounded bg-amber-800 sm:block" />
            <span className="rounded-xl bg-emerald-600 px-2.5 py-1 text-xs font-extrabold text-white shadow">
              Tujuan
            </span>
          </div>
        </div>

        {/* Rushing River Band */}
        <div className="mt-3 h-3 w-full rounded-full bg-gradient-to-r from-cyan-400 via-sky-500 to-cyan-400 opacity-75" />
      </div>

      {/* Cargo Crates */}
      <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-4">
        {question.options.map((opt, idx) => {
          const isChosen = selectedAnswer === opt;
          const isAnswer = opt === question.correctAnswer;

          let crateClass =
            'border-amber-400 bg-gradient-to-b from-amber-100 to-amber-200 text-amber-950 shadow-[0_4px_0_#b45309] hover:-translate-y-0.5 hover:border-blue-600 cursor-grab active:cursor-grabbing';
          if (revealed) {
            if (isAnswer) {
              crateClass = 'border-emerald-600 bg-emerald-100 text-emerald-950 shadow-[0_4px_0_#047857]';
            } else if (isChosen) {
              crateClass = 'border-rose-500 bg-rose-100 text-rose-950 shadow-[0_4px_0_#be123c]';
            } else {
              crateClass = 'border-slate-200 bg-slate-100 text-slate-400 opacity-60';
            }
          }

          return (
            <button
              key={opt}
              type="button"
              draggable={!revealed}
              disabled={revealed}
              onDragStart={(e) => handleDragStart(e, opt)}
              onClick={() => onSubmitAnswer(opt)}
              className={`flex min-h-[76px] flex-col items-center justify-center rounded-2xl border-2 px-4 py-3 transition-all ${crateClass}`}
            >
              <span className="text-[10px] font-extrabold uppercase tracking-wider opacity-75">
                Peti {['A', 'B', 'C', 'D'][idx]}
              </span>
              <span className="font-mono-num text-2xl font-extrabold">{opt}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

/* =========================================================
   GAME 5: MERIAM PERTAHANAN KASTEL (Castle Defense Turrets)
========================================================= */
const CastleGameBoard: React.FC<MiniGameBoardProps> = ({
  question,
  revealed,
  selectedAnswer,
  currentIdx,
  totalQuestions,
  onSubmitAnswer,
}) => {
  const [showRadar, setShowRadar] = useState(false);

  useEffect(() => {
    setShowRadar(false);
  }, [question.id]);

  const enemyDistancePct = Math.min(82, 22 + ((currentIdx + 1) / Math.max(totalQuestions, 1)) * 55);
  const isCorrect = revealed && selectedAnswer === question.correctAnswer;

  return (
    <div className="space-y-4">
      <div className="relative overflow-hidden rounded-2xl border-2 border-orange-300 bg-gradient-to-b from-slate-800 via-slate-900 to-orange-950 p-5 text-white">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="inline-flex items-center gap-1.5 text-xs font-extrabold text-orange-300">
            <Castle className="h-4 w-4" />
            <span>Gelombang Pertahanan {currentIdx + 1}/{totalQuestions}</span>
          </span>
          <button
            type="button"
            onClick={() => setShowRadar((r) => !r)}
            className="inline-flex items-center gap-1.5 rounded-xl border border-amber-400/60 bg-amber-500/20 px-3 py-1.5 text-xs font-bold text-amber-200 hover:bg-amber-500/30"
          >
            <Radar className="h-3.5 w-3.5" />
            <span>{showRadar ? 'Tutup Radar Urutan' : 'Radar Urutan Operasi'}</span>
          </button>
        </div>

        {showRadar && (
          <div className="mt-3 rounded-xl border border-amber-300/40 bg-amber-950/70 px-3.5 py-2.5 text-xs font-semibold text-amber-100">
            {getOrderOfOperationsTip(question.prompt)}
          </div>
        )}

        {/* Battlefield Track */}
        <div className="mt-5 flex items-center justify-between gap-4 rounded-xl border border-slate-700 bg-slate-950/70 p-4">
          <div className="flex items-center gap-2 shrink-0">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-600 text-white shadow">
              <Castle className="h-6 w-6" />
            </div>
            <div className="hidden sm:block">
              <p className="text-[11px] font-bold text-blue-300">Bentengmu</p>
              <p className="text-xs font-extrabold text-white">Siap Tembak</p>
            </div>
          </div>

          <div className="relative h-3 flex-1 rounded-full bg-slate-800">
            <div
              className="absolute top-1/2 flex h-9 w-9 items-center justify-center rounded-full border-2 border-orange-400 bg-orange-600 text-white shadow transition-all duration-300"
              style={{ left: `${revealed && isCorrect ? 90 : enemyDistancePct}%`, transform: 'translate(-50%, -50%)' }}
            >
              {revealed && isCorrect ? <Zap className="h-4 w-4" /> : <ShieldAlert className="h-4 w-4" />}
            </div>
          </div>

          <div className="text-right shrink-0">
            <p className="text-[11px] font-bold text-orange-300">Target Perisai</p>
            <p className="text-xs font-extrabold text-white">Pilih Meriam!</p>
          </div>
        </div>
      </div>

      {/* 4 Cannon Turrets */}
      <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-4">
        {question.options.map((opt, idx) => {
          const isChosen = selectedAnswer === opt;
          const isAnswer = opt === question.correctAnswer;

          let turretClass =
            'border-slate-700 bg-slate-800 text-white shadow-[0_4px_0_#0f172a] hover:-translate-y-0.5 hover:border-orange-400 hover:bg-slate-700';
          if (revealed) {
            if (isAnswer) {
              turretClass = 'border-emerald-500 bg-emerald-600 text-white shadow-[0_4px_0_#047857]';
            } else if (isChosen) {
              turretClass = 'border-rose-500 bg-rose-600 text-white shadow-[0_4px_0_#9f1239]';
            } else {
              turretClass = 'border-slate-300 bg-slate-200 text-slate-500 opacity-65';
            }
          }

          return (
            <button
              key={opt}
              type="button"
              disabled={revealed}
              onClick={() => onSubmitAnswer(opt)}
              className={`flex min-h-[78px] flex-col items-center justify-center rounded-2xl border-2 px-4 py-3 transition-all ${turretClass}`}
            >
              <div className="flex items-center gap-1 text-[10px] font-extrabold uppercase tracking-wider text-orange-300">
                <Target className="h-3.5 w-3.5" />
                <span>Meriam {idx + 1}</span>
              </div>
              <span className="font-mono-num mt-0.5 text-2xl font-extrabold">{opt}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

/* =========================================================
   GAME 6: DUEL BOS MASTER INTEGER (Boss Battle Arena)
========================================================= */
const BossDuelGameBoard: React.FC<MiniGameBoardProps> = ({
  question,
  studentAvatarId,
  studentName,
  revealed,
  selectedAnswer,
  correctCountSoFar,
  wrongCountSoFar,
  totalQuestions,
  onSubmitAnswer,
}) => {
  const stepDamage = Math.round(100 / Math.max(totalQuestions, 1));
  const bossHp = Math.max(0, 100 - correctCountSoFar * stepDamage);
  const playerHp = Math.max(10, 100 - wrongCountSoFar * stepDamage);
  const isCorrect = revealed && selectedAnswer === question.correctAnswer;

  return (
    <div className="space-y-4">
      {/* Sky Palace Boss Battle Arena */}
      <div className="relative overflow-hidden rounded-2xl border-2 border-indigo-400 bg-gradient-to-br from-indigo-950 via-purple-950 to-slate-900 p-5 text-white">
        <div className="grid grid-cols-1 items-center gap-4 sm:grid-cols-11">
          {/* Player Side */}
          <div className="sm:col-span-5 rounded-2xl border border-blue-400/40 bg-blue-950/60 p-3.5">
            <div className="flex items-center gap-3">
              <img
                src={getAvatarImage(studentAvatarId)}
                alt={studentName}
                referrerPolicy="no-referrer"
                className="h-12 w-12 rounded-xl border-2 border-amber-300 object-cover"
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-extrabold text-blue-200">{studentName}</p>
                <div className="mt-1 flex items-center justify-between text-[11px] font-bold">
                  <span className="text-emerald-300">HP Penjelajah</span>
                  <span className="font-mono-num text-white">{playerHp}/100</span>
                </div>
                <div className="mt-1 h-2.5 w-full overflow-hidden rounded-full bg-slate-800">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-cyan-400 transition-all duration-300"
                    style={{ width: `${playerHp}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* VS Emblem */}
          <div className="flex justify-center sm:col-span-1">
            <div className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-amber-300 bg-amber-500 text-xs font-extrabold text-slate-950 shadow">
              <Swords className="h-4 w-4" />
            </div>
          </div>

          {/* Boss Side */}
          <div className="sm:col-span-5 rounded-2xl border border-purple-400/40 bg-purple-950/60 p-3.5">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border-2 border-amber-400 bg-gradient-to-br from-amber-500 to-orange-600 text-white shadow">
                <Crown className="h-6 w-6" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-extrabold text-amber-300">Grandmaster Integer</p>
                <div className="mt-1 flex items-center justify-between text-[11px] font-bold">
                  <span className="text-rose-300">HP Bos</span>
                  <span className="font-mono-num text-white">{bossHp}/100</span>
                </div>
                <div className="mt-1 h-2.5 w-full overflow-hidden rounded-full bg-slate-800">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-rose-500 to-amber-500 transition-all duration-300"
                    style={{ width: `${bossHp}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {revealed && (
          <div
            className={`mt-3 flex items-center justify-center gap-2 rounded-xl px-3 py-2 text-xs font-extrabold ${
              isCorrect ? 'bg-emerald-500/25 text-emerald-200' : 'bg-rose-500/25 text-rose-200'
            }`}
          >
            <Flame className="h-4 w-4" />
            <span>
              {isCorrect
                ? `Serangan Telak! HP Bos berkurang -${stepDamage}!`
                : `Bos Menangkis! Pelajari trik di bawah untuk serangan berikutnya.`}
            </span>
          </div>
        )}
      </div>

      {/* 4 Royal Spell Cards */}
      <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-4">
        {question.options.map((opt, idx) => {
          const isChosen = selectedAnswer === opt;
          const isAnswer = opt === question.correctAnswer;

          let cardClass =
            'border-indigo-300 bg-gradient-to-b from-white to-indigo-50 text-indigo-950 shadow-[0_4px_0_#6366f1] hover:-translate-y-1 hover:border-amber-500';
          if (revealed) {
            if (isAnswer) {
              cardClass = 'border-emerald-500 bg-emerald-50 text-emerald-900 shadow-[0_4px_0_#10b981]';
            } else if (isChosen) {
              cardClass = 'border-rose-500 bg-rose-50 text-rose-900 shadow-[0_4px_0_#f43f5e]';
            } else {
              cardClass = 'border-slate-200 bg-slate-100 text-slate-400 opacity-65';
            }
          }

          return (
            <button
              key={opt}
              type="button"
              disabled={revealed}
              onClick={() => onSubmitAnswer(opt)}
              className={`flex min-h-[86px] flex-col items-center justify-center rounded-2xl border-2 px-4 py-3 transition-all ${cardClass}`}
            >
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-indigo-600">
                Kartu Jurus {['I', 'II', 'III', 'IV'][idx]}
              </span>
              <span className="font-mono-num mt-1 text-2xl font-extrabold">{opt}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export const MiniGameBoard: React.FC<MiniGameBoardProps> = (props) => {
  switch (props.gameType) {
    case 'jumper':
      return <JumperGameBoard {...props} />;
    case 'lantern':
      return <LanternGameBoard {...props} />;
    case 'safecracker':
      return <SafeCrackerGameBoard {...props} />;
    case 'bridge':
      return <BridgeGameBoard {...props} />;
    case 'castle':
      return <CastleGameBoard {...props} />;
    case 'boss':
      return <BossDuelGameBoard {...props} />;
  }
};
