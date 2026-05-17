"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setErr(null);
    const r = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });
    setLoading(false);
    if (r?.error) setErr("E-posta veya parola hatalı.");
    else router.push("/dashboard");
  }

  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <div className="rounded-2xl border bg-card p-8">
        <h1 className="text-2xl font-bold text-brand-dark">Giriş</h1>
        <p className="text-sm text-muted mt-1">
          PVSim hesabınızla projelerinizi yönetin.
        </p>
        <form onSubmit={submit} className="mt-6 space-y-3">
          <input
            type="email"
            required
            placeholder="E-posta"
            className="w-full rounded-lg border bg-card px-3 py-2 text-sm"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <input
            type="password"
            required
            placeholder="Parola"
            className="w-full rounded-lg border bg-card px-3 py-2 text-sm"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          {err && <p className="text-sm text-red-600">{err}</p>}
          <button
            disabled={loading}
            className="w-full rounded-2xl bg-brand px-4 py-3 font-semibold text-white hover:bg-brand-dark disabled:opacity-60"
          >
            {loading ? "Giriş yapılıyor…" : "Giriş Yap"}
          </button>
        </form>
        <p className="mt-4 text-xs text-muted">
          Geliştirme ortamında <code>DEV_LOGIN_EMAIL</code> /{" "}
          <code>DEV_LOGIN_PASSWORD</code> ile giriş yapılabilir. Google ve
          e-posta bağlantısı, ilgili ortam değişkenleri tanımlanınca
          otomatik etkinleşir.
        </p>
      </div>
    </div>
  );
}
