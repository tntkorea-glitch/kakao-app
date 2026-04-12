import { NextRequest, NextResponse } from "next/server";
import { signup, login } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { action, email, password, name } = body;

  if (action === "signup") {
    if (!email || !password || !name) {
      return NextResponse.json({ error: "모든 필드를 입력해주세요." }, { status: 400 });
    }
    const result = signup(email, password, name);
    if ("error" in result) {
      return NextResponse.json(result, { status: 400 });
    }
    return NextResponse.json(result);
  }

  if (action === "login") {
    if (!email || !password) {
      return NextResponse.json({ error: "이메일과 비밀번호를 입력해주세요." }, { status: 400 });
    }
    const result = login(email, password);
    if ("error" in result) {
      return NextResponse.json(result, { status: 401 });
    }
    return NextResponse.json(result);
  }

  return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
}
