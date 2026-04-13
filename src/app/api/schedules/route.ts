import { NextResponse } from "next/server";
import { storageGet, storageSet } from "@/lib/storage";
import type { Schedule } from "@/lib/types";
import crypto from "crypto";

async function loadSchedules(): Promise<Schedule[]> {
  return storageGet<Schedule[]>("schedules", []);
}
async function saveSchedules(data: Schedule[]) {
  return storageSet("schedules", data);
}

export async function GET() {
  const schedules = await loadSchedules();
  return NextResponse.json(schedules);
}

export async function POST(req: Request) {
  const body = await req.json();
  const { action } = body;

  if (action === "create") {
    const schedules = await loadSchedules();
    const newSchedule: Schedule = {
      id: crypto.randomUUID(),
      days: body.days || [],
      times: body.times || [],
      rooms: body.rooms || [],
      message: body.message || "",
      filePath: body.filePath || "",
      fileFirst: body.fileFirst || false,
      repeat: body.repeat ?? true,
      enabled: true,
      createdAt: new Date().toISOString(),
    };
    schedules.push(newSchedule);
    await saveSchedules(schedules);
    return NextResponse.json(newSchedule);
  }

  if (action === "bulk-create") {
    const schedules = await loadSchedules();
    const items: Omit<Schedule, "id" | "createdAt" | "enabled">[] = body.items || [];
    const created: Schedule[] = items.map((item) => ({
      id: crypto.randomUUID(),
      days: item.days || [],
      times: item.times || [],
      rooms: item.rooms || [],
      message: item.message || "",
      filePath: item.filePath || "",
      fileFirst: item.fileFirst || false,
      repeat: item.repeat ?? true,
      enabled: true,
      createdAt: new Date().toISOString(),
    }));
    schedules.push(...created);
    await saveSchedules(schedules);
    return NextResponse.json({ created: created.length });
  }

  if (action === "update") {
    const schedules = await loadSchedules();
    const idx = schedules.findIndex((s) => s.id === body.id);
    if (idx === -1) return NextResponse.json({ error: "스케줄을 찾을 수 없습니다." }, { status: 404 });
    schedules[idx] = { ...schedules[idx], ...body.data };
    await saveSchedules(schedules);
    return NextResponse.json(schedules[idx]);
  }

  if (action === "toggle") {
    const schedules = await loadSchedules();
    const s = schedules.find((s) => s.id === body.id);
    if (!s) return NextResponse.json({ error: "not found" }, { status: 404 });
    s.enabled = !s.enabled;
    await saveSchedules(schedules);
    return NextResponse.json(s);
  }

  if (action === "delete") {
    const schedules = await loadSchedules();
    const filtered = schedules.filter((s) => s.id !== body.id);
    await saveSchedules(filtered);
    return NextResponse.json({ success: true });
  }

  if (action === "delete-all") {
    await saveSchedules([]);
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: "unknown action" }, { status: 400 });
}
