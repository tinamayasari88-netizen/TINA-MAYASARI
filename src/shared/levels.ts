import type { StudentBadgeRecord } from './badges';

export type GameType = 'jumper' | 'lantern' | 'safecracker' | 'bridge' | 'castle' | 'boss';

export interface LevelConfig {
  id: number;
  code: string;
  title: string;
  subtitle: string;
  topic: string;
  description: string;
  gameType: GameType;
  gameName: string;
  gameTagline: string;
  accentColor: string;
  badgeBg: string;
  mapX: number;
  mapY: number;
  sampleExpr: string;
}

export const LEVELS: LevelConfig[] = [
  {
    id: 1,
    code: 'LVL-1',
    title: 'Gerbang Penjumlahan',
    subtitle: 'Penjumlahan Bilangan Bulat',
    topic: 'Penjumlahan Bilangan Bulat',
    description: 'Taklukkan gerbang awal dengan menjumlahkan bilangan positif dan negatif secara tepat.',
    gameType: 'jumper',
    gameName: 'Susun Tombol Bilangan',
    gameTagline: 'Tekan tombol Positif (Biru) dan Negatif (Merah) untuk merangkai hasil tepat!',
    accentColor: '#2563EB',
    badgeBg: 'bg-blue-600',
    mapX: 16,
    mapY: 78,
    sampleExpr: '(-4) + 7 = ?',
  },
  {
    id: 2,
    code: 'LVL-2',
    title: 'Hutan Pengurangan',
    subtitle: 'Pengurangan Bilangan Bulat',
    topic: 'Pengurangan Bilangan Bulat',
    description: 'Jelajahi hutan berkabut dan kuasai selisih serta pengurangan bilangan negatif.',
    gameType: 'lantern',
    gameName: 'Tangkap Lentera Hutan',
    gameTagline: 'Tangkap lentera kunang-kunang yang melayang sesuai hasil pengurangan!',
    accentColor: '#7C3AED',
    badgeBg: 'bg-purple-600',
    mapX: 28,
    mapY: 46,
    sampleExpr: '(-7) - (-3) = ?',
  },
  {
    id: 3,
    code: 'LVL-3',
    title: 'Gunung Perkalian',
    subtitle: 'Perkalian Bilangan Bulat',
    topic: 'Perkalian Bilangan Bulat',
    description: 'Daki puncak bersalju dengan memahami aturan tanda perkalian bilangan bulat.',
    gameType: 'safecracker',
    gameName: 'Brankas Gunung Es',
    gameTagline: 'Pilih tanda (+ / -) dan ketik angka di kunci brankas untuk mendaki puncak!',
    accentColor: '#D97706',
    badgeBg: 'bg-amber-600',
    mapX: 43,
    mapY: 24,
    sampleExpr: '(-4) × (-3) = ?',
  },
  {
    id: 4,
    code: 'LVL-4',
    title: 'Lembah Pembagian',
    subtitle: 'Pembagian Bilangan Bulat',
    topic: 'Pembagian Bilangan Bulat',
    description: 'Seberangi jembatan lembah dengan operasi pembagian bilangan bulat yang presisi.',
    gameType: 'bridge',
    gameName: 'Jembatan Kargo Lembah',
    gameTagline: 'Seret atau ketuk peti kargo yang tepat ke celah papan jembatan!',
    accentColor: '#0284C7',
    badgeBg: 'bg-sky-600',
    mapX: 57,
    mapY: 44,
    sampleExpr: '(-24) ÷ (-6) = ?',
  },
  {
    id: 5,
    code: 'LVL-5',
    title: 'Kastel Tantangan',
    subtitle: 'Operasi Hitung Campuran',
    topic: 'Operasi Campuran Bilangan Bulat',
    description: 'Hadapi benteng ujian dengan aturan urutan operasi hitung bilangan bulat.',
    gameType: 'castle',
    gameName: 'Meriam Pertahanan Kastel',
    gameTagline: 'Aktifkan radar urutan operasi dan tembakkan meriam benteng yang tepat!',
    accentColor: '#EA580C',
    badgeBg: 'bg-orange-600',
    mapX: 74,
    mapY: 63,
    sampleExpr: '6 + (-4) × 3 = ?',
  },
  {
    id: 6,
    code: 'LVL-6',
    title: 'Istana Master Integer',
    subtitle: 'Tantangan Master Terpadu',
    topic: 'Tantangan Master Bilangan Bulat',
    description: 'Ujian tertinggi di istana langit untuk meraih gelar Penjelajah Matematika Terbaik.',
    gameType: 'boss',
    gameName: 'Duel Bos Master Integer',
    gameTagline: 'Tanding kartu jurus dengan bar HP menghadapi Grandmaster Istana Langit!',
    accentColor: '#4F46E5',
    badgeBg: 'bg-indigo-600',
    mapX: 86,
    mapY: 22,
    sampleExpr: '2a - 3b (a=-4, b=6)',
  },
];

