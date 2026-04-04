"use client";

import { clsx } from "clsx";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
}

export function Input({ label, className, ...props }: InputProps) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label className="text-sm font-semibold text-gordemy-muted">
          {label}
        </label>
      )}
      <input
        className={clsx(
          "w-full px-4 py-3 rounded-xl bg-gordemy-bg border border-gordemy-border",
          "text-white text-[15px] placeholder:text-gordemy-muted/50",
          "outline-none transition-all duration-200",
          "focus:border-gordemy-blue focus:shadow-[0_0_0_2px_rgba(59,130,246,0.15)]",
          className
        )}
        {...props}
      />
    </div>
  );
}