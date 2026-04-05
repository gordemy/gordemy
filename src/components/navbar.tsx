"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { GlowButton } from "./ui/glow-button";
import { useAuth } from "@/lib/auth-context";

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, loading, signOut } = useAuth();

  const isLanding = pathname === "/";
  const isOnboarding = pathname === "/onboarding";

  const handleSignOut = async () => {
    await signOut();
    router.push("/");
  };

  return (
    <nav className="sticky top-0 z-50 flex items-center justify-between px-6 py-4 border-b border-gordemy-border bg-gordemy-bg/90 backdrop-blur-xl">
      <Link href={user ? "/dashboard" : "/"} className="flex items-center gap-2 group">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-gordemy-blue to-gordemy-purple flex items-center justify-center text-lg font-black text-white transition-transform group-hover:scale-110">
          G
        </div>
        <span className="text-xl font-extrabold tracking-tight">GORDEMY</span>
      </Link>

      {!loading && !isOnboarding && (
        <div className="flex items-center gap-3">
          {user ? (
            <>
              <Link href="/leaderboard" className="text-sm text-gordemy-muted hover:text-white transition-colors">🏆</Link>
              <Link href="/achievements" className="text-sm text-gordemy-muted hover:text-white transition-colors">🎖️</Link>
              <Link
                href="/dashboard"
                className="text-sm text-gordemy-muted hover:text-white transition-colors"
              >
                {user.user_metadata?.name || user.email}
              </Link>
              <button
                onClick={handleSignOut}
                className="px-4 py-2 rounded-xl text-sm font-semibold text-gordemy-muted border border-gordemy-border hover:border-red-500/50 hover:text-red-400 transition-all"
              >
                Вийти
              </button>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="px-5 py-2.5 rounded-xl text-sm font-semibold text-gordemy-muted border border-gordemy-border hover:border-gordemy-muted/50 transition-all"
              >
                Увійти
              </Link>
              <Link href="/register">
                <GlowButton className="!px-5 !py-2.5 !text-sm">
                  Почати
                </GlowButton>
              </Link>
            </>
          )}
        </div>
      )}
    </nav>
  );
}