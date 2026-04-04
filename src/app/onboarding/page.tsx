"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { GlowButton } from "@/components/ui/glow-button";
import { Card } from "@/components/ui/card";
import { ProgressBar } from "@/components/ui/progress-bar";
import {
  NMT_SUBJECTS,
  SCORE_OPTIONS,
  TIME_OPTIONS,
  type SubjectId,
} from "@/lib/constants";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/lib/supabase";

interface OnboardingAnswers {
  grade: number | null;
  subjects: SubjectId[];
  targetScore: number | null;
  studyTime: number | null;
}

const TOTAL_STEPS = 6;

const slideVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? 200 : -200,
    opacity: 0,
  }),
  center: { x: 0, opacity: 1 },
  exit: (direction: number) => ({
    x: direction > 0 ? -200 : 200,
    opacity: 0,
  }),
};

export default function OnboardingPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState(1);
  const [saving, setSaving] = useState(false);
  const [answers, setAnswers] = useState<OnboardingAnswers>({
    grade: null,
    subjects: [],
    targetScore: null,
    studyTime: null,
  });

  const progress = ((step + 1) / TOTAL_STEPS) * 100;

  const saveOnboarding = async () => {
    if (!user) {
      router.push("/dashboard");
      return;
    }
    setSaving(true);

    try {
      // Update student profile with onboarding data
      const { error: updateError } = await supabase
        .from("students")
        .update({
          grade: answers.grade,
          subjects: answers.subjects,
          target_score: answers.targetScore,
          study_time_minutes: answers.studyTime,
          onboarding_completed: true,
          xp: 50,
        })
        .eq("id", user.id);

      if (updateError) {
        console.error("Update error:", updateError);
      }

      // Save individual answers for analytics (non-blocking)
      supabase.from("onboarding_answers").insert([
        { student_id: user.id, step_number: 1, step_name: "grade", answer: { grade: answers.grade } },
        { student_id: user.id, step_number: 2, step_name: "subjects", answer: { subjects: answers.subjects } },
        { student_id: user.id, step_number: 3, step_name: "target_score", answer: { target_score: answers.targetScore } },
        { student_id: user.id, step_number: 4, step_name: "study_time", answer: { study_time: answers.studyTime } },
      ]).then(({ error }) => {
        if (error) console.error("Onboarding answers error:", error);
      });

    } catch (err) {
      console.error("Failed to save onboarding:", err);
    } finally {
      setSaving(false);
      // Always navigate to dashboard, even if save fails
      router.push("/dashboard");
    }
  };

  const goNext = () => {
    if (step < TOTAL_STEPS - 1) {
      setDirection(1);
      setStep(step + 1);
    } else {
      saveOnboarding();
    }
  };

  const goBack = () => {
    if (step > 0) {
      setDirection(-1);
      setStep(step - 1);
    }
  };

  const toggleSubject = (id: SubjectId) => {
    setAnswers((prev) => ({
      ...prev,
      subjects: prev.subjects.includes(id)
        ? prev.subjects.filter((s) => s !== id)
        : [...prev.subjects, id],
    }));
  };

  const canProceed = (): boolean => {
    switch (step) {
      case 0:
        return true;
      case 1:
        return answers.grade !== null;
      case 2:
        return answers.subjects.length > 0;
      case 3:
        return answers.targetScore !== null;
      case 4:
        return answers.studyTime !== null;
      case 5:
        return true;
      default:
        return false;
    }
  };

  return (
    <div className="max-w-[520px] mx-auto px-6 py-6 min-h-[calc(100vh-70px)] flex flex-col">
      {/* Progress */}
      <div className="mb-8">
        <div className="flex justify-between items-center mb-2">
          {step > 0 ? (
            <button
              onClick={goBack}
              className="text-sm text-gordemy-muted hover:text-white transition-colors"
            >
              ← Назад
            </button>
          ) : (
            <div />
          )}
          <span className="text-sm text-gordemy-muted">
            {step + 1} / {TOTAL_STEPS}
          </span>
        </div>
        <ProgressBar progress={progress} />
      </div>

      {/* Animated Step Content */}
      <div className="flex-1 relative overflow-hidden">
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={step}
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.3, ease: "easeInOut" }}
          >
            {step === 0 && <WelcomeStep />}
            {step === 1 && (
              <GradeStep
                selected={answers.grade}
                onSelect={(grade) =>
                  setAnswers((prev) => ({ ...prev, grade }))
                }
              />
            )}
            {step === 2 && (
              <SubjectsStep
                selected={answers.subjects}
                onToggle={toggleSubject}
              />
            )}
            {step === 3 && (
              <ScoreStep
                selected={answers.targetScore}
                onSelect={(targetScore) =>
                  setAnswers((prev) => ({ ...prev, targetScore }))
                }
              />
            )}
            {step === 4 && (
              <TimeStep
                selected={answers.studyTime}
                onSelect={(studyTime) =>
                  setAnswers((prev) => ({ ...prev, studyTime }))
                }
              />
            )}
            {step === 5 && <FinalStep answers={answers} />}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* CTA Button */}
      <div className="pt-6">
        <GlowButton
          onClick={goNext}
          disabled={!canProceed() || saving}
          color={step === TOTAL_STEPS - 1 ? "green" : "blue"}
          fullWidth
          className="!py-4 !text-base"
        >
          {saving
            ? "Зберігаємо..."
            : step === 0
            ? "Поїхали! 🚀"
            : step === TOTAL_STEPS - 1
            ? "Перейти до навчання →"
            : "Далі →"}
        </GlowButton>
      </div>
    </div>
  );
}

