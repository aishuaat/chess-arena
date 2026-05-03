import { initializeApp, getApps } from "firebase/app";
import {
  createUserWithEmailAndPassword,
  getAuth,
  GoogleAuthProvider,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  type User,
} from "firebase/auth";
import {
  addDoc,
  arrayUnion,
  collection,
  doc,
  getCountFromServer,
  getDoc,
  getDocs,
  getFirestore,
  increment,
  limit,
  orderBy,
  query,
  runTransaction,
  where,
  serverTimestamp,
  setDoc,
  updateDoc,
} from "firebase/firestore";
import { computeNewUserStats, type SessionBlunder, type UserStats } from "@/lib/analytics";
import { calculatePoints } from "@/lib/points";

type UserBlunder = {
  fen: string;
  move: string;
  bestMove: string;
  type: "mistake" | "blunder";
  square: string;
  pieceLost: string;
  severity: number;
  gameId: string;
};

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

export const isFirebaseConfigured = Boolean(
  firebaseConfig.apiKey &&
    firebaseConfig.authDomain &&
    firebaseConfig.projectId &&
    firebaseConfig.appId,
);

const app = isFirebaseConfigured
  ? getApps()[0] ?? initializeApp(firebaseConfig)
  : null;

export const auth = app ? getAuth(app) : null;
export const db = app ? getFirestore(app) : null;
export const googleProvider = new GoogleAuthProvider();

async function saveUserProfile(user: User) {
  if (!db) return;
  const ref = doc(db, "users", user.uid);
  const snap = await getDoc(ref);
  const existing = snap.exists() ? snap.data() : {};
  // Always write points/gamesPlayed/streak so orderBy("points") works for all users
  await setDoc(
    ref,
    {
      displayName: user.displayName ?? user.email ?? "Chess player",
      email: user.email,
      points: (existing.points as number | undefined) ?? 0,
      gamesPlayed: (existing.gamesPlayed as number | undefined) ?? 0,
      streak: (existing.streak as number | undefined) ?? 0,
      lastLoginAt: serverTimestamp(),
    },
    { merge: true },
  );
}

export async function loginWithGoogle() {
  if (!auth) throw new Error("Firebase is not configured.");
  const result = await signInWithPopup(auth, googleProvider);
  await saveUserProfile(result.user);
}

export async function loginWithEmail(email: string, password: string) {
  if (!auth) throw new Error("Firebase is not configured.");
  const result = await signInWithEmailAndPassword(auth, email, password);
  await saveUserProfile(result.user);
}

export async function signUpWithEmail(email: string, password: string) {
  if (!auth) throw new Error("Firebase is not configured.");
  const result = await createUserWithEmailAndPassword(auth, email, password);
  await saveUserProfile(result.user);
}

export async function logout() {
  if (!auth) return;
  await signOut(auth);
}

export async function saveUserBlunder(user: User, blunder: UserBlunder) {
  if (!db) return;
  await addDoc(collection(db, "users", user.uid, "blunders"), {
    ...blunder,
    createdAt: serverTimestamp(),
  });
}

export type SavedGame = {
  result: "win" | "loss" | "draw";
  movesCount: number;
  blundersCount: number;
};

export async function saveGame(
  user: User,
  gameId: string,
  game: SavedGame,
): Promise<void> {
  if (!db) return;
  await setDoc(doc(db, "users", user.uid, "games", gameId), {
    ...game,
    createdAt: serverTimestamp(),
  });
}

export async function updateUserStatsAfterGame(
  user: User,
  sessionBlunders: SessionBlunder[],
  existingStats: UserStats | null,
): Promise<void> {
  if (!db) return;
  const newStats = computeNewUserStats(existingStats, user.uid, sessionBlunders);
  await setDoc(doc(db, "userStats", user.uid), newStats);
}

export type PlayerProfile = {
  name: string;
  avatar?: string;
};

export type OnlineGame = {
  players: string[];
  playerProfiles: Record<string, PlayerProfile>;
  moves: string[];
  turn: "white" | "black";
  status: "waiting" | "playing" | "finished";
  result?: "white" | "black" | "draw";
  resignedBy?: "white" | "black";
  isPublic: boolean;
  createdAt: unknown;
};

export type ActiveGame = {
  id: string;
  players: string[];
  playerProfiles: Record<string, PlayerProfile>;
};

export type ChatMessage = {
  uid: string;
  displayName: string;
  text: string;
  createdAt: unknown;
};

