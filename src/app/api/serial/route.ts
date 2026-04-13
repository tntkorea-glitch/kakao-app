import { NextRequest, NextResponse } from "next/server";
import { activateSerial, checkSerial, generateSerialKey } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { action, userId, serialKey, durationDays } = body;

  if (action === "activate") {
    if (!userId || !serialKey) {
      return NextResponse.json({ error: "사용자 ID와 시리얼 키를 입력해주세요." }, { status: 400 });
    }
    const result = await activateSerial(userId, serialKey);
    if ("error" in result) {
      return NextResponse.json(result, { status: 400 });
    }
    return NextResponse.json(result);
  }

  if (action === "check") {
    if (!userId) {
      return NextResponse.json({ error: "사용자 ID가 필요합니다." }, { status: 400 });
    }
    const result = checkSerial(userId);
    return NextResponse.json(result);
  }

  if (action === "generate") {
    const key = generateSerialKey(durationDays || 365);
    return NextResponse.json({ key });
  }

  return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
}
