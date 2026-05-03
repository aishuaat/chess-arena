"use client";

import { useEffect, useRef, useState } from "react";
import { collection, onSnapshot, orderBy, query } from "firebase/firestore";
import { db, sendChatMessage, type ChatMessage } from "@/lib/firebase";

export type ChatEntry = ChatMessage & { id: string };

export function useChatMessages(gameId: string | null) {
  const [messages, setMessages] = useState<ChatEntry[]>([]);
  const gameIdRef = useRef(gameId);
  gameIdRef.current = gameId;

  useEffect(() => {
    if (!gameId || !db) return;
    const q = query(
      collection(db, "games", gameId, "messages"),
      orderBy("createdAt", "asc"),
    );
    const unsub = onSnapshot(q, (snap) => {
      setMessages(
        snap.docs.map((d) => ({ id: d.id, ...(d.data() as ChatMessage) })),
      );
    });
    return () => unsub();
  }, [gameId]);

  async function send(uid: string, displayName: string, text: string): Promise<void> {
    const gid = gameIdRef.current;
    if (!gid || !text.trim()) return;
    await sendChatMessage(gid, uid, displayName, text.trim());
  }

  return { messages, send };
}
