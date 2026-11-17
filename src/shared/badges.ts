export interface BadgeDefinition {
  id: string;
  name: string;
  englishAlias: string;
  category: string;
  description: string;
  requirementHint: string;
  tier: 'gold' | 'purple' | 'blue' | 'orange';
  iconKey: 'crown' | 'zap' | 'flame' | 'star' | 'compass' | 'shield' | 'trophy' | 'swords';
}

export interface StudentBadgeRecord {
  id: string;
  studentId: string;
  badgeId: string;
  levelId: number | null;
  unlockedAt: string;
}

export const ACHIEVEMENT_BADGES: BadgeDefinition[] = [
  {
    id: 'perfect_score',
    name: 'Nilai Sempurna',
    englishAlias: 'Perfect Score',
    category: 'Akurasi',
    description: 'Menjawab 100% seluruh soal dengan benar dalam satu misi atau evaluasi.',
    requirementHint: 'Raih nilai 100 di level mana saja',
    tier: 'gold',
    iconKey: 'crown',
  },
  {
    id: 'speed_demon',
    name: 'Penakluk Kilat',
    englishAlias: 'Speed Demon',
    category: 'Kecepatan',
    description: 'Menyelesaikan 10+ soal dalam waktu 45 detik atau kurang dengan nilai minimal 80.',
    requirementHint: 'Selesaikan ≥ 10 soal ≤ 45 detik (Nilai ≥ 80)',
    tier: 'orange',
    iconKey: 'zap',
  },
  {
    id: 'consistent_learner',
    name: 'Penjelajah Konsisten',
    englishAlias: 'Consistent Learner',
    category: 'Konsistensi',
    description: 'Menuntaskan minimal 5 misi permainan dengan rata-rata nilai 75 ke atas.',
    requirementHint: 'Selesaikan 5 misi dengan rata-rata ≥ 75',
    tier: 'blue',
    iconKey: 'flame',
  },
  {
    id: 'star_collector',
    name: 'Kolektor Bintang',
    englishAlias: 'Star Collector',
    category: 'Progres',
    description: 'Mengumpulkan minimal 12 bintang petualangan dari seluruh pulau tantangan.',
    requirementHint: 'Kumpulkan total 12 bintang',
    tier: 'gold',
    iconKey: 'star',
  },
  {
    id: 'operation_master',
    name: 'Master 4 Operasi',
    englishAlias: 'Operation Master',
    category: 'Penguasaan',
    description: 'Menaklukkan Level 1, 2, 3, dan 4 dengan nilai minimal 75 di setiap level.',
    requirementHint: 'Nilai ≥ 75 di Level 1, 2, 3, dan 4',
    tier: 'purple',
    iconKey: 'compass',
  },
  {
    id: 'castle_conqueror',
    name: 'Penakluk Kastel',
    englishAlias: 'Castle Conqueror',
    category: 'Tantangan',
    description: 'Menyelesaikan Level 5 (Kastel Tantangan) dengan nilai minimal 80.',
    requirementHint: 'Nilai ≥ 80 di Level 5',
    tier: 'orange',
    iconKey: 'shield',
  },
  {
    id: 'grand_integer_master',
    name: 'Grand Master Integer',
    englishAlias: 'Grand Master',
    category: 'Puncak',
    description: 'Meraih 3 bintang (nilai ≥ 85) pada Level 6 Istana Master Integer.',
    requirementHint: 'Raih nilai ≥ 85 di Level 6',
    tier: 'gold',
    iconKey: 'trophy',
  },
  {
    id: 'arena_champion',
    name: 'Juara Arena Kompetisi',
    englishAlias: 'Arena Champion',
    category: 'Kompetisi',
    description: 'Berpartisipasi dalam Mode Kompetisi Kelas dan meraih nilai minimal 80.',
    requirementHint: 'Nilai ≥ 80 di Mode Kompetisi Kelas',
    tier: 'purple',
    iconKey: 'swords',
  },
];

export function getBadgeDefinition(badgeId: string): BadgeDefinition | undefined {
  return ACHIEVEMENT_BADGES.find((b) => b.id === badgeId);
}
