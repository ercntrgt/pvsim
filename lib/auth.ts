/**
 * NextAuth (Auth.js v5) yapılandırması.
 *
 * - Credentials: geliştirme/giriş (DEV_LOGIN_* env veya DB passwordHash).
 * - Google OAuth: GOOGLE_CLIENT_ID set ise otomatik aktif.
 * - Email magic link (Nodemailer/SMTP): EMAIL_SERVER set ise aktif.
 *
 * Credentials JWT strateji gerektirir; adapter kullanıcı/hesap kalıcılığı
 * ve email doğrulama token'ları için kullanılır.
 */

import NextAuth, { type NextAuthConfig } from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import bcrypt from "bcryptjs";
import { prisma } from "./db";

const providers: NextAuthConfig["providers"] = [
  Credentials({
    id: "credentials",
    name: "E-posta & Parola",
    credentials: {
      email: { label: "E-posta", type: "email" },
      password: { label: "Parola", type: "password" },
    },
    async authorize(creds) {
      const email = String(creds?.email ?? "").toLowerCase().trim();
      const password = String(creds?.password ?? "");
      if (!email || !password) return null;

      // 1) DB kullanıcısı (passwordHash)
      const existing = await prisma.user.findUnique({ where: { email } });
      if (existing?.passwordHash) {
        const ok = await bcrypt.compare(password, existing.passwordHash);
        return ok
          ? { id: existing.id, email: existing.email, name: existing.name }
          : null;
      }

      // 2) Dev login (sadece env tanımlıysa)
      const devEmail = process.env.DEV_LOGIN_EMAIL?.toLowerCase();
      const devPass = process.env.DEV_LOGIN_PASSWORD;
      if (devEmail && devPass && email === devEmail && password === devPass) {
        const user = await prisma.user.upsert({
          where: { email },
          update: {},
          create: { email, name: "Dev Kullanıcı", role: "admin" },
        });
        return { id: user.id, email: user.email, name: user.name };
      }
      return null;
    },
  }),
];

if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  providers.push(
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      allowDangerousEmailAccountLinking: true,
    }),
  );
}

// Email magic link — EMAIL_SERVER varsa dinamik yüklenir (nodemailer
// bağımlılığını yalnızca gerektiğinde getirir).
async function buildAuthConfig(): Promise<NextAuthConfig> {
  const allProviders = [...providers];
  if (process.env.EMAIL_SERVER && process.env.EMAIL_FROM) {
    const { default: Nodemailer } = await import(
      "next-auth/providers/nodemailer"
    );
    allProviders.push(
      Nodemailer({
        server: process.env.EMAIL_SERVER,
        from: process.env.EMAIL_FROM,
      }),
    );
  }
  return {
    adapter: PrismaAdapter(prisma),
    session: { strategy: "jwt" },
    trustHost: true,
    providers: allProviders,
    pages: { signIn: "/login" },
    callbacks: {
      jwt({ token, user }) {
        if (user) token.uid = user.id;
        return token;
      },
      session({ session, token }) {
        if (token.uid && session.user) {
          (session.user as { id?: string }).id = token.uid as string;
        }
        return session;
      },
    },
  };
}

export const { handlers, auth, signIn, signOut } = NextAuth(buildAuthConfig);
