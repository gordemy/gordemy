"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { GlowButton } from "./ui/glow-button";
import { useAuth } from "@/lib/auth-context";

const NAV_ITEMS = [
  { href: "/boss",              icon: "👹", title: "Денний Бос",      color: "hover:text-red-400"        },
  { href: "/boss?mode=weekly",  icon: "🐉", title: "Тижневий Бос",    color: "hover:text-orange-400"     },
  { href: "/ghost",             icon: "👻", title: "Битва з Собою",   color: "hover:text-cyan-400"       },
  { href: "/duel",              icon: "⚔️", title: "1v1 Дуелі",       color: "hover:text-gordemy-purple" },
  { href: "/card-battle",       icon: "🃏", title: "Card Battle",     color: "hover:text-gordemy-blue"   },
  { href: "/weakspot",          icon: "🎯", title: "Слабкі місця",     color: "hover:text-gordemy-green"  },
  { href: "/leaderboard",       icon: "🏆", title: "Рейтинг",         color: "hover:text-gordemy-orange" },
  { href: "/achievements",      icon: "🎖️", title: "Досягнення",      color: "hover:text-white"          },
  { href: "/avatar",            icon: "🎨", title: "Мій Герой",       color: "hover:text-gordemy-purple" },
];

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, loading, signOut } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);

  const isOnboarding = pathname === "/onboarding";

  const handleSignOut = async () => {
    await signOut();
    router.push("/");
  };

  return (
    <>
      <nav className="sticky top-0 z-50 flex items-center justify-between px-6 py-4 border-b border-gordemy-border bg-gordemy-bg/90 backdrop-blur-xl">
        <Link href={user ? "/dashboard" : "/"} className="flex items-center gap-2 group">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-gordemy-blue to-gordemy-purple flex items-center justify-center text-lg font-black text-white transition-transform group-hover:scale-110">
            G
          </div>
          <span className="text-xl font-extrabold tracking-tight">GORDEMY</span>
        </Link>

        {!loading && !isOnboarding && (
          <div className="flex items-center gap-2">
            {user ? (
              <>
                {/* Desktop: show key nav icons */}
                <div className="hidden sm:flex items-center gap-1">
                  {NAV_ITEMS.slice(0, 6).map(item => (
                    <Link
                      key={item.href}
                      href={item.href}
                      title={item.title}
                      className={`w-9 h-9 flex items-center justify-center rounded-lg text-gordemy-muted transition-all ${item.color} ${pathname === item.href ? "bg-gordemy-border text-white" : ""}`}
                    >
                      {item.icon}
                    </Link>
                  ))}
                </div>

                {/* Hamburger for more / mobile */}
                <button
                  onClick={() => setMenuOpen(prev => !prev)}
                  className="w-9 h-9 flex items-center justify-center rounded-lg border border-gordemy-border text-gordemy-muted hover:text-white hover:border-gordemy-muted/50 transition-all"
                  title="Меню"
                >
                  {menuOpen ? "✕" : "☰"}
                </button>

                <Link
                  href="/dashboard"
                  className="hidden sm:flex items-center gap-1.5 text-sm text-gordemy-muted hover:text-white transition-colors"
                >
                  <div className="w-7 h-7 rounded-full bg-gordemy-purple/30 flex items-center justify-center text-xs font-black text-gordemy-purple">
                    {(user.user_metadata?.name || user.email || "?")[0]?.toUpperCase()}
                  </div>
                </Link>
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
                  <GlowButton className="!px-5 !py-2.5 !text-sm">Почати</GlowButton>
                </Link>
              </>
            )}
          </div>
        )}
      </nav>

      {/* Mobile / expanded menu */}
      {menuOpen && user && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
          onClick={() => setMenuOpen(false)}
        >
          <div
            className="absolute top-[73px] right-0 left-0 bg-gordemy-bg border-b border-gordemy-border p-4"
            onClick={e => e.stopPropagation()}
          >
            <div className="grid grid-cols-4 gap-3 max-w-[600px] mx-auto mb-4">
              {NAV_ITEMS.map(item => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMenuOpen(false)}
                  className={`flex flex-col items-center gap-1 p-3 rounded-xl border border-gordemy-border hover:border-gordemy-muted/40 transition-all ${pathname === item.href ? "bg-gordemy-border/50 border-gordemy-muted/40" : ""}`}
                >
                  <span className="text-2xl">{item.icon}</span>
                  <span className="text-[10px] text-gordemy-muted text-center leading-tight">{item.title}</span>
                </Link>
              ))}
            </div>
            <div className="flex items-center justify-between max-w-[600px] mx-auto pt-3 border-t border-gordemy-border">
              <Link href="/dashboard" onClick={() => setMenuOpen(false)} className="text-sm text-gordemy-muted hover:text-white transition-colors">
                👤 {user.user_metadata?.name || user.email}
              </Link>
              <button
                onClick={() => { setMenuOpen(false); handleSignOut(); }}
                className="px-4 py-1.5 rounded-lg text-sm text-gordemy-muted border border-gordemy-border hover:border-red-500/50 hover:text-red-400 transition-all"
              >
                Вийти
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
