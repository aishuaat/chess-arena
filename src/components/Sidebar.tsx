"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { useUserStats } from "@/hooks/useUserStats";
import { fetchActiveGames } from "@/lib/firebase";
import ThemeSwitch from "./ThemeSwitch";

const navItems = [
  {
    href: "/",
    label: "Home",
    icon: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
        <path d="M8 5.14v14l11-7-11-7z" />
      </svg>
    ),
  },
  {
    href: "/active-games",
    label: "Active Games",
    icon: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2a10 10 0 100 20A10 10 0 0012 2zm0 18a8 8 0 110-16 8 8 0 010 16zm-1-5h2v2h-2zm0-8h2v6h-2z" />
      </svg>
    ),
  },
  {
    href: "/profile",
    label: "Profile",
    icon: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
      </svg>
    ),
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const { userStats } = useUserStats(user ?? null);
  const [activeCount, setActiveCount] = useState(0);

  useEffect(() => {
    fetchActiveGames().then((games) => setActiveCount(games.length));
    const id = window.setInterval(() => {
      fetchActiveGames().then((games) => setActiveCount(games.length));
    }, 30_000);
    return () => window.clearInterval(id);
  }, []);

  const initials = user?.displayName
    ? user.displayName
        .split(" ")
        .map((w: string) => w[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : (user?.email?.slice(0, 2).toUpperCase() ?? "?");

  const displayName =
    user?.displayName ?? user?.email?.split("@")[0] ?? "Player";

  return (
    <aside className="sticky top-0 flex h-screen w-56 shrink-0 flex-col border-r border-slate-200 bg-white dark:border-white/5 dark:bg-[#0D1117]">
      {/* Logo */}
      <div className="px-5 py-5">
        <div className="flex items-center gap-2.5">
          <span className="text-lg leading-none">♟</span>
          <span className="text-sm font-bold tracking-tight text-slate-900 dark:text-white">
            Chess Arena
          </span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-0.5 px-3">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          const isActiveGames = item.href === "/active-games";
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                isActive
                  ? "bg-indigo-500/10 text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-400"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-white/5 dark:hover:text-white"
              }`}
            >
              <span
                className={`shrink-0 ${
                  isActive
                    ? "text-indigo-500 dark:text-indigo-400"
                    : "text-slate-400 dark:text-slate-500"
                }`}
              >
                {item.icon}
              </span>
              <span className="flex-1">{item.label}</span>
              {isActiveGames && activeCount > 0 && (
                <span className="flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold text-emerald-500">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
                  {activeCount}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Bottom */}
      <div className="space-y-3 border-t border-slate-200 px-3 py-4 dark:border-white/5">
        <div className="px-1">
          <ThemeSwitch />
        </div>

        {user && (
          <div className="flex items-center gap-2.5 rounded-lg px-2 py-1.5">
            <div className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-[11px] font-bold text-white">
              {initials}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-semibold text-slate-900 dark:text-white">
                {displayName}
              </p>
              {userStats && userStats.improvementPercent !== 0 && (
                <p
                  className={`text-[10px] ${
                    userStats.improvementPercent > 0
                      ? "text-emerald-500"
                      : "text-red-400"
                  }`}
                >
                  {userStats.improvementPercent > 0 ? "↑" : "↓"}{" "}
                  {Math.abs(userStats.improvementPercent).toFixed(0)}%
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={logout}
              title="Sign out"
              className="shrink-0 rounded-md p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-white/10 dark:hover:text-white"
            >
              <svg
                width="13"
                height="13"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}

export default Sidebar;
