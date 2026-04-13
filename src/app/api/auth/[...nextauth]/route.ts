import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import { login } from "@/lib/auth";

const handler = NextAuth({
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
    }),
    CredentialsProvider({
      name: "이메일",
      credentials: {
        email: { label: "이메일", type: "email" },
        password: { label: "비밀번호", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;
        const result = await login(credentials.email, credentials.password);
        if ("error" in result) return null;
        return {
          id: result.user.id,
          email: result.user.email,
          name: result.user.name,
        };
      },
    }),
  ],
  pages: {
    signIn: "/login",
  },
  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider === "google" && user.email) {
        const { signup, login: loginFn } = await import("@/lib/auth");
        const existing = await loginFn(user.email, `google_${user.id}`);
        if ("error" in existing) {
          await signup(user.email, `google_${user.id}`, user.name || "사용자");
        }
      }
      return true;
    },
    async jwt({ token, user, account }) {
      if (user) {
        token.userId = user.id;
      }
      if (account?.provider === "google") {
        const { login: loginFn } = await import("@/lib/auth");
        const result = await loginFn(token.email as string, `google_${token.sub}`);
        if (!("error" in result)) {
          token.userId = result.user.id;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as { id?: string }).id = token.userId as string;
      }
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET || "kakao-sender-dev-secret-key-change-in-production",
});

export { handler as GET, handler as POST };
