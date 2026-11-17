import React, { useState } from 'react';
import {
  ArrowRight,
  Award,
  BookOpen,
  Castle,
  Compass,
  Crown,
  DoorOpen,
  Gamepad2,
  GraduationCap,
  Lock,
  Mountain,
  Play,
  Star,
  Trees,
  Trophy,
} from 'lucide-react';
import { LEVELS } from '../shared/levels';
import { AppSignature } from './AppSignature';

interface LandingPageProps {
  onOpenCover?: () => void;
  onOpenTeacherAuth: () => void;
  onOpenStudentAuth: () => void;
  teacherLoggedIn: boolean;
  studentLoggedIn: boolean;
  onGoTeacherDashboard: () => void;
  onGoStudentHub: () => void;
}

function renderLevelIcon(levelId: number) {
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
}

export const LandingPage: React.FC<LandingPageProps> = ({
  onOpenCover,
  onOpenTeacherAuth,
  onOpenStudentAuth,
  teacherLoggedIn,
  studentLoggedIn,
  onGoTeacherDashboard,
  onGoStudentHub,
}) => {
  const [heroImgError, setHeroImgError] = useState(false);
  const [numA, setNumA] = useState<number>(-3);
  const [op, setOp] = useState<'+' | '-'>('+');
  const [numB, setNumB] = useState<number>(5);

  const resultVal = op === '+' ? numA + numB : numA - numB;

  const handleTeacherClick = () => {
    if (teacherLoggedIn) onGoTeacherDashboard();
    else onOpenTeacherAuth();
  };

  const handleStudentClick = () => {
    if (studentLoggedIn) onGoStudentHub();
    else onOpenStudentAuth();
  };

  return (
    <div className="game-canvas min-h-screen text-slate-900">
      {/* Top Bar Contract: 3 zones */}
      <header className="sticky top-0 z-30 border-b-2 border-slate-200/80 bg-white/95 backdrop-blur-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3.5 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3 shrink-0">
            {onOpenCover && (
              <button
                type="button"
                onClick={onOpenCover}
                className="game-btn-back inline-flex h-9 items-center gap-1.5 rounded-xl px-3 text-xs font-extrabold whitespace-nowrap"
              >
                <ArrowRight className="h-3.5 w-3.5 rotate-180" />
                <span>Kembali ke Sampul</span>
              </button>
            )}
            <a
              href="#top"
              className="font-display flex items-center gap-2 text-base font-extrabold tracking-tight text-blue-700 whitespace-nowrap shrink-0 sm:text-lg"
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-[0_2px_0_#1d4ed8]">
                <Compass className="h-5 w-5" />
              </span>
              <span className="hidden sm:inline">INTEGER ADVENTURE</span>
            </a>
          </div>

          <nav className="hidden items-center gap-6 text-sm font-semibold text-slate-600 lg:flex">
            <a href="#peta-level" className="hover:text-blue-700 transition-colors whitespace-nowrap shrink-0">
              Peta Level
            </a>
            <a href="#arena-arcade" className="hover:text-blue-700 transition-colors whitespace-nowrap shrink-0">
              Arena Arcade
            </a>
            <a href="#lab-bilangan" className="hover:text-blue-700 transition-colors whitespace-nowrap shrink-0">
              Tombol Bilangan
            </a>
            <a href="#fitur-kelas" className="hover:text-blue-700 transition-colors whitespace-nowrap shrink-0">
              Kompetisi &amp; Guru
            </a>
          </nav>

          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={handleStudentClick}
              className="game-btn-orange rounded-xl px-4 py-2 text-xs font-extrabold whitespace-nowrap shrink-0 sm:text-sm"
            >
              {studentLoggedIn ? 'Lanjut Bermain' : 'Mulai Petualangan'}
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section id="top" className="mx-auto max-w-7xl px-4 pt-8 pb-14 sm:px-6 lg:px-8 lg:pt-12">
        <div className="grid grid-cols-1 items-stretch gap-8 lg:grid-cols-12">
          <div className="flex flex-col justify-center lg:col-span-6">
            <p className="text-xs font-extrabold uppercase tracking-wider text-purple-700">
              Matematika SMP · Permainan Bilangan Bulat
            </p>
            <h1 className="font-display mt-3 text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl text-balance">
              INTEGER ADVENTURE
            </h1>
            <p className="mt-2.5 text-lg font-bold text-blue-700">
              Jelajahi Dunia Bilangan, Taklukkan Tantangan Matematika!
            </p>
            <p className="mt-4 max-w-xl text-base leading-relaxed text-slate-600">
              Siapkan dirimu! Dunia bilangan bulat sedang menantimu. Selesaikan setiap misi, kumpulkan bintang &amp;
              lencana, dan jadilah penjelajah matematika terbaik!
            </p>

            {/* Primary Dual CTAs */}
            <div className="mt-8 flex flex-col gap-3.5 sm:flex-row sm:items-center">
              <button
                type="button"
                onClick={handleStudentClick}
                className="game-btn-orange inline-flex min-h-[54px] items-center justify-center gap-2.5 rounded-2xl px-6 py-3.5 text-sm font-extrabold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-600 whitespace-nowrap"
              >
                <Play className="h-5 w-5 fill-white shrink-0" />
                <span>MULAI PETUALANGAN (SISWA)</span>
                <ArrowRight className="h-4 w-4 shrink-0" />
              </button>

              <button
                type="button"
                onClick={handleTeacherClick}
                className="game-btn-back inline-flex min-h-[54px] items-center justify-center gap-2.5 rounded-2xl px-6 py-3.5 text-sm font-extrabold text-blue-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 whitespace-nowrap"
              >
                <GraduationCap className="h-5 w-5 shrink-0 text-blue-600" />
                <span>MASUK SEBAGAI GURU</span>
              </button>
            </div>

            <div className="mt-6 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs font-semibold text-slate-500">
              <span>6 Pulau Operasi Interaktif</span>
              <span aria-hidden="true">·</span>
              <span>4 Game Misi Arena Arcade</span>
              <span aria-hidden="true">·</span>
              <span>8 Lencana Koleksi</span>
            </div>
          </div>

          <div className="lg:col-span-6">
            <div className="game-card relative h-full min-h-[300px] overflow-hidden bg-gradient-to-br from-sky-600 via-indigo-700 to-purple-700 p-0">
              {!heroImgError ? (
                <img
                  src="/src/assets/images/hero_integer_world_1794558986899.jpg"
                  alt="Ilustrasi dunia petualangan matematika INTEGER ADVENTURE dengan pulau tantangan, karakter penjelajah, dan simbol bilangan bulat"
                  referrerPolicy="no-referrer"
                  onError={() => setHeroImgError(true)}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full min-h-[320px] flex-col items-center justify-center p-8 text-center text-white">
                  <Compass className="h-16 w-16 text-amber-300" />
                  <p className="font-display mt-4 text-2xl font-bold">Dunia Bilangan Bulat</p>
                  <p className="mt-1 text-sm text-blue-100">6 Pulau Misi · Penjumlahan hingga Master Integer</p>
                </div>
              )}

              {/* Cute floating math tiles inside hero frame */}
              <div className="animate-float-gentle pointer-events-none absolute top-4 left-4 flex items-center gap-2">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl border-2 border-white/80 bg-emerald-500 font-mono-num text-sm font-extrabold text-white shadow-md">
                  +5
                </div>
                <div className="flex h-10 w-10 items-center justify-center rounded-xl border-2 border-white/80 bg-amber-500 font-mono-num text-sm font-extrabold text-white shadow-md">
                  -3
                </div>
                <div className="flex h-10 w-10 items-center justify-center rounded-xl border-2 border-white/80 bg-purple-600 font-mono-num text-sm font-extrabold text-white shadow-md">
                  ×4
                </div>
              </div>

              <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-950/85 via-slate-950/40 to-transparent p-5 text-white">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <img
                      src="/src/assets/images/avatar_owl_mentor_1794558987496.jpg"
                      alt="Mentor Burung Hantu"
                      referrerPolicy="no-referrer"
                      className="h-11 w-11 rounded-xl border-2 border-amber-300 object-cover shadow"
                    />
                    <div>
                      <p className="text-xs font-bold text-amber-300">Misi Terstruktur SMP</p>
                      <p className="font-display text-base font-extrabold">Gerbang Penjumlahan hingga Istana Master</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 rounded-xl bg-slate-900/70 px-3 py-1.5 text-amber-300">
                    <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                    <span className="font-mono-num text-xs font-extrabold text-white">18 Bintang &amp; 8 Lencana</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 6 Adventure Levels Preview */}
      <section id="peta-level" className="border-y-2 border-slate-200/80 bg-white py-14">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl">
            <p className="text-xs font-extrabold uppercase tracking-wider text-blue-700">Kurikulum &amp; Permainan Unik</p>
            <h2 className="font-display mt-1.5 text-2xl font-extrabold text-slate-900 sm:text-3xl text-balance">
              Enam Pulau &amp; 6 Macam Permainan Interaktif
            </h2>
            <p className="mt-2 text-sm text-slate-600">
              Bukan sekadar kuis pilihan ganda biasa — setiap pulau menghadirkan mekanisme permainan berbeda lengkap dengan pembahasan konsep dan sistem bintang.
            </p>
          </div>

          <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {LEVELS.map((lvl) => (
              <div
                key={lvl.id}
                className="game-card game-card-interactive flex flex-col justify-between bg-slate-50/60 p-5 hover:border-blue-300 hover:bg-white"
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <span
                        className={`flex h-9 w-9 items-center justify-center rounded-xl text-white shadow-xs ${lvl.badgeBg}`}
                      >
                        {renderLevelIcon(lvl.id)}
                      </span>
                      <span className="text-xs font-extrabold uppercase tracking-wider text-blue-700">
                        Level {lvl.id}
                      </span>
                    </div>
                    <span className="font-mono-num rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-700">
                      {lvl.sampleExpr}
                    </span>
                  </div>
                  <h3 className="font-display mt-3.5 text-lg font-extrabold text-slate-900">{lvl.title}</h3>
                  <p className="mt-0.5 text-xs font-bold text-purple-700">{lvl.subtitle}</p>
                  <p className="mt-1.5 inline-flex items-center gap-1.5 text-xs font-extrabold text-orange-600">
                    <Gamepad2 className="h-3.5 w-3.5 shrink-0" />
                    <span>Permainan: {lvl.gameName}</span>
                  </p>
                  <p className="mt-2 text-sm leading-relaxed text-slate-600">{lvl.gameTagline}</p>
                </div>
                <div className="mt-4 flex items-center justify-between border-t border-slate-200/80 pt-3 text-xs font-semibold text-slate-500">
                  <span>10 Ronde Bertahap</span>
                  <span className="flex items-center gap-1 text-amber-600">
                    <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-500" />
                    Hingga 3 Bintang
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Arena Arcade Showcase */}
      <section id="arena-arcade" className="mx-auto max-w-7xl px-4 pt-14 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="max-w-2xl">
            <p className="text-xs font-extrabold uppercase tracking-wider text-purple-700">Portal Game Misi Terpisah</p>
            <h2 className="font-display mt-1.5 text-2xl font-extrabold text-slate-900 sm:text-3xl text-balance">
              Arena Arcade: 4 Misi Petualangan Seru
            </h2>
            <p className="mt-2 text-sm text-slate-600">
              Selain 6 pulau latihan, siswa bisa bermain langsung di Arena Arcade dengan misi strategi, labirin, meracik ramuan, dan pertahanan meteor!
            </p>
          </div>
          <button
            type="button"
            onClick={handleStudentClick}
            className="game-btn-purple inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-xs font-extrabold whitespace-nowrap"
          >
            <Gamepad2 className="h-4 w-4" />
            <span>{studentLoggedIn ? 'Buka Arena Arcade' : 'Masuk & Mainkan'}</span>
          </button>
        </div>

        <div className="mt-7 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {[
            {
              title: 'Kapal Selam Harta Karun',
              desc: 'Menyelam mencari peti harta & hindari ranjau di kedalaman negatif.',
              img: '/src/assets/images/arcade_submarine_treasure_1794676821524.jpg',
              tag: '3 Zona Samudra',
            },
            {
              title: 'Kurir Kota Nol',
              desc: 'Susun rute labirin agar energi tepat 0 saat tiba di gerbang finish.',
              img: '/src/assets/images/arcade_courier_maze_1794676821878.jpg',
              tag: '5 Peta Teka-teki',
            },
            {
              title: 'Lab Ramuan Ajaib',
              desc: 'Campurkan kristal es, bara api, & katalis sesuai suhu pesanan.',
              img: '/src/assets/images/arcade_potion_lab_1794676821880.jpg',
              tag: '5 Pesanan Pelanggan',
            },
            {
              title: 'Komandan Perisai Meteor',
              desc: 'Rakit 2 kristal energi secara cepat untuk menembak jatuh meteor.',
              img: '/src/assets/images/arcade_asteroid_shield_1794676823529.jpg',
              tag: '3 Gelombang Real-Time',
            },
          ].map((item) => (
            <div key={item.title} className="game-card game-card-interactive overflow-hidden p-0 hover:border-purple-400">
              <div className="aspect-[4/3] w-full overflow-hidden bg-slate-900">
                <img
                  src={item.img}
                  alt={item.title}
                  referrerPolicy="no-referrer"
                  className="h-full w-full object-cover transition-transform duration-300 hover:scale-105"
                />
              </div>
              <div className="p-4">
                <p className="text-[11px] font-extrabold uppercase tracking-wider text-purple-700">{item.tag}</p>
                <h3 className="font-display mt-0.5 text-base font-extrabold text-slate-900">{item.title}</h3>
                <p className="mt-1.5 text-xs leading-relaxed text-slate-600">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Interactive Positive Blue & Negative Red Button Lab */}
      <section id="lab-bilangan" className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="game-card p-6 sm:p-8">
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
            <div className="lg:col-span-6">
              <p className="text-xs font-extrabold uppercase tracking-wider text-blue-700">
                Simulasi Konsep Bilangan Bulat
              </p>
              <h2 className="font-display mt-1.5 text-2xl font-extrabold text-slate-900 text-balance">
                Lab Tombol Positif (Biru) &amp; Negatif (Merah)
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">
                Tekan tombol <strong className="text-blue-700">Biru (+)</strong> untuk nilai positif atau tombol{' '}
                <strong className="text-red-600">Merah (−)</strong> untuk nilai negatif pada kedua bilangan, lalu lihat
                hasil gabungannya secara langsung!
              </p>

              <div className="mt-5 space-y-4">
                {/* Bilangan A Controls */}
                <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-3.5">
                  <div className="flex items-center justify-between text-xs font-extrabold">
                    <span className="text-slate-700">Bilangan Awal (a)</span>
                    <span
                      className={`font-mono-num rounded-lg px-2.5 py-0.5 text-sm ${
                        numA > 0
                          ? 'bg-blue-600 text-white'
                          : numA < 0
                            ? 'bg-red-600 text-white'
                            : 'bg-slate-200 text-slate-800'
                      }`}
                    >
                      {numA > 0 ? `+${numA}` : numA}
                    </span>
                  </div>
                  <div className="mt-2.5 flex flex-wrap gap-1.5">
                    {[-5, -1].map((d) => (
                      <button
                        key={`a-${d}`}
                        type="button"
                        onClick={() => setNumA((v) => Math.max(-20, v + d))}
                        className="font-mono-num min-h-[38px] flex-1 rounded-xl border-2 border-red-700 bg-red-600 px-2.5 py-1 text-xs font-extrabold text-white shadow-[0_2px_0_#991b1b] hover:bg-red-500 active:translate-y-0.5"
                      >
                        {d}
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => setNumA(0)}
                      className="min-h-[38px] rounded-xl border border-slate-300 bg-white px-3 py-1 text-xs font-bold text-slate-700 hover:bg-slate-100"
                    >
                      0
                    </button>
                    {[1, 5].map((d) => (
                      <button
                        key={`a-${d}`}
                        type="button"
                        onClick={() => setNumA((v) => Math.min(20, v + d))}
                        className="font-mono-num min-h-[38px] flex-1 rounded-xl border-2 border-blue-700 bg-blue-600 px-2.5 py-1 text-xs font-extrabold text-white shadow-[0_2px_0_#1e40af] hover:bg-blue-500 active:translate-y-0.5"
                      >
                        +{d}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Operator Selector */}
                <div>
                  <span className="block text-xs font-bold text-slate-700">Pilih Operasi</span>
                  <div className="mt-1.5 grid grid-cols-2 gap-2.5">
                    <button
                      type="button"
                      onClick={() => setOp('+')}
                      className={`rounded-xl border-2 px-3 py-2.5 text-sm font-extrabold transition-colors ${
                        op === '+'
                          ? 'border-blue-600 bg-blue-600 text-white shadow-[0_3px_0_#1d4ed8]'
                          : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      Penjumlahan (+)
                    </button>
                    <button
                      type="button"
                      onClick={() => setOp('-')}
                      className={`rounded-xl border-2 px-3 py-2.5 text-sm font-extrabold transition-colors ${
                        op === '-'
                          ? 'border-purple-600 bg-purple-600 text-white shadow-[0_3px_0_#6b21a8]'
                          : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      Pengurangan (−)
                    </button>
                  </div>
                </div>

                {/* Bilangan B Controls */}
                <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-3.5">
                  <div className="flex items-center justify-between text-xs font-extrabold">
                    <span className="text-slate-700">Bilangan Kedua (b)</span>
                    <span
                      className={`font-mono-num rounded-lg px-2.5 py-0.5 text-sm ${
                        numB > 0
                          ? 'bg-blue-600 text-white'
                          : numB < 0
                            ? 'bg-red-600 text-white'
                            : 'bg-slate-200 text-slate-800'
                      }`}
                    >
                      {numB > 0 ? `+${numB}` : numB}
                    </span>
                  </div>
                  <div className="mt-2.5 flex flex-wrap gap-1.5">
                    {[-5, -1].map((d) => (
                      <button
                        key={`b-${d}`}
                        type="button"
                        onClick={() => setNumB((v) => Math.max(-20, v + d))}
                        className="font-mono-num min-h-[38px] flex-1 rounded-xl border-2 border-red-700 bg-red-600 px-2.5 py-1 text-xs font-extrabold text-white shadow-[0_2px_0_#991b1b] hover:bg-red-500 active:translate-y-0.5"
                      >
                        {d}
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => setNumB(0)}
                      className="min-h-[38px] rounded-xl border border-slate-300 bg-white px-3 py-1 text-xs font-bold text-slate-700 hover:bg-slate-100"
                    >
                      0
                    </button>
                    {[1, 5].map((d) => (
                      <button
                        key={`b-${d}`}
                        type="button"
                        onClick={() => setNumB((v) => Math.min(20, v + d))}
                        className="font-mono-num min-h-[38px] flex-1 rounded-xl border-2 border-blue-700 bg-blue-600 px-2.5 py-1 text-xs font-extrabold text-white shadow-[0_2px_0_#1e40af] hover:bg-blue-500 active:translate-y-0.5"
                      >
                        +{d}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-col justify-between rounded-2xl border-2 border-slate-200 bg-slate-50/70 p-5 lg:col-span-6">
              {(() => {
                const effectiveB = op === '+' ? numB : -numB;
                const totalPos = (numA > 0 ? numA : 0) + (effectiveB > 0 ? effectiveB : 0);
                const totalNeg = (numA < 0 ? Math.abs(numA) : 0) + (effectiveB < 0 ? Math.abs(effectiveB) : 0);
                const pairCount = Math.min(totalPos, totalNeg);
                const remPos = Math.max(0, totalPos - pairCount);
                const remNeg = Math.max(0, totalNeg - pairCount);

                return (
                  <>
                    <div>
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-4">
                        <div className="font-mono-num text-2xl font-extrabold text-slate-900">
                          {numA < 0 ? `(${numA})` : numA} {op} {numB < 0 ? `(${numB})` : numB} ={' '}
                          <span
                            className={
                              resultVal > 0 ? 'text-blue-700' : resultVal < 0 ? 'text-red-600' : 'text-slate-700'
                            }
                          >
                            {resultVal > 0 ? `+${resultVal}` : resultVal}
                          </span>
                        </div>
                        <span
                          className={`rounded-lg px-2.5 py-1 text-xs font-extrabold ${
                            resultVal > 0
                              ? 'bg-blue-100 text-blue-800'
                              : resultVal < 0
                                ? 'bg-red-100 text-red-800'
                                : 'bg-slate-200 text-slate-700'
                          }`}
                        >
                          {resultVal > 0
                            ? `Sisa ${remPos} Tombol (+) Biru`
                            : resultVal < 0
                              ? `Sisa ${remNeg} Tombol (−) Merah`
                              : 'Semua Habis Berpasangan (0)'}
                        </span>
                      </div>

                      {/* Step 1: Individual Buttons Displayed */}
                      <div className="mt-4 space-y-3">
                        <div className="rounded-2xl border border-slate-200 bg-white p-3.5">
                          <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-bold text-slate-600">
                            <span>Semua Tombol yang Dipasang:</span>
                            <span>
                              <span className="text-red-600">{totalNeg} tombol (−)</span>
                              <span aria-hidden="true"> · </span>
                              <span className="text-blue-700">{totalPos} tombol (+)</span>
                            </span>
                          </div>

                          <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                            {totalNeg === 0 && totalPos === 0 ? (
                              <span className="text-xs font-semibold text-slate-400">Belum ada tombol (+ atau −)</span>
                            ) : (
                              <>
                                {Array.from({ length: Math.min(totalNeg, 15) }, (_, idx) => (
                                  <span
                                    key={`neg-all-${idx}`}
                                    className="font-mono-num inline-flex h-8 w-8 items-center justify-center rounded-lg border-2 border-red-700 bg-red-600 text-sm font-extrabold text-white shadow-xs"
                                  >
                                    −
                                  </span>
                                ))}
                                {totalNeg > 15 && (
                                  <span className="font-mono-num rounded-lg bg-red-100 px-2 py-1 text-xs font-extrabold text-red-700">
                                    +{totalNeg - 15} (−)
                                  </span>
                                )}
                                {Array.from({ length: Math.min(totalPos, 15) }, (_, idx) => (
                                  <span
                                    key={`pos-all-${idx}`}
                                    className="font-mono-num inline-flex h-8 w-8 items-center justify-center rounded-lg border-2 border-blue-700 bg-blue-600 text-sm font-extrabold text-white shadow-xs"
                                  >
                                    +
                                  </span>
                                ))}
                                {totalPos > 15 && (
                                  <span className="font-mono-num rounded-lg bg-blue-100 px-2 py-1 text-xs font-extrabold text-blue-700">
                                    +{totalPos - 15} (+)
                                  </span>
                                )}
                              </>
                            )}
                          </div>
                        </div>

                        {/* Step 2: Zero Pairs */}
                        {pairCount > 0 && (
                          <div className="rounded-2xl border border-slate-200 bg-slate-100/80 p-3">
                            <p className="text-xs font-bold text-slate-600">
                              Pasangan Saling Menghapus ({pairCount} pasang = 0):
                            </p>
                            <div className="mt-2 flex flex-wrap items-center gap-2">
                              {Array.from({ length: Math.min(pairCount, 8) }, (_, idx) => (
                                <div
                                  key={`pair-${idx}`}
                                  className="inline-flex items-center gap-1 rounded-xl border border-slate-300 bg-white px-2 py-1 opacity-75"
                                >
                                  <span className="font-mono-num inline-flex h-6 w-6 items-center justify-center rounded-md bg-red-600 text-xs font-extrabold text-white">
                                    −
                                  </span>
                                  <span className="font-mono-num inline-flex h-6 w-6 items-center justify-center rounded-md bg-blue-600 text-xs font-extrabold text-white">
                                    +
                                  </span>
                                  <span className="font-mono-num text-[11px] font-extrabold text-slate-500">=0</span>
                                </div>
                              ))}
                              {pairCount > 8 && (
                                <span className="text-xs font-bold text-slate-500">
                                  +{pairCount - 8} pasang lainnya (=0)
                                </span>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Step 3: Remaining Result */}
                        <div>
                          <p className="text-xs font-extrabold text-slate-700">
                            Hasil = Sisa Tombol yang Tidak Punya Pasangan:
                          </p>
                          <div className="mt-2 flex min-h-[68px] flex-wrap items-center gap-2 rounded-2xl border-2 border-dashed border-slate-300 bg-white p-3.5">
                            {resultVal === 0 ? (
                              <span className="font-mono-num rounded-xl border-2 border-slate-300 bg-slate-100 px-4 py-2 text-sm font-extrabold text-slate-700">
                                0 · Tidak ada tombol tersisa
                              </span>
                            ) : (
                              <>
                                {Array.from({ length: Math.min(Math.abs(resultVal), 15) }, (_, idx) => (
                                  <span
                                    key={`rem-${idx}`}
                                    className={`font-mono-num inline-flex h-10 w-10 items-center justify-center rounded-xl border-2 text-base font-extrabold text-white shadow-sm ${
                                      resultVal > 0
                                        ? 'border-blue-700 bg-blue-600 shadow-[0_2px_0_#1d4ed8]'
                                        : 'border-red-700 bg-red-600 shadow-[0_2px_0_#b91c1c]'
                                    }`}
                                  >
                                    {resultVal > 0 ? '+' : '−'}
                                  </span>
                                ))}
                                {Math.abs(resultVal) > 15 && (
                                  <span
                                    className={`font-mono-num rounded-xl border-2 px-3 py-1.5 text-xs font-extrabold text-white ${
                                      resultVal > 0 ? 'border-blue-700 bg-blue-600' : 'border-red-700 bg-red-600'
                                    }`}
                                  >
                                    +{Math.abs(resultVal) - 15} tombol lagi
                                  </span>
                                )}
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    <p className="mt-4 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-semibold text-slate-600">
                      {pairCount > 0
                        ? `Ada ${totalNeg} tombol (−) merah dan ${totalPos} tombol (+) biru. Sebanyak ${pairCount} pasang saling menghilangkan menjadi 0, sehingga sisanya ${Math.abs(resultVal)} tombol ${resultVal > 0 ? '(+) biru' : resultVal < 0 ? '(−) merah' : ''} = ${resultVal}.`
                        : `Semua ${Math.abs(resultVal)} tombol bertanda sama (${resultVal > 0 ? 'Biru +' : resultVal < 0 ? 'Merah −' : '0'}), sehingga hasilnya ${resultVal}.`}
                    </p>
                  </>
                );
              })()}
            </div>
          </div>
        </div>
      </section>

      {/* Teacher & Competition Features */}
      <section id="fitur-kelas" className="border-t-2 border-slate-200/80 bg-white py-14">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            <div className="game-card p-6">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-100 text-blue-700">
                <Lock className="h-5 w-5" />
              </div>
              <h3 className="font-display mt-4 text-lg font-extrabold text-slate-900">Masuk Cukup Pakai Kode Kelas</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">
                Siswa cukup memasukkan Kode Kelas dari guru lalu memilih namanya. Cepat, bebas ribet, dan langsung bermain!
              </p>
            </div>

            <div className="game-card p-6">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-purple-100 text-purple-700">
                <Trophy className="h-5 w-5" />
              </div>
              <h3 className="font-display mt-4 text-lg font-extrabold text-slate-900">Kompetisi Kelas Real-Time</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">
                Guru membuat kode ruang kompetisi, memantau siswa di ruang tunggu, memulai serentak, dan melihat
                leaderboard secara langsung.
              </p>
            </div>

            <div className="game-card p-6">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
                <BookOpen className="h-5 w-5" />
              </div>
              <h3 className="font-display mt-4 text-lg font-extrabold text-slate-900">Laporan PDF &amp; Excel</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">
                Semua hasil evaluasi dan lencana otomatis masuk ke dashboard guru lengkap dengan unduhan PDF dan Excel.
              </p>
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t border-slate-200 bg-slate-50 py-6">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 text-xs text-slate-500 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center justify-between gap-3 sm:flex-row">
            <div className="flex items-center gap-2 font-semibold text-slate-700">
              <Award className="h-4 w-4 text-blue-600" />
              <span>INTEGER ADVENTURE · Edukasi Matematika Bilangan Bulat SMP</span>
            </div>
            <div className="flex items-center gap-4">
              <button type="button" onClick={handleTeacherClick} className="font-semibold hover:text-blue-700">
                Portal Guru
              </button>
              <span aria-hidden="true">·</span>
              <button type="button" onClick={handleStudentClick} className="font-semibold hover:text-blue-700">
                Portal Siswa
              </button>
            </div>
          </div>
          <div className="border-t border-slate-200/80 pt-3 text-center sm:text-left">
            <AppSignature compact />
          </div>
        </div>
      </footer>
    </div>
  );
};
