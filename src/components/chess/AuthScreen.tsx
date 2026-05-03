"use client";

import { type FormEvent, useState } from "react";

type AuthScreenProps = {
  isFirebaseConfigured: boolean;
  loginWithEmail: (email: string, password: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  signUpWithEmail: (email: string, password: string) => Promise<void>;
};

export function AuthScreen({
  isFirebaseConfigured,
  loginWithEmail,
  loginWithGoogle,
  signUpWithEmail,
}: AuthScreenProps) {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e?: FormEvent) {
    e?.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      if (mode === "login") {
        await loginWithEmail(email, password);
      } else {
        await signUpWithEmail(email, password);
      }
    } catch {
      setError("Could not authenticate. Check your email and password.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleGoogleLogin() {
    setError(null);
    setIsSubmitting(true);
    try {
      await loginWithGoogle();
    } catch {
      setError("Google login failed.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="min-h-screen bg-[#F8FAFC] p-4 text-gray-900 dark:bg-[#0B1220] dark:text-white">
      <div className="mx-auto grid min-h-screen w-full max-w-6xl items-center gap-8 lg:grid-cols-[1fr_420px]">

        {/* ── Left: hero ── */}
        <div className="max-w-2xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-700 shadow-sm dark:border-gray-700 dark:bg-white/5 dark:text-gray-300">
            <span className="grid h-6 w-6 place-items-center rounded-full bg-indigo-600 text-xs text-white">
              ♟
            </span>
            Chess Arena
          </div>

          <h1 className="mt-8 text-5xl font-bold leading-tight tracking-tight text-gray-900 dark:text-white">
            Train the decision behind every chess move.
          </h1>
          <p className="mt-5 text-lg text-gray-500 dark:text-slate-400">
            Play, review your mistakes, and turn blunders into personalized
            puzzles. Built for players who want feedback, not just another board.
          </p>

          <div className="mt-8 grid gap-3 sm:grid-cols-3">
            {[
              ["AI coach", "Stockfish-backed feedback"],
              ["Blunder Bank", "Your mistakes become puzzles"],
              ["Progress", "Track prevented errors"],
            ].map(([title, description]) => (
              <div
                key={title}
                className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-[#0B1220]"
              >
                <p className="font-semibold text-gray-900 dark:text-white">{title}</p>
                <p className="mt-2 text-sm text-gray-500 dark:text-slate-400">{description}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ── Right: auth card ── */}
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-[#0B1220]">
          {/* Tab switcher */}
          <div className="grid grid-cols-2 gap-1 rounded-lg bg-gray-100 p-1 dark:bg-white/5">
            {(["login", "signup"] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setMode(tab)}
                className={`rounded-md px-4 py-2.5 text-sm font-semibold transition-colors ${
                  mode === tab
                    ? "bg-white text-gray-900 shadow-sm dark:bg-indigo-600 dark:text-white"
                    : "text-gray-500 hover:text-gray-700 dark:text-slate-400 dark:hover:text-white"
                }`}
              >
                {tab === "login" ? "Login" : "Sign Up"}
              </button>
            ))}
          </div>

          <div className="mt-6">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              {mode === "login" ? "Welcome back" : "Create your account"}
            </h2>
            <p className="mt-1.5 text-sm text-gray-500 dark:text-slate-400">
              Your saved blunders and solved puzzles live in your profile.
            </p>
          </div>

          {!isFirebaseConfigured && (
            <p className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-400">
              Firebase config is missing. Add <code>.env.local</code> to enable auth.
            </p>
          )}

          <form onSubmit={handleSubmit} className="mt-5 space-y-4">
            <label className="block text-sm font-semibold text-gray-700 dark:text-slate-300">
              Email
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                autoComplete="email"
                className="mt-1.5 w-full rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/20 dark:border-gray-700 dark:bg-white/5 dark:text-white dark:placeholder:text-slate-500 dark:focus:border-indigo-500"
              />
            </label>

            <label className="block text-sm font-semibold text-gray-700 dark:text-slate-300">
              Password
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                autoComplete={mode === "login" ? "current-password" : "new-password"}
                className="mt-1.5 w-full rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/20 dark:border-gray-700 dark:bg-white/5 dark:text-white dark:placeholder:text-slate-500 dark:focus:border-indigo-500"
              />
            </label>

            {error && (
              <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-400">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={isSubmitting || !isFirebaseConfigured || !email || !password}
              className="w-full rounded-lg bg-indigo-600 px-4 py-2.5 font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSubmitting ? "Please wait…" : mode === "login" ? "Log in" : "Create account"}
            </button>
          </form>

          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={isSubmitting || !isFirebaseConfigured}
            className="mt-3 w-full rounded-lg border border-gray-200 bg-white px-4 py-2.5 font-semibold text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10"
          >
            Login with Google
          </button>
        </div>

      </div>
    </section>
  );
}

export default AuthScreen;