export const AVATAR_OPTIONS = [
  {
    id: 'boy',
    label: 'Penjelajah Biru',
    image: '/src/assets/images/avatar_boy_explorer_1794558987159.jpg',
  },
  {
    id: 'girl',
    label: 'Cendekia Ungu',
    image: '/src/assets/images/avatar_girl_scholar_1794558987742.jpg',
  },
  {
    id: 'owl',
    label: 'Mentor Burung Hantu',
    image: '/src/assets/images/avatar_owl_mentor_1794558987496.jpg',
  },
] as const;

export type AvatarId = 'boy' | 'girl' | 'owl';

export function getAvatarImage(avatarId: string): string {
  const found = AVATAR_OPTIONS.find((a) => a.id === avatarId);
  return found ? found.image : AVATAR_OPTIONS[0].image;
}

export interface TeacherUser {
  id: string;
  name: string;
  email: string;
  schoolName: string;
}

export interface ClassRoom {
  id: string;
  teacherId: string;
  name: string;
  classCode: string;
  passingGrade: number;
  studentCount: number;
  createdAt: string;
}

export interface StudentRecord {
  id: string;
  classId: string;
  className?: string;
  classCode?: string;
  teacherId: string;
  fullName: string;
  studentCode: string;
  avatarId: AvatarId;
  totalStars: number;
  unlockedLevel: number;
  passingGrade?: number;
  createdAt: string;
  badges?: StudentBadgeRecord[];
}

export interface QuestionItem {
  id: string;
  levelId: number;
  orderIndex: number;
  prompt: string;
  options: number[];
  correctAnswer: number;
  explanation: string;
  difficulty: 'easy' | 'medium' | 'hard';
}

export interface StudentAnswerPayload {
  questionId: string;
  questionPrompt: string;
  selectedAnswer: number;
  correctAnswer: number;
  isCorrect: boolean;
  explanation: string;
}

export interface GameSessionRecord {
  id: string;
  teacherId: string;
  classId: string;
  className: string;
  title: string;
  levelId: number;
  topic: string;
  questionCount: number;
  durationMinutes: number;
  mode: 'practice' | 'evaluation' | 'competition';
  status: 'active' | 'ended';
  allowRetry: boolean;
  roomCode?: string;
  roomId?: string;
  createdAt: string;
}

export interface CompetitionParticipant {
  id: string;
  roomId: string;
  studentId: string;
  studentName: string;
  avatarId: AvatarId;
  status: 'joined' | 'playing' | 'finished';
  score: number;
  correctCount: number;
  wrongCount: number;
  durationSeconds: number;
  attemptCount: number;
  joinedAt: string;
  finishedAt: string | null;
}

export interface CompetitionRoomRecord {
  id: string;
  sessionId: string;
  teacherId: string;
  classId: string;
  className: string;
  roomCode: string;
  title: string;
  levelId: number;
  topic: string;
  questionCount: number;
  durationMinutes: number;
  allowRetry: boolean;
  status: 'waiting' | 'active' | 'ended';
  startedAt: string | null;
  endedAt: string | null;
  createdAt: string;
  participants: CompetitionParticipant[];
}

export interface EvaluationRecord {
  id: string;
  studentId: string;
  studentName: string;
  classId: string;
  className: string;
  teacherId: string;
  sessionId: string | null;
  roomId: string | null;
  levelId: number;
  levelName: string;
  topic: string;
  mode: 'adventure' | 'session' | 'competition';
  totalQuestions: number;
  correctCount: number;
  wrongCount: number;
  score: number;
  passPercentage: number;
  starsEarned: number;
  durationSeconds: number;
  isPassed: boolean;
  status: string;
  attemptNumber: number;
  executedAt: string;
  answers?: StudentAnswerPayload[];
}
