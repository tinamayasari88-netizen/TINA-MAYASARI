import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Anchor,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  Award,
  CheckCircle2,
  FlaskConical,
  Heart,
  Package,
  Rocket,
  RotateCcw,
  ShieldAlert,
  Sparkles,
  Star,
  Target,
  Trash2,
  Trophy,
  Undo2,
  Volume2,
  VolumeX,
  Waves,
  Zap,
} from 'lucide-react';
import { getAvatarImage } from '../shared/levels';
import {
  getSoundMuted,
  playCorrectSound,
  playVictorySound,
  playWrongSound,
  setSoundMuted,
} from '../utils/sound';

export type ArcadeMissionId = 'submarine' | 'courier' | 'potion' | 'asteroid';

export interface ArcadeMissionMeta {
  id: ArcadeMissionId;
  title: string;
  subtitle: string;
  missionSummary: string;
  controlsHint: string;
  badgeBg: string;
  accentText: string;
  stagesLabel: string;
}

export const ARCADE_MISSIONS: ArcadeMissionMeta[] = [
  {
    id: 'submarine',
    title: 'Kapal Selam Harta Karun',
    subtitle: 'Navigasi Kedalaman Laut Negatif',
    missionSummary:
      'Kemudikan kapal selam naik-turun menggunakan kartu manuver & sonar untuk mengambil semua peti harta karun tanpa menabrak ranjau laut.',
    controlsHint: 'Pilih kartu manuver · Gunakan Sonar (±1 m) · Hindari ranjau',
    badgeBg: 'bg-cyan-600',
    accentText: 'text-cyan-700',
    stagesLabel: '3 Zona Samudra',
  },
  {
    id: 'courier',
    title: 'Kurir Kota Nol',
    subtitle: 'Teka-teki Labirin Keseimbangan Energi',
    missionSummary:
      'Susun rute kurir melewati papan grid 5×5, kumpulkan bintang emas, dan pastikan muatan energi tepat bernilai 0 saat tiba di gerbang tujuan!',
    controlsHint: 'Klik petak tetangga atau tombol panah ↑ ↓ ← → · Undo tersedia',
    badgeBg: 'bg-emerald-600',
    accentText: 'text-emerald-700',
    stagesLabel: '5 Peta Teka-teki',
  },
  {
    id: 'potion',
    title: 'Lab Ramuan Ajaib',
    subtitle: 'Meracik Suhu Kuali Bilangan Bulat',
    missionSummary:
      'Campurkan kristal es, bara api, dan katalis pengali ke dalam kuali agar suhu ramuan tepat sesuai pesanan pelanggan sebelum kesabaran habis!',
    controlsHint: 'Campur beberapa bahan · Cek riwayat suhu · Sajikan Ramuan',
    badgeBg: 'bg-purple-600',
    accentText: 'text-purple-700',
    stagesLabel: '5 Pesanan Pelanggan',
  },
  {
    id: 'asteroid',
    title: 'Komandan Perisai Meteor',
    subtitle: 'Pertahanan Real-Time Menara Angkasa',
    missionSummary:
      'Meteor bermuatan bilangan bulat jatuh mendekati kota! Rakit 2 kristal energi dan operator untuk mengunci target lalu tembak laser pertahanan.',
    controlsHint: 'Pilih Kristal 1 + Operator + Kristal 2 · Tembak (Enter/Spasi)',
    badgeBg: 'bg-orange-600',
    accentText: 'text-orange-700',
    stagesLabel: '3 Gelombang Meteor',
  },
];

export interface ArcadeScoreUpdate {
  missionId: ArcadeMissionId;
  score: number;
  stars: number;
  won: boolean;
}

interface ArcadeGameCommonProps {
  studentName: string;
  studentAvatarId: string;
  onExit: () => void;
  onSaveProgress: (update: ArcadeScoreUpdate) => void;
}

