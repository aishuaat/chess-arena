"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import ThemeSwitch from "@/components/ThemeSwitch";
import UserMenu from "@/components/UserMenu";

export function AppNav() {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  return (
    <nav className="sticky top-0 z-50 flex h-12 items-center justify-between border-b border-slate-200/80 bg-white/95 px-4 backdrop-blur transition-colors duration-200 dark:border-slate-800/80 dark:bg-[#0B0F19]/95">
      <Link
        href="/"
        className="text-xs font-bold uppercase tracking-[0.2em] text-violet-600 transition-colors hover:text-violet-500 dark:text-violet-400 dark:hover:text-violet-300"
      >
        Chess Arena
      </Link>

      <div className="flex items-center gap-3">
        {user && (
          <>
            <div className="flex items-center gap-0.5">
              <NavLink href="/" active={pathname === "/"}>
                Play
              </NavLink>
            </div>

            <div className="h-4 w-px bg-slate-200 dark:bg-slate-700" />

            <ThemeSwitch />

            <UserMenu user={user} onLogout={logout} />
          </>
        )}

        {!user && <ThemeSwitch />}
      </div>
    </nav>
  );
}

function NavLink({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors duration-150 ${
        active
          ? "bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-white"
          : "text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800/60 dark:hover:text-slate-100"
      }`}
    >
      {children}
    </Link>
  );
}

export default AppNav;
