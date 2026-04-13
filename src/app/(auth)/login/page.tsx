"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Mail, Lock, Phone } from "lucide-react";

const FAKE_SESSION_KEY = "zalo_fake_session";
const DEMO_PASSWORD = "123456";
const DEMO_USER = {
  _id: "demo-user-001",
  fullName: "Demo User",
  email: "demo@zalo.local",
  phone: "0987654321",
  avatar: "",
};

export default function LoginPage() {
  const router = useRouter();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const isPhone = useMemo(() => /^\d{9,11}$/.test(identifier.trim()), [identifier]);
  const isEmail = useMemo(() => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(identifier.trim()), [identifier]);

  useEffect(() => {
    const session = localStorage.getItem(FAKE_SESSION_KEY);

    if (session) {
      router.replace("/");
    }
  }, [router]);

  const saveFakeSession = (loginBy: "email" | "phone" | "quick") => {
    localStorage.setItem(
      FAKE_SESSION_KEY,
      JSON.stringify({
        ...DEMO_USER,
        loginBy,
        loggedInAt: new Date().toISOString(),
      })
    );
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!isPhone && !isEmail) {
      setError("Vui lòng nhập đúng số điện thoại hoặc email.");
      return;
    }

    if (password.length < 6) {
      setError("Mật khẩu cần ít nhất 6 ký tự.");
      return;
    }

    setError("");
    saveFakeSession(isPhone ? "phone" : "email");
    router.push("/");
  };

  const handleQuickLogin = () => {
    setIdentifier(DEMO_USER.email);
    setPassword(DEMO_PASSWORD);
    setError("");
    saveFakeSession("quick");
    router.push("/");
  };

  return (
    <div className="relative flex min-h-screen w-full items-center justify-center overflow-hidden p-4 md:p-8">
      <Image
        src="/images/anhnen.jpg" // Ảnh mẫu tạm thời
        alt="Sea background"
        fill
        quality={100}
        priority
        className="-z-20 object-cover"
      />
      <div className="absolute inset-0 -z-10 bg-slate-900/35" />

      <div className="absolute left-0 top-0 h-full w-full bg-[radial-gradient(circle_at_18%_30%,rgba(255,255,255,0.18),transparent_42%),radial-gradient(circle_at_78%_72%,rgba(59,130,246,0.28),transparent_45%)]" />

      <div className="mx-auto grid w-full max-w-6xl gap-8 rounded-[2rem] border border-white/30 bg-white/5 p-4 shadow-[0_18px_55px_rgba(10,16,30,0.45)] backdrop-blur-sm md:grid-cols-[1fr_430px] md:p-8">
        <div className="rounded-[1.5rem] p-6 text-white md:p-10">
          <p className="mb-5 inline-flex items-center gap-2 text-lg font-semibold tracking-[0.2em] text-white/95">
            TRAVEL
          </p>
          <h1 className="text-5xl font-black uppercase leading-[0.9] tracking-tight md:text-7xl">
            Explore
            <br />
            Horizons
          </h1>
          <p className="mt-7 max-w-md text-xl font-medium text-white/90 md:text-2xl">
            Where your dream destinations become reality.
          </p>
          <p className="mt-3 max-w-md text-base text-white/70 md:text-lg">
            Đăng nhập để truy cập Zalo Web, trò chuyện với bạn bè và đồng bộ dữ liệu của bạn mọi lúc.
          </p>
        </div>

        <div className="w-full rounded-[1.5rem] border border-white/30 bg-white/20 p-6 shadow-2xl backdrop-blur-xl md:p-8">
          <form className="space-y-5" onSubmit={handleSubmit}>
            <h2 className="text-center text-3xl font-bold text-white">Đăng nhập</h2>

            <div className="space-y-2">
              <label htmlFor="identifier" className="text-sm font-medium text-white/90">
                Email hoặc số điện thoại
              </label>
              <div className="relative">
                <input
                  id="identifier"
                  name="identifier"
                  type="text"
                  value={identifier}
                  onChange={(event) => setIdentifier(event.target.value)}
                  placeholder="Nhập email hoặc số điện thoại"
                  className="h-12 w-full rounded-lg border border-white/30 bg-white/85 pl-11 pr-4 text-sm text-slate-700 placeholder:text-slate-400 outline-none transition focus:border-blue-500"
                />
                {isPhone ? (
                  <Phone className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-500" />
                ) : (
                  <Mail className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-500" />
                )}
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label htmlFor="password" className="text-sm font-medium text-white/90">
                  Mật khẩu
                </label>
                <Link href="/forgot-password" className="text-sm text-white underline-offset-4 hover:underline">
                  Quên mật khẩu?
                </Link>
              </div>
              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="************"
                  className="h-12 w-full rounded-lg border border-white/30 bg-white/85 pl-11 pr-4 text-sm text-slate-700 placeholder:text-slate-400 outline-none transition focus:border-blue-500"
                />
                <Lock className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-500" />
              </div>
            </div>

            {error ? (
              <p className="rounded-lg bg-red-500/20 px-3 py-2 text-sm text-red-100">{error}</p>
            ) : null}

            <button
              type="submit"
              className="h-12 w-full rounded-lg bg-[#1988ff] text-sm font-semibold text-white transition hover:bg-[#0074f0]"
            >
              SIGN IN
            </button>

            <button
              type="button"
              onClick={handleQuickLogin}
              className="h-11 w-full rounded-lg border border-white/60 bg-white/15 text-sm font-semibold text-white transition hover:bg-white/25"
            >
              Đăng nhập nhanh với tài khoản demo
            </button>

            <p className="rounded-lg bg-black/20 px-3 py-2 text-xs text-white/90">
              Demo: demo@zalo.local hoặc 0987654321 - Mật khẩu: 123456
            </p>

            <div className="flex items-center gap-3">
              <div className="h-px flex-1 bg-white/40" />
              <span className="text-sm text-white">or</span>
              <div className="h-px flex-1 bg-white/40" />
            </div>

            <button
              type="button"
              className="flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-white text-sm font-medium text-slate-700 transition hover:bg-slate-100"
            >
              <span className="text-lg">G</span>
              Sign in with Google
            </button>

            <p className="text-center text-sm text-white/90">
              Bạn chưa có tài khoản?{" "}
              <Link href="/register" className="font-semibold underline underline-offset-4">
                Tạo tài khoản
              </Link>
            </p>
          </form>
        </div>
      </div>

      <footer className="absolute bottom-5 text-center text-xs text-white/80">
        Zalo Web Mock UI - Đăng nhập với email hoặc số điện thoại
      </footer>
    </div>
  );
}