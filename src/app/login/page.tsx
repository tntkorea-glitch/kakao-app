"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [isSignup, setIsSignup] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: isSignup ? "signup" : "login",
          email,
          password,
          name: isSignup ? name : undefined,
        }),
      });

      const data = await res.json();

      if (data.error) {
        setError(data.error);
        return;
      }

      // 토큰 + 사용자 정보 저장
      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));

      // 대시보드로 이동
      router.push("/");
    } catch {
      setError("서버 연결에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-gray-900 rounded-2xl p-8 shadow-2xl">
        <h1 className="text-2xl font-bold text-center mb-2">
          카카오톡 자동 발송기
        </h1>
        <p className="text-gray-400 text-center text-sm mb-8">
          {isSignup ? "새 계정을 만들어주세요" : "로그인해주세요"}
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          {isSignup && (
            <div>
              <label className="block text-sm text-gray-400 mb-1">이름</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required={isSignup}
                placeholder="홍길동"
                className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-sm focus:outline-none focus:border-blue-500"
              />
            </div>
          )}

          <div>
            <label className="block text-sm text-gray-400 mb-1">이메일</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="email@example.com"
              className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-sm focus:outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-1">
              비밀번호
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="비밀번호 입력"
              className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-sm focus:outline-none focus:border-blue-500"
            />
          </div>

          {error && (
            <div className="text-red-400 text-sm bg-red-900/20 px-3 py-2 rounded-lg">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg font-bold text-sm"
          >
            {loading
              ? "처리 중..."
              : isSignup
              ? "회원가입"
              : "로그인"}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button
            onClick={() => {
              setIsSignup(!isSignup);
              setError("");
            }}
            className="text-sm text-blue-400 hover:text-blue-300"
          >
            {isSignup
              ? "이미 계정이 있나요? 로그인"
              : "계정이 없나요? 회원가입"}
          </button>
        </div>
      </div>
    </div>
  );
}
