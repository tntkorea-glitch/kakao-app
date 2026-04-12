import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    version: "1.0.0",
    downloadUrl: null, // 업데이트 있을 때 설치파일 URL 설정
  });
}
