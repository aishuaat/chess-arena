# Chess Arena

A competitive chess platform built for players who want real feedback — not just another board. Play against AI or friends, catch your mistakes, and turn blunders into personalized puzzles.

---

## Who it's for

Chess players at any level who want to improve, not just play. Whether you're training openings, reviewing your games, or competing on a leaderboard — Chess Arena gives you the tools to grow.

---

## Features

### Gameplay
- **Play vs AI** — Stockfish-backed engine with position evaluation and best-move suggestions
- **Real-time multiplayer** — Create a game and invite a friend; the board syncs live via Firebase
- **Puzzle mode** — Dedicated puzzle challenges to sharpen tactical vision
- **Daily challenge** — A fresh puzzle or challenge each day
- **What-If panel** — Explore alternative moves and lines without leaving the game

### Analysis
- **Blunder detection** — Every move is evaluated; mistakes are flagged with severity scores
- **Blunder Bank** — Your blunders are saved and turned into puzzles you can replay
- **Blunder Heatmap** — Visual overlay showing which squares you struggle on most
- **Game Tree Manager** — Multi-branch analysis to explore what could have happened
- **Move history** — Full navigable move list for every game
- **Improvement card** — Game-to-game performance trends so you can see if you're getting better

### Progression
- **Points system** — Earn points based on result (win/draw/loss), whether you played blunder-free, and your current win streak
- **Streak multiplier** — Consecutive wins boost your points per game
- **Leaderboard** — Top players ranked by total points, updated in real time
- **Rank tracking** — See your exact position among all players
- **Profile dashboard** — Blunders prevented, improvement %, play style, level progress bar

### Social & Spectator
- **Active Games feed** — Browse all ongoing public games in real time
- **Spectator mode** — Watch any live game without affecting the players
- **Player avatars** — Both players shown above the board with active-turn indicator
- **Game history** — Full archive of past games with stats

### UX
- **Dark / light mode** — Full theme support with smooth switching
- **Sound effects** — Distinct sounds for moves, captures, and game events
- **Responsive layout** — Works on desktop and mobile
- **Google + email auth** — Sign in with Google or create an account with email and password

---

## Tech Stack

- **Next.js 14** (App Router, TypeScript)
- **Firebase** — Auth, Firestore (real-time game sync, user profiles, leaderboard)
- **Stockfish** — Chess engine via WebAssembly
- **Tailwind CSS** — Utility-first styling with dark mode
- **chess.js** — Move validation and game logic

---



## Deployment

Deployed on Vercel. After deploying, add your Vercel domain to Firebase Console → Authentication → Authorized domains so Google Sign-In works in production.
