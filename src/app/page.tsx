"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { GlowButton } from "@/components/ui/glow-button";

const features = [
  {
    icon: "🎯",
    title: "Персональний план",
    desc: "AI аналізує твій рівень і будує маршрут підготовки спеціально для тебе",
  },
  {
    icon: "🎮",
    title: "Навчання як гра",
    desc: "XP, рівні, стріки, досягнення — мотивація кожного дня",
  },
  {
    icon: "📊",
    title: "Аналітика прогресу",
    desc: "Бачиш свої сильні і слабкі сторони в реальному часі",
  },
  {
    icon: "⚡",
    title: "Щоденні завдання",
    desc: "Адаптивні задачі що підлаштовуються під твій темп",
  },
];

const stats = [
  { value: "200+", label: "балів НМТ" },
  { value: "15хв", label: "на день" },
  { value: "100%", label: "безкоштовно" },
];

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.1, duration: 0.5 },
  }),
};

export default function LandingPage() {
  return (
    <main>
      {/* Hero */}
      <section className="relative overflow-hidden px-6 pt-20 pb-16 text-center">
        {/* Background glow */}
        <div className="absolute top-[-100px] left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full bg-gordemy-blue/5 blur-3xl pointer-events-none" />

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="inline-block bg-gordemy-blue/10 border border-gordemy-blue/20 rounded-full px-4 py-1.5 text-sm font-semibold text-gordemy-blue mb-6"
        >
          Підготовка до НМТ нового покоління
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight leading-[1.1] max-w-[700px] mx-auto mb-5"
        >
          Здобудь максимальний бал на{" "}
          <span className="text-gradient">НМТ</span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-lg text-gordemy-muted max-w-[500px] mx-auto mb-10 leading-relaxed"
        >
          AI-платформа що перетворює підготовку на гру. Персональний план,
          щоденні завдання і мотивація кожного дня.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Link href="/register">
            <GlowButton className="!px-10 !py-4 !text-lg">
              Почати безкоштовно →
            </GlowButton>
          </Link>
        </motion.div>

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="flex justify-center gap-12 mt-16 flex-wrap"
        >
          {stats.map((s, i) => (
            <div key={i} className="text-center">
              <div className="text-3xl font-black">{s.value}</div>
              <div className="text-sm text-gordemy-muted">{s.label}</div>
            </div>
          ))}
        </motion.div>
      </section>

      {/* Features */}
      <section className="px-6 py-16 max-w-[800px] mx-auto">
        <h2 className="text-center text-3xl font-extrabold tracking-tight mb-12">
          Чому Gordemy?
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {features.map((f, i) => (
            <motion.div
              key={i}
              custom={i}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={fadeUp}
              className="bg-gordemy-card border border-gordemy-border rounded-2xl p-6 hover:border-gordemy-muted/30 transition-all duration-300"
            >
              <div className="text-3xl mb-3">{f.icon}</div>
              <h3 className="text-base font-bold mb-2">{f.title}</h3>
              <p className="text-sm text-gordemy-muted leading-relaxed">
                {f.desc}
              </p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Testimonial */}
      <section className="px-6 py-16 text-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          className="bg-gradient-to-br from-gordemy-card to-gordemy-card-hover border border-gordemy-border rounded-2xl p-12 max-w-[600px] mx-auto"
        >
          <div className="text-5xl mb-4">💬</div>
          <p className="text-lg italic leading-relaxed mb-4">
            &ldquo;Gordemy допоміг мені підняти бал з 140 до 189 за 3 місяці.
            Як гра — не хотілось зупинятись!&rdquo;
          </p>
          <p className="text-sm text-gordemy-muted">
            — Олена, 11 клас, Київ
          </p>
        </motion.div>
      </section>

      {/* Pricing */}
      <section className="px-6 py-16 max-w-[700px] mx-auto">
        <h2 className="text-center text-3xl font-extrabold tracking-tight mb-12">
          Простий тариф
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {/* Free */}
          <div className="bg-gordemy-card border border-gordemy-border rounded-2xl p-7">
            <div className="text-sm font-semibold text-gordemy-muted mb-2">
              FREE
            </div>
            <div className="text-3xl font-black mb-4">₴0</div>
            {[
              "Placement test",
              "Базовий план",
              "3 предмети",
              "Обмежені задачі",
            ].map((item, i) => (
              <div
                key={i}
                className="text-sm text-gordemy-muted py-1.5"
              >
                ✓ {item}
              </div>
            ))}
            <Link href="/register" className="block mt-5">
              <GlowButton fullWidth>Почати</GlowButton>
            </Link>
          </div>

          {/* Premium */}
          <div className="relative bg-gradient-to-br from-gordemy-card to-[#1a1035] border border-gordemy-purple/30 rounded-2xl p-7">
            <div className="absolute -top-2.5 right-4 bg-gradient-to-r from-gordemy-orange to-red-500 rounded-lg px-3 py-1 text-xs font-bold">
              POPULAR
            </div>
            <div className="text-sm font-semibold text-gordemy-orange mb-2">
              PREMIUM
            </div>
            <div className="text-3xl font-black mb-1">
              ₴299
              <span className="text-sm font-normal text-gordemy-muted">
                /міс
              </span>
            </div>
            <div className="text-xs text-gordemy-muted mb-4">
              або ₴1999/рік
            </div>
            {[
              "Все з Free",
              "AI-репетитор",
              "Необмежені задачі",
              "Детальна аналітика",
              "Живі тьютори",
            ].map((item, i) => (
              <div
                key={i}
                className="text-sm text-gordemy-muted py-1.5"
              >
                ✓ {item}
              </div>
            ))}
            <Link href="/register" className="block mt-5">
              <GlowButton color="orange" fullWidth>
                Спробувати Premium
              </GlowButton>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="px-6 py-10 border-t border-gordemy-border text-center mt-10">
        <p className="text-sm text-gordemy-muted">
          © 2026 Gordemy. Побудовано для амбітних учнів України.
        </p>
      </footer>
    </main>
  );
}