/**
 * 간단한 파일 기반 인증 시스템
 * 개발/소규모 사용 - 나중에 DB로 전환 가능
 */

import fs from "fs";
import path from "path";
import crypto from "crypto";

const DATA_DIR = path.join(process.cwd(), ".data");
const USERS_FILE = path.join(DATA_DIR, "users.json");
const SERIALS_FILE = path.join(DATA_DIR, "serials.json");

// 데이터 디렉토리 생성
function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

// ── 사용자 관련 ──

interface User {
  id: string;
  email: string;
  password: string; // hashed
  name: string;
  createdAt: string;
  serial?: string;
  serialExpiresAt?: string;
}

function hashPassword(password: string): string {
  return crypto.createHash("sha256").update(password).digest("hex");
}

function generateToken(userId: string): string {
  const payload = `${userId}:${Date.now()}:${crypto.randomBytes(16).toString("hex")}`;
  return Buffer.from(payload).toString("base64");
}

function loadUsers(): User[] {
  ensureDataDir();
  if (!fs.existsSync(USERS_FILE)) return [];
  try {
    return JSON.parse(fs.readFileSync(USERS_FILE, "utf-8"));
  } catch {
    return [];
  }
}

function saveUsers(users: User[]) {
  ensureDataDir();
  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2), "utf-8");
}

export function signup(email: string, password: string, name: string) {
  const users = loadUsers();
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
  saveUsers(users);

  const token = generateToken(user.id);
  return {
    token,
    user: { id: user.id, email: user.email, name: user.name },
  };
}

export function login(email: string, password: string) {
  const users = loadUsers();
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

interface Serial {
  key: string;
  durationDays: number;
  used: boolean;
  usedBy?: string;
  usedAt?: string;
  createdAt: string;
}

function loadSerials(): Serial[] {
  ensureDataDir();
  if (!fs.existsSync(SERIALS_FILE)) return [];
  try {
    return JSON.parse(fs.readFileSync(SERIALS_FILE, "utf-8"));
  } catch {
    return [];
  }
}

function saveSerials(serials: Serial[]) {
  ensureDataDir();
  fs.writeFileSync(SERIALS_FILE, JSON.stringify(serials, null, 2), "utf-8");
}

/** 시리얼 키 생성 (관리자용) */
export function generateSerialKey(durationDays: number = 365): string {
  const key = `KS-${crypto.randomBytes(4).toString("hex").toUpperCase()}-${crypto.randomBytes(4).toString("hex").toUpperCase()}`;
  const serials = loadSerials();
  serials.push({
    key,
    durationDays,
    used: false,
    createdAt: new Date().toISOString(),
  });
  saveSerials(serials);
  return key;
}

/** 시리얼 키 인증 */
export function activateSerial(userId: string, serialKey: string) {
  const serials = loadSerials();
  const serial = serials.find((s) => s.key === serialKey);

  if (!serial) {
    return { error: "유효하지 않은 시리얼 키입니다." };
  }
  if (serial.used) {
    return { error: "이미 사용된 시리얼 키입니다." };
  }

  // 시리얼 사용 처리
  serial.used = true;
  serial.usedBy = userId;
  serial.usedAt = new Date().toISOString();
  saveSerials(serials);

  // 사용자에 시리얼 연결
  const users = loadUsers();
  const user = users.find((u) => u.id === userId);
  if (!user) {
    return { error: "사용자를 찾을 수 없습니다." };
  }

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + serial.durationDays);

  user.serial = serialKey;
  user.serialExpiresAt = expiresAt.toISOString();
  saveUsers(users);

  return {
    serial: serialKey,
    expiresAt: expiresAt.toISOString(),
    durationDays: serial.durationDays,
  };
}

/** 시리얼 유효성 확인 */
export function checkSerial(userId: string) {
  const users = loadUsers();
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
