import ChessGame from "@/components/chess/ChessGame";

export default function Home() {
  return (
    <main className="min-h-[calc(100vh-3rem)] bg-slate-100 dark:bg-[#0B0F19]">
      <ChessGame />
    </main>
  );
}
