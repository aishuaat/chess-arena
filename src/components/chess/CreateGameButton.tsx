"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createOnlineGame } from "@/lib/firebase";
import type { User } from "firebase/auth";

type Props = { user: User };

export function CreateGameButton({ user }: Props) {
  const router = useRouter();
  const [creating, setCreating] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function handleCreate() {
    setCreating(true);
    setErr(null);
    try {
      const gameId = await createOnlineGame(user.uid, {
        name: user.displayName ?? user.email ?? "Player",
        ...(user.photoURL ? { avatar: user.photoURL } : {}),
      });
      router.push(`/play/${gameId}`);
    } catch {
      setErr("Failed to create game. Try again.");
      setCreating(false);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <button
        onClick={handleCreate}
        disabled={creating}
        className="w-full rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 px-5 py-3 text-sm font-semibold text-white shadow-lg transition-all hover:opacity-90 active:scale-95 disabled:opacity-60"
      >
        {creating ? "Creating…" : "Create Game & Get Link"}
      </button>
      {err && <p className="text-center text-xs text-rose-400">{err}</p>}
    </div>
  );
}

export default CreateGameButton;
