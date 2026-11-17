import React from 'react';
import {
  Compass,
  Crown,
  Flame,
  Lock,
  Shield,
  Star,
  Swords,
  Trophy,
  Zap,
} from 'lucide-react';
import type { BadgeDefinition } from '../shared/badges';

export function renderBadgeIcon(iconKey: BadgeDefinition['iconKey'], className = 'h-6 w-6') {
  switch (iconKey) {
    case 'crown':
      return <Crown className={className} />;
    case 'zap':
      return <Zap className={className} />;
    case 'flame':
      return <Flame className={className} />;
    case 'star':
      return <Star className={className} />;
    case 'compass':
      return <Compass className={className} />;
    case 'shield':
      return <Shield className={className} />;
    case 'trophy':
      return <Trophy className={className} />;
    case 'swords':
      return <Swords className={className} />;
  }
}

const TIER_STYLES: Record<
  BadgeDefinition['tier'],
  { bg: string; iconBg: string; border: string; text: string; shadow: string }
> = {
  gold: {
    bg: 'bg-gradient-to-br from-amber-50 to-yellow-50/90',
    iconBg: 'bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-[0_3px_0_#b45309]',
    border: 'border-amber-300',
    text: 'text-amber-800',
    shadow: 'shadow-[0_4px_0_rgba(245,158,11,0.22)]',
  },
  purple: {
    bg: 'bg-gradient-to-br from-purple-50 to-fuchsia-50/70',
    iconBg: 'bg-gradient-to-br from-purple-500 to-indigo-600 text-white shadow-[0_3px_0_#5b21b6]',
    border: 'border-purple-300',
    text: 'text-purple-800',
    shadow: 'shadow-[0_4px_0_rgba(147,51,234,0.2)]',
  },
  blue: {
    bg: 'bg-gradient-to-br from-sky-50 to-blue-50/90',
    iconBg: 'bg-gradient-to-br from-sky-500 to-blue-600 text-white shadow-[0_3px_0_#1d4ed8]',
    border: 'border-blue-300',
    text: 'text-blue-800',
    shadow: 'shadow-[0_4px_0_rgba(37,99,235,0.2)]',
  },
  orange: {
    bg: 'bg-gradient-to-br from-orange-50 to-amber-50/80',
    iconBg: 'bg-gradient-to-br from-orange-400 to-rose-500 text-white shadow-[0_3px_0_#c2410c]',
    border: 'border-orange-300',
    text: 'text-orange-800',
    shadow: 'shadow-[0_4px_0_rgba(249,115,22,0.2)]',
  },
};

interface BadgeCardProps {
  badge: BadgeDefinition;
  unlocked: boolean;
  unlockedAt?: string;
  compact?: boolean;
}

export const BadgeCard: React.FC<BadgeCardProps> = ({ badge, unlocked, unlockedAt, compact = false }) => {
  const style = TIER_STYLES[badge.tier];

  return (
    <div
      className={`rounded-2xl border-2 p-4 transition-transform duration-150 ${
        unlocked
          ? `${style.border} ${style.bg} ${style.shadow} hover:-translate-y-0.5`
          : 'border-slate-200 bg-slate-100/70 opacity-80'
      }`}
    >
      <div className="flex items-start gap-3.5">
        <div
          className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${
            unlocked ? style.iconBg : 'bg-slate-200 text-slate-500'
          }`}
        >
          {unlocked ? renderBadgeIcon(badge.iconKey, 'h-6 w-6') : <Lock className="h-5 w-5" />}
        </div>

        <div className="min-w-0 flex-1">
          <p className={`text-[11px] font-bold uppercase tracking-wider ${unlocked ? style.text : 'text-slate-500'}`}>
            {badge.category} · {badge.englishAlias}
          </p>
          <h3 className="font-display mt-0.5 text-sm font-extrabold text-slate-900">{badge.name}</h3>
          {!compact && (
            <p className="mt-1 text-xs leading-relaxed text-slate-600">
              {unlocked ? badge.description : badge.requirementHint}
            </p>
          )}
          {unlocked && unlockedAt && (
            <p className="mt-1.5 text-[11px] font-semibold text-slate-500">
              Diraih {new Date(unlockedAt).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
