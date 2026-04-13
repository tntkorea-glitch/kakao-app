/**
 * 인증 시스템
 * 로컬: 파일 기반, Vercel: Upstash Redis (storage.ts 추상화)
 */

import crypto from "crypto";
import { storageGet, storageSet } from "./storage";

// ── 타입 ──

interface User {
  id: string;
  email: string;
  password: string; // hashed
  name: string;
  createdAt: string;
  serial?: string;
  serialExpiresAt?: string;
}

interface Serial {
  key: string;
  durationDays: number;
  used: boolean;
  usedBy?: string;
  usedAt?: string;
  createdAt: string;
}

// ── 유틸 ──

function hashPassword(password: string): string {
  return crypto.createHash("sha256").update(password).digest("hex");
}

function generateToken(userId: string): string {
  const payload = `${userId}:${Date.now()}:${crypto.randomBytes(16).toString("hex")}`;
  return Buffer.from(payload).toString("base64");
}

async function loadUsers(): Promise<User[]> {
  return storageGet<User[]>("users", []);
}

async function saveUsers(users: User[]): Promise<void> {
  return storageSet("users", users);
}

async function loadSerials(): Promise<Serial[]> {
  return storageGet<Serial[]>("serials", []);
}

async function saveSerials(serials: Serial[]): Promise<void> {
  return storageSet("serials", serials);
}

// ── 사용자 관련 ──

export async function signup(email: string, password: string, name: string) {
  const users = await loadUsers();
  if (users.find((u) => u.email === email)) {
    return { error: "이미 가입된 이메일입니다." };
  }

  const user: User = {
    id: crypto.randomUUID(),
    email,
    password: hashPassword(password),
    name,
    createdAt: new Date().toISOString(),
  };

  users.push(user);
  await saveUsers(users);

  const token = generateToken(user.id);
  return {
    token,
    user: { id: user.id, email: user.email, name: user.name },
  };
}

export async function login(email: string, password: string) {
  const users = await loadUsers();
  const user = users.find(
    (u) => u.email === email && u.password === hashPassword(password)
  );

  if (!user) {
    return { error: "이메일 또는 비밀번호가 올바르지 않습니다." };
  }

  const token = generateToken(user.id);
  return {
    token,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      serial: user.serial || null,
      serialExpiresAt: user.serialExpiresAt || null,
    },
  };
}

// ── 시리얼 키 관련 ──

/** 시리얼 키 생성 (관리자용) */
export async function generateSerialKey(durationDays: number = 365): Promise<string> {
  const key = `KS-${crypto.randomBytes(4).toString("hex").toUpperCase()}-${crypto.randomBytes(4).toString("hex").toUpperCase()}`;
  const serials = await loadSerials();
  serials.push({
    key,
    durationDays,
    used: false,
    createdAt: new Date().toISOString(),
  });
  await saveSerials(serials);
  return key;
}

/** 시리얼 키 인증 */
export async function activateSerial(userId: string, serialKey: string) {
  const serials = await loadSerials();
  const serial = serials.find((s) => s.key === serialKey);

  if (!serial) {
    return { error: "유효하지 않은 시리얼 키입니다." };
  }
  if (serial.used) {
    return { error: "이미 사용된 시리얼 키입니다." };
  }

  serial.used = true;
  serial.usedBy = userId;
  serial.usedAt = new Date().toISOString();
  await saveSerials(serials);

  const users = await loadUsers();
  const user = users.find((u) => u.id === userId);
  if (!user) {
    return { error: "사용자를 찾을 수 없습니다." };
  }

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + serial.durationDays);

  user.serial = serialKey;
  user.serialExpiresAt = expiresAt.toISOString();
  await saveUsers(users);

  return {
    serial: serialKey,
    expiresAt: expiresAt.toISOString(),
    durationDays: serial.durationDays,
  };
}

/** 시리얼 유효성 확인 */
export async function checkSerial(userId: string) {
  const users = await loadUsers();
  const user = users.find((u) => u.id === userId);

  if (!user || !user.serial || !user.serialExpiresAt) {
    return { valid: false, reason: "시리얼 키가 등록되지 않았습니다." };
  }

  const now = new Date();
  const expires = new Date(user.serialExpiresAt);

  if (now > expires) {
    return { valid: false, reason: "시리얼 키가 만료되었습니다.", expiredAt: user.serialExpiresAt };
  }

  const daysLeft = Math.ceil((expires.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  return { valid: true, serial: user.serial, expiresAt: user.serialExpiresAt, daysLeft };
}
