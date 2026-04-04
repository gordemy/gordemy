"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { GlowButton } from "@/components/ui/glow-button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/lib/auth-context";

interface AuthFormProps {
  mode: "login" | "register";
}

export function AuthForm({ mode }: AuthFormProps) {
  const router = useRouter();
  const { signUp, signIn, resetPassword } = useAuth();
  const isLogin = mode === "login";

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [confirmationSent, setConfirmationSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (isLogin) {
        const { error } = await signIn(email, password);
        if (error) {
          setError(error);
        } else {
          router.push("/dashboard");
        }
      } else {
        if (!name.trim()) {
          setError("Введи своє ім'я");
          setLoading(false);
          return;
        }
        if (password.length < 6) {
          setError("Пароль має бути мінімум 6 символів");
          setLoading(false);
          return;
        }
        const { error, needsConfirmation } = await signUp(email, password, name);
        if (error) {
          setError(error);
        } else if (needsConfirmation) {
          setConfirmationSent(true);
        } else {
          router.push("/onboarding");
        }
      }
    } catch {
      setError("Щось пішло не так. Спробуй ще раз.");
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async () => {
    if (!email) {
      setError("Введи email щоб відновити пароль");
      return;
    }
    setLoading(true);
    const { error } = await resetPassword(email);
    if (error) {
      setError(error);
    } else {
      setResetSent(true);
    }
    setLoading(false);
  };

  return (
    <div className="flex justify-center items-center min-h-[calc(100vh-70px)] px-6">
      <div className="fixed top-[30%] left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full bg-gordemy-blue/5 blur-3xl pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="bg-gordemy-card border border-gordemy-border rounded-2xl p-10 w-full max-w-[420px]"
      >
        <h2 className="text-2xl font-extrabold text-center mb-2">
          {isLogin ? "З поверненням!" : "Створи акаунт"}
        </h2>
        <p className="text-sm text-gordemy-muted text-center mb-8">
          {isLogin
            ? "Увійди щоб продовжити навчання"
            : "Почни підготовку до НМТ прямо зараз"}
        </p>

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 mb-4 text-sm text-red-400">
            {error}
          </div>
        )}

        {resetSent && (
          <div className="bg-gordemy-green/10 border border-gordemy-green/30 rounded-xl px-4 py-3 mb-4 text-sm text-gordemy-green">
            Лист для відновлення паролю надіслано на {email}
          </div>
        )}

        {confirmationSent && (
          <div className="bg-gordemy-blue/10 border border-gordemy-blue/30 rounded-xl px-4 py-5 mb-4 text-center">
            <div className="text-3xl mb-2">📧</div>
            <p className="text-sm font-semibold text-white mb-1">Перевір свою пошту!</p>
            <p className="text-sm text-gordemy-muted">
              Надіслали лист підтвердження на <span className="text-white">{email}</span>.
              Перейди за посиланням у листі щоб активувати акаунт і почати підготовку.
            </p>
          </div>
        )}

        {!confirmationSent && (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {!isLogin && (
              <Input
                label="Ім'я"
                placeholder="Як тебе звати?"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            )}
            <Input
              label="Email"
              type="email"
              placeholder="your@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <Input
              label="Пароль"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
            />

            {isLogin && (
              <div className="text-right">
                <button
                  type="button"
                  onClick={handleReset}
                  className="text-sm text-gordemy-blue hover:underline"
                >
                  Забув пароль?
                </button>
              </div>
            )}

            <GlowButton type="submit" fullWidth className="!mt-2" disabled={loading}>
              {loading
                ? "Зачекай..."
                : isLogin
                ? "Увійти"
                : "Створити акаунт"}
            </GlowButton>
          </form>
        )}

        {!confirmationSent && (
          <div className="text-center mt-6 text-sm text-gordemy-muted">
            {isLogin ? "Ще немає акаунту? " : "Вже є акаунт? "}
            <Link
              href={isLogin ? "/register" : "/login"}
              className="text-gordemy-blue font-semibold hover:underline"
            >
              {isLogin ? "Зареєструватись" : "Увійти"}
            </Link>
          </div>
        )}
      </motion.div>
    </div>
  );
}