import type { User } from "firebase/auth";
import type { UserStats } from "@/lib/analytics";

type ProfileHeaderProps = {
  user: User;
  userStats: UserStats | null;
};

export function ProfileHeader({ user, userStats }: ProfileHeaderProps) {
  const initials = getInitials(user.displayName ?? user.email ?? "?");
  const name = user.displayName ?? user.email ?? "Chess player";

  return (
    <div className="flex items-center gap-5">
      <div className="relative shrink-0">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 text-xl font-bold text-white shadow-lg shadow-violet-500/20">
          {initials}
        </div>
        <span className="absolute -bottom-0.5 -right-0.5 h-4 w-4 rounded-full border-2 border-white bg-emerald-400 dark:border-gray-800" />
      </div>

      <div>
        <h1 className="text-xl font-semibold tracking-tight text-slate-900 dark:text-white">
          {name}
        </h1>
        <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">Improving player</p>
        {userStats && userStats.totalGames > 0 && (
          <div className="mt-2 flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-violet-500 dark:bg-violet-400" />
            <span className="text-xs text-slate-500 dark:text-slate-500">
              {userStats.totalGames} game{userStats.totalGames !== 1 ? "s" : ""} played
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

function getInitials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

export default ProfileHeader;