/* ============================================================================
   SHARED ARCADE HEADER & END SCREEN MODAL
============================================================================ */
const ArcadeTopBar: React.FC<{
  title: string;
  badgeBg: string;
  icon: React.ReactNode;
  score: number;
  lives?: number;
  maxLives?: number;
  stageLabel: string;
  onExit: () => void;
}> = ({ title, badgeBg, icon, score, lives, maxLives = 3, stageLabel, onExit }) => {
  const [muted, setMuted] = useState(getSoundMuted());

  const handleToggle = () => {
    const next = !muted;
    setMuted(next);
    setSoundMuted(next);
  };

  return (
    <header className="sticky top-0 z-30 border-b-2 border-slate-200/80 bg-white/95 backdrop-blur-sm">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={onExit}
            className="game-btn-back inline-flex h-10 items-center gap-1.5 rounded-xl px-3.5 text-xs font-extrabold whitespace-nowrap shrink-0 sm:text-sm"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Kembali</span>
          </button>
          <div className="flex items-center gap-2.5 min-w-0">
            <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-white ${badgeBg}`}>
              {icon}
            </span>
            <div className="min-w-0">
              <h1 className="font-display truncate text-sm font-extrabold text-slate-900 sm:text-base">{title}</h1>
              <p className="text-[11px] font-bold text-slate-500 truncate">{stageLabel}</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {typeof lives === 'number' && (
            <div
              className="flex items-center gap-1 rounded-xl border-2 border-rose-200 bg-rose-50 px-2.5 py-1.5"
              aria-label={`${lives} dari ${maxLives} nyawa`}
            >
              {Array.from({ length: maxLives }, (_, i) => (
                <Heart
                  key={i}
                  className={`h-4 w-4 ${i < lives ? 'fill-rose-500 text-rose-500' : 'text-rose-200'}`}
                />
              ))}
            </div>
          )}

          <div className="flex items-center gap-1.5 rounded-xl border-2 border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-extrabold text-amber-800">
            <Trophy className="h-4 w-4 text-amber-500" />
            <span className="font-mono-num">{score}</span>
          </div>

          <button
            type="button"
            onClick={handleToggle}
            title={muted ? 'Nyalakan Suara' : 'Matikan Suara'}
            className="game-btn-back flex h-10 w-10 items-center justify-center rounded-xl text-slate-700"
          >
            {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
          </button>
        </div>
      </div>
    </header>
  );
};

const ArcadeEndCard: React.FC<{
  won: boolean;
  title: string;
  subtitle: string;
  score: number;
  stars: number;
  stats: { label: string; value: string }[];
  onReplay: () => void;
  onExit: () => void;
}> = ({ won, title, subtitle, score, stars, stats, onReplay, onExit }) => (
  <div className="mx-auto max-w-xl px-4 py-10">
    <div className="game-card p-6 text-center sm:p-8">
      <div
        className={`mx-auto flex h-16 w-16 items-center justify-center rounded-2xl text-white shadow-md ${
          won ? 'bg-gradient-to-br from-emerald-500 to-teal-600' : 'bg-gradient-to-br from-rose-500 to-orange-600'
        }`}
      >
        {won ? <Award className="h-8 w-8" /> : <ShieldAlert className="h-8 w-8" />}
      </div>

      <h2 className="font-display mt-4 text-2xl font-extrabold text-slate-900">{title}</h2>
      <p className="mt-1 text-sm text-slate-600">{subtitle}</p>

      <div className="mt-5 flex items-center justify-center gap-2">
        {[1, 2, 3].map((s) => (
          <Star
            key={s}
            className={`h-9 w-9 ${s <= stars ? 'fill-amber-400 text-amber-500' : 'text-slate-200'}`}
          />
        ))}
      </div>

      <div className="mt-5 grid grid-cols-3 gap-3 rounded-2xl border-2 border-slate-100 bg-slate-50 p-4">
        <div>
          <p className="text-[11px] font-bold text-slate-500">Skor Akhir</p>
          <p className="font-mono-num mt-0.5 text-xl font-extrabold text-blue-700">{score}</p>
        </div>
        {stats.map((st) => (
          <div key={st.label}>
            <p className="text-[11px] font-bold text-slate-500">{st.label}</p>
            <p className="font-mono-num mt-0.5 text-xl font-extrabold text-slate-900">{st.value}</p>
          </div>
        ))}
      </div>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <button
          type="button"
          onClick={onReplay}
          className="game-btn-orange flex min-h-[48px] flex-1 items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-sm font-extrabold"
        >
          <RotateCcw className="h-4 w-4" />
          <span>Main Lagi</span>
        </button>
        <button
          type="button"
          onClick={onExit}
          className="game-btn-back flex min-h-[48px] flex-1 items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-sm font-extrabold text-slate-800"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Kembali ke Arena Arcade</span>
        </button>
      </div>
    </div>
  </div>
);

/* ============================================================================
   ARCADE GAME 1: KAPAL SELAM HARTA KARUN (Submarine Depth Explorer)
============================================================================ */
interface SubCard {
  id: string;
  op: '+' | '×';
  val: number;
  label: string;
}

interface SubZoneConfig {
  name: string;
  minDepth: number;
  maxDepth: number;
  chestsNeeded: number;
  startFuel: number;
  mineCount: number;
}

const SUB_ZONES: SubZoneConfig[] = [
  { name: 'Zona 1: Laut Terumbu', minDepth: -20, maxDepth: 0, chestsNeeded: 4, startFuel: 11, mineCount: 1 },
  { name: 'Zona 2: Palung Biru', minDepth: -35, maxDepth: 0, chestsNeeded: 5, startFuel: 13, mineCount: 2 },
  { name: 'Zona 3: Dasar Samudra', minDepth: -45, maxDepth: 5, chestsNeeded: 5, startFuel: 14, mineCount: 2 },
];

function makeSubCard(op: '+' | '×', val: number): SubCard {
  const label = op === '+' ? (val >= 0 ? `Naik +${val} m` : `Selam ${val} m`) : `Kali ×${val}`;
  return {
    id: `${op}_${val}_${Math.random().toString(36).slice(2, 7)}`,
    op,
    val,
    label,
  };
}

function buildSubRound(
  currentDepth: number,
  zone: SubZoneConfig
): { target: number; mines: number[]; hand: SubCard[] } {
  const span = zone.maxDepth - zone.minDepth;
  let target = currentDepth;
  for (let tries = 0; tries < 25; tries++) {
    const candidate = zone.minDepth + Math.floor(Math.random() * (span + 1));
    if (candidate !== currentDepth && Math.abs(candidate - currentDepth) >= 3) {
      target = candidate;
      break;
    }
  }
  if (target === currentDepth) {
    target = currentDepth > zone.minDepth + 6 ? currentDepth - 6 : currentDepth + 6;
  }

  const mines: number[] = [];
  for (let tries = 0; tries < 40 && mines.length < zone.mineCount; tries++) {
    const m = zone.minDepth + Math.floor(Math.random() * (span + 1));
    if (m !== currentDepth && m !== target && !mines.includes(m)) {
      mines.push(m);
    }
  }

  // Guarantee 1-step or 2-step solution in hand
  const diff = target - currentDepth;
  const requiredCards: SubCard[] = [];
  if (Math.abs(diff) <= 12) {
    requiredCards.push(makeSubCard('+', diff));
  } else {
    const first = diff > 0 ? Math.min(10, Math.floor(diff / 2)) : Math.max(-10, Math.ceil(diff / 2));
    const second = diff - first;
    requiredCards.push(makeSubCard('+', first));
    requiredCards.push(makeSubCard('+', second));
  }

  const distractors = [-9, -6, -4, -3, 2, 4, 6, 8];
  while (requiredCards.length < 4) {
    if (requiredCards.length === 3 && Math.random() < 0.35 && currentDepth !== 0) {
      const mul = Math.random() < 0.5 ? -1 : 2;
      requiredCards.push(makeSubCard('×', mul));
    } else {
      const d = distractors[Math.floor(Math.random() * distractors.length)];
      if (!requiredCards.some((c) => c.op === '+' && c.val === d)) {
        requiredCards.push(makeSubCard('+', d));
      }
    }
  }

  // Shuffle cards cleanly
  for (let i = requiredCards.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [requiredCards[i], requiredCards[j]] = [requiredCards[j], requiredCards[i]];
  }

  return { target, mines, hand: requiredCards };
}

const SubmarineMissionGame: React.FC<ArcadeGameCommonProps> = ({
  studentAvatarId,
  onExit,
  onSaveProgress,
}) => {
  const [zoneIdx, setZoneIdx] = useState(0);
  const [depth, setDepth] = useState(0);
  const [targetDepth, setTargetDepth] = useState(-7);
  const [mines, setMines] = useState<number[]>([-4]);
  const [hand, setHand] = useState<SubCard[]>([]);
  const [chestsInZone, setChestsInZone] = useState(0);
  const [totalChests, setTotalChests] = useState(0);
  const [fuel, setFuel] = useState(SUB_ZONES[0].startFuel);
  const [sonarLeft, setSonarLeft] = useState(3);
  const [lives, setLives] = useState(3);
  const [score, setScore] = useState(0);
  const [feedback, setFeedback] = useState<{ type: 'ok' | 'warn' | 'info'; text: string }>({
    type: 'info',
    text: 'Pilih kartu manuver untuk menuju kedalaman Peti Harta!',
  });
  const [phase, setPhase] = useState<'playing' | 'won' | 'lost'>('playing');

  const zone = SUB_ZONES[zoneIdx];

  const initZone = (idx: number, resetScore = false) => {
    const z = SUB_ZONES[idx];
    const startDepth = 0;
    const round = buildSubRound(startDepth, z);
    setZoneIdx(idx);
    setDepth(startDepth);
    setTargetDepth(round.target);
    setMines(round.mines);
    setHand(round.hand);
    setChestsInZone(0);
    setFuel(z.startFuel);
    setSonarLeft(3);
    if (resetScore) {
      setTotalChests(0);
      setLives(3);
      setScore(0);
      setPhase('playing');
    }
    setFeedback({
      type: 'info',
      text: `${z.name}: Kumpulkan ${z.chestsNeeded} peti harta karun!`,
    });
  };

  useEffect(() => {
    initZone(0, true);
  }, []);

  const finishGame = (won: boolean, finalScore: number, chestsFinal: number, livesFinal: number) => {
    setPhase(won ? 'won' : 'lost');
    const stars = won ? (livesFinal >= 3 ? 3 : livesFinal === 2 ? 2 : 1) : chestsFinal >= 5 ? 1 : 0;
    if (won) playVictorySound();
    else playWrongSound();
    onSaveProgress({ missionId: 'submarine', score: finalScore, stars, won });
  };

  const applyDepthMove = (nextDepthRaw: number, usedCardIdx: number | null, fuelCost: number) => {
    if (phase !== 'playing') return;

    const clamped = Math.max(zone.minDepth, Math.min(zone.maxDepth, nextDepthRaw));
    const bounced = clamped !== nextDepthRaw;

    if (mines.includes(clamped)) {
      playWrongSound();
      const nextLives = lives - 1;
      const nextFuel = fuel - fuelCost;
      setLives(nextLives);
      setFuel(nextFuel);
      setDepth(clamped);
      setFeedback({
        type: 'warn',
        text: `Duar! Kapal menyentuh ranjau di ${clamped} m (-1 Nyawa).`,
      });
      if (nextLives <= 0 || nextFuel <= 0) {
        finishGame(false, score, totalChests, Math.max(0, nextLives));
        return;
      }
      if (usedCardIdx !== null) {
        replaceSubCard(usedCardIdx, clamped);
      }
      return;
    }

    if (clamped === targetDepth) {
      playCorrectSound();
      const nextChestsInZone = chestsInZone + 1;
      const nextTotalChests = totalChests + 1;
      const nextScore = score + 150 + zoneIdx * 50;
      const nextFuel = Math.min(zone.startFuel + 3, fuel - fuelCost + 2);
      setTotalChests(nextTotalChests);
      setScore(nextScore);

      if (nextChestsInZone >= zone.chestsNeeded) {
        if (zoneIdx + 1 < SUB_ZONES.length) {
          const nextZoneIdx = zoneIdx + 1;
          const nextZone = SUB_ZONES[nextZoneIdx];
          const nextRound = buildSubRound(0, nextZone);
          setZoneIdx(nextZoneIdx);
          setDepth(0);
          setTargetDepth(nextRound.target);
          setMines(nextRound.mines);
          setHand(nextRound.hand);
          setChestsInZone(0);
          setFuel(nextZone.startFuel);
          setSonarLeft(3);
          setFeedback({
            type: 'ok',
            text: `Zona ${zoneIdx + 1} Tuntas! Menyelam menuju ${nextZone.name}!`,
          });
        } else {
          setDepth(clamped);
          setChestsInZone(nextChestsInZone);
          const bonus = lives * 100 + nextFuel * 20;
          const finalScore = nextScore + bonus;
          setScore(finalScore);
          finishGame(true, finalScore, nextTotalChests, lives);
        }
        return;
      }

      const nextRound = buildSubRound(clamped, zone);
      setDepth(clamped);
      setTargetDepth(nextRound.target);
      setMines(nextRound.mines);
      setHand(nextRound.hand);
      setChestsInZone(nextChestsInZone);
      setFuel(nextFuel);
      setFeedback({
        type: 'ok',
        text: `Harta ditemukan di ${clamped} m! (+${150 + zoneIdx * 50} skor, +2 bahan bakar)`,
      });
      return;
    }

    // Normal travel move
    const nextFuel = fuel - fuelCost;
    setDepth(clamped);
    setFuel(nextFuel);
    if (nextFuel <= 0) {
      finishGame(false, score, totalChests, lives);
      return;
    }

    setFeedback({
      type: bounced ? 'warn' : 'info',
      text: bounced
        ? `Batas zona laut tercapai (${clamped} m). Peti masih di ${targetDepth} m.`
        : `Kapal berada di ${clamped} m. Target Peti berada di ${targetDepth} m.`,
    });

    if (usedCardIdx !== null) {
      replaceSubCard(usedCardIdx, clamped);
    }
  };

  const replaceSubCard = (cardIdx: number, currentD: number) => {
    setHand((prev) => {
      const next = [...prev];
      const diff = targetDepth - currentD;
      const otherReachable = next.some(
        (c, i) => i !== cardIdx && (c.op === '+' ? currentD + c.val === targetDepth : currentD * c.val === targetDepth)
      );
      if (!otherReachable && Math.abs(diff) <= 12 && diff !== 0) {
        next[cardIdx] = makeSubCard('+', diff);
      } else {
        const pool = [-8, -5, -3, -2, 2, 3, 5, 7];
        const v = pool[Math.floor(Math.random() * pool.length)];
        next[cardIdx] = makeSubCard('+', v);
      }
      return next;
    });
  };

  const handlePlayCard = (card: SubCard, idx: number) => {
    const nextDepth = card.op === '+' ? depth + card.val : depth * card.val;
    applyDepthMove(nextDepth, idx, 1);
  };

  const handleSonarNudge = (delta: number) => {
    if (sonarLeft <= 0 || phase !== 'playing') return;
    setSonarLeft((s) => s - 1);
    applyDepthMove(depth + delta, null, 0);
  };

  const toPct = (d: number) => {
    const span = Math.max(1, zone.maxDepth - zone.minDepth);
    return ((zone.maxDepth - d) / span) * 100;
  };

  if (phase !== 'playing') {
    const won = phase === 'won';
    const stars = won ? (lives >= 3 ? 3 : lives === 2 ? 2 : 1) : totalChests >= 5 ? 1 : 0;
    return (
      <div className="game-canvas min-h-screen">
        <ArcadeTopBar
          title="Kapal Selam Harta Karun"
          badgeBg="bg-cyan-600"
          icon={<Anchor className="h-5 w-5" />}
          score={score}
          lives={lives}
          stageLabel={zone.name}
          onExit={onExit}
        />
        <ArcadeEndCard
          won={won}
          title={won ? 'Misi Samudra Berhasil!' : 'Bahan Bakar atau Lambung Habis!'}
          subtitle={
            won
              ? 'Semua peti harta karun dasar laut berhasil diangkat dengan selamat.'
              : 'Atur strategi kartu selam lebih cermat untuk menghindari ranjau.'
          }
          score={score}
          stars={stars}
          stats={[
            { label: 'Peti Terkumpul', value: `${totalChests}/14` },
            { label: 'Zona Dicapai', value: `${zoneIdx + 1}/3` },
          ]}
          onReplay={() => initZone(0, true)}
          onExit={onExit}
        />
      </div>
    );
  }

  return (
    <div className="game-canvas min-h-screen pb-10">
      <ArcadeTopBar
        title="Kapal Selam Harta Karun"
        badgeBg="bg-cyan-600"
        icon={<Anchor className="h-5 w-5" />}
        score={score}
        lives={lives}
        stageLabel={`${zone.name} · Peti ${chestsInZone}/${zone.chestsNeeded}`}
        onExit={onExit}
      />

      <main className="mx-auto max-w-5xl px-4 pt-6 sm:px-6">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* Left: Ocean Depth Radar Column */}
          <div className="game-card overflow-hidden p-5 lg:col-span-5">
            <div className="flex items-center justify-between text-xs font-extrabold text-slate-700">
              <span>Radar Kedalaman ({zone.minDepth} m s/d {zone.maxDepth} m)</span>
              <span className="font-mono-num text-cyan-700">Posisi: {depth} m</span>
            </div>

            <div className="relative mt-4 h-[330px] overflow-hidden rounded-2xl border-2 border-cyan-800 bg-gradient-to-b from-sky-400 via-cyan-700 to-slate-950 p-4 text-white">
              {/* Surface line */}
              <div className="flex items-center justify-between text-[11px] font-bold text-cyan-100 opacity-85">
                <span className="inline-flex items-center gap-1">
                  <Waves className="h-3.5 w-3.5" /> Atas ({zone.maxDepth} m)
                </span>
                <span>0 m = Permukaan</span>
              </div>

              {/* Mines */}
              {mines.map((m) => (
                <div
                  key={m}
                  className="absolute right-4 flex items-center gap-1.5 rounded-xl border border-rose-400/70 bg-rose-900/90 px-2.5 py-1 text-xs font-extrabold text-rose-100 shadow transition-all"
                  style={{ top: `${Math.min(86, Math.max(10, toPct(m)))}%`, transform: 'translateY(-50%)' }}
                >
                  <ShieldAlert className="h-3.5 w-3.5 text-rose-300" />
                  <span className="font-mono-num">Ranjau {m} m</span>
                </div>
              ))}

              {/* Target Treasure */}
              <div
                className="absolute right-4 flex items-center gap-1.5 rounded-xl border-2 border-amber-300 bg-amber-500 px-3 py-1.5 text-xs font-extrabold text-slate-950 shadow-md transition-all"
                style={{ top: `${Math.min(86, Math.max(10, toPct(targetDepth)))}%`, transform: 'translateY(-50%)' }}
              >
                <Sparkles className="h-3.5 w-3.5" />
                <span className="font-mono-num">Peti {targetDepth} m</span>
              </div>

              {/* Player Submarine */}
              <div
                className="absolute left-4 flex items-center gap-2 rounded-2xl border-2 border-white bg-blue-600 px-3 py-1.5 text-xs font-extrabold text-white shadow-lg transition-all duration-300"
                style={{ top: `${Math.min(86, Math.max(10, toPct(depth)))}%`, transform: 'translateY(-50%)' }}
              >
                <img
                  src={getAvatarImage(studentAvatarId)}
                  alt="Kapten"
                  referrerPolicy="no-referrer"
                  className="h-6 w-6 rounded-lg object-cover"
                />
                <span className="font-mono-num">{depth} m</span>
              </div>
            </div>
          </div>

          {/* Right: Mission Briefing & Maneuver Deck */}
          <div className="space-y-5 lg:col-span-7">
            <div className="game-card p-5">
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <p className="text-[11px] font-bold text-slate-500">Kedalaman Saat Ini</p>
                  <p className="font-mono-num mt-0.5 text-2xl font-extrabold text-blue-700">{depth} m</p>
                </div>
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-3">
                  <p className="text-[11px] font-bold text-amber-800">Target Peti Harta</p>
                  <p className="font-mono-num mt-0.5 text-2xl font-extrabold text-amber-700">{targetDepth} m</p>
                </div>
                <div className="rounded-xl border border-cyan-200 bg-cyan-50 p-3">
                  <p className="text-[11px] font-bold text-cyan-800">Sisa Bahan Bakar</p>
                  <p className="font-mono-num mt-0.5 text-2xl font-extrabold text-cyan-700">{fuel}</p>
                </div>
              </div>

              <div
                className={`mt-4 rounded-xl border px-4 py-3 text-xs font-bold ${
                  feedback.type === 'ok'
                    ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
                    : feedback.type === 'warn'
                      ? 'border-rose-200 bg-rose-50 text-rose-900'
                      : 'border-sky-200 bg-sky-50 text-sky-900'
                }`}
              >
                {feedback.text}
              </div>
            </div>

            <div className="game-card p-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h2 className="font-display text-base font-extrabold text-slate-900">Kartu Manuver Kapal Selam</h2>
                  <p className="text-xs text-slate-500">Pilih kartu untuk menggerakkan kapal dari {depth} m menuju {targetDepth} m</p>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3">
                {hand.map((card, idx) => {
                  const preview = card.op === '+' ? depth + card.val : depth * card.val;
                  return (
                    <button
                      key={card.id}
                      type="button"
                      onClick={() => handlePlayCard(card, idx)}
                      className="flex min-h-[76px] flex-col items-start justify-between rounded-2xl border-2 border-slate-200 bg-white px-4 py-3 text-left shadow-[0_3px_0_#cbd5e1] transition-all hover:-translate-y-0.5 hover:border-cyan-500 hover:bg-cyan-50/50 active:translate-y-0"
                    >
                      <span className="text-[11px] font-bold text-slate-500">
                        Menuju <span className="font-mono-num font-extrabold text-slate-800">{preview} m</span>
                      </span>
                      <span className="font-mono-num text-lg font-extrabold text-cyan-800">{card.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* Emergency Fine-Tune Thrusters */}
              <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
                <span className="text-xs font-bold text-slate-600">
                  Sonar Penstabil (±1 m gratis bahan bakar, sisa {sonarLeft}x):
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={sonarLeft <= 0}
                    onClick={() => handleSonarNudge(-1)}
                    className="font-mono-num min-h-[40px] rounded-xl border-2 border-slate-200 bg-slate-50 px-3.5 py-1.5 text-xs font-extrabold text-slate-800 hover:border-blue-400 hover:bg-blue-50 disabled:opacity-40"
                  >
                    Turun -1 m
                  </button>
                  <button
                    type="button"
                    disabled={sonarLeft <= 0}
                    onClick={() => handleSonarNudge(1)}
                    className="font-mono-num min-h-[40px] rounded-xl border-2 border-slate-200 bg-slate-50 px-3.5 py-1.5 text-xs font-extrabold text-slate-800 hover:border-blue-400 hover:bg-blue-50 disabled:opacity-40"
                  >
                    Naik +1 m
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

/* ============================================================================
   ARCADE GAME 2: KURIR KOTA NOL (Zero-Balance Courier Maze)
============================================================================ */
interface MazeTile {
  kind: 'start' | 'goal' | 'wall' | 'mod' | 'floor';
  op?: '+' | '×';
  val?: number;
  label?: string;
  star?: boolean;
}

interface MazeLevelSpec {
  title: string;
  hint: string;
  start: [number, number];
  goal: [number, number];
  initEnergy: number;
  parMoves: number;
  grid: MazeTile[][];
}

const mMod = (op: '+' | '×', val: number, label: string, star = false): MazeTile => ({
  kind: 'mod',
  op,
  val,
  label,
  star,
});
const mFloor = (star = false): MazeTile => ({ kind: 'floor', star });
const mWall = (): MazeTile => ({ kind: 'wall' });

const MAZE_LEVELS: MazeLevelSpec[] = [
  {
    title: 'Peta 1: Gerbang Keseimbangan',
    hint: 'Mulai dengan energi +4. Kumpulkan Bintang dan tiba di Finish dengan energi tepat 0.',
    start: [4, 0],
    goal: [0, 4],
    initEnergy: 4,
    parMoves: 9,
    grid: [
      [mWall(), mFloor(), mMod('+', -3, '-3'), mFloor(), { kind: 'goal' }],
      [mWall(), mMod('+', 6, '+6'), mFloor(true), mMod('+', -6, '-6'), mFloor()],
      [mMod('+', 3, '+3'), mMod('+', -5, '-5'), mMod('+', 2, '+2'), mWall(), mMod('+', 4, '+4')],
      [mMod('+', -2, '-2'), mWall(), mWall(), mMod('+', -4, '-4'), mFloor()],
      [{ kind: 'start' }, mFloor(), mMod('+', 5, '+5'), mFloor(), mFloor()],
    ],
  },
  {
    title: 'Peta 2: Membalik Kutub Energi',
    hint: 'Energi awalmu -5! Gunakan petak ×(-1) untuk membalik tanda bilangan bulat.',
    start: [4, 0],
    goal: [0, 4],
    initEnergy: -5,
    parMoves: 9,
    grid: [
      [mWall(), mMod('+', 2, '+2'), mFloor(), mFloor(), { kind: 'goal' }],
      [mFloor(), mFloor(), mMod('+', -7, '-7'), mFloor(), mWall()],
      [mWall(), mMod('×', -1, '×(-1)'), mMod('+', 4, '+4', true), mMod('+', -3, '-3'), mFloor()],
      [mWall(), mMod('+', -6, '-6'), mWall(), mMod('+', 5, '+5'), mFloor()],
      [{ kind: 'start' }, mMod('+', 8, '+8'), mFloor(), mWall(), mFloor()],
    ],
  },
  {
    title: 'Peta 3: Pengganda Kota Barat',
    hint: 'Manfaatkan petak ×2 dan Bintang di jalur utara agar energi kembali nol di timur!',
    start: [2, 0],
    goal: [2, 4],
    initEnergy: 3,
    parMoves: 9,
    grid: [
      [mFloor(), mMod('+', 7, '+7', true), mMod('+', -3, '-3'), mMod('+', 5, '+5'), mWall()],
      [mMod('×', 2, '×2'), mMod('+', -10, '-10'), mWall(), mMod('+', -5, '-5'), mFloor()],
      [{ kind: 'start' }, mFloor(), mMod('×', -1, '×(-1)'), mWall(), { kind: 'goal' }],
      [mMod('+', -3, '-3'), mMod('+', 4, '+4'), mFloor(), mMod('+', -2, '-2'), mFloor()],
      [mWall(), mMod('+', -4, '-4'), mMod('+', 2, '+2'), mFloor(), mWall()],
    ],
  },
  {
    title: 'Peta 4: Terowongan Pembalik Ganda',
    hint: 'Hati-hati dengan petak ×(-2)! Hitung perubahan energi sebelum melangkah.',
    start: [4, 2],
    goal: [0, 2],
    initEnergy: -6,
    parMoves: 7,
    grid: [
      [mWall(), mMod('+', -2, '-2'), { kind: 'goal' }, mFloor(), mWall()],
      [mFloor(), mMod('+', -3, '-3'), mFloor(), mMod('+', -4, '-4'), mFloor()],
      [mWall(), mMod('+', -5, '-5', true), mMod('+', 9, '+9'), mMod('+', 4, '+4'), mWall()],
      [mFloor(), mMod('×', -2, '×(-2)'), mMod('+', 2, '+2'), mMod('+', -4, '-4'), mFloor()],
      [mFloor(), mMod('+', 3, '+3'), { kind: 'start' }, mMod('+', 6, '+6'), mFloor()],
    ],
  },
  {
    title: 'Peta 5: Puncak Master Kota Nol',
    hint: 'Petualangan terakhir! Gunakan ×(-3) dengan cerdas untuk menutup selisih energi.',
    start: [4, 4],
    goal: [0, 0],
    initEnergy: 9,
    parMoves: 9,
    grid: [
      [{ kind: 'goal' }, mFloor(), mWall(), mFloor(), mFloor()],
      [mWall(), mFloor(), mFloor(), mMod('+', 3, '+3'), mWall()],
      [mFloor(), mMod('+', 3, '+3'), mMod('+', -8, '-8'), mWall(), mFloor()],
      [mWall(), mFloor(), mMod('+', -4, '-4', true), mMod('×', -3, '×(-3)'), mFloor()],
      [mFloor(), mMod('+', 6, '+6'), mFloor(), mMod('+', -12, '-12'), { kind: 'start' }],
    ],
  },
];

interface CourierSnapshot {
  pos: [number, number];
  energy: number;
  consumed: string[];
  gotStar: boolean;
  moves: number;
}

const CourierMazeGame: React.FC<ArcadeGameCommonProps> = ({
  studentAvatarId,
  onExit,
  onSaveProgress,
}) => {
  const [levelIdx, setLevelIdx] = useState(0);
  const [pos, setPos] = useState<[number, number]>(MAZE_LEVELS[0].start);
  const [energy, setEnergy] = useState(MAZE_LEVELS[0].initEnergy);
  const [consumed, setConsumed] = useState<string[]>([]);
  const [gotStar, setGotStar] = useState(false);
  const [moves, setMoves] = useState(0);
  const [history, setHistory] = useState<CourierSnapshot[]>([]);
  const [score, setScore] = useState(0);
  const [starsTotal, setStarsTotal] = useState(0);
  const [feedback, setFeedback] = useState<string>(MAZE_LEVELS[0].hint);
  const [phase, setPhase] = useState<'playing' | 'won'>('playing');

  const spec = MAZE_LEVELS[levelIdx];

  const loadMazeLevel = (idx: number, fullReset = false) => {
    const s = MAZE_LEVELS[idx];
    setLevelIdx(idx);
    setPos(s.start);
    setEnergy(s.initEnergy);
    setConsumed([]);
    setGotStar(false);
    setMoves(0);
    setHistory([]);
    setFeedback(s.hint);
    if (fullReset) {
      setScore(0);
      setStarsTotal(0);
      setPhase('playing');
    }
  };

  const tryMove = (nr: number, nc: number) => {
    if (phase !== 'playing') return;
    if (nr < 0 || nr >= 5 || nc < 0 || nc >= 5) return;
    if (Math.abs(nr - pos[0]) + Math.abs(nc - pos[1]) !== 1) return;

    const tile = spec.grid[nr][nc];
    if (tile.kind === 'wall') {
      playWrongSound();
      setFeedback('Ada tembok batu di sana! Pilih jalur lain.');
      return;
    }

    const key = `${nr},${nc}`;
    const alreadyUsed = consumed.includes(key);

    let nextEnergy = energy;
    const nextConsumed = [...consumed];
    let nextGotStar = gotStar;

    if (!alreadyUsed) {
      if (tile.kind === 'mod' && tile.op && typeof tile.val === 'number') {
        nextEnergy = tile.op === '+' ? energy + tile.val : energy * tile.val;
        nextConsumed.push(key);
      } else if (tile.star) {
        nextConsumed.push(key);
      }
      if (tile.star) {
        nextGotStar = true;
      }
    }

    if (tile.kind === 'goal') {
      if (nextEnergy !== 0) {
        playWrongSound();
        setFeedback(
          `Gerbang terkunci! Energi saat tiba harus tepat 0 (sekarang ${nextEnergy > 0 ? `+${nextEnergy}` : nextEnergy}). Gunakan Undo atau Reset.`
        );
        return;
      }

      playCorrectSound();
      const stageBonus = 200 + (nextGotStar ? 100 : 0) + (moves + 1 <= spec.parMoves ? 50 : 0);
      const nextScore = score + stageBonus;
      const nextStarsTotal = starsTotal + (nextGotStar ? 1 : 0);
      setScore(nextScore);
      setStarsTotal(nextStarsTotal);

      if (levelIdx + 1 < MAZE_LEVELS.length) {
        loadMazeLevel(levelIdx + 1, false);
        setFeedback(`Peta ${levelIdx + 1} Selesai (+${stageBonus} skor)! Lanjut ke Peta ${levelIdx + 2}.`);
      } else {
        setPhase('won');
        playVictorySound();
        const earnedStars = nextStarsTotal >= 4 ? 3 : nextStarsTotal >= 2 ? 2 : 1;
        onSaveProgress({ missionId: 'courier', score: nextScore, stars: earnedStars, won: true });
      }
      return;
    }

    setHistory((h) => [...h, { pos, energy, consumed, gotStar, moves }]);
    setPos([nr, nc]);
    setEnergy(nextEnergy);
    setConsumed(nextConsumed);
    setGotStar(nextGotStar);
    setMoves((m) => m + 1);
    setFeedback(
      tile.star && !alreadyUsed
        ? 'Bintang bonus diambil! Arahkan energi ke 0 lalu masuk gerbang Finish.'
        : `Energi kurir sekarang: ${nextEnergy > 0 ? `+${nextEnergy}` : nextEnergy}`
    );
  };

  const handleUndo = () => {
    if (history.length === 0 || phase !== 'playing') return;
    const prev = history[history.length - 1];
    setHistory((h) => h.slice(0, -1));
    setPos(prev.pos);
    setEnergy(prev.energy);
    setConsumed(prev.consumed);
    setGotStar(prev.gotStar);
    setMoves(prev.moves);
    setFeedback('Langkah dibatalkan.');
  };

  useEffect(() => {
    if (phase !== 'playing') return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') {
        e.preventDefault();
        tryMove(pos[0] - 1, pos[1]);
      } else if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') {
        e.preventDefault();
        tryMove(pos[0] + 1, pos[1]);
      } else if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
        e.preventDefault();
        tryMove(pos[0], pos[1] - 1);
      } else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
        e.preventDefault();
        tryMove(pos[0], pos[1] + 1);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [phase, pos, energy, consumed, gotStar, moves, levelIdx]);

  if (phase === 'won') {
    const earnedStars = starsTotal >= 4 ? 3 : starsTotal >= 2 ? 2 : 1;
    return (
      <div className="game-canvas min-h-screen">
        <ArcadeTopBar
          title="Kurir Kota Nol"
          badgeBg="bg-emerald-600"
          icon={<Package className="h-5 w-5" />}
          score={score}
          stageLabel="5/5 Peta Selesai"
          onExit={onExit}
        />
        <ArcadeEndCard
          won
          title="Semua Rute Kota Nol Terbuka!"
          subtitle="Kamu ahli menyeimbangkan energi bilangan bulat di seluruh distrik kota."
          score={score}
          stars={earnedStars}
          stats={[
            { label: 'Peta Selesai', value: '5/5' },
            { label: 'Bintang Peta', value: `${starsTotal}/5` },
          ]}
          onReplay={() => loadMazeLevel(0, true)}
          onExit={onExit}
        />
      </div>
    );
  }

  return (
    <div className="game-canvas min-h-screen pb-10">
      <ArcadeTopBar
        title="Kurir Kota Nol"
        badgeBg="bg-emerald-600"
        icon={<Package className="h-5 w-5" />}
        score={score}
        stageLabel={`${spec.title} (${levelIdx + 1}/5)`}
        onExit={onExit}
      />

      <main className="mx-auto max-w-5xl px-4 pt-6 sm:px-6">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* 5x5 Puzzle Grid */}
          <div className="game-card p-4 sm:p-6 lg:col-span-7">
            <div className="grid grid-cols-5 gap-2 sm:gap-2.5">
              {spec.grid.map((row, r) =>
                row.map((tile, c) => {
                  const isPlayer = pos[0] === r && pos[1] === c;
                  const isAdjacent = Math.abs(r - pos[0]) + Math.abs(c - pos[1]) === 1 && tile.kind !== 'wall';
                  const used = consumed.includes(`${r},${c}`);

                  let cellClass = 'border-slate-200 bg-slate-50 text-slate-700';
                  if (tile.kind === 'wall') {
                    cellClass = 'border-slate-700 bg-slate-800 text-slate-600 cursor-not-allowed';
                  } else if (tile.kind === 'goal') {
                    cellClass =
                      energy === 0
                        ? 'border-emerald-500 bg-emerald-100 text-emerald-900 ring-2 ring-emerald-400'
                        : 'border-amber-400 bg-amber-50 text-amber-900';
                  } else if (tile.kind === 'mod' && !used) {
                    cellClass =
                      tile.op === '×'
                        ? 'border-purple-300 bg-purple-50 text-purple-900'
                        : (tile.val || 0) >= 0
                          ? 'border-blue-300 bg-blue-50 text-blue-900'
                          : 'border-orange-300 bg-orange-50 text-orange-900';
                  } else if (used) {
                    cellClass = 'border-slate-200 bg-slate-100 text-slate-400';
                  }

                  return (
                    <button
                      key={`${r}-${c}`}
                      type="button"
                      disabled={tile.kind === 'wall' || !isAdjacent}
                      onClick={() => tryMove(r, c)}
                      className={`relative flex aspect-square min-h-[56px] flex-col items-center justify-center rounded-2xl border-2 p-1 text-center transition-all ${cellClass} ${
                        isAdjacent ? 'cursor-pointer hover:-translate-y-0.5 hover:border-blue-600' : ''
                      } ${isPlayer ? 'ring-3 ring-blue-600' : ''}`}
                    >
                      {tile.star && !used && (
                        <Star className="absolute top-1 right-1 h-3.5 w-3.5 fill-amber-400 text-amber-500" />
                      )}

                      {isPlayer ? (
                        <div className="flex flex-col items-center">
                          <img
                            src={getAvatarImage(studentAvatarId)}
                            alt="Kurir"
                            referrerPolicy="no-referrer"
                            className="h-8 w-8 rounded-lg border-2 border-blue-600 object-cover sm:h-9 sm:w-9"
                          />
                          <span className="font-mono-num mt-0.5 text-[11px] font-extrabold text-blue-800">
                            {energy > 0 ? `+${energy}` : energy}
                          </span>
                        </div>
                      ) : tile.kind === 'wall' ? (
                        <span className="text-[11px] font-bold opacity-40">Batu</span>
                      ) : tile.kind === 'goal' ? (
                        <div className="flex flex-col items-center">
                          <Target className="h-5 w-5 text-emerald-700" />
                          <span className="text-[10px] font-extrabold uppercase">Finish=0</span>
                        </div>
                      ) : tile.kind === 'start' ? (
                        <span className="text-[10px] font-bold text-slate-400">Start</span>
                      ) : tile.kind === 'mod' ? (
                        <span className="font-mono-num text-sm font-extrabold sm:text-base">
                          {used ? '✓' : tile.label}
                        </span>
                      ) : (
                        <span className="text-xs text-slate-300">·</span>
                      )}
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* Right Status & Controls */}
          <div className="space-y-5 lg:col-span-5">
            <div className="game-card p-5">
              <h2 className="font-display text-lg font-extrabold text-slate-900">{spec.title}</h2>
              <p className="mt-1 text-xs leading-relaxed text-slate-600">{feedback}</p>

              <div className="mt-4 grid grid-cols-3 gap-2.5 text-center">
                <div className="rounded-xl border border-blue-200 bg-blue-50 p-3">
                  <p className="text-[10px] font-bold uppercase text-blue-700">Energi Saat Ini</p>
                  <p
                    className={`font-mono-num mt-0.5 text-2xl font-extrabold ${
                      energy === 0 ? 'text-emerald-600' : 'text-blue-800'
                    }`}
                  >
                    {energy > 0 ? `+${energy}` : energy}
                  </p>
                </div>
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3">
                  <p className="text-[10px] font-bold uppercase text-emerald-700">Target Finish</p>
                  <p className="font-mono-num mt-0.5 text-2xl font-extrabold text-emerald-700">0</p>
                </div>
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-3">
                  <p className="text-[10px] font-bold uppercase text-amber-700">Bintang Peta</p>
                  <p className="font-mono-num mt-0.5 text-2xl font-extrabold text-amber-600">
                    {gotStar ? '1/1' : '0/1'}
                  </p>
                </div>
              </div>
            </div>

            <div className="game-card p-5">
              <p className="text-xs font-extrabold text-slate-700">Kendali Arah (atau ketuk petak bersebelahan)</p>
              <div className="mt-3 grid grid-cols-3 gap-2 max-w-[210px] mx-auto">
                <div />
                <button
                  type="button"
                  onClick={() => tryMove(pos[0] - 1, pos[1])}
                  className="flex h-12 items-center justify-center rounded-xl border-2 border-slate-200 bg-white text-slate-800 shadow-[0_2px_0_#cbd5e1] hover:border-blue-500 hover:bg-blue-50"
                  aria-label="Atas"
                >
                  <ArrowUp className="h-5 w-5" />
                </button>
                <div />
                <button
                  type="button"
                  onClick={() => tryMove(pos[0], pos[1] - 1)}
                  className="flex h-12 items-center justify-center rounded-xl border-2 border-slate-200 bg-white text-slate-800 shadow-[0_2px_0_#cbd5e1] hover:border-blue-500 hover:bg-blue-50"
                  aria-label="Kiri"
                >
                  <ArrowLeft className="h-5 w-5" />
                </button>
                <button
                  type="button"
                  onClick={() => tryMove(pos[0] + 1, pos[1])}
                  className="flex h-12 items-center justify-center rounded-xl border-2 border-slate-200 bg-white text-slate-800 shadow-[0_2px_0_#cbd5e1] hover:border-blue-500 hover:bg-blue-50"
                  aria-label="Bawah"
                >
                  <ArrowDown className="h-5 w-5" />
                </button>
                <button
                  type="button"
                  onClick={() => tryMove(pos[0], pos[1] + 1)}
                  className="flex h-12 items-center justify-center rounded-xl border-2 border-slate-200 bg-white text-slate-800 shadow-[0_2px_0_#cbd5e1] hover:border-blue-500 hover:bg-blue-50"
                  aria-label="Kanan"
                >
                  <ArrowRight className="h-5 w-5" />
                </button>
              </div>

              <div className="mt-5 flex gap-2.5">
                <button
                  type="button"
                  disabled={history.length === 0}
                  onClick={handleUndo}
                  className="game-btn-back flex min-h-[44px] flex-1 items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-xs font-extrabold disabled:opacity-40"
                >
                  <Undo2 className="h-4 w-4" />
                  <span>Undo Langkah</span>
                </button>
                <button
                  type="button"
                  onClick={() => loadMazeLevel(levelIdx, false)}
                  className="game-btn-back flex min-h-[44px] flex-1 items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-xs font-extrabold text-rose-700"
                >
                  <RotateCcw className="h-4 w-4" />
                  <span>Ulangi Peta</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

/* ============================================================================
   ARCADE GAME 3: LAB RAMUAN AJAIB (Potion Alchemist Lab)
============================================================================ */
interface PotionIngredient {
  id: string;
  name: string;
  op: '+' | '×';
  val: number;
  label: string;
  colorClass: string;
}

const POTION_INGREDIENTS: PotionIngredient[] = [
  {
    id: 'ice_crystal',
    name: 'Kristal Beku',
    op: '+',
    val: -5,
    label: '-5°C',
    colorClass: 'border-cyan-300 bg-cyan-50 text-cyan-900 hover:border-cyan-500',
  },
  {
    id: 'snow_drop',
    name: 'Embun Salju',
    op: '+',
    val: -2,
    label: '-2°C',
    colorClass: 'border-sky-300 bg-sky-50 text-sky-900 hover:border-sky-500',
  },
  {
    id: 'ember',
    name: 'Bara Api',
    op: '+',
    val: 3,
    label: '+3°C',
    colorClass: 'border-amber-300 bg-amber-50 text-amber-900 hover:border-amber-500',
  },
  {
    id: 'dragon_chili',
    name: 'Cabai Naga',
    op: '+',
    val: 7,
    label: '+7°C',
    colorClass: 'border-orange-300 bg-orange-50 text-orange-900 hover:border-orange-500',
  },
  {
    id: 'double_catalyst',
    name: 'Katalis Pengganda',
    op: '×',
    val: 2,
    label: '×2',
    colorClass: 'border-purple-300 bg-purple-50 text-purple-900 hover:border-purple-500',
  },
  {
    id: 'flip_catalyst',
    name: 'Katalis Pembalik',
    op: '×',
    val: -1,
    label: '×(-1)',
    colorClass: 'border-indigo-300 bg-indigo-50 text-indigo-900 hover:border-indigo-500',
  },
];

interface CustomerOrder {
  customer: string;
  potionTitle: string;
  startTemp: number;
  targetTemp: number;
}

const CUSTOMER_TEMPLATES = [
  { customer: 'Ksatria Pelindung', potionTitle: 'Eliksir Perisai Es' },
  { customer: 'Penyihir Hutan', potionTitle: 'Ramuan Cahaya Kunang' },
  { customer: 'Kapten Angkasa', potionTitle: 'Kapsul Stabilizer Kutub' },
  { customer: 'Alkemis Senior', potionTitle: 'Tinta Naga Kristal' },
  { customer: 'Raja Kerajaan', potionTitle: 'Mahkota Suhu Seimbang' },
];

function generatePotionOrder(idx: number): CustomerOrder {
  const tpl = CUSTOMER_TEMPLATES[idx % CUSTOMER_TEMPLATES.length];
  const startTemp = [-4, -2, 0, 2, 4][Math.floor(Math.random() * 5)];
  const steps = Math.min(4, 2 + Math.floor(idx / 2));

  let temp = startTemp;
  for (let s = 0; s < steps; s++) {
    const ing = POTION_INGREDIENTS[Math.floor(Math.random() * POTION_INGREDIENTS.length)];
    const candidate = ing.op === '+' ? temp + ing.val : temp * ing.val;
    if (candidate >= -32 && candidate <= 32) {
      temp = candidate;
    } else {
      temp = temp > 0 ? temp - 5 : temp + 7;
    }
  }
  if (temp === startTemp) temp += 7;

  return {
    customer: tpl.customer,
    potionTitle: tpl.potionTitle,
    startTemp,
    targetTemp: temp,
  };
}

const PotionAlchemistGame: React.FC<ArcadeGameCommonProps> = ({
  onExit,
  onSaveProgress,
}) => {
  const [orders, setOrders] = useState<CustomerOrder[]>(() =>
    Array.from({ length: 5 }, (_, i) => generatePotionOrder(i))
  );
  const [orderIdx, setOrderIdx] = useState(0);
  const [cauldronTemp, setCauldronTemp] = useState(orders[0].startTemp);
  const [mixLog, setMixLog] = useState<string[]>([]);
  const [patience, setPatience] = useState(40);
  const [lives, setLives] = useState(3);
  const [combo, setCombo] = useState(0);
  const [score, setScore] = useState(0);
  const [fulfilled, setFulfilled] = useState(0);
  const [feedback, setFeedback] = useState<{ type: 'ok' | 'warn' | 'info'; text: string }>({
    type: 'info',
    text: 'Campur bahan di meja agar suhu kuali sama persis dengan pesanan!',
  });
  const [phase, setPhase] = useState<'playing' | 'won' | 'lost'>('playing');

  const currentOrder = orders[orderIdx];

  const resetGame = () => {
    const fresh = Array.from({ length: 5 }, (_, i) => generatePotionOrder(i));
    setOrders(fresh);
    setOrderIdx(0);
    setCauldronTemp(fresh[0].startTemp);
    setMixLog([]);
    setPatience(40);
    setLives(3);
    setCombo(0);
    setScore(0);
    setFulfilled(0);
    setPhase('playing');
    setFeedback({
      type: 'info',
      text: 'Campur bahan di meja agar suhu kuali sama persis dengan pesanan!',
    });
  };

  useEffect(() => {
    if (phase !== 'playing') return;
    const timer = window.setInterval(() => {
      setPatience((p) => {
        if (p <= 1) {
          return 0;
        }
        return p - 1;
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [phase, orderIdx]);

  useEffect(() => {
    if (patience === 0 && phase === 'playing') {
      playWrongSound();
      const nextLives = lives - 1;
      setLives(nextLives);
      setCombo(0);
      if (nextLives <= 0) {
        setPhase('lost');
        onSaveProgress({ missionId: 'potion', score, stars: fulfilled >= 2 ? 1 : 0, won: false });
      } else if (orderIdx + 1 < orders.length) {
        const nextIdx = orderIdx + 1;
        setOrderIdx(nextIdx);
        setCauldronTemp(orders[nextIdx].startTemp);
        setMixLog([]);
        setPatience(40);
        setFeedback({ type: 'warn', text: 'Waktu pesanan habis (-1 Nyawa). Pelanggan berikutnya datang!' });
      } else {
        setPhase('lost');
        onSaveProgress({ missionId: 'potion', score, stars: fulfilled >= 3 ? 2 : 1, won: false });
      }
    }
  }, [patience, phase]);

  const addIngredient = (ing: PotionIngredient) => {
    if (phase !== 'playing') return;
    if (mixLog.length >= 6) {
      setFeedback({ type: 'warn', text: 'Kuali penuh (maks 6 bahan)! Klik Kosongkan atau Sajikan.' });
      return;
    }
    const nextTemp = ing.op === '+' ? cauldronTemp + ing.val : cauldronTemp * ing.val;
    if (Math.abs(nextTemp) > 99) {
      setFeedback({ type: 'warn', text: 'Suhu kuali terlalu ekstrem! Coba bahan lain.' });
      return;
    }
    setCauldronTemp(nextTemp);
    setMixLog((log) => [...log, `${ing.name} (${ing.label}) → ${nextTemp}°C`]);
    if (nextTemp === currentOrder.targetTemp) {
      setFeedback({ type: 'ok', text: `Tepat ${nextTemp}°C! Segera klik Sajikan Ramuan!` });
    }
  };

  const clearCauldron = () => {
    if (phase !== 'playing') return;
    setCauldronTemp(currentOrder.startTemp);
    setMixLog([]);
    setFeedback({ type: 'info', text: `Kuali dikosongkan kembali ke suhu awal ${currentOrder.startTemp}°C.` });
  };

  const servePotion = () => {
    if (phase !== 'playing') return;
    if (cauldronTemp === currentOrder.targetTemp) {
      playCorrectSound();
      const nextCombo = combo + 1;
      const gained = 200 + patience * 5 + (nextCombo - 1) * 40;
      const nextScore = score + gained;
      const nextFulfilled = fulfilled + 1;
      setCombo(nextCombo);
      setScore(nextScore);
      setFulfilled(nextFulfilled);

      if (orderIdx + 1 < orders.length) {
        const nextIdx = orderIdx + 1;
        setOrderIdx(nextIdx);
        setCauldronTemp(orders[nextIdx].startTemp);
        setMixLog([]);
        setPatience(40);
        setFeedback({
          type: 'ok',
          text: `${currentOrder.customer} puas! (+${gained} skor · Combo ${nextCombo}x)`,
        });
      } else {
        setPhase('won');
        playVictorySound();
        const stars = lives >= 3 ? 3 : lives === 2 ? 2 : 1;
        onSaveProgress({ missionId: 'potion', score: nextScore, stars, won: true });
      }
    } else {
      playWrongSound();
      const nextLives = lives - 1;
      setLives(nextLives);
      setCombo(0);
      setFeedback({
        type: 'warn',
        text: `Suhu masih ${cauldronTemp}°C, padahal pesanan butuh ${currentOrder.targetTemp}°C! (-1 Nyawa)`,
      });
      if (nextLives <= 0) {
        setPhase('lost');
        onSaveProgress({ missionId: 'potion', score, stars: fulfilled >= 2 ? 1 : 0, won: false });
      }
    }
  };

  if (phase !== 'playing') {
    const won = phase === 'won';
    const stars = won ? (lives >= 3 ? 3 : lives === 2 ? 2 : 1) : fulfilled >= 2 ? 1 : 0;
    return (
      <div className="game-canvas min-h-screen">
        <ArcadeTopBar
          title="Lab Ramuan Ajaib"
          badgeBg="bg-purple-600"
          icon={<FlaskConical className="h-5 w-5" />}
          score={score}
          lives={lives}
          stageLabel={`Pesanan ${fulfilled}/5`}
          onExit={onExit}
        />
        <ArcadeEndCard
          won={won}
          title={won ? 'Alkemis Terbaik Kerajaan!' : 'Kuali Lab Terlalu Panas!'}
          subtitle={
            won
              ? 'Semua pesanan ramuan berhasil diracik dengan suhu bilangan bulat yang presisi.'
              : 'Atur campuran bahan positif, negatif, dan katalis pengali lebih teliti ya!'
          }
          score={score}
          stars={stars}
          stats={[
            { label: 'Ramuan Terjual', value: `${fulfilled}/5` },
            { label: 'Sisa Nyawa', value: `${lives}/3` },
          ]}
          onReplay={resetGame}
          onExit={onExit}
        />
      </div>
    );
  }

  const matchesTarget = cauldronTemp === currentOrder.targetTemp;

  return (
    <div className="game-canvas min-h-screen pb-10">
      <ArcadeTopBar
        title="Lab Ramuan Ajaib"
        badgeBg="bg-purple-600"
        icon={<FlaskConical className="h-5 w-5" />}
        score={score}
        lives={lives}
        stageLabel={`Pesanan ${orderIdx + 1}/5 · Combo ${combo}x`}
        onExit={onExit}
      />

      <main className="mx-auto max-w-5xl px-4 pt-6 sm:px-6">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* Customer Order & Cauldron */}
          <div className="game-card p-5 sm:p-6 lg:col-span-5">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-xs font-extrabold uppercase tracking-wider text-purple-700">
                  {currentOrder.customer}
                </p>
                <h2 className="font-display text-xl font-extrabold text-slate-900">{currentOrder.potionTitle}</h2>
              </div>
              <span className="font-mono-num rounded-xl bg-amber-100 px-3 py-1 text-xs font-extrabold text-amber-800">
                {patience}s
              </span>
            </div>

            {/* Patience bar */}
            <div className="mt-2.5 h-2 w-full overflow-hidden rounded-full bg-slate-200">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  patience > 15 ? 'bg-emerald-500' : 'bg-rose-500'
                }`}
                style={{ width: `${(patience / 40) * 100}%` }}
              />
            </div>

            {/* Temperature Comparison */}
            <div className="mt-5 grid grid-cols-2 gap-3 text-center">
              <div
                className={`rounded-2xl border-2 p-4 ${
                  matchesTarget ? 'border-emerald-500 bg-emerald-50' : 'border-purple-200 bg-purple-50'
                }`}
              >
                <p className="text-[11px] font-bold text-slate-600">Suhu Kuali Saat Ini</p>
                <p
                  className={`font-mono-num mt-1 text-3xl font-extrabold ${
                    matchesTarget ? 'text-emerald-700' : 'text-purple-800'
                  }`}
                >
                  {cauldronTemp > 0 ? `+${cauldronTemp}` : cauldronTemp}°C
                </p>
              </div>
              <div className="rounded-2xl border-2 border-amber-300 bg-amber-50 p-4">
                <p className="text-[11px] font-bold text-amber-800">Target Pesanan</p>
                <p className="font-mono-num mt-1 text-3xl font-extrabold text-amber-700">
                  {currentOrder.targetTemp > 0 ? `+${currentOrder.targetTemp}` : currentOrder.targetTemp}°C
                </p>
              </div>
            </div>

            {/* Mix History Trail */}
            <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3">
              <p className="text-[11px] font-bold text-slate-500">
                Campuran ({mixLog.length}/6 · Awal: {currentOrder.startTemp}°C):
              </p>
              {mixLog.length === 0 ? (
                <p className="mt-1 text-xs text-slate-400">Belum ada bahan dimasukkan.</p>
              ) : (
                <ul className="mt-1.5 space-y-1 text-xs font-semibold text-slate-700">
                  {mixLog.map((entry, idx) => (
                    <li key={idx} className="font-mono-num">
                      {idx + 1}. {entry}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="mt-4 flex gap-2.5">
              <button
                type="button"
                onClick={clearCauldron}
                className="game-btn-back flex min-h-[46px] items-center justify-center gap-1.5 rounded-xl px-4 py-2 text-xs font-extrabold text-slate-700"
              >
                <Trash2 className="h-4 w-4" />
                <span>Kosongkan</span>
              </button>
              <button
                type="button"
                onClick={servePotion}
                className={`flex min-h-[46px] flex-1 items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-extrabold ${
                  matchesTarget ? 'game-btn-orange ring-2 ring-emerald-400' : 'game-btn-purple'
                }`}
              >
                <CheckCircle2 className="h-4 w-4" />
                <span>Sajikan Ramuan!</span>
              </button>
            </div>
          </div>

          {/* Ingredient Shelf */}
          <div className="game-card p-5 sm:p-6 lg:col-span-7">
            <h2 className="font-display text-lg font-extrabold text-slate-900">Rak Bahan Ajaib</h2>
            <p className="mt-0.5 text-xs text-slate-500">
              Ketuk bahan untuk langsung mencampurkannya ke dalam kuali. Kamu bebas mencari kombinasi terbaikmu!
            </p>

            <div
              className={`mt-4 rounded-xl border px-4 py-3 text-xs font-bold ${
                feedback.type === 'ok'
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
                  : feedback.type === 'warn'
                    ? 'border-rose-200 bg-rose-50 text-rose-900'
                    : 'border-sky-200 bg-sky-50 text-sky-900'
              }`}
            >
              {feedback.text}
            </div>

            <div className="mt-5 grid grid-cols-2 gap-3.5 sm:grid-cols-3">
              {POTION_INGREDIENTS.map((ing) => (
                <button
                  key={ing.id}
                  type="button"
                  onClick={() => addIngredient(ing)}
                  className={`flex min-h-[96px] flex-col items-center justify-center rounded-2xl border-2 p-4 text-center shadow-[0_3px_0_rgba(148,163,184,0.28)] transition-all hover:-translate-y-0.5 active:translate-y-0 ${ing.colorClass}`}
                >
                  <span className="font-mono-num text-2xl font-extrabold">{ing.label}</span>
                  <span className="mt-1 text-xs font-bold">{ing.name}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

/* ============================================================================
   ARCADE GAME 4: KOMANDAN PERISAI METEOR (Asteroid Shield Commander)
============================================================================ */
interface AsteroidEntity {
  id: string;
  value: number;
  x: number; // % left (14..86)
  y: number; // % top (0..90)
  speed: number; // % per tick
}

type WeaponOp = '+' | '-' | '×';

function computeWeapon(a: number, op: WeaponOp, b: number): number {
  if (op === '+') return a + b;
  if (op === '-') return a - b;
  return a * b;
}

function makeAsteroidValue(wave: number): number {
  const pool =
    wave === 1
      ? [-9, -6, -4, -3, 3, 5, 7, 8, 10]
      : wave === 2
        ? [-15, -12, -8, -5, 6, 9, 12, 14, 16]
        : [-24, -18, -14, -10, 12, 15, 18, 20, 24];
  return pool[Math.floor(Math.random() * pool.length)];
}

function makeGuaranteedCrystalDeck(targetValues: number[]): number[] {
  const focus = targetValues[0] ?? 6;
  // Build two numbers whose +, -, or × yields `focus`
  const useMul = Math.abs(focus) >= 6 && Math.random() < 0.45;
  let a = 0;
  let b = 0;

  if (useMul) {
    const divisors = [-6, -4, -3, -2, 2, 3, 4, 6].filter((d) => focus % d === 0 && Math.abs(focus / d) <= 9);
    if (divisors.length > 0) {
      a = divisors[Math.floor(Math.random() * divisors.length)];
      b = focus / a;
    }
  }
  if (a === 0 && b === 0) {
    a = [-6, -4, -3, -2, 2, 3, 5, 7][Math.floor(Math.random() * 8)];
    b = focus - a;
  }

  const deck = [a, b];
  const fillers = [-7, -5, -3, -2, 2, 3, 4, 6, 8];
  while (deck.length < 6) {
    deck.push(fillers[Math.floor(Math.random() * fillers.length)]);
  }
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

const WAVE_COUNTS = [6, 8, 10];

const AsteroidDefenseGame: React.FC<ArcadeGameCommonProps> = ({
  onExit,
  onSaveProgress,
}) => {
  const [wave, setWave] = useState(1);
  const [spawnedInWave, setSpawnedInWave] = useState(1);
  const [destroyedInWave, setDestroyedInWave] = useState(0);
  const [totalDestroyed, setTotalDestroyed] = useState(0);
  const [meteors, setMeteors] = useState<AsteroidEntity[]>(() => [
    { id: 'm1', value: -6, x: 50, y: 12, speed: 0.7 },
  ]);
  const [deck, setDeck] = useState<number[]>(() => makeGuaranteedCrystalDeck([-6]));
  const [slotA, setSlotA] = useState<number | null>(null);
  const [slotB, setSlotB] = useState<number | null>(null);
  const [op, setOp] = useState<WeaponOp>('+');
  const [lives, setLives] = useState(3);
  const [score, setScore] = useState(0);
  const [statusText, setStatusText] = useState('Pilih 2 kristal + operator agar cocok dengan angka meteor!');
  const [phase, setPhase] = useState<'playing' | 'won' | 'lost'>('playing');

  const waveRef = useRef(wave);
  waveRef.current = wave;

  const resetGame = () => {
    const firstVal = makeAsteroidValue(1);
    setWave(1);
    setSpawnedInWave(1);
    setDestroyedInWave(0);
    setTotalDestroyed(0);
    setMeteors([{ id: `m_${Date.now()}`, value: firstVal, x: 48, y: 10, speed: 0.65 }]);
    setDeck(makeGuaranteedCrystalDeck([firstVal]));
    setSlotA(null);
    setSlotB(null);
    setOp('+');
    setLives(3);
    setScore(0);
    setStatusText('Pilih 2 kristal + operator agar cocok dengan angka meteor!');
    setPhase('playing');
  };

  // Real-time meteor descent + spawner loop
  useEffect(() => {
    if (phase !== 'playing') return;
    const interval = window.setInterval(() => {
      setMeteors((prev) => {
        let shieldHit = false;
        const kept: AsteroidEntity[] = [];
        for (const m of prev) {
          const nextY = m.y + m.speed;
          if (nextY >= 88) {
            shieldHit = true;
          } else {
            kept.push({ ...m, y: nextY });
          }
        }

        if (shieldHit) {
          playWrongSound();
          setLives((lv) => {
            const nl = lv - 1;
            if (nl <= 0) {
              setPhase('lost');
            }
            return nl;
          });
          setDestroyedInWave((d) => d + 1);
          setStatusText('Perisai kota terkena meteor (-1 Nyawa)!');
        }

        return kept;
      });
    }, 180);

    return () => window.clearInterval(interval);
  }, [phase]);

  // Spawn / Advance wave effect
  useEffect(() => {
    if (phase !== 'playing') return;
    const needed = WAVE_COUNTS[wave - 1];

    if (destroyedInWave >= needed && meteors.length === 0) {
      if (wave < 3) {
        const nextWave = wave + 1;
        const firstVal = makeAsteroidValue(nextWave);
        setWave(nextWave);
        setSpawnedInWave(1);
        setDestroyedInWave(0);
        setMeteors([{ id: `mw${nextWave}_${Date.now()}`, value: firstVal, x: 50, y: 8, speed: 0.65 + nextWave * 0.14 }]);
        setDeck(makeGuaranteedCrystalDeck([firstVal]));
        setSlotA(null);
        setSlotB(null);
        setStatusText(`Gelombang ${nextWave} Dimulai!`);
      } else {
        setPhase('won');
        playVictorySound();
        const finalScore = score + lives * 150;
        setScore(finalScore);
        const stars = lives >= 3 ? 3 : lives === 2 ? 2 : 1;
        onSaveProgress({ missionId: 'asteroid', score: finalScore, stars, won: true });
      }
      return;
    }

    if (meteors.length === 0 && spawnedInWave < needed) {
      const nextVal = makeAsteroidValue(wave);
      setSpawnedInWave((s) => s + 1);
      setMeteors([
        {
          id: `m_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`,
          value: nextVal,
          x: 20 + Math.floor(Math.random() * 60),
          y: 8,
          speed: 0.65 + wave * 0.14,
        },
      ]);
      setDeck(makeGuaranteedCrystalDeck([nextVal]));
      setSlotA(null);
      setSlotB(null);
    } else if (meteors.length === 1 && spawnedInWave < needed && meteors[0].y > 46) {
      const nextVal = makeAsteroidValue(wave);
      setSpawnedInWave((s) => s + 1);
      setMeteors((prev) => [
        ...prev,
        {
          id: `m2_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`,
          value: nextVal,
          x: prev[0].x > 50 ? 25 : 75,
          y: 6,
          speed: 0.62 + wave * 0.13,
        },
      ]);
    }
  }, [phase, meteors, destroyedInWave, spawnedInWave, wave]);

  useEffect(() => {
    if (phase === 'lost') {
      const stars = wave >= 3 ? 2 : totalDestroyed >= 5 ? 1 : 0;
      onSaveProgress({ missionId: 'asteroid', score, stars, won: false });
    }
  }, [phase]);

  const weaponVal = useMemo(() => {
    if (slotA === null || slotB === null) return null;
    return computeWeapon(deck[slotA], op, deck[slotB]);
  }, [slotA, slotB, op, deck]);

  const lockedMeteor = useMemo(() => {
    if (weaponVal === null) return null;
    return meteors.find((m) => m.value === weaponVal) || null;
  }, [weaponVal, meteors]);

  const handleCrystalClick = (idx: number) => {
    if (phase !== 'playing') return;
    if (slotA === idx) {
      setSlotA(null);
      return;
    }
    if (slotB === idx) {
      setSlotB(null);
      return;
    }
    if (slotA === null) {
      setSlotA(idx);
    } else {
      setSlotB(idx);
    }
  };

  const handleFire = () => {
    if (phase !== 'playing' || slotA === null || slotB === null || weaponVal === null) return;
    if (!lockedMeteor) {
      playWrongSound();
      setStatusText(`Hasil ${weaponVal} tidak cocok dengan meteor mana pun!`);
      return;
    }

    playCorrectSound();
    const remaining = meteors.filter((m) => m.id !== lockedMeteor.id);
    setMeteors(remaining);
    setDestroyedInWave((d) => d + 1);
    setTotalDestroyed((t) => t + 1);
    setScore((s) => s + 140 * wave);
    setStatusText(`Tembakan tepat! Meteor (${lockedMeteor.value}) hancur!`);
    setSlotA(null);
    setSlotB(null);

    if (remaining.length > 0) {
      setDeck(makeGuaranteedCrystalDeck(remaining.map((m) => m.value)));
    }
  };

  useEffect(() => {
    if (phase !== 'playing') return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        if (lockedMeteor) {
          e.preventDefault();
          handleFire();
        }
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [phase, lockedMeteor, meteors, slotA, slotB, weaponVal, wave]);

  if (phase !== 'playing') {
    const won = phase === 'won';
    const stars = won ? (lives >= 3 ? 3 : lives === 2 ? 2 : 1) : totalDestroyed >= 5 ? 1 : 0;
    return (
      <div className="game-canvas min-h-screen">
        <ArcadeTopBar
          title="Komandan Perisai Meteor"
          badgeBg="bg-orange-600"
          icon={<Rocket className="h-5 w-5" />}
          score={score}
          lives={Math.max(0, lives)}
          stageLabel={`Gelombang ${wave}/3`}
          onExit={onExit}
        />
        <ArcadeEndCard
          won={won}
          title={won ? 'Kota Angkasa Terlindungi!' : 'Perisai Kota Jebol!'}
          subtitle={
            won
              ? 'Seluruh gelombang meteor berhasil dihancurkan dengan tembakan bilangan bulat presisi.'
              : 'Rakit kombinasi kristal lebih cepat sebelum meteor menyentuh perisai bawah!'
          }
          score={score}
          stars={stars}
          stats={[
            { label: 'Meteor Hancur', value: `${totalDestroyed}` },
            { label: 'Gelombang', value: `${wave}/3` },
          ]}
          onReplay={resetGame}
          onExit={onExit}
        />
      </div>
    );
  }

  return (
    <div className="game-canvas min-h-screen pb-10">
      <ArcadeTopBar
        title="Komandan Perisai Meteor"
        badgeBg="bg-orange-600"
        icon={<Rocket className="h-5 w-5" />}
        score={score}
        lives={lives}
        stageLabel={`Gelombang ${wave}/3 · Hancur ${destroyedInWave}/${WAVE_COUNTS[wave - 1]}`}
        onExit={onExit}
      />

      <main className="mx-auto max-w-4xl px-4 pt-5 sm:px-6">
        {/* Space Arena */}
        <div className="relative h-[280px] overflow-hidden rounded-3xl border-2 border-slate-700 bg-gradient-to-b from-slate-950 via-indigo-950 to-slate-900 shadow-lg">
          <div className="flex items-center justify-between px-4 py-2.5 text-xs font-bold text-indigo-200">
            <span>{statusText}</span>
            <span className="font-mono-num text-amber-300">Wave {wave}/3</span>
          </div>

          {meteors.map((m) => {
            const isLocked = lockedMeteor?.id === m.id;
            return (
              <div
                key={m.id}
                className={`absolute flex h-14 w-16 flex-col items-center justify-center rounded-2xl border-2 text-white shadow-lg transition-transform ${
                  isLocked
                    ? 'scale-110 border-emerald-400 bg-emerald-600 ring-4 ring-emerald-400/50'
                    : 'border-orange-400 bg-gradient-to-b from-orange-600 to-rose-700'
                }`}
                style={{ left: `${m.x}%`, top: `${m.y}%`, transform: 'translate(-50%, -50%)' }}
              >
                <span className="text-[9px] font-bold uppercase tracking-wider opacity-80">
                  {isLocked ? 'Terkunci' : 'Meteor'}
                </span>
                <span className="font-mono-num text-lg font-extrabold">{m.value}</span>
              </div>
            );
          })}

          {/* City Defense Shield Line */}
          <div className="absolute inset-x-0 bottom-0 flex items-center justify-center border-t-2 border-cyan-400/70 bg-cyan-950/80 py-2 text-xs font-extrabold text-cyan-200">
            <span>Perisai Kota Angkasa</span>
          </div>
        </div>

        {/* Weapon Assembler Deck */}
        <div className="game-card mt-5 p-5">
          {/* Live Targeting Equation */}
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border-2 border-slate-200 bg-slate-50 px-4 py-3">
            <div className="flex flex-wrap items-center gap-2 text-lg font-extrabold">
              <span className="font-mono-num rounded-xl border-2 border-blue-300 bg-white px-3 py-1 text-blue-800">
                {slotA !== null ? deck[slotA] : '?'}
              </span>
              <span className="font-mono-num text-purple-700">{op}</span>
              <span className="font-mono-num rounded-xl border-2 border-blue-300 bg-white px-3 py-1 text-blue-800">
                {slotB !== null ? deck[slotB] : '?'}
              </span>
              <span className="text-slate-500">=</span>
              <span
                className={`font-mono-num rounded-xl px-3 py-1 ${
                  lockedMeteor
                    ? 'bg-emerald-500 text-white'
                    : weaponVal !== null
                      ? 'bg-slate-200 text-slate-900'
                      : 'bg-slate-200 text-slate-400'
                }`}
              >
                {weaponVal !== null ? weaponVal : '?'}
              </span>
            </div>

            <div className="flex items-center gap-2">
              {(['+', '-', '×'] as WeaponOp[]).map((symbol) => (
                <button
                  key={symbol}
                  type="button"
                  onClick={() => setOp(symbol)}
                  className={`font-mono-num flex h-11 w-11 items-center justify-center rounded-xl border-2 text-lg font-extrabold transition-colors ${
                    op === symbol
                      ? 'border-purple-600 bg-purple-600 text-white'
                      : 'border-slate-200 bg-white text-slate-700 hover:border-purple-400'
                  }`}
                >
                  {symbol}
                </button>
              ))}
              <button
                type="button"
                disabled={weaponVal === null}
                onClick={handleFire}
                className={`flex min-h-[44px] items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-extrabold disabled:opacity-40 ${
                  lockedMeteor ? 'game-btn-orange' : 'game-btn-blue'
                }`}
              >
                <Zap className="h-4 w-4" />
                <span>{lockedMeteor ? 'TEMBAK!' : 'Cek'}</span>
              </button>
            </div>
          </div>

          {/* 6 Crystals */}
          <p className="mt-4 text-xs font-bold text-slate-500">Pilih 2 Kristal Energi:</p>
          <div className="mt-2 grid grid-cols-3 gap-2.5 sm:grid-cols-6">
            {deck.map((val, idx) => {
              const isA = slotA === idx;
              const isB = slotB === idx;
              return (
                <button
                  key={`${idx}-${val}`}
                  type="button"
                  onClick={() => handleCrystalClick(idx)}
                  className={`font-mono-num flex min-h-[54px] flex-col items-center justify-center rounded-2xl border-2 text-xl font-extrabold transition-all ${
                    isA || isB
                      ? 'border-blue-600 bg-blue-600 text-white shadow-[0_3px_0_#1d4ed8]'
                      : 'border-slate-200 bg-white text-slate-900 shadow-[0_3px_0_#cbd5e1] hover:border-blue-400 hover:bg-blue-50'
                  }`}
                >
                  <span>{val > 0 ? `+${val}` : val}</span>
                  {(isA || isB) && (
                    <span className="text-[9px] font-bold uppercase text-blue-100">
                      {isA ? 'Slot 1' : 'Slot 2'}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </main>
    </div>
  );
};

/* ============================================================================
   MAIN SWITCHER FOR STANDALONE ARCADE MISSION GAMES
============================================================================ */
export const ArcadeMissionRunner: React.FC<{
  missionId: ArcadeMissionId;
  studentName: string;
  studentAvatarId: string;
  onExit: () => void;
  onSaveProgress: (update: ArcadeScoreUpdate) => void;
}> = ({ missionId, studentName, studentAvatarId, onExit, onSaveProgress }) => {
  switch (missionId) {
    case 'submarine':
      return (
        <SubmarineMissionGame
          studentName={studentName}
          studentAvatarId={studentAvatarId}
          onExit={onExit}
          onSaveProgress={onSaveProgress}
        />
      );
    case 'courier':
      return (
        <CourierMazeGame
          studentName={studentName}
          studentAvatarId={studentAvatarId}
          onExit={onExit}
          onSaveProgress={onSaveProgress}
        />
      );
    case 'potion':
      return (
        <PotionAlchemistGame
          studentName={studentName}
          studentAvatarId={studentAvatarId}
          onExit={onExit}
          onSaveProgress={onSaveProgress}
        />
      );
    case 'asteroid':
      return (
        <AsteroidDefenseGame
          studentName={studentName}
          studentAvatarId={studentAvatarId}
          onExit={onExit}
          onSaveProgress={onSaveProgress}
        />
      );
  }
};
