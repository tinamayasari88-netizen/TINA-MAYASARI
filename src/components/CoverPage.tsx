import React, { useState } from 'react';
import { ArrowRight, Compass, Gamepad2, GraduationCap, Play, Star } from 'lucide-react';
import coverArtwork from '../assets/images/cover_integer_adventure_1794882222959.jpg';
import { AppSignature } from './AppSignature';

interface CoverPageProps {
  teacherLoggedIn: boolean;
  studentLoggedIn: boolean;
  onEnterDashboard: () => void;
  onOpenStudentLogin: () => void;
  onOpenTeacherLogin: () => void;
}

export const CoverPage: React.FC<CoverPageProps> = ({
  onEnterDashboard,
  onOpenStudentLogin,
  onOpenTeacherLogin,
}) => {
  const [imgError, setImgError] = useState(false);

  const primaryLabel = 'Masuk ke Dashboard';

  return (
    <div className="game-canvas relative flex min-h-screen flex-col justify-between overflow-x-hidden text-slate-900">
      {/* Subtle Top Cover Header */}
      <header className="relative z-10 mx-auto flex w-full max-w-7xl items-center justify-between gap-6 px-4 pt-5 pb-2 sm:px-6 lg:px-8">
        <div className="font-display flex items-center gap-2.5 text-lg font-extrabold tracking-tight text-blue-700 whitespace-nowrap shrink-0">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white shadow-[0_3px_0_#1d4ed8]">
            <Compass className="h-5 w-5" />
          </span>
          <span>INTEGER ADVENTURE</span>
        </div>

        <div className="flex items-center gap-4 text-xs font-bold text-slate-600 sm:text-sm">
          <button
            type="button"
            onClick={onOpenStudentLogin}
            className="whitespace-nowrap hover:text-blue-700 transition-colors"
          >
            Login Siswa
          </button>
          <span aria-hidden="true" className="text-slate-300">
            ·
          </span>
          <button
            type="button"
            onClick={onOpenTeacherLogin}
            className="whitespace-nowrap hover:text-blue-700 transition-colors"
          >
            Login Guru
          </button>
        </div>
      </header>

      {/* Main Game Cover Stage */}
      <main className="relative z-10 mx-auto flex w-full max-w-7xl flex-1 items-center px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        <div className="grid w-full grid-cols-1 items-stretch gap-8 lg:grid-cols-12">
          {/* Cover Typography & Primary CTA */}
          <div className="flex flex-col justify-center lg:col-span-5">
            <p className="text-xs font-extrabold uppercase tracking-wider text-blue-700">
              Edisi Petualangan Matematika SMP
            </p>
            <h1 className="font-display mt-3 text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl lg:text-[3.35rem] lg:leading-[1.08] text-balance">
              INTEGER ADVENTURE
            </h1>
            <p className="mt-3 text-lg font-bold text-orange-600">
              Jelajahi Dunia Bilangan Bulat Positif &amp; Negatif!
            </p>
            <p className="mt-4 max-w-lg text-base leading-relaxed text-slate-600">
              Mulai dari sampul ini untuk memasuki dashboard petualangan. Kumpulkan bintang dari 6 pulau tantangan,
              mainkan 4 misi Arena Arcade, dan ikuti kompetisi kelas secara langsung.
            </p>

            {/* Single Dominant Primary Action */}
            <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:items-center">
              <button
                type="button"
                onClick={onEnterDashboard}
                className="game-btn-orange inline-flex min-h-[56px] items-center justify-center gap-3 rounded-2xl px-7 py-3.5 text-base font-extrabold whitespace-nowrap focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-600"
              >
                <Play className="h-5 w-5 fill-white shrink-0" />
                <span>{primaryLabel}</span>
                <ArrowRight className="h-5 w-5 shrink-0" />
              </button>
            </div>

            <div className="mt-6 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs font-semibold text-slate-500">
              <span>6 Pulau Operasi</span>
              <span aria-hidden="true">·</span>
              <span>4 Misi Arcade</span>
              <span aria-hidden="true">·</span>
              <span>Masuk Siswa Cukup Kode Kelas</span>
            </div>
          </div>

          {/* Official Cover Artwork Frame */}
          <div className="lg:col-span-7">
            <div className="game-card relative h-full min-h-[320px] overflow-hidden bg-gradient-to-br from-sky-500 via-blue-600 to-indigo-700 p-0 shadow-[0_14px_34px_rgba(30,64,175,0.18)]">
              {!imgError ? (
                <img
                  src={coverArtwork}
                  alt="Sampul resmi INTEGER ADVENTURE menampilkan petualangan matematika bilangan bulat"
                  referrerPolicy="no-referrer"
                  onError={() => setImgError(true)}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full min-h-[380px] flex-col items-center justify-center p-10 text-center text-white">
                  <Compass className="h-20 w-20 text-amber-300" />
                  <h2 className="font-display mt-4 text-3xl font-extrabold">INTEGER ADVENTURE</h2>
                  <p className="mt-2 max-w-md text-sm text-sky-100">
                    Petualangan Matematika Bilangan Bulat SMP
                  </p>
                </div>
              )}

              {/* Cover Caption Scrim */}
              <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-950/85 via-slate-950/35 to-transparent p-5 text-white sm:p-6">
                <div className="flex flex-wrap items-end justify-between gap-4">
                  <div>
                    <p className="text-xs font-extrabold uppercase tracking-wider text-amber-300">
                      Sampul Petualangan Matematika
                    </p>
                    <p className="font-display mt-0.5 text-lg font-extrabold sm:text-xl">
                      6 Pulau Operasi · Arena Arcade · Kompetisi Kelas
                    </p>
                  </div>
                  <div className="flex items-center gap-3 text-xs font-bold text-amber-200">
                    <span className="inline-flex items-center gap-1">
                      <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                      18 Bintang
                    </span>
                    <span aria-hidden="true">·</span>
                    <span className="inline-flex items-center gap-1">
                      <Gamepad2 className="h-4 w-4 text-sky-300" />
                      10 Permainan
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Quiet Cover Footer */}
      <footer className="relative z-10 mx-auto flex w-full max-w-7xl flex-col gap-2 px-4 py-4 text-xs font-semibold text-slate-500 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span>INTEGER ADVENTURE · Matematika Bilangan Bulat SMP</span>
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={onOpenStudentLogin}
              className="inline-flex items-center gap-1.5 text-blue-700 hover:underline"
            >
              <Play className="h-3.5 w-3.5" />
              <span>Masuk Siswa (Kode Kelas)</span>
            </button>
            <span aria-hidden="true">·</span>
            <button
              type="button"
              onClick={onOpenTeacherLogin}
              className="inline-flex items-center gap-1.5 text-slate-700 hover:text-blue-700 hover:underline"
            >
              <GraduationCap className="h-3.5 w-3.5" />
              <span>Login Guru</span>
            </button>
          </div>
        </div>
        <div className="border-t border-slate-200/70 pt-2 text-center sm:text-left">
          <AppSignature compact />
        </div>
      </footer>
    </div>
  );
};
