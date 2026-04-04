"use client";

import { motion } from "framer-motion";

interface ProgressBarProps {
  progress: number; // 0-100
}

export function ProgressBar({ progress }: ProgressBarProps) {
  return (
    <div className="h-1.5 bg-gordemy-card rounded-full overflow-hidden">
      <motion.div
        className="h-full bg-gradient-to-r from-gordemy-blue to-gordemy-purple rounded-full"
        initial={{ width: 0 }}
        animate={{ width: `${progress}%` }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        style={{
          boxShadow: "0 0 10px rgba(59,130,246,0.6)",
        }}
      />
    </div>
  );
}