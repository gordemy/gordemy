"use client";

import { motion } from "framer-motion";
import { clsx } from "clsx";

interface CardProps {
  children: React.ReactNode;
  selected?: boolean;
  onClick?: () => void;
  className?: string;
  glowColor?: "blue" | "orange" | "green" | "purple";
}

const glowMap = {
  blue: "border-gordemy-blue bg-gordemy-blue/10 shadow-glow-blue",
  orange: "border-gordemy-orange bg-gordemy-orange/10 shadow-glow-orange",
  green: "border-gordemy-green bg-gordemy-green/10 shadow-glow-green",
  purple: "border-gordemy-purple bg-gordemy-purple/10 shadow-glow-purple",
};

export function Card({
  children,
  selected = false,
  onClick,
  className,
  glowColor = "blue",
}: CardProps) {
  return (
    <motion.div
      onClick={onClick}
      whileHover={onClick ? { scale: 1.02 } : {}}
      whileTap={onClick ? { scale: 0.98 } : {}}
      className={clsx(
        "rounded-2xl border-2 p-6 transition-all duration-300",
        onClick && "cursor-pointer",
        selected
          ? glowMap[glowColor]
          : "bg-gordemy-card border-gordemy-border hover:border-gordemy-muted/30",
        className
      )}
    >
      {children}
    </motion.div>
  );
}