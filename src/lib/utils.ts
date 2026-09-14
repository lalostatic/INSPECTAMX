import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(dateString: string | null | undefined, locale = 'es-MX'): string {
  if (!dateString) return '—';
  try {
    return new Date(dateString).toLocaleDateString(locale, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return dateString;
  }
}

export function formatDateTime(dateString: string | null | undefined, locale = 'es-MX'): string {
  if (!dateString) return '—';
  try {
    return new Date(dateString).toLocaleString(locale, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return dateString;
  }
}

export function formatCurrency(amount: number | null | undefined, currency = 'MXN'): string {
  if (amount === null || amount === undefined) return '—';
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency,
  }).format(amount);
}

export function formatNumber(n: number | null | undefined): string {
  if (n === null || n === undefined) return '—';
  return new Intl.NumberFormat('es-MX').format(n);
}

export function parseLocation(location: string | null | undefined): {
  bay: string; row: string; slot: string;
} {
  if (!location) return { bay: '', row: '', slot: '' };
  const parts = location.split('-');
  return {
    bay: parts[0] || '',
    row: parts[1] || '',
    slot: parts[2] || '',
  };
}

export function buildLocation(bay: string, row: string, slot: string): string {
  if (!bay && !row && !slot) return '';
  return `${bay}-${row}-${slot}`;
}

export function validateISO6346(containerNo: string): boolean {
  const clean = containerNo.toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (clean.length !== 11) return false;
  if (!/^[A-Z]{4}[0-9]{7}$/.test(clean)) return false;

  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const values: Record<string, number> = {};
  let val = 10;
  for (const letter of letters) {
    if (val === 11 || val === 22 || val === 33) val++;
    values[letter] = val++;
  }

  let sum = 0;
  for (let i = 0; i < 10; i++) {
    const char = clean[i];
    const charVal = /[A-Z]/.test(char) ? values[char] : parseInt(char);
    sum += charVal * Math.pow(2, i);
  }

  const checkDigit = sum % 11 % 10;
  return checkDigit === parseInt(clean[10]);
}

export function generateLocalId(): string {
  return `local-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function truncate(str: string, length = 50): string {
  if (str.length <= length) return str;
  return str.slice(0, length) + '…';
}

export function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

export function slugify(str: string): string {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

export function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export function daysAgo(dateString: string): number {
  const date = new Date(dateString);
  const now = new Date();
  return Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
}

export function relativeTime(dateString: string, locale = 'es-MX'): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });

  if (diffDays > 0) return rtf.format(-diffDays, 'day');
  if (diffHours > 0) return rtf.format(-diffHours, 'hour');
  if (diffMins > 0) return rtf.format(-diffMins, 'minute');
  return rtf.format(-diffSecs, 'second');
}

export function fileSize(bytes: number | null | undefined): string {
  if (!bytes) return '—';
  const units = ['B', 'KB', 'MB', 'GB'];
  let size = bytes;
  let unit = 0;
  while (size >= 1024 && unit < units.length - 1) {
    size /= 1024;
    unit++;
  }
  return `${size.toFixed(1)} ${units[unit]}`;
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function debounce<T extends (...args: unknown[]) => unknown>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timer: ReturnType<typeof setTimeout>;
  return (...args: Parameters<T>) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}
