import { NextResponse } from "next/server";
import { storageGet, storageSet } from "@/lib/storage";
import type { SendRecord } from "@/lib/types";

async function loadHistory(): Promise<SendRecord[]> {
  return storageGet<SendRecord[]>("send-history", []);
}
async function saveHistory(data: SendRecord[]) {
  return storageSet("send-history", data);
}

export async function GET() {
  const history = await loadHistory();
  // 최신순 정렬
  history.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  return NextResponse.json(history);
}

export async function POST(req: Request) {
  const body = await req.json();
  const { action } = body;

  if (action === "add") {
    const history = await loadHistory();
    const record: SendRecord = {
      id: crypto.randomUUID(),
      type: body.type || "immediate",
      timestamp: body.timestamp || new Date().toISOString(),
      room: body.room || "",
      message: body.message || "",
      filePath: body.filePath || "",
      result: body.result || "success",
      error: body.error || "",
      scheduleName: body.scheduleName || "",
    };
    history.push(record);
    // 최대 1000건 유지
    if (history.length > 1000) history.splice(0, history.length - 1000);
    await saveHistory(history);
    return NextResponse.json(record);
  }

  if (action === "delete") {
    const history = await loadHistory();
    const ids: string[] = body.ids || [];
    const filtered = history.filter((h) => !ids.includes(h.id));
    await saveHistory(filtered);
    return NextResponse.json({ deleted: ids.length });
  }

  if (action === "clear") {
    await saveHistory([]);
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: "unknown action" }, { status: 400 });
}
