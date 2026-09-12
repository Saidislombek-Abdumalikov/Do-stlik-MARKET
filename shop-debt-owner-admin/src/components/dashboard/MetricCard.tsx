import React from 'react';
import { LucideIcon } from 'lucide-react';

interface MetricCardProps {
  title: string;
  value: string;
  subValue?: string;
  icon: LucideIcon;
  variant?: 'emerald' | 'violet' | 'amber' | 'rose' | 'indigo' | 'slate';
  badgeText?: string;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  subValue,
  icon: Icon,
  variant = 'violet',
  badgeText,
}) => {
  const colorMap = {
    violet: {
      bg: 'bg-violet-500/10',
      border: 'border-violet-500/20',
      text: 'text-violet-400',
      iconBg: 'bg-violet-500/15',
    },
    emerald: {
      bg: 'bg-violet-500/10',
      border: 'border-violet-500/20',
      text: 'text-violet-400',
      iconBg: 'bg-violet-500/15',
    },
    amber: {
      bg: 'bg-amber-500/10',
      border: 'border-amber-500/20',
      text: 'text-amber-400',
      iconBg: 'bg-amber-500/15',
    },
    rose: {
      bg: 'bg-rose-500/10',
      border: 'border-rose-500/20',
      text: 'text-rose-400',
      iconBg: 'bg-rose-500/15',
    },
    indigo: {
      bg: 'bg-indigo-500/10',
      border: 'border-indigo-500/20',
      text: 'text-indigo-400',
      iconBg: 'bg-indigo-500/15',
    },
    slate: {
      bg: 'bg-slate-800/40',
      border: 'border-slate-700/50',
      text: 'text-slate-300',
      iconBg: 'bg-slate-700/40',
    },
  }[variant];

  return (
    <div className={`p-5 rounded-2xl bg-slate-900 border ${colorMap.border} shadow-lg relative overflow-hidden transition-all hover:border-slate-700`}>
      <div className="flex items-start justify-between">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            {title}
          </span>
          <div className="mt-2 text-2xl font-black tracking-tight text-slate-100">
            {value}
          </div>
          {subValue && (
            <div className="mt-1 text-xs text-slate-400 font-medium">
              {subValue}
            </div>
          )}
        </div>

        <div className={`p-3 rounded-xl ${colorMap.iconBg} ${colorMap.text}`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>

      {badgeText && (
        <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs">
          <span className="text-slate-400">{badgeText}</span>
        </div>
      )}
    </div>
  );
};
