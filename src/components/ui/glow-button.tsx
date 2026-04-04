"use client";

import { motion } from "framer-motion";
import { clsx } from "clsx";

type ButtonColor = "blue" | "orange" | "green" | "purple";

interface GlowButtonProps {
  children: React.ReactNode;
  color?: ButtonColor;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
  type?: "button" | "submit";
  fullWidth?: boolean;
}

const colorMap: Record<ButtonColor, { bg: string; glow: string }> = {
  blue: {
    bg: "from-gordemy-blue to-blue-600",
    glow: "shadow-glow-blue hover:shadow-[0_0_30px_rgba(59,130,246,0.6)]",
  },
  orange: {
    bg: "from-gordemy-orange to-orange-600",
    glow: "shadow-glow-orange hover:shadow-[0_0_30px_rgba(249,115,22,0.6)]",
  },
  green: {
    bg: "from-gordemy-green to-green-600",
    glow: "shadow-glow-green hover:shadow-[0_0_30px_rgba(34,197,94,0.6)]",
  },
  purple: {
    bg: "from-gordemy-purple to-purple-600",
    glow: "shadow-glow-purple hover:shadow-[0_0_30px_rgba(168,85,247,0.6)]",
  },
};

export function GlowButton({
  children,
  color = "blue",
  onClick,
  disabled = false,
  className,
  type = "button",
  fullWidth = false,
}: GlowButtonProps) {
  const { bg, glow } = colorMap[color];

  return (
    <motion.button
      type={type}
      onClick={onClick}
      disabled={disabled}
      whileHover={disabled ? {} : { scale: 1.02 }}
      whileTap={disabled ? {} : { scale: 0.98 }}
      className={clsx(
        "bg-gradient-to-br text-white font-bold rounded-xl px-8 py-3.5 text-base",
        "transition-all duration-300 cursor-pointer",
        bg,
        glow,
        disabled && "opacity-50 cursor-not-allowed",
        fullWidth && "w-full",
        className
      )}
    >
      {children}
    </motion.button>
  );
}