import { badRequest } from './error.js';

export const str = (value, field, { required = false, max = 500 } = {}) => {
  if (value === undefined || value === null) {
    if (required) throw badRequest(`${field} is required.`);
    return '';
  }
  const text = String(value).trim();
  if (required && !text) throw badRequest(`${field} is required.`);
  if (text.length > max) throw badRequest(`${field} is too long (max ${max} characters).`);
  return text;
};

export const int = (value, field, { min = 0, max = 100000, fallback = 0 } = {}) => {
  if (value === undefined || value === null || value === '') return fallback;
  const n = Number(value);
  if (!Number.isInteger(n) || n < min || n > max) throw badRequest(`${field} must be a number between ${min} and ${max}.`);
  return n;
};

export const oneOf = (value, allowed, field) => {
  if (value === undefined || value === null || value === '') return '';
  if (!allowed.includes(value)) throw badRequest(`Invalid ${field}. Allowed: ${allowed.join(', ')}.`);
  return value;
};

export const email = (value) => {
  const text = str(value, 'Email', { required: true, max: 190 }).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text)) throw badRequest('Enter a valid email address.');
  return text;
};

export const password = (value) => {
  const text = str(value, 'Password', { required: true, max: 200 });
  if (text.length < 8) throw badRequest('Password must be at least 8 characters.');
  return text;
};
