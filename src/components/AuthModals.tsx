import React, { useState } from 'react';
import { signInWithPopup } from 'firebase/auth';
import {
  ArrowLeft,
  CheckCircle2,
  Compass,
  GraduationCap,
  KeyRound,
  School,
  Sparkles,
  UserCheck,
} from 'lucide-react';
import { auth, googleProvider, syncTeacherProfileToFirestore } from '../firebase';
import { AVATAR_OPTIONS, getAvatarImage, type StudentRecord, type TeacherUser } from '../shared/levels';
import { apiFetch, setStudentToken, setTeacherToken } from '../utils/authSession';

interface TeacherAuthModalProps {
  onClose: () => void;
  onSuccess: (teacher: TeacherUser) => void;
}

export const TeacherAuthView: React.FC<TeacherAuthModalProps> = ({ onClose, onSuccess }) => {
  const [tab, setTab] = useState<'login' | 'register'>('login');
  const [name, setName] = useState('');
  const [schoolName, setSchoolName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const endpoint = tab === 'login' ? '/api/auth/teacher/login' : '/api/auth/teacher/register';
      const body =
        tab === 'login'
          ? { email, password }
          : { name, schoolName, email, password };

      const res = await apiFetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = (await res.json()) as { teacher?: TeacherUser; token?: string; error?: string };
      if (!res.ok || !data.teacher) {
        setError(data.error || 'Terjadi kesalahan saat memproses akun.');
        return;
      }
      if (data.token) setTeacherToken(data.token);
      onSuccess(data.teacher);
    } catch {
      setError('Tidak dapat terhubung ke server. Periksa koneksi Anda.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError('');
    setLoading(true);
    try {
      const cred = await signInWithPopup(auth, googleProvider);
      const user = cred.user;
      if (!user.email) {
        setError('Akun Google tidak memiliki email terverifikasi.');
        return;
      }
      const res = await apiFetch('/api/auth/teacher/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          uid: user.uid,
          email: user.email,
          name: user.displayName || user.email.split('@')[0],
        }),
      });
      const data = (await res.json()) as { teacher?: TeacherUser; token?: string; error?: string };
      if (!res.ok || !data.teacher) {
        setError(data.error || 'Gagal menyinkronkan akun Google.');
        return;
      }
      if (data.token) setTeacherToken(data.token);
      if (data.teacher.id === user.uid) {
        await syncTeacherProfileToFirestore(data.teacher).catch(() => {});
      }
      onSuccess(data.teacher);
    } catch (err) {
      const msg = err instanceof Error ? err.message : '';
      if (!msg.includes('popup-closed-by-user')) {
        setError('Gagal masuk dengan Google. Pastikan pop-up browser tidak diblokir.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="game-canvas min-h-screen px-4 py-8 sm:px-6 lg:py-12">
      <div className="mx-auto max-w-4xl">
        <button
          type="button"
          onClick={onClose}
          className="game-btn-back inline-flex min-h-[42px] items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Kembali ke Beranda</span>
        </button>

        <div className="mt-5 grid grid-cols-1 items-stretch gap-6 lg:grid-cols-12">
          {/* Friendly Owl Mentor Guide Card */}
          <div className="game-card flex flex-col justify-between bg-gradient-to-br from-blue-600 via-indigo-700 to-purple-700 p-6 text-white sm:p-8 lg:col-span-5">
            <div>
              <div className="flex items-center gap-3">
                <img
                  src="/src/assets/images/avatar_owl_mentor_1794558987496.jpg"
                  alt="Mentor Burung Hantu"
                  referrerPolicy="no-referrer"
                  className="h-14 w-14 rounded-2xl border-3 border-amber-300 object-cover shadow-md"
                />
                <div>
                  <p className="text-xs font-extrabold uppercase tracking-wider text-amber-300">Portal Guru</p>
                  <h1 className="font-display text-2xl font-extrabold text-white">Kelola Kelas Lebih Mudah</h1>
                </div>
              </div>

              <p className="mt-4 text-sm leading-relaxed text-blue-100">
                Masuk cukup sekali klik dengan Google. Semua data kelas, kode siswa, ruang kompetisi, dan laporan nilai
                tersimpan aman di cloud.
              </p>

              <ul className="mt-6 space-y-3 text-xs font-semibold text-white/95">
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" />
                  <span>Otomatis membuat Kode Kelas &amp; Kode Siswa (murid tidak perlu akun email)</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" />
                  <span>Pantau kompetisi kelas real-time &amp; perkembangan 6 level operasi</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" />
                  <span>Unduh rekap evaluasi siap cetak dalam format PDF &amp; Excel</span>
                </li>
              </ul>
            </div>

            <div className="mt-6 rounded-2xl border border-white/20 bg-white/10 p-3.5 text-xs text-blue-50">
              Tips: Gunakan tombol <strong>Masuk dengan Google</strong> agar data otomatis tersinkronisasi ke perangkat
              mana pun.
            </div>
          </div>

          {/* Auth Actions Card */}
          <div className="game-card p-6 sm:p-8 lg:col-span-7">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-100 text-blue-700">
                <GraduationCap className="h-6 w-6" />
              </div>
              <div>
                <h2 className="font-display text-xl font-extrabold text-slate-900">Masuk Dashboard Guru</h2>
                <p className="text-xs text-slate-500">Pilih cara masuk tercepat di bawah ini</p>
              </div>
            </div>

            {/* Recommended Instant Google Sign-In at Top */}
            <div className="mt-5">
              <button
                type="button"
                disabled={loading}
                onClick={handleGoogleSignIn}
                className="flex min-h-[50px] w-full items-center justify-center gap-3 rounded-2xl border-2 border-blue-200 bg-blue-50/70 px-4 py-3 text-sm font-extrabold text-slate-900 shadow-[0_3px_0_#bfdbfe] transition-all hover:-translate-y-0.5 hover:border-blue-400 hover:bg-blue-50 disabled:opacity-60"
              >
                <svg className="h-5 w-5 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
                  <path
                    fill="#4285F4"
                    d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17Z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.11-6.72-4.96H1.29v3.14C3.26 21.3 7.31 24 12 24Z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.28 14.24c-.24-.72-.38-1.49-.38-2.24s.14-1.52.38-2.24V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.99-3.14Z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.99 3.14c.95-2.85 3.6-4.96 6.72-4.96Z"
                  />
                </svg>
                <span>Masuk Sekali Klik dengan Google (Direkomendasikan)</span>
              </button>
            </div>

            <div className="my-5 flex items-center gap-3 text-xs font-semibold text-slate-400">
              <div className="h-px flex-1 bg-slate-200" />
              <span>atau gunakan email &amp; kata sandi</span>
              <div className="h-px flex-1 bg-slate-200" />
            </div>

            {/* Segmented control */}
            <div className="grid grid-cols-2 gap-1 rounded-xl bg-slate-100 p-1">
              <button
                type="button"
                onClick={() => {
                  setTab('login');
                  setError('');
                }}
                className={`rounded-lg py-2 text-xs font-bold transition-colors ${
                  tab === 'login' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Masuk Email Guru
              </button>
              <button
                type="button"
                onClick={() => {
                  setTab('register');
                  setError('');
                }}
                className={`rounded-lg py-2 text-xs font-bold transition-colors ${
                  tab === 'register' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Daftar Guru Baru
              </button>
            </div>

            <form onSubmit={handleSubmit} className="mt-4 space-y-3.5">
              {tab === 'register' && (
                <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
                  <div>
                    <label className="block text-xs font-bold text-slate-700" htmlFor="teacher-name">
                      Nama Lengkap Guru
                    </label>
                    <input
                      id="teacher-name"
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Ibu Sari Dewi, S.Pd."
                      className="mt-1 w-full rounded-xl border-2 border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-900 focus:border-blue-600 focus:bg-white focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700" htmlFor="teacher-school">
                      Nama Sekolah (Opsional)
                    </label>
                    <div className="relative mt-1">
                      <School className="pointer-events-none absolute top-3 left-3 h-4 w-4 text-slate-400" />
                      <input
                        id="teacher-school"
                        type="text"
                        value={schoolName}
                        onChange={(e) => setSchoolName(e.target.value)}
                        placeholder="SMPN 1 Nusantara"
                        className="w-full rounded-xl border-2 border-slate-200 bg-slate-50 py-2.5 pr-3.5 pl-9 text-sm text-slate-900 focus:border-blue-600 focus:bg-white focus:outline-none"
                      />
                    </div>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700" htmlFor="teacher-email">
                  Email Guru
                </label>
                <input
                  id="teacher-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="guru@sekolah.sch.id"
                  className="mt-1 w-full rounded-xl border-2 border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-900 focus:border-blue-600 focus:bg-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700" htmlFor="teacher-password">
                  Kata Sandi
                </label>
                <input
                  id="teacher-password"
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Minimal 6 karakter"
                  className="mt-1 w-full rounded-xl border-2 border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-900 focus:border-blue-600 focus:bg-white focus:outline-none"
                />
              </div>

              {error && (
                <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs font-semibold text-red-700">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="game-btn-blue min-h-[48px] w-full rounded-xl py-3 text-sm font-extrabold disabled:opacity-60"
              >
                {loading
                  ? 'Memproses...'
                  : tab === 'login'
                    ? 'Masuk dengan Email'
                    : 'Buat Akun & Buka Dashboard'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

interface StudentAuthViewProps {
  onClose: () => void;
  onSuccess: (student: StudentRecord) => void;
}

interface LookupStudentItem {
  id: string;
  fullName: string;
  avatarId: 'boy' | 'girl' | 'owl';
  totalStars: number;
  unlockedLevel: number;
}

interface LookupClassInfo {
  id: string;
  name: string;
  classCode: string;
  passingGrade: number;
}

export const StudentAuthView: React.FC<StudentAuthViewProps> = ({ onClose, onSuccess }) => {
  const [classCode, setClassCode] = useState('');
  const [matchedClass, setMatchedClass] = useState<LookupClassInfo | null>(null);
  const [roster, setRoster] = useState<LookupStudentItem[]>([]);
  const [nameSearch, setNameSearch] = useState('');
  const [showNewNameForm, setShowNewNameForm] = useState(false);
  const [newFullName, setNewFullName] = useState('');
  const [newAvatarId, setNewAvatarId] = useState<'boy' | 'girl' | 'owl'>('boy');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLookupClass = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const normalized = classCode.trim().toUpperCase().replace(/\s+/g, '');
      const res = await apiFetch('/api/auth/student/class-lookup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ classCode: normalized }),
      });
      const data = (await res.json()) as {
        classRoom?: LookupClassInfo;
        students?: LookupStudentItem[];
        error?: string;
      };
      if (!res.ok || !data.classRoom) {
        setError(data.error || 'Kode kelas tidak ditemukan.');
        return;
      }
      setMatchedClass(data.classRoom);
      const list = data.students || [];
      setRoster(list);
      setShowNewNameForm(list.length === 0);
      setNameSearch('');
    } catch {
      setError('Gagal terhubung ke server. Periksa koneksi internet Anda.');
    } finally {
      setLoading(false);
    }
  };

  const handlePickExistingStudent = async (studentId: string) => {
    if (!matchedClass) return;
    setError('');
    setLoading(true);
    try {
      const res = await apiFetch('/api/auth/student/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          classCode: matchedClass.classCode,
          studentId,
        }),
      });
      const data = (await res.json()) as { student?: StudentRecord; token?: string; error?: string };
      if (!res.ok || !data.student) {
        setError(data.error || 'Gagal masuk ke profil siswa.');
        return;
      }
      if (data.token) setStudentToken(data.token);
      onSuccess(data.student);
    } catch {
      setError('Gagal terhubung ke server. Periksa koneksi internet Anda.');
    } finally {
      setLoading(false);
    }
  };

  const handleJoinWithName = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!matchedClass || !newFullName.trim()) return;
    setError('');
    setLoading(true);
    try {
      const res = await apiFetch('/api/auth/student/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          classCode: matchedClass.classCode,
          fullName: newFullName.trim(),
          avatarId: newAvatarId,
        }),
      });
      const data = (await res.json()) as { student?: StudentRecord; token?: string; error?: string };
      if (!res.ok || !data.student) {
        setError(data.error || 'Gagal bergabung ke kelas.');
        return;
      }
      if (data.token) setStudentToken(data.token);
      onSuccess(data.student);
    } catch {
      setError('Gagal terhubung ke server. Periksa koneksi internet Anda.');
    } finally {
      setLoading(false);
    }
  };

  const filteredRoster = roster.filter((s) =>
    !nameSearch.trim() ? true : s.fullName.toLowerCase().includes(nameSearch.trim().toLowerCase())
  );

  return (
    <div className="game-canvas min-h-screen px-4 py-8 sm:px-6 lg:py-12">
      <div className="mx-auto max-w-4xl">
        <button
          type="button"
          onClick={onClose}
          className="game-btn-back inline-flex min-h-[42px] items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Kembali</span>
        </button>

        <div className="mt-5 grid grid-cols-1 items-stretch gap-6 lg:grid-cols-12">
          {/* Cute Welcome Explorer Card */}
          <div className="game-card flex flex-col justify-between bg-gradient-to-br from-amber-400 via-orange-500 to-rose-500 p-6 text-white sm:p-8 lg:col-span-5">
            <div>
              <div className="flex items-center gap-3">
                <img
                  src="/src/assets/images/avatar_boy_explorer_1794558987159.jpg"
                  alt="Karakter Penjelajah"
                  referrerPolicy="no-referrer"
                  className="h-15 w-15 rounded-2xl border-3 border-white object-cover shadow-md"
                />
                <div>
                  <p className="text-xs font-extrabold uppercase tracking-wider text-amber-100">Portal Siswa</p>
                  <h1 className="font-display text-2xl font-extrabold text-white">Siap Bertualang!</h1>
                </div>
              </div>

              <p className="mt-4 text-sm leading-relaxed text-amber-50">
                Masuk super gampang! Cukup ketik <strong>Kode Kelas</strong> dari gurumu, tidak perlu email, password,
                atau kode siswa lagi.
              </p>

              <div className="mt-6 flex items-center gap-3 rounded-2xl border border-white/25 bg-white/15 p-3.5">
                <div className="flex -space-x-2 shrink-0">
                  {AVATAR_OPTIONS.map((av) => (
                    <img
                      key={av.id}
                      src={getAvatarImage(av.id)}
                      alt={av.label}
                      referrerPolicy="no-referrer"
                      className="h-10 w-10 rounded-full border-2 border-white object-cover shadow-xs"
                    />
                  ))}
                </div>
                <p className="text-xs font-bold text-white">
                  Pilih karakter favoritmu dan taklukkan 6 pulau operasi + 4 misi Arena Arcade!
                </p>
              </div>
            </div>

            <div className="mt-6 rounded-2xl border border-white/25 bg-slate-950/20 p-3.5 text-xs text-amber-50">
              <span className="inline-flex items-center gap-1.5 font-extrabold text-white">
                <Sparkles className="h-3.5 w-3.5" /> Info Cepat:
              </span>{' '}
              Tanyakan <strong>Kode Kelas</strong> ke gurumu (contoh: <span className="font-mono-num">VIIA123</span>),
              lalu ketuk namamu untuk langsung mulai!
            </div>
          </div>

          {/* Class-Code Only Login Card */}
          <div className="game-card p-6 sm:p-8 lg:col-span-7">
            {!matchedClass ? (
              <>
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-orange-100 text-orange-600">
                    <Compass className="h-6 w-6" />
                  </div>
                  <div>
                    <h2 className="font-display text-xl font-extrabold text-slate-900">Masuk Pakai Kode Kelas</h2>
                    <p className="text-xs text-slate-500">Hanya perlu 1 Kode Kelas dari gurumu</p>
                  </div>
                </div>

                <form onSubmit={handleLookupClass} className="mt-6 space-y-5">
                  <div>
                    <label
                      className="block text-xs font-extrabold text-slate-800"
                      htmlFor="student-class-code"
                    >
                      Kode Kelas (Contoh: VIIA123)
                    </label>
                    <div className="relative mt-2">
                      <KeyRound className="pointer-events-none absolute top-4 left-3.5 h-5 w-5 text-slate-400" />
                      <input
                        id="student-class-code"
                        type="text"
                        required
                        autoFocus
                        value={classCode}
                        onChange={(e) => {
                          setClassCode(e.target.value.toUpperCase());
                          setError('');
                        }}
                        placeholder="Ketik Kode Kelas..."
                        className="font-mono-num w-full rounded-2xl border-2 border-slate-200 bg-slate-50 py-3.5 pr-4 pl-11 text-lg font-extrabold uppercase tracking-wider text-slate-900 focus:border-blue-600 focus:bg-white focus:outline-none"
                      />
                    </div>
                  </div>

                  {error && (
                    <div
                      role="alert"
                      className="rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs font-semibold text-red-700"
                    >
                      {error}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={loading || !classCode.trim()}
                    className="game-btn-orange min-h-[54px] w-full rounded-2xl py-3.5 text-base font-extrabold disabled:opacity-60"
                  >
                    {loading ? 'Mencari Kelas...' : 'Masuk ke Kelas'}
                  </button>
                </form>
              </>
            ) : (
              <div>
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-4">
                  <div>
                    <p className="text-xs font-extrabold uppercase tracking-wider text-blue-700">
                      Kode Kelas: <span className="font-mono-num">{matchedClass.classCode}</span>
                    </p>
                    <h2 className="font-display mt-0.5 text-xl font-extrabold text-slate-900">
                      {matchedClass.name}
                    </h2>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setMatchedClass(null);
                      setRoster([]);
                      setError('');
                    }}
                    className="rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-50"
                  >
                    Ganti Kode Kelas
                  </button>
                </div>

                {error && (
                  <div
                    role="alert"
                    className="mt-4 rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs font-semibold text-red-700"
                  >
                    {error}
                  </div>
                )}

                {roster.length > 0 && !showNewNameForm ? (
                  <div className="mt-4 space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-xs font-bold text-slate-600">
                        Ketuk namamu di bawah ini ({roster.length} siswa):
                      </p>
                      {roster.length > 6 && (
                        <input
                          type="search"
                          value={nameSearch}
                          onChange={(e) => setNameSearch(e.target.value)}
                          placeholder="Cari namamu..."
                          className="rounded-xl border border-slate-300 bg-slate-50 px-3 py-1.5 text-xs focus:border-blue-600 focus:bg-white focus:outline-none"
                        />
                      )}
                    </div>

                    <div className="grid max-h-[280px] grid-cols-1 gap-2.5 overflow-y-auto pr-1 sm:grid-cols-2">
                      {filteredRoster.map((stu) => (
                        <button
                          key={stu.id}
                          type="button"
                          disabled={loading}
                          onClick={() => handlePickExistingStudent(stu.id)}
                          className="flex items-center gap-3 rounded-2xl border-2 border-slate-200 bg-slate-50/70 p-3 text-left transition hover:-translate-y-0.5 hover:border-blue-500 hover:bg-blue-50/60 disabled:opacity-60"
                        >
                          <img
                            src={getAvatarImage(stu.avatarId)}
                            alt={stu.fullName}
                            referrerPolicy="no-referrer"
                            className="h-10 w-10 shrink-0 rounded-xl border border-amber-300 object-cover"
                          />
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-extrabold text-slate-900">{stu.fullName}</p>
                            <p className="text-[11px] font-semibold text-slate-500">
                              Level {stu.unlockedLevel} · {stu.totalStars} Bintang
                            </p>
                          </div>
                        </button>
                      ))}
                    </div>

                    <div className="pt-2 text-center">
                      <button
                        type="button"
                        onClick={() => setShowNewNameForm(true)}
                        className="text-xs font-extrabold text-blue-700 hover:underline"
                      >
                        Namamu belum ada di daftar? Ketuk di sini untuk tulis nama
                      </button>
                    </div>
                  </div>
                ) : (
                  <form onSubmit={handleJoinWithName} className="mt-5 space-y-4">
                    <div>
                      <label className="block text-xs font-extrabold text-slate-800" htmlFor="student-new-name">
                        Tulis Nama Lengkapmu
                      </label>
                      <div className="relative mt-1.5">
                        <UserCheck className="pointer-events-none absolute top-3.5 left-3.5 h-5 w-5 text-slate-400" />
                        <input
                          id="student-new-name"
                          type="text"
                          required
                          autoFocus
                          value={newFullName}
                          onChange={(e) => setNewFullName(e.target.value)}
                          placeholder="Contoh: Budi Santoso"
                          className="w-full rounded-2xl border-2 border-slate-200 bg-slate-50 py-3 pr-4 pl-11 text-sm font-bold text-slate-900 focus:border-blue-600 focus:bg-white focus:outline-none"
                        />
                      </div>
                    </div>

                    <div>
                      <span className="block text-xs font-extrabold text-slate-800">Pilih Karakter</span>
                      <div className="mt-2 grid grid-cols-3 gap-2.5">
                        {AVATAR_OPTIONS.map((av) => (
                          <button
                            key={av.id}
                            type="button"
                            onClick={() => setNewAvatarId(av.id)}
                            className={`flex flex-col items-center gap-1.5 rounded-xl border-2 p-2.5 text-xs font-bold transition ${
                              newAvatarId === av.id
                                ? 'border-blue-600 bg-blue-50 text-blue-800'
                                : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                            }`}
                          >
                            <img
                              src={av.image}
                              alt={av.label}
                              referrerPolicy="no-referrer"
                              className="h-10 w-10 rounded-xl object-cover"
                            />
                            <span className="truncate text-[11px]">{av.label}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="flex flex-col gap-2 sm:flex-row">
                      {roster.length > 0 && (
                        <button
                          type="button"
                          onClick={() => setShowNewNameForm(false)}
                          className="rounded-2xl border-2 border-slate-200 px-4 py-3 text-xs font-bold text-slate-700 hover:bg-slate-50"
                        >
                          Lihat Daftar Nama
                        </button>
                      )}
                      <button
                        type="submit"
                        disabled={loading || !newFullName.trim()}
                        className="game-btn-orange min-h-[50px] flex-1 rounded-2xl py-3 text-sm font-extrabold disabled:opacity-60"
                      >
                        {loading ? 'Masuk ke Kelas...' : 'Mulai Petualangan Sekarang!'}
                      </button>
                    </div>
                  </form>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
