import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';

const TOKEN_TTL_SEC = 8 * 60 * 60;
const BCRYPT_ROUNDS = 10;

/** @type {Map<string, { count: number, resetAt: number }>} */
const loginAttempts = new Map();
const MAX_ATTEMPTS = 20;
const WINDOW_MS = 5 * 60 * 1000;

function jwtSecret() {
  const secret = process.env.STUDENT_JWT_SECRET;
  if (!secret) throw new Error('Missing environment variable: STUDENT_JWT_SECRET');
  return secret;
}

export function normalizeDob(value) {
  if (!value || typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return null;
  const date = new Date(`${trimmed}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return null;
  return trimmed;
}

export async function hashDob(dob) {
  const normalized = normalizeDob(dob);
  if (!normalized) throw new Error('Invalid date of birth');
  return bcrypt.hash(normalized, BCRYPT_ROUNDS);
}

export async function verifyDob(dob, hash) {
  const normalized = normalizeDob(dob);
  if (!normalized || !hash) return false;
  return bcrypt.compare(normalized, hash);
}

function b64url(input) {
  return Buffer.from(input).toString('base64url');
}

export function signStudentToken(studentId) {
  const now = Math.floor(Date.now() / 1000);
  const header = b64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const payload = b64url(JSON.stringify({
    sub: studentId,
    role: 'student',
    iat: now,
    exp: now + TOKEN_TTL_SEC,
  }));
  const sig = crypto
    .createHmac('sha256', jwtSecret())
    .update(`${header}.${payload}`)
    .digest('base64url');
  return `${header}.${payload}.${sig}`;
}

export function verifyStudentToken(token) {
  if (!token) return { error: 'Missing token', status: 401 };

  const parts = token.split('.');
  if (parts.length !== 3) return { error: 'Invalid token', status: 401 };

  const [header, payload, sig] = parts;
  const expected = crypto
    .createHmac('sha256', jwtSecret())
    .update(`${header}.${payload}`)
    .digest('base64url');

  if (sig !== expected) return { error: 'Invalid token', status: 401 };

  let decoded;
  try {
    decoded = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
  } catch {
    return { error: 'Invalid token', status: 401 };
  }

  if (decoded.role !== 'student' || !decoded.sub) {
    return { error: 'Invalid token', status: 401 };
  }

  const now = Math.floor(Date.now() / 1000);
  if (decoded.exp && decoded.exp < now) {
    return { error: 'Token expired', status: 401 };
  }

  return { studentId: decoded.sub };
}

export function getBearerToken(req) {
  const header = req.headers.authorization || req.headers.Authorization;
  if (!header?.startsWith('Bearer ')) return null;
  return header.slice(7);
}

export function requireStudent(req) {
  const token = getBearerToken(req);
  return verifyStudentToken(token);
}

export function checkLoginRateLimit(ip) {
  const key = ip || 'unknown';
  const now = Date.now();
  const entry = loginAttempts.get(key);

  if (!entry || now > entry.resetAt) {
    return { allowed: true };
  }

  if (entry.count >= MAX_ATTEMPTS) {
    return { allowed: false, retryAfterSec: Math.ceil((entry.resetAt - now) / 1000) };
  }

  return { allowed: true };
}

export function recordFailedLogin(ip) {
  const key = ip || 'unknown';
  const now = Date.now();
  const entry = loginAttempts.get(key);

  if (!entry || now > entry.resetAt) {
    loginAttempts.set(key, { count: 1, resetAt: now + WINDOW_MS });
  } else {
    entry.count += 1;
  }
}

export function clearLoginAttempts(ip) {
  loginAttempts.delete(ip || 'unknown');
}