export async function createOnlineGame(
  creatorId: string,
  creatorProfile: PlayerProfile,
): Promise<string> {
  if (!db) throw new Error("Firebase is not configured.");
  const ref = doc(collection(db, "games"));
  await setDoc(ref, {
    players: [creatorId],
    playerProfiles: { [creatorId]: creatorProfile },
    moves: [],
    turn: "white",
    status: "waiting",
    isPublic: true,
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

export async function joinOnlineGame(
  gameId: string,
  joinerId: string,
  joinerProfile: PlayerProfile,
): Promise<void> {
  if (!db) throw new Error("Firebase is not configured.");
  const ref = doc(db, "games", gameId);
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists()) throw new Error("Game not found.");
    const data = snap.data() as OnlineGame;
    if (data.players.includes(joinerId)) return;
    if (data.status !== "waiting") throw new Error("Game already started.");
    if (data.players.length >= 2) throw new Error("Game is full.");
    tx.update(ref, {
      players: arrayUnion(joinerId),
      status: "playing",
      playerProfiles: { ...(data.playerProfiles ?? {}), [joinerId]: joinerProfile },
    });
  });
}

export async function pushOnlineMove(
  gameId: string,
  uci: string,
  expectedTurn: "white" | "black",
  nextTurn: "white" | "black",
  isGameOver: boolean,
  result?: "white" | "black" | "draw",
): Promise<void> {
  if (!db) throw new Error("Firebase is not configured.");
  const ref = doc(db, "games", gameId);
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists()) throw new Error("Game not found.");
    const data = snap.data() as OnlineGame;
    if (data.status !== "playing") throw new Error("Game is not active.");
    if (data.turn !== expectedTurn) throw new Error("Not your turn.");
    tx.update(ref, {
      moves: arrayUnion(uci),
      turn: nextTurn,
      status: isGameOver ? "finished" : "playing",
      ...(result ? { result } : {}),
    });
  });
}

export async function resignOnlineGame(
  gameId: string,
  resigningColor: "white" | "black",
): Promise<void> {
  if (!db) throw new Error("Firebase is not configured.");
  const ref = doc(db, "games", gameId);
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists()) throw new Error("Game not found.");
    const data = snap.data() as OnlineGame;
    if (data.status !== "playing") throw new Error("Game is not active.");
    tx.update(ref, {
      status: "finished",
      result: resigningColor === "white" ? "black" : "white",
      resignedBy: resigningColor,
    });
  });
}

export async function updateUserPointsAfterGame(
  userId: string,
  result: "win" | "loss" | "draw",
  blundersCount: number,
): Promise<void> {
  if (!db) return;
  const ref = doc(db, "users", userId);
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    const currentStreak: number = (snap.data()?.streak as number | undefined) ?? 0;
    const newStreak = blundersCount === 0 ? currentStreak + 1 : 0;
    const earned = calculatePoints(result, blundersCount, newStreak);
    tx.set(
      ref,
      { points: increment(earned), gamesPlayed: increment(1), streak: newStreak },
      { merge: true },
    );
  });
}

export type LeaderboardEntry = {
  uid: string;
  displayName: string;
  points: number;
};

export async function fetchActiveGames(): Promise<ActiveGame[]> {
  if (!db) return [];
  const q = query(
    collection(db, "games"),
    where("status", "==", "playing"),
    where("isPublic", "==", true),
    limit(20),
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => {
    const data = d.data() as OnlineGame;
    return {
      id: d.id,
      players: data.players,
      playerProfiles: data.playerProfiles ?? {},
    };
  });
}

export async function fetchLeaderboard(top = 10): Promise<LeaderboardEntry[]> {
  if (!db) return [];
  // Fetch all users without orderBy so documents missing the 'points' field
  // are still included — Firestore silently drops them from orderBy queries.
  const snap = await getDocs(collection(db, "users"));
  return snap.docs
    .map((d) => ({
      uid: d.id,
      displayName: (d.data().displayName as string | undefined) ?? "Player",
      points: (d.data().points as number | undefined) ?? 0,
    }))
    .sort((a, b) => b.points - a.points)
    .slice(0, top);
}

export async function fetchUserRankAndPoints(
  userId: string,
): Promise<{ rank: number; points: number }> {
  if (!db) return { rank: 0, points: 0 };
  const userSnap = await getDoc(doc(db, "users", userId));
  const points = (userSnap.data()?.points as number | undefined) ?? 0;
  const countSnap = await getCountFromServer(
    query(collection(db, "users"), where("points", ">", points)),
  );
  return { rank: countSnap.data().count + 1, points };
}

export async function sendChatMessage(
  gameId: string,
  uid: string,
  displayName: string,
  text: string,
): Promise<void> {
  if (!db) throw new Error("Firebase is not configured.");
  await addDoc(collection(db, "games", gameId, "messages"), {
    uid,
    displayName,
    text: text.trim(),
    createdAt: serverTimestamp(),
  });
}
