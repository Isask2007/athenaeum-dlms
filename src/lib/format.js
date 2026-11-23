export const FORMAT_LABELS = {
  physical: 'Physical Book',
  ebook: 'E-Book',
  research_paper: 'Research Paper',
  audio_video: 'Audio / Video',
};

export const FORMAT_SHORT = {
  physical: 'Book', ebook: 'E-Book', research_paper: 'Paper', audio_video: 'A/V',
};

export const formatDate = (value, options = {}) => {
  if (!value) return '—';
  const date = new Date(String(value).replace(' ', 'T') + (String(value).includes('Z') ? '' : 'Z'));
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', ...options });
};

export const relativeDue = (value) => {
  if (!value) return { label: '—', tone: 'slate', days: null };
  const date = new Date(String(value).replace(' ', 'T') + 'Z');
  const days = Math.ceil((date.getTime() - Date.now()) / 86400000);
  if (days < 0) return { label: `${Math.abs(days)}d overdue`, tone: 'rose', days };
  if (days === 0) return { label: 'Due today', tone: 'amber', days };
  if (days <= 3) return { label: `Due in ${days}d`, tone: 'amber', days };
  if (days <= 7) return { label: `Due in ${days}d`, tone: 'gold', days };
  return { label: `Due in ${days}d`, tone: 'slate', days };
};

export const money = (amount) => `$${Number(amount || 0).toFixed(2)}`;

export const initials = (name = '') => name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0].toUpperCase()).join('');

export const truncate = (text, max = 120) => (text?.length > max ? `${text.slice(0, max).trim()}…` : text || '');

export const availability = (item) => {
  if (item.format !== 'physical') return { label: 'Digital access', tone: 'emerald' };
  if (item.available_copies > 0) return { label: `Available · ${item.available_copies} cop${item.available_copies === 1 ? 'y' : 'ies'}`, tone: 'emerald' };
  return { label: 'All copies on loan', tone: 'amber' };
};
