import React from 'react';
import { DebtDirection, DebtStatus } from '../../types/database';
import { getStatusLabel, getDirectionLabel, isOverdue } from '../../utils/formatters';

interface BadgeProps {
  type: 'status' | 'direction' | 'overdue' | 'role' | 'active';
  status?: DebtStatus;
  direction?: DebtDirection;
  dueDate?: string | null;
  isActive?: boolean;
  role?: string;
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  type,
  status,
  direction,
  dueDate,
  isActive,
  role,
  className = '',
}) => {
  if (type === 'status' && status) {
    const isOpen = status === 'open';
    return (
      <span
        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold tracking-wide ${
          isOpen
            ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
            : 'bg-violet-500/15 text-violet-300 border border-violet-500/30'
        } ${className}`}
      >
        <span
          className={`w-1.5 h-1.5 rounded-full mr-1.5 ${
            isOpen ? 'bg-amber-400' : 'bg-violet-400'
          }`}
        />
        {getStatusLabel(status)}
      </span>
    );
  }

  if (type === 'direction' && direction) {
    const isCustomer = direction === 'customer';
    return (
      <span
        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
          isCustomer
            ? 'bg-violet-500/15 text-violet-300 border border-violet-500/30'
            : 'bg-purple-500/15 text-purple-300 border border-purple-500/30'
        } ${className}`}
      >
        {getDirectionLabel(direction)}
      </span>
    );
  }

  if (type === 'overdue' && dueDate && status && isOverdue(dueDate, status)) {
    return (
      <span
        className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-rose-500/15 text-rose-400 border border-rose-500/30 ${className}`}
      >
        Muddati o‘tgan
      </span>
    );
  }

  if (type === 'active') {
    return (
      <span
        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
          isActive
            ? 'bg-violet-500/15 text-violet-300 border border-violet-500/30'
            : 'bg-slate-500/10 text-slate-400 border border-slate-500/20'
        } ${className}`}
      >
        <span
          className={`w-1.5 h-1.5 rounded-full mr-1.5 ${
            isActive ? 'bg-violet-400' : 'bg-slate-400'
          }`}
        />
        {isActive ? 'Faol' : 'Nofaol (To‘xtatilgan)'}
      </span>
    );
  }

  if (type === 'role') {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
        {role === 'owner' ? 'Do‘kon Egasi' : 'Ishchi'}
      </span>
    );
  }

  return null;
};
