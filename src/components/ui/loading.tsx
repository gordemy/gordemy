"use client";

import { motion } from "framer-motion";

export function LoadingScreen({ text = "Завантаження..." }: { text?: string }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-70px)] gap-4">
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
        className="w-10 h-10 rounded-xl bg-gradient-to-br from-gordemy-blue to-gordemy-purple"
        style={{ boxShadow: "0 0 20px rgba(59,130,246,0.4)" }}
      />
      <span className="text-gordemy-muted text-sm animate-pulse">{text}</span>
    </div>
  );
}

export function Skeleton({ className = "" }: { className?: string }) {
  return (
    <div
      className={`bg-gordemy-card rounded-xl animate-pulse ${className}`}
    />
  );
}

export function DashboardSkeleton() {
  return (
    <div className="max-w-[640px] mx-auto px-6 py-8">
      <Skeleton className="h-8 w-48 mb-2" />
      <Skeleton className="h-4 w-72 mb-8" />
      <div className="grid grid-cols-4 gap-3 mb-8">
        {[1, 2, 3, 4].map(i => (
          <Skeleton key={i} className="h-24" />
        ))}
      </div>
      <Skeleton className="h-20 mb-6" />
      <Skeleton className="h-5 w-48 mb-4" />
      {[1, 2, 3, 4, 5].map(i => (
        <Skeleton key={i} className="h-20 mb-3" />
      ))}
    </div>
  );
}