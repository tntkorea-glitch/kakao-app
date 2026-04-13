/**
 * 데이터 저장소 추상화
 * - 로컬/Electron: 파일 기반 (.data/)
 * - Vercel(서버리스): Upstash Redis
 *
 * 환경변수 UPSTASH_REDIS_REST_URL이 있으면 Redis, 없으면 파일
 */

import { Redis } from "@upstash/redis";

const isRedisEnabled = !!(
  process.env.UPSTASH_REDIS_REST_URL &&
  process.env.UPSTASH_REDIS_REST_TOKEN
);

let redis: Redis | null = null;

function getRedis(): Redis {
  if (!redis) {
    redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL!,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    });
  }
  return redis;
}

// ── 파일 기반 ──
async function fileRead<T>(key: string, fallback: T): Promise<T> {
  const fs = await import("fs");
  const path = await import("path");
  const filePath = path.join(process.cwd(), ".data", `${key}.json`);

  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  if (!fs.existsSync(filePath)) return fallback;

  try {
    return JSON.parse(fs.readFileSync(filePath, "utf-8"));
  } catch {
    return fallback;
  }
}

async function fileWrite<T>(key: string, data: T): Promise<void> {
  const fs = await import("fs");
  const path = await import("path");
  const dir = path.join(process.cwd(), ".data");
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, `${key}.json`), JSON.stringify(data, null, 2), "utf-8");
}

// ── 통합 인터페이스 ──
export async function storageGet<T>(key: string, fallback: T): Promise<T> {
  if (isRedisEnabled) {
    const data = await getRedis().get<T>(key);
    return data ?? fallback;
  }
  return fileRead(key, fallback);
}

export async function storageSet<T>(key: string, data: T): Promise<void> {
  if (isRedisEnabled) {
    await getRedis().set(key, data);
    return;
  }
  return fileWrite(key, data);
}
