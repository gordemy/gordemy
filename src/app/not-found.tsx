import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-70px)] px-6 text-center">
      <div className="text-6xl mb-4">🔍</div>
      <h2 className="text-2xl font-extrabold mb-2">Сторінку не знайдено</h2>
      <p className="text-gordemy-muted text-sm mb-8">
        Можливо, ви перейшли за неправильним посиланням
      </p>
      <Link
        href="/"
        className="bg-gradient-to-br from-gordemy-blue to-blue-600 text-white font-bold rounded-xl px-8 py-3.5 shadow-glow-blue transition-all hover:scale-105"
      >
        На головну
      </Link>
    </div>
  );
}