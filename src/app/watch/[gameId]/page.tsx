"use client";

import { useParams } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import AuthScreen from "@/components/chess/AuthScreen";
import GameRoom from "@/components/chess/GameRoom";

export default function WatchPage() {
  const params = useParams();
  const gameId = typeof params.gameId === "string" ? params.gameId : null;

  const {
    isAuthLoading,
    isFirebaseConfigured,
    loginWithEmail,
    loginWithGoogle,
    signUpWithEmail,
    user,
  } = useAuth();

  if (isAuthLoading) {
    return (
      <div className="grid min-h-screen place-items-center bg-slate-100 text-sm text-slate-500 dark:bg-[#0B0F19]">
        Loading…
      </div>
    );
  }

  if (!user) {
    return (
      <AuthScreen
        isFirebaseConfigured={isFirebaseConfigured}
        loginWithEmail={loginWithEmail}
        loginWithGoogle={loginWithGoogle}
        signUpWithEmail={signUpWithEmail}
      />
    );
  }

  if (!gameId) {
    return (
      <div className="grid min-h-screen place-items-center bg-slate-100 text-sm text-slate-500 dark:bg-[#0B0F19]">
        Invalid game link.
      </div>
    );
  }

  return <GameRoom gameId={gameId} user={user} forceSpectator={true} />;
}
