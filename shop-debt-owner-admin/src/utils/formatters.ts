import { DebtDirection, DebtStatus, AdminActionType } from '../types/database';

export function formatMoney(amount: number | null | undefined): string {
  if (amount === null || amount === undefined || isNaN(amount)) {
    return "0 so'm";
  }
  const formatted = new Intl.NumberFormat('uz-UZ').format(Math.round(amount));
  return `${formatted.replace(/,/g, ' ')} so‘m`;
}

export function formatDate(dateString: string | null | undefined): string {
  if (!dateString) return '—';
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return dateString;
    return new Intl.DateTimeFormat('uz-UZ', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(d);
  } catch {
    return dateString;
  }
}

export function formatDateTime(dateString: string | null | undefined): string {
  if (!dateString) return '—';
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return dateString;
    return new Intl.DateTimeFormat('uz-UZ', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(d);
  } catch {
    return dateString;
  }
}

export function formatDays(days: number | null | undefined): string {
  if (days === null || days === undefined || isNaN(days)) return 'Ma’lumot yo‘q';
  if (days < 1) return '1 kundan kam';
  const rounded = Math.round(days * 10) / 10;
  return `${rounded} kun`;
}

export function getStatusLabel(status: DebtStatus): string {
  return status === 'open' ? 'Ochiq' : 'To‘langan';
}

export function getDirectionLabel(direction: DebtDirection): string {
  return direction === 'customer' ? 'Mijoz qarzi' : 'Yetkazib beruvchi qarzi';
}

export function getActionTypeLabel(actionType: AdminActionType): string {
  switch (actionType) {
    case 'edit':
      return 'Qarz tahrirlandi';
    case 'delete':
      return 'Qarz butunlay o‘chirildi';
    case 'manual_add':
      return 'Qo‘lda yangi qarz kiritildi';
    case 'worker_add':
      return 'Yangi ishchi hisobi ochildi';
    case 'worker_deactivate':
      return 'Ishchi faolsizlantirildi';
    case 'worker_activate':
      return 'Ishchi qayta faollashtirildi';
    default:
      return actionType;
  }
}

export function isOverdue(dueDate: string | null | undefined, status: DebtStatus): boolean {
  if (!dueDate || status === 'paid') return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(dueDate);
  return due < today;
}

export function cleanPhoneDigits(input: string): string {
  let digits = input.replace(/\D/g, '');
  if (digits.startsWith('998')) {
    digits = digits.slice(3);
  }
  return digits.slice(0, 9);
}

export function formatUzPhone(digits9: string): string {
  const d = cleanPhoneDigits(digits9);
  if (!d) return '';
  let res = d.slice(0, 2);
  if (d.length > 2) res += ' ' + d.slice(2, 5);
  if (d.length > 5) res += ' ' + d.slice(5, 7);
  if (d.length > 7) res += ' ' + d.slice(7, 9);
  return res;
}

export function toFullUzPhone(input: string): string {
  const d = cleanPhoneDigits(input);
  if (!d) return '';
  return `+998 ${formatUzPhone(d)}`;
}