/* ─── Step Components ─── */

function WelcomeStep() {
  return (
    <div className="text-center py-10">
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.5, type: "spring" }}
        className="w-20 h-20 rounded-2xl bg-gradient-to-br from-gordemy-blue to-gordemy-purple flex items-center justify-center text-4xl mx-auto mb-6"
        style={{ boxShadow: "0 0 40px rgba(59,130,246,0.4)" }}
      >
        🎓
      </motion.div>
      <h2 className="text-3xl font-black tracking-tight mb-3">
        Вітаємо в Gordemy!
      </h2>
      <p className="text-base text-gordemy-muted leading-relaxed max-w-[400px] mx-auto mb-8">
        За 5 простих кроків ми створимо твій персональний план підготовки до НМТ.
        Це займе менше хвилини!
      </p>
      <div className="flex justify-center gap-2 flex-wrap">
        {["🎯 Ціль", "📚 Предмети", "⏰ Темп", "🚀 План"].map(
          (item, i) => (
            <motion.span
              key={i}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 + i * 0.1 }}
              className="bg-gordemy-blue/10 border border-gordemy-blue/20 rounded-xl px-3.5 py-2 text-sm text-gordemy-blue font-medium"
            >
              {item}
            </motion.span>
          )
        )}
      </div>
    </div>
  );
}

function GradeStep({
  selected,
  onSelect,
}: {
  selected: number | null;
  onSelect: (grade: number) => void;
}) {
  return (
    <div className="text-center py-5">
      <div className="text-5xl mb-4">🏫</div>
      <h2 className="text-2xl font-extrabold mb-2">В якому ти класі?</h2>
      <p className="text-sm text-gordemy-muted mb-8">
        Це допоможе адаптувати складність завдань
      </p>
      <div className="flex gap-4 justify-center">
        {[10, 11].map((grade) => (
          <Card
            key={grade}
            selected={selected === grade}
            onClick={() => onSelect(grade)}
            className="!w-[140px] !h-[140px] flex flex-col items-center justify-center"
          >
            <div className="text-4xl font-black">{grade}</div>
            <div className="text-sm text-gordemy-muted">клас</div>
          </Card>
        ))}
      </div>
    </div>
  );
}

function SubjectsStep({
  selected,
  onToggle,
}: {
  selected: SubjectId[];
  onToggle: (id: SubjectId) => void;
}) {
  return (
    <div className="text-center py-5">
      <div className="text-5xl mb-4">📚</div>
      <h2 className="text-2xl font-extrabold mb-2">
        Які предмети складатимеш?
      </h2>
      <p className="text-sm text-gordemy-muted mb-6">
        Обери всі предмети НМТ (мінімум 1)
      </p>
      <div className="grid grid-cols-2 gap-3 max-w-[400px] mx-auto">
        {NMT_SUBJECTS.map((subj) => {
          const isSelected = selected.includes(subj.id);
          return (
            <Card
              key={subj.id}
              selected={isSelected}
              onClick={() => onToggle(subj.id)}
              className="!p-3.5 flex items-center gap-2.5"
            >
              <span className="text-xl">{subj.icon}</span>
              <span
                className={`text-sm font-semibold text-left ${
                  isSelected ? "text-white" : "text-gordemy-muted"
                }`}
              >
                {subj.label}
              </span>
            </Card>
          );
        })}
      </div>
      {selected.length > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mt-4 text-sm text-gordemy-blue font-medium"
        >
          Обрано: {selected.length} предмет(ів)
        </motion.div>
      )}
    </div>
  );
}

