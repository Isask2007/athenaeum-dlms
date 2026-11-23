export const DAY = 86400000;

export const parseDate = (value) => {
  if (!value) return null;
  const normalized = String(value).replace(' ', 'T');
  const date = new Date(normalized.endsWith('Z') ? normalized : `${normalized}Z`);
  return Number.isNaN(date.getTime()) ? null : date;
};

export const daysUntil = (value, from = new Date()) => {
  const date = parseDate(value);
  if (!date) return 0;
  return Math.ceil((date.getTime() - from.getTime()) / DAY);
};

export const formatDate = (value) => {
  const date = parseDate(value);
  if (!date) return '—';
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
};

export const overdueDays = (dueAt, from = new Date()) => Math.max(0, -daysUntil(dueAt, from));
