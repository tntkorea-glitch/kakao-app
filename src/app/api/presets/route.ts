import { NextResponse } from "next/server";
import { storageGet, storageSet } from "@/lib/storage";
import type { QuickSendSet } from "@/lib/types";
import crypto from "crypto";

async function loadPresets(): Promise<QuickSendSet[]> {
  return storageGet<QuickSendSet[]>("presets", []);
}
async function savePresets(data: QuickSendSet[]) {
  return storageSet("presets", data);
}

export async function GET() {
  const presets = await loadPresets();
  return NextResponse.json(presets);
}

export async function POST(req: Request) {
  const body = await req.json();
  const { action } = body;

  if (action === "create") {
    const presets = await loadPresets();
    const preset: QuickSendSet = {
      id: crypto.randomUUID(),
      name: body.name || "새 세트",
      rooms: body.rooms || [],
      message: body.message || "",
      filePath: body.filePath || "",
      fileFirst: body.fileFirst || false,
      createdAt: new Date().toISOString(),
    };
    presets.push(preset);
    await savePresets(presets);
    return NextResponse.json(preset);
  }

  if (action === "update") {
    const presets = await loadPresets();
    const idx = presets.findIndex((p) => p.id === body.id);
    if (idx === -1) return NextResponse.json({ error: "not found" }, { status: 404 });
    presets[idx] = { ...presets[idx], ...body.data };
    await savePresets(presets);
    return NextResponse.json(presets[idx]);
  }

  if (action === "delete") {
    const presets = await loadPresets();
    const filtered = presets.filter((p) => p.id !== body.id);
    await savePresets(filtered);
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: "unknown action" }, { status: 400 });
}