function ScoreStep({
  selected,
  onSelect,
}: {
  selected: number | null;
  onSelect: (score: number) => void;
}) {
  const colorMap: Record<string, string> = {
    green: "gordemy-green",
    blue: "gordemy-blue",
    purple: "gordemy-purple",
    orange: "gordemy-orange",
  };

  return (
    <div className="text-center py-5">
      <div className="text-5xl mb-4">🎯</div>
      <h2 className="text-2xl font-extrabold mb-2">Яка твоя ціль?</h2>
      <p className="text-sm text-gordemy-muted mb-7">
        Обери бажаний бал НМТ
      </p>
      <div className="flex flex-col gap-3 max-w-[360px] mx-auto">
        {SCORE_OPTIONS.map((opt) => {
          const isSelected = selected === opt.value;
          return (
            <Card
              key={opt.value}
              selected={isSelected}
              onClick={() => onSelect(opt.value)}
              glowColor={opt.color as "green" | "blue" | "purple" | "orange"}
              className="!p-4 flex items-center justify-between"
            >
              <div className="text-left">
                <div
                  className={`text-xl font-extrabold ${
                    isSelected
                      ? `text-${colorMap[opt.color]}`
                      : "text-white"
                  }`}
                >
                  {opt.label}
                </div>
                <div className="text-sm text-gordemy-muted">{opt.desc}</div>
              </div>
              <div
                className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                  isSelected
                    ? `border-${colorMap[opt.color]} bg-${colorMap[opt.color]}`
                    : "border-gordemy-border"
                }`}
              >
                {isSelected && (
                  <span className="text-white text-xs font-bold">✓</span>
                )}
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

function TimeStep({
  selected,
  onSelect,
}: {
  selected: number | null;
  onSelect: (time: number) => void;
}) {
  return (
    <div className="text-center py-5">
      <div className="text-5xl mb-4">⏰</div>
      <h2 className="text-2xl font-extrabold mb-2">Скільки часу на день?</h2>
      <p className="text-sm text-gordemy-muted mb-7">
        Навіть 15 хвилин щодня дають результат
      </p>
      <div className="grid grid-cols-2 gap-3 max-w-[360px] mx-auto">
        {TIME_OPTIONS.map((opt) => {
          const isSelected = selected === opt.value;
          return (
            <Card
              key={opt.value}
              selected={isSelected}
              onClick={() => onSelect(opt.value)}
              className="!p-5 text-center"
            >
              <div className="text-3xl mb-2">{opt.icon}</div>
              <div
                className={`text-lg font-extrabold mb-1 ${
                  isSelected ? "text-gordemy-blue" : "text-white"
                }`}
              >
                {opt.label}
              </div>
              <div className="text-xs text-gordemy-muted">{opt.desc}</div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

function FinalStep({ answers }: { answers: OnboardingAnswers }) {
  const summaryCards = [
    {
      label: "Предметів",
      value: answers.subjects.length,
      color: "text-gordemy-blue",
    },
    {
      label: "Ціль",
      value: `${answers.targetScore || 175}+`,
      color: "text-gordemy-orange",
    },
    {
      label: "Темп",
      value: `${answers.studyTime || 30}хв`,
      color: "text-gordemy-green",
    },
    { label: "XP бонус", value: "+50", color: "text-gordemy-purple" },
  ];

  return (
    <div className="text-center py-10">
      <motion.div
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.6, type: "spring" }}
        className="w-24 h-24 rounded-full bg-gordemy-green/15 border-2 border-gordemy-green/30 flex items-center justify-center text-5xl mx-auto mb-6"
        style={{ boxShadow: "0 0 60px rgba(34,197,94,0.3)" }}
      >
        🚀
      </motion.div>

      <h2 className="text-3xl font-black tracking-tight mb-3">
        Твій план готовий!
      </h2>
      <p className="text-base text-gordemy-muted max-w-[400px] mx-auto mb-8 leading-relaxed">
        На основі твоїх відповідей ми створили персональний маршрут підготовки
      </p>

      <div className="grid grid-cols-2 gap-3 max-w-[360px] mx-auto mb-8">
        {summaryCards.map((card, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 + i * 0.1 }}
            className="bg-gordemy-card rounded-2xl p-4 border border-gordemy-border"
          >
            <div className="text-sm text-gordemy-muted">{card.label}</div>
            <div className={`text-2xl font-extrabold ${card.color}`}>
              {card.value}
            </div>
          </motion.div>
        ))}
      </div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.7 }}
        className="bg-gordemy-green/10 border border-gordemy-green/25 rounded-xl px-5 py-3 max-w-[360px] mx-auto text-sm text-gordemy-green font-semibold"
      >
        🎉 +50 XP за завершення онбордінгу!
      </motion.div>
    </div>
  );
}