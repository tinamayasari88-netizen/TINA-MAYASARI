import React, { useEffect, useState } from 'react';
import {
  ArrowLeft,
  Award,
  Castle,
  CheckCircle2,
  CloudOff,
  Compass,
  Crown,
  DoorOpen,
  Gamepad2,
  History,
  Lock,
  LogOut,
  Map,
  Mountain,
  Play,
  RefreshCw,
  Star,
  Swords,
  Trees,
  Trophy,
  Volume2,
  VolumeX,
} from 'lucide-react';
import {
  AVATAR_OPTIONS,
  LEVELS,
  getAvatarImage,
  type AvatarId,
  type CompetitionRoomRecord,
  type GameType,
  type LevelConfig,
  type StudentRecord,
} from '../shared/levels';
import { ACHIEVEMENT_BADGES, type StudentBadgeRecord } from '../shared/badges';
import { BadgeCard } from './BadgeCard';
import { AppSignature } from './AppSignature';
import { apiFetch } from '../utils/authSession';
import { getSoundMuted, setSoundMuted } from '../utils/sound';
import { formatDateId, formatDuration } from '../utils/exportReports';
import { cacheStudentProfile, flushOfflineEvaluations, getOfflineQueue } from '../utils/offlineSync';

interface LevelProgressRow {
  level_id: number;
  best_stars: number;
  best_score: number;
  attempts: number;
}

interface ActiveSessionRow {
  id: string;
  title: string;
  levelId: number;
  topic: string;
  questionCount: number;
  durationMinutes: number;
  mode: 'practice' | 'evaluation' | 'competition';
  allowRetry: boolean;
  roomId?: string;
  roomCode?: string;
  roomStatus?: string;
}

interface HistoryRow {
  id: string;
  levelId: number;
  levelName: string;
  score: number;
  starsEarned: number;
  correctCount: number;
  totalQuestions: number;
  durationSeconds: number;
  mode: string;
  executedAt: string;
}

type HubSection = 'map' | 'sessions' | 'trophies';

interface StudentAdventureHubProps {
  student: StudentRecord;
  isOnline: boolean;
  onUpdateStudent: (student: StudentRecord) => void;
  onOpenArcade: () => void;
  onStartAdventureLevel: (level: LevelConfig, gameType?: GameType) => void;
  onStartTeacherSession: (session: ActiveSessionRow) => void;
  onJoinCompetitionRoom: (room: CompetitionRoomRecord, alreadyFinished: boolean) => void;
  onLogout: () => void;
  onBackHome: () => void;
  onBackCover?: () => void;
}

export const StudentAdventureHub: React.FC<StudentAdventureHubProps> = ({
  student,
  isOnline,
  onUpdateStudent,
  onOpenArcade,
  onStartAdventureLevel,
  onStartTeacherSession,
  onJoinCompetitionRoom,
  onLogout,
  onBackHome,
  onBackCover,
}) => {
  const [activeSection, setActiveSection] = useState<HubSection>('map');
  const [levelProgress, setLevelProgress] = useState<LevelProgressRow[]>([]);
  const [activeSessions, setActiveSessions] = useState<ActiveSessionRow[]>([]);
  const [recentHistory, setRecentHistory] = useState<HistoryRow[]>([]);
  const [roomCodeInput, setRoomCodeInput] = useState('');
  const [joiningRoom, setJoiningRoom] = useState(false);
  const [roomError, setRoomError] = useState('');
  const [muted, setMuted] = useState(getSoundMuted());
  const [mapImgError, setMapImgError] = useState(false);
  const [pendingSyncCount, setPendingSyncCount] = useState(() => getOfflineQueue().length);
  const [syncMessage, setSyncMessage] = useState('');
  const [earnedBadges, setEarnedBadges] = useState<StudentBadgeRecord[]>(student.badges || []);

  const loadAdventureData = async () => {
    try {
      const res = await apiFetch('/api/student/adventure');
      if (!res.ok) return;
      const data = (await res.json()) as {
        student: StudentRecord;
        badges?: StudentBadgeRecord[];
        levelProgress: LevelProgressRow[];
        activeSessions: ActiveSessionRow[];
        recentHistory: HistoryRow[];
      };
      onUpdateStudent(data.student);
      cacheStudentProfile(data.student);
      setEarnedBadges(data.badges || data.student.badges || []);
      setLevelProgress(data.levelProgress || []);
      setActiveSessions(data.activeSessions || []);
      setRecentHistory(data.recentHistory || []);
    } catch {
      // Offline mode uses existing student state
    }
  };

  useEffect(() => {
    loadAdventureData();
  }, []);

  useEffect(() => {
    if (isOnline && pendingSyncCount > 0) {
      flushOfflineEvaluations().then((count) => {
        setPendingSyncCount(getOfflineQueue().length);
        if (count > 0) {
          setSyncMessage(`${count} hasil permainan offline berhasil disinkronkan ke server.`);
          loadAdventureData();
        }
      });
    }
  }, [isOnline]);

  const handleToggleMute = () => {
    const next = !muted;
    setMuted(next);
    setSoundMuted(next);
  };

  const handleAvatarChange = async (avatarId: AvatarId) => {
    onUpdateStudent({ ...student, avatarId });
    try {
      await apiFetch('/api/student/avatar', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ avatarId }),
      });
    } catch {
      // ignore offline
    }
  };

  const handleJoinRoom = async (codeOverride?: string) => {
    const code = (codeOverride ?? roomCodeInput).trim().toUpperCase();
    if (!code) {
      setRoomError('Masukkan kode ruang kompetisi dari gurumu.');
      return;
    }
    setRoomError('');
    setJoiningRoom(true);
    try {
      const res = await apiFetch('/api/student/competitions/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomCode: code }),
      });
      const data = (await res.json()) as {
        room?: CompetitionRoomRecord;
        alreadyFinished?: boolean;
        error?: string;
      };
      if (!res.ok || !data.room) {
        setRoomError(data.error || 'Gagal bergabung ke ruang kompetisi.');
        return;
      }
      onJoinCompetitionRoom(data.room, Boolean(data.alreadyFinished));
    } catch {
      setRoomError('Kompetisi real-time membutuhkan koneksi internet aktif.');
    } finally {
      setJoiningRoom(false);
    }
  };

  const getLevelStats = (levelId: number) => {
    return levelProgress.find((p) => p.level_id === levelId);
  };

  const renderWorldIcon = (levelId: number) => {
    switch (levelId) {
      case 1:
        return <DoorOpen className="h-5 w-5" />;
      case 2:
        return <Trees className="h-5 w-5" />;
      case 3:
        return <Mountain className="h-5 w-5" />;
      case 4:
        return <Compass className="h-5 w-5" />;
      case 5:
        return <Castle className="h-5 w-5" />;
      default:
        return <Crown className="h-5 w-5" />;
    }
  };

  const starProgressPct = Math.min(100, Math.round((student.totalStars / 18) * 100));

  return (
    <div className="game-canvas min-h-screen pb-14 text-slate-900">
      {/* Compact Top Bar */}
      <header className="sticky top-0 z-30 border-b-2 border-slate-200/80 bg-white/95 backdrop-blur-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            {onBackCover && (
              <button
                type="button"
                onClick={onBackCover}
                className="game-btn-back inline-flex h-10 items-center gap-1.5 rounded-xl px-3.5 text-xs font-extrabold whitespace-nowrap shrink-0 sm:text-sm"
              >
                <ArrowLeft className="h-4 w-4" />
                <span>Kembali ke Sampul</span>
              </button>
            )}
            <button
              type="button"
              onClick={onBackHome}
              className="game-btn-back inline-flex h-10 items-center gap-1.5 rounded-xl px-3.5 text-xs font-extrabold whitespace-nowrap shrink-0 sm:text-sm"
            >
              {!onBackCover && <ArrowLeft className="h-4 w-4" />}
              <span>Beranda</span>
            </button>
            <div className="font-display hidden items-center gap-2 text-base font-extrabold text-blue-700 whitespace-nowrap md:flex sm:text-lg">
              <Compass className="h-5 w-5 text-blue-600" />
              <span>INTEGER ADVENTURE</span>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <button
              type="button"
              onClick={onOpenArcade}
              className="game-btn-purple inline-flex h-10 items-center gap-1.5 rounded-xl px-3.5 text-xs font-extrabold whitespace-nowrap"
            >
              <Gamepad2 className="h-4 w-4" />
              <span>Arena Arcade</span>
            </button>
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
        {/* Offline / Sync Notification */}
        {(!isOnline || pendingSyncCount > 0 || syncMessage) && (
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs font-medium text-amber-900">
            <div className="flex items-center gap-2">
              {!isOnline ? <CloudOff className="h-4 w-4 text-amber-700" /> : <RefreshCw className="h-4 w-4 text-blue-700" />}
              <span>
                {!isOnline
                  ? 'Mode Offline Aktif — Kamu tetap bisa memainkan level petualangan. Hasil akan otomatis dikirim ke guru saat kembali online.'
                  : syncMessage || `${pendingSyncCount} hasil permainan siap disinkronkan ke cloud.`}
              </span>
            </div>
            {isOnline && pendingSyncCount > 0 && (
              <button
                type="button"
                onClick={() => flushOfflineEvaluations().then(() => setPendingSyncCount(getOfflineQueue().length))}
                className="rounded-lg bg-amber-600 px-3 py-1.5 font-semibold text-white hover:bg-amber-700"
              >
                Sinkronkan Sekarang
              </button>
            )}
          </div>
        )}

        {/* Student Identity Banner */}
        <section className="game-card p-5 sm:p-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
              <div className="relative shrink-0 self-start sm:self-auto">
                <img
                  src={getAvatarImage(student.avatarId)}
                  alt={`Avatar ${student.fullName}`}
                  referrerPolicy="no-referrer"
                  className="h-20 w-20 rounded-3xl border-4 border-amber-300 object-cover shadow-md sm:h-24 sm:w-24"
                />
              </div>
              <div>
                <p className="text-xs font-extrabold uppercase tracking-wider text-blue-700">
                  {student.className} · Kode Kelas {student.classCode || '-'}
                </p>
                <h1 className="font-display mt-0.5 text-2xl font-extrabold text-slate-900 sm:text-3xl">
                  Halo, {student.fullName}!
                </h1>
                <p className="mt-0.5 text-xs font-medium text-slate-500">
                  Pilih karakter favoritmu dan taklukkan semua pulau matematika!
                </p>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  {AVATAR_OPTIONS.map((av) => (
                    <button
                      key={av.id}
                      type="button"
                      onClick={() => handleAvatarChange(av.id)}
                      className={`inline-flex items-center gap-2 rounded-xl border-2 px-2.5 py-1.5 text-xs font-bold transition-all ${
                        student.avatarId === av.id
                          ? 'border-blue-600 bg-blue-50 text-blue-800 shadow-[0_2px_0_#2563eb]'
                          : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      <img
                        src={av.image}
                        alt={av.label}
                        referrerPolicy="no-referrer"
                        className="h-6 w-6 rounded-lg object-cover"
                      />
                      <span>{av.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:flex sm:items-stretch">
              <div className="rounded-2xl border-2 border-amber-300 bg-gradient-to-br from-amber-50 to-yellow-50 px-4 py-3 shadow-[0_3px_0_rgba(245,158,11,0.2)] sm:min-w-[175px]">
                <div className="flex items-center gap-1.5 text-xs font-extrabold text-amber-800">
                  <Star className="h-4 w-4 fill-amber-500 text-amber-500" />
                  <span>Total Bintang</span>
                </div>
                <p className="font-mono-num mt-1 text-2xl font-extrabold text-slate-900">
                  {student.totalStars} <span className="text-sm font-semibold text-slate-500">/ 18</span>
                </p>
                <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-amber-200/80">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-amber-400 to-orange-500 transition-all duration-300"
                    style={{ width: `${starProgressPct}%` }}
                  />
                </div>
              </div>
              <div className="rounded-2xl border-2 border-purple-300 bg-gradient-to-br from-purple-50 to-indigo-50 px-4 py-3 shadow-[0_3px_0_rgba(147,51,234,0.18)] sm:min-w-[155px]">
                <div className="flex items-center gap-1.5 text-xs font-extrabold text-purple-800">
                  <Trophy className="h-4 w-4 text-purple-600" />
                  <span>Level Terbuka</span>
                </div>
                <p className="font-mono-num mt-1 text-2xl font-extrabold text-slate-900">
                  {student.unlockedLevel} <span className="text-sm font-semibold text-slate-500">/ 6</span>
                </p>
                <p className="mt-1.5 text-[11px] font-bold text-purple-700">
                  {earnedBadges.length} Lencana Diraih
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Active Session Alert Banner (when teacher opens a session or competition) */}
        {activeSessions.length > 0 && activeSection !== 'sessions' && (
          <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border-2 border-purple-300 bg-gradient-to-r from-purple-50 to-indigo-50 px-5 py-3.5">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-purple-600 text-white shadow-xs">
                <Swords className="h-5 w-5" />
              </span>
              <div>
                <p className="text-xs font-extrabold text-purple-900">
                  Ada {activeSessions.length} Sesi / Kompetisi Kelas Aktif dari Gurumu!
                </p>
                <p className="text-xs text-purple-700">{activeSessions[0].title}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setActiveSection('sessions')}
              className="game-btn-purple rounded-xl px-4 py-2 text-xs font-extrabold whitespace-nowrap"
            >
              Lihat &amp; Gabung
            </button>
          </div>
        )}

        {/* Unified Game Mode Switcher Bar */}
        <nav
          aria-label="Menu utama siswa"
          className="mt-6 grid grid-cols-2 gap-2.5 rounded-2xl border-2 border-slate-200 bg-white p-2 shadow-xs sm:grid-cols-4"
        >
          <button
            type="button"
            onClick={() => setActiveSection('map')}
            className={`flex min-h-[46px] items-center justify-center gap-2 rounded-xl px-3 py-2 text-xs font-extrabold transition-all sm:text-sm ${
              activeSection === 'map'
                ? 'game-btn-blue'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <Map className="h-4 w-4 shrink-0" />
            <span className="whitespace-nowrap">Peta 6 Pulau</span>
          </button>

          <button
            type="button"
            onClick={onOpenArcade}
            className="flex min-h-[46px] items-center justify-center gap-2 rounded-xl border-2 border-purple-200 bg-purple-50 px-3 py-2 text-xs font-extrabold text-purple-800 transition-all hover:border-purple-400 hover:bg-purple-100 sm:text-sm"
          >
            <Gamepad2 className="h-4 w-4 shrink-0 text-purple-600" />
            <span className="whitespace-nowrap">Arena Arcade (4 Misi)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSection('sessions')}
            className={`flex min-h-[46px] items-center justify-center gap-2 rounded-xl px-3 py-2 text-xs font-extrabold transition-all sm:text-sm ${
              activeSection === 'sessions'
                ? 'game-btn-purple'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <Swords className="h-4 w-4 shrink-0" />
            <span className="whitespace-nowrap">
              Kompetisi &amp; Sesi{activeSessions.length > 0 ? ` (${activeSessions.length})` : ''}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSection('trophies')}
            className={`flex min-h-[46px] items-center justify-center gap-2 rounded-xl px-3 py-2 text-xs font-extrabold transition-all sm:text-sm ${
              activeSection === 'trophies'
                ? 'game-btn-orange'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <Award className="h-4 w-4 shrink-0" />
            <span className="whitespace-nowrap">Lencana &amp; Riwayat</span>
          </button>
        </nav>

        {/* SECTION 1: PETA 6 PULAU (Default) */}
        {activeSection === 'map' && (
          <section className="game-card mt-6 p-5 sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="font-display text-xl font-extrabold text-slate-900">Peta Dunia Petualangan</h2>
                <p className="text-xs text-slate-500">
                  Ketuk pulau misi yang bersinar untuk bertualang dan mengumpulkan bintang!
                </p>
              </div>
              <span className="text-xs font-bold text-blue-700">Nilai minimal 60 membuka pulau berikutnya</span>
            </div>

            <div className="relative mt-4 overflow-hidden rounded-3xl border-2 border-sky-200 bg-sky-900 shadow-inner">
              {!mapImgError ? (
                <img
                  src="/src/assets/images/map_adventure_islands_1794558987204.jpg"
                  alt="Peta interaktif enam pulau petualangan INTEGER ADVENTURE"
                  referrerPolicy="no-referrer"
                  onError={() => setMapImgError(true)}
                  className="aspect-[16/9] w-full object-cover"
                />
              ) : (
                <div className="aspect-[16/9] w-full bg-gradient-to-br from-blue-800 via-indigo-800 to-purple-900" />
              )}

              {/* Interactive Map Level Pins (Desktop/Tablet overlay) */}
              <div className="hidden md:block">
                {LEVELS.map((lvl) => {
                  const isUnlocked = lvl.id <= student.unlockedLevel;
                  const isCurrentTarget = lvl.id === student.unlockedLevel;
                  const stats = getLevelStats(lvl.id);
                  const stars = stats?.best_stars || 0;
                  return (
                    <button
                      key={lvl.id}
                      type="button"
                      disabled={!isUnlocked}
                      onClick={() => onStartAdventureLevel(lvl)}
                      style={{ left: `${lvl.mapX}%`, top: `${lvl.mapY}%` }}
                      className={`group absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center transition-transform ${
                        isUnlocked ? 'cursor-pointer hover:scale-110' : 'cursor-not-allowed opacity-80'
                      }`}
                    >
                      <div
                        className={`flex h-13 w-13 items-center justify-center rounded-2xl border-3 border-white shadow-lg ${
                          isCurrentTarget ? 'animate-float-gentle ring-4 ring-amber-300/80 ' : ''
                        }${isUnlocked ? lvl.badgeBg + ' text-white' : 'bg-slate-700 text-slate-300'}`}
                      >
                        {isUnlocked ? renderWorldIcon(lvl.id) : <Lock className="h-5 w-5" />}
                      </div>
                      <div className="mt-1.5 rounded-xl border border-white/20 bg-slate-950/90 px-3 py-1 text-center text-white shadow-md">
                        <p className="text-[11px] font-extrabold whitespace-nowrap">
                          {lvl.id}. {lvl.title}
                        </p>
                        <div className="mt-0.5 flex items-center justify-center gap-0.5">
                          {[1, 2, 3].map((s) => (
                            <Star
                              key={s}
                              className={`h-3 w-3 ${
                                s <= stars ? 'fill-amber-400 text-amber-400' : 'text-slate-500'
                              }`}
                            />
                          ))}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 6 Missions Cards Grid */}
            <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {LEVELS.map((lvl) => {
                const isUnlocked = lvl.id <= student.unlockedLevel;
                const stats = getLevelStats(lvl.id);
                const stars = stats?.best_stars || 0;
                return (
                  <div
                    key={lvl.id}
                    className={`flex flex-col justify-between rounded-2xl border-2 p-5 transition-all ${
                      isUnlocked
                        ? 'border-slate-200 bg-white shadow-[0_4px_0_rgba(148,163,184,0.18)] hover:-translate-y-0.5 hover:border-blue-400'
                        : 'border-slate-200 bg-slate-100/80 opacity-85'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span
                            className={`flex h-8 w-8 items-center justify-center rounded-xl text-white ${
                              isUnlocked ? lvl.badgeBg : 'bg-slate-400'
                            }`}
                          >
                            {isUnlocked ? renderWorldIcon(lvl.id) : <Lock className="h-4 w-4" />}
                          </span>
                          <span className="text-xs font-extrabold uppercase tracking-wider text-blue-700">
                            Level {lvl.id}
                          </span>
                        </div>
                        <div className="flex items-center gap-0.5" aria-label={`${stars} dari 3 bintang`}>
                          {[1, 2, 3].map((s) => (
                            <Star
                              key={s}
                              className={`h-4 w-4 ${
                                s <= stars ? 'fill-amber-400 text-amber-400' : 'text-slate-300'
                              }`}
                            />
                          ))}
                        </div>
                      </div>
                      <h3 className="font-display mt-3 text-lg font-extrabold text-slate-900">{lvl.title}</h3>
                      <p className="text-xs font-bold text-purple-700">{lvl.subtitle}</p>
                      <p className="mt-1.5 inline-flex items-center gap-1.5 text-xs font-extrabold text-orange-600">
                        <Gamepad2 className="h-3.5 w-3.5 shrink-0" />
                        <span>Permainan: {lvl.gameName}</span>
                      </p>
                      <p className="mt-2 text-sm text-slate-600">{lvl.description}</p>
                      {stats && (
                        <p className="mt-2.5 text-xs font-semibold text-emerald-700">
                          Skor Terbaik: <span className="font-mono-num font-bold">{stats.best_score}</span> ·{' '}
                          {stats.attempts}x percobaan
                        </p>
                      )}
                    </div>

                    <button
                      type="button"
                      disabled={!isUnlocked}
                      onClick={() => onStartAdventureLevel(lvl)}
                      className={`mt-4 inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-extrabold ${
                        isUnlocked
                          ? stats
                            ? 'game-btn-blue'
                            : 'game-btn-orange'
                          : 'cursor-not-allowed bg-slate-200 text-slate-500'
                      }`}
                    >
                      {isUnlocked ? (
                        <>
                          <Play className="h-4 w-4 fill-current" />
                          <span>{stats ? 'Mainkan Lagi' : `Main: ${lvl.gameName}`}</span>
                        </>
                      ) : (
                        <>
                          <Lock className="h-4 w-4" />
                          <span>Terkunci (Selesaikan Level {lvl.id - 1})</span>
                        </>
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* SECTION 2: KOMPETISI & SESI GURU */}
        {activeSection === 'sessions' && (
          <section className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-12">
            <div className="game-card p-6 lg:col-span-5">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-500 to-indigo-600 text-white shadow-[0_3px_0_#5b21b6]">
                  <Swords className="h-6 w-6" />
                </div>
                <div>
                  <h2 className="font-display text-lg font-extrabold text-slate-900">Mode Kompetisi Kelas</h2>
                  <p className="text-xs text-slate-500">Masukkan kode ruang lomba dari gurumu</p>
                </div>
              </div>

              <div className="mt-5 flex gap-2">
                <input
                  type="text"
                  value={roomCodeInput}
                  onChange={(e) => setRoomCodeInput(e.target.value.toUpperCase())}
                  placeholder="Contoh: CMP-8421"
                  className="font-mono-num flex-1 rounded-xl border-2 border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm font-bold uppercase tracking-wider text-slate-900 focus:border-purple-600 focus:bg-white focus:outline-none"
                />
                <button
                  type="button"
                  disabled={joiningRoom}
                  onClick={() => handleJoinRoom()}
                  className="game-btn-purple rounded-xl px-5 py-2.5 text-sm font-extrabold disabled:opacity-60 whitespace-nowrap shrink-0"
                >
                  {joiningRoom ? 'Masuk...' : 'Gabung'}
                </button>
              </div>
              {roomError && <p className="mt-2.5 text-xs font-semibold text-red-600">{roomError}</p>}
            </div>

            <div className="game-card p-6 lg:col-span-7">
              <h2 className="font-display text-lg font-extrabold text-slate-900">Sesi Aktif di Kelasmu</h2>
              <p className="text-xs text-slate-500">Tugas atau ruang kompetisi yang dibuka oleh guru</p>

              {activeSessions.length === 0 ? (
                <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-5 text-center">
                  <p className="text-sm font-semibold text-slate-700">Belum ada sesi atau kompetisi aktif saat ini.</p>
                  <p className="mt-1 text-xs text-slate-500">
                    Kamu bisa langsung kembali ke Peta 6 Pulau atau bermain di Arena Arcade!
                  </p>
                  <button
                    type="button"
                    onClick={() => setActiveSection('map')}
                    className="game-btn-blue mt-4 inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-extrabold"
                  >
                    <Map className="h-4 w-4" />
                    <span>Kembali ke Peta 6 Pulau</span>
                  </button>
                </div>
              ) : (
                <div className="mt-4 space-y-3">
                  {activeSessions.map((sess) => (
                    <div
                      key={sess.id}
                      className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border-2 border-slate-200 bg-slate-50 px-4 py-3.5"
                    >
                      <div>
                        <p className="text-sm font-extrabold text-slate-900">{sess.title}</p>
                        <p className="mt-0.5 text-xs text-slate-600">
                          {sess.topic} · {sess.questionCount} soal · {sess.durationMinutes} menit
                          {sess.roomCode ? ` · Kode: ${sess.roomCode}` : ''}
                        </p>
                      </div>
                      {sess.mode === 'competition' && sess.roomCode ? (
                        <button
                          type="button"
                          onClick={() => handleJoinRoom(sess.roomCode)}
                          className="game-btn-purple rounded-xl px-4 py-2 text-xs font-extrabold whitespace-nowrap"
                        >
                          Masuk Ruang Kompetisi
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => onStartTeacherSession(sess)}
                          className="game-btn-blue rounded-xl px-4 py-2 text-xs font-extrabold whitespace-nowrap"
                        >
                          Kerjakan Sesi
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>
        )}

        {/* SECTION 3: LENCANA & RIWAYAT */}
        {activeSection === 'trophies' && (
          <div className="mt-6 space-y-6">
            <section className="game-card p-5 sm:p-6">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h2 className="font-display text-xl font-extrabold text-slate-900">Koleksi Lencana Pencapaian</h2>
                  <p className="text-xs text-slate-500">
                    Raih seluruh lencana dengan menaklukkan misi, menjaga kecepatan, dan konsisten berlatih.
                  </p>
                </div>
                <span className="font-mono-num text-xs font-bold text-purple-700">
                  {earnedBadges.length} / {ACHIEVEMENT_BADGES.length} Terbuka
                </span>
              </div>

              <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {ACHIEVEMENT_BADGES.map((badge) => {
                  const unlockedRecord = earnedBadges.find((b) => b.badgeId === badge.id);
                  return (
                    <BadgeCard
                      key={badge.id}
                      badge={badge}
                      unlocked={Boolean(unlockedRecord)}
                      unlockedAt={unlockedRecord?.unlockedAt}
                    />
                  );
                })}
              </div>
            </section>

            <section className="game-card p-5 sm:p-6">
              <div className="flex items-center gap-2">
                <History className="h-5 w-5 text-blue-600" />
                <h2 className="font-display text-lg font-extrabold text-slate-900">Riwayat Petualangan Terakhir</h2>
              </div>

              {recentHistory.length === 0 ? (
                <p className="mt-4 rounded-xl bg-slate-50 px-4 py-4 text-center text-xs text-slate-500">
                  Belum ada riwayat evaluasi. Selesaikan salah satu pulau di Peta 6 Pulau untuk mencatat skormu!
                </p>
              ) : (
                <div className="mt-4 overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 text-xs font-semibold text-slate-500">
                        <th className="py-2.5 pr-4">Misi / Materi</th>
                        <th className="py-2.5 px-4">Mode</th>
                        <th className="py-2.5 px-4 text-right">Benar</th>
                        <th className="py-2.5 px-4 text-right">Nilai</th>
                        <th className="py-2.5 px-4 text-right">Durasi</th>
                        <th className="py-2.5 pl-4 text-right">Waktu</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {recentHistory.map((item) => (
                        <tr key={item.id} className="hover:bg-slate-50">
                          <td className="py-3 pr-4 font-semibold text-slate-900">{item.levelName}</td>
                          <td className="py-3 px-4 text-xs capitalize text-slate-600">
                            {item.mode === 'competition'
                              ? 'Kompetisi'
                              : item.mode === 'session'
                                ? 'Sesi Guru'
                                : 'Petualangan'}
                          </td>
                          <td className="font-mono-num py-3 px-4 text-right text-slate-700">
                            {item.correctCount}/{item.totalQuestions}
                          </td>
                          <td className="font-mono-num py-3 px-4 text-right font-bold text-blue-700">
                            <span className="inline-flex items-center gap-1">
                              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                              {item.score}
                            </span>
                          </td>
                          <td className="font-mono-num py-3 px-4 text-right text-slate-600">
                            {formatDuration(item.durationSeconds)}
                          </td>
                          <td className="py-3 pl-4 text-right text-xs text-slate-500">{formatDateId(item.executedAt)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </div>
        )}
      </main>
      <AppSignature />
    </div>
  );
};
