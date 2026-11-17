import React, { useState } from 'react';
import {
  Anchor,
  ArrowLeft,
  Compass,
  FlaskConical,
  Gamepad2,
  LogOut,
  Package,
  Play,
  Rocket,
  Star,
  Trophy,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { getAvatarImage, type StudentRecord } from '../shared/levels';
import { getSoundMuted, setSoundMuted } from '../utils/sound';
import {
  ARCADE_MISSIONS,
  ArcadeMissionRunner,
  type ArcadeMissionId,
  type ArcadeScoreUpdate,
} from './ArcadeGames';
import { AppSignature } from './AppSignature';

interface ArcadeProgressMap {
  [missionId: string]: {
    bestScore: number;
    bestStars: number;
    wins: number;
  };
}

const ARCADE_COVERS: Record<ArcadeMissionId, { image: string; fallbackBg: string }> = {
  submarine: {
    image: '/src/assets/images/arcade_submarine_treasure_1794676821524.jpg',
    fallbackBg: 'from-cyan-500 to-blue-700',
  },
  courier: {
    image: '/src/assets/images/arcade_courier_maze_1794676821878.jpg',
    fallbackBg: 'from-emerald-500 to-teal-700',
  },
  potion: {
    image: '/src/assets/images/arcade_potion_lab_1794676821880.jpg',
    fallbackBg: 'from-purple-500 to-indigo-700',
  },
  asteroid: {
    image: '/src/assets/images/arcade_asteroid_shield_1794676823529.jpg',
    fallbackBg: 'from-orange-500 to-rose-700',
  },
};

function loadArcadeProgress(studentId: string): ArcadeProgressMap {
  try {
    const raw = localStorage.getItem(`ia_arcade_stats_${studentId}`);
    if (!raw) return {};
    return JSON.parse(raw) as ArcadeProgressMap;
  } catch {
    return {};
  }
}

function saveArcadeProgress(studentId: string, next: ArcadeProgressMap) {
  try {
    localStorage.setItem(`ia_arcade_stats_${studentId}`, JSON.stringify(next));
  } catch {
    // ignore storage quota errors
  }
}

function renderMissionIcon(id: ArcadeMissionId) {
  switch (id) {
    case 'submarine':
      return <Anchor className="h-6 w-6" />;
    case 'courier':
      return <Package className="h-6 w-6" />;
    case 'potion':
      return <FlaskConical className="h-6 w-6" />;
    case 'asteroid':
      return <Rocket className="h-6 w-6" />;
  }
}

interface ArcadeHubViewProps {
  student: StudentRecord;
  onBackToAdventure: () => void;
  onLogout: () => void;
}

export const ArcadeHubView: React.FC<ArcadeHubViewProps> = ({
  student,
  onBackToAdventure,
  onLogout,
}) => {
  const [activeMission, setActiveMission] = useState<ArcadeMissionId | null>(null);
  const [progress, setProgress] = useState<ArcadeProgressMap>(() => loadArcadeProgress(student.id));
  const [muted, setMuted] = useState(getSoundMuted());
  const [brokenCovers, setBrokenCovers] = useState<Record<string, boolean>>({});

  const handleToggleMute = () => {
    const next = !muted;
    setMuted(next);
    setSoundMuted(next);
  };

  const handleSaveUpdate = (update: ArcadeScoreUpdate) => {
    setProgress((prev) => {
      const current = prev[update.missionId] || { bestScore: 0, bestStars: 0, wins: 0 };
      const updated: ArcadeProgressMap = {
        ...prev,
        [update.missionId]: {
          bestScore: Math.max(current.bestScore, update.score),
          bestStars: Math.max(current.bestStars, update.stars),
          wins: current.wins + (update.won ? 1 : 0),
        },
      };
      saveArcadeProgress(student.id, updated);
      return updated;
    });
  };

  if (activeMission) {
    return (
      <ArcadeMissionRunner
        missionId={activeMission}
        studentName={student.fullName}
        studentAvatarId={student.avatarId}
        onExit={() => setActiveMission(null)}
        onSaveProgress={handleSaveUpdate}
      />
    );
  }

  const totalArcadeScore = Object.values(progress).reduce((acc, item) => acc + (item.bestScore || 0), 0);
  const totalArcadeStars = Object.values(progress).reduce((acc, item) => acc + (item.bestStars || 0), 0);
  const completedMissions = Object.values(progress).filter((item) => item.wins > 0).length;

  return (
    <div className="game-canvas min-h-screen pb-14 text-slate-900">
      {/* Standalone Top Header */}
      <header className="sticky top-0 z-30 border-b-2 border-slate-200/80 bg-white/95 backdrop-blur-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={onBackToAdventure}
              className="game-btn-back inline-flex h-10 items-center gap-1.5 rounded-xl px-3.5 text-xs font-extrabold whitespace-nowrap shrink-0 sm:text-sm"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Peta 6 Pulau</span>
            </button>
            <div className="font-display hidden items-center gap-2 text-base font-extrabold text-purple-700 whitespace-nowrap sm:flex sm:text-lg">
              <Gamepad2 className="h-5 w-5 text-purple-600" />
              <span>ARENA ARCADE</span>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <button
              type="button"
              onClick={handleToggleMute}
              title={muted ? 'Nyalakan Suara' : 'Matikan Suara'}
              className="game-btn-back flex h-10 w-10 items-center justify-center rounded-xl text-slate-700"
            >
              {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
            </button>
            <button
              type="button"
              onClick={onLogout}
              className="game-btn-back inline-flex h-10 items-center gap-2 rounded-xl px-3.5 text-xs font-extrabold text-slate-700 whitespace-nowrap"
            >
              <LogOut className="h-4 w-4" />
              <span>Keluar</span>
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 pt-6 sm:px-6 lg:px-8">
        {/* Arcade Hero Banner */}
        <section className="game-card overflow-hidden bg-gradient-to-br from-indigo-900 via-purple-900 to-slate-900 p-6 text-white sm:p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-start gap-4">
              <img
                src={getAvatarImage(student.avatarId)}
                alt={student.fullName}
                referrerPolicy="no-referrer"
                className="h-18 w-18 shrink-0 rounded-2xl border-3 border-amber-300 object-cover shadow-md sm:h-20 sm:w-20"
              />
              <div>
                <p className="text-xs font-extrabold uppercase tracking-wider text-amber-300">
                  Arena Arcade Terpisah · {student.fullName}
                </p>
                <h1 className="font-display mt-1 text-2xl font-extrabold text-white sm:text-3xl text-balance">
                  4 Game Misi Petualangan Seru
                </h1>
                <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-indigo-100">
                  Pilih misimu! Di sini kamu bermain langsung: mengemudikan kapal selam, menembus labirin kota, meracik
                  suhu ramuan ajaib, dan menjaga perisai kota dari hujan meteor.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3 shrink-0">
              <div className="rounded-2xl border border-white/15 bg-white/10 px-4 py-3 text-center">
                <p className="text-[11px] font-bold text-indigo-200">Misi Tuntas</p>
                <p className="font-mono-num mt-0.5 text-2xl font-extrabold text-white">
                  {completedMissions}
                  <span className="text-xs font-semibold text-indigo-200">/4</span>
                </p>
              </div>
              <div className="rounded-2xl border border-white/15 bg-white/10 px-4 py-3 text-center">
                <p className="text-[11px] font-bold text-amber-200">Bintang Arcade</p>
                <p className="font-mono-num mt-0.5 text-2xl font-extrabold text-amber-300">
                  {totalArcadeStars}
                  <span className="text-xs font-semibold text-amber-200">/12</span>
                </p>
              </div>
              <div className="rounded-2xl border border-white/15 bg-white/10 px-4 py-3 text-center">
                <p className="text-[11px] font-bold text-emerald-200">Skor Terbaik</p>
                <p className="font-mono-num mt-0.5 text-2xl font-extrabold text-emerald-300">{totalArcadeScore}</p>
              </div>
            </div>
          </div>
        </section>

        {/* 4 Illustrated Mission Games Grid */}
        <section className="mt-7 grid grid-cols-1 gap-6 md:grid-cols-2">
          {ARCADE_MISSIONS.map((mission) => {
            const stat = progress[mission.id];
            const bestStars = stat?.bestStars || 0;
            const cover = ARCADE_COVERS[mission.id];
            const imgBroken = brokenCovers[mission.id];

            return (
              <div
                key={mission.id}
                className="game-card game-card-interactive flex flex-col justify-between overflow-hidden hover:border-purple-400"
              >
                <div>
                  {/* Illustrated Cover Art */}
                  <div className="relative aspect-[16/9] w-full overflow-hidden bg-slate-900">
                    {!imgBroken ? (
                      <img
                        src={cover.image}
                        alt={`Ilustrasi game ${mission.title}`}
                        referrerPolicy="no-referrer"
                        onError={() => setBrokenCovers((b) => ({ ...b, [mission.id]: true }))}
                        className="h-full w-full object-cover transition-transform duration-300 hover:scale-105"
                      />
                    ) : (
                      <div
                        className={`flex h-full w-full items-center justify-center bg-gradient-to-br ${cover.fallbackBg} text-white`}
                      >
                        {renderMissionIcon(mission.id)}
                      </div>
                    )}
                    <div className="pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-slate-950/80 via-slate-950/30 to-transparent" />
                    <div className="absolute right-4 bottom-3 left-4 flex items-center justify-between gap-2 text-white">
                      <span className="text-xs font-extrabold uppercase tracking-wider text-amber-300">
                        {mission.stagesLabel}
                      </span>
                      <div className="flex items-center gap-0.5" aria-label={`${bestStars} dari 3 bintang`}>
                        {[1, 2, 3].map((s) => (
                          <Star
                            key={s}
                            className={`h-4 w-4 ${
                              s <= bestStars ? 'fill-amber-400 text-amber-400' : 'text-white/40'
                            }`}
                          />
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Card Details */}
                  <div className="p-5 sm:p-6">
                    <div className="flex items-center gap-3">
                      <span
                        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-white shadow-xs ${mission.badgeBg}`}
                      >
                        {renderMissionIcon(mission.id)}
                      </span>
                      <div>
                        <h2 className="font-display text-xl font-extrabold text-slate-900">{mission.title}</h2>
                        <p className="text-xs font-bold text-slate-500">{mission.subtitle}</p>
                      </div>
                    </div>

                    <p className="mt-3 text-sm leading-relaxed text-slate-700">{mission.missionSummary}</p>
                    <p className="mt-3 text-xs font-semibold text-slate-500">
                      Kendali: {mission.controlsHint}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 bg-slate-50/70 px-5 py-4 sm:px-6">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-600">
                    <Trophy className="h-4 w-4 text-amber-500" />
                    <span>
                      Rekor:{' '}
                      <span className="font-mono-num text-slate-900">{stat?.bestScore ?? 0}</span>
                      {stat?.wins ? ` · ${stat.wins}x menang` : ''}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => setActiveMission(mission.id)}
                    className="game-btn-orange inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-sm font-extrabold"
                  >
                    <Play className="h-4 w-4 fill-current" />
                    <span>Mulai Misi</span>
                  </button>
                </div>
              </div>
            );
          })}
        </section>

        {/* Link back to Curriculum Islands */}
        <section className="mt-7 flex flex-wrap items-center justify-between gap-4 rounded-2xl border-2 border-slate-200 bg-white p-5">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-100 text-blue-700">
              <Compass className="h-6 w-6" />
            </span>
            <div>
              <p className="font-display text-base font-extrabold text-slate-900">
                Ingin melanjutkan latihan evaluasi 6 pulau operasi?
              </p>
              <p className="text-xs text-slate-500">
                Kembali ke Peta Dunia Petualangan untuk membuka level kurikulum, tugas guru, dan kompetisi kelas.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onBackToAdventure}
            className="game-btn-blue inline-flex min-h-[44px] items-center gap-2 rounded-xl px-5 py-2.5 text-xs font-extrabold sm:text-sm"
          >
            <Compass className="h-4 w-4" />
            <span>Buka Peta 6 Pulau</span>
          </button>
        </section>
      </main>
      <AppSignature />
    </div>
  );
};
