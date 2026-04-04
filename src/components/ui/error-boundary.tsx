"use client";

import { Component, type ReactNode } from "react";
import { GlowButton } from "./glow-button";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback || (
          <div className="flex flex-col items-center justify-center min-h-[calc(100vh-70px)] px-6 text-center">
            <div className="text-5xl mb-4">😕</div>
            <h2 className="text-xl font-bold mb-2">Щось пішло не так</h2>
            <p className="text-gordemy-muted text-sm mb-6 max-w-sm">
              Виникла помилка. Спробуй перезавантажити сторінку.
            </p>
            <GlowButton onClick={() => window.location.reload()}>
              Перезавантажити
            </GlowButton>
          </div>
        )
      );
    }

    return this.props.children;
  }
}

export function EmptyState({
  icon = "📭",
  title,
  description,
}: {
  icon?: string;
  title: string;
  description?: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="text-5xl mb-4">{icon}</div>
      <h3 className="text-lg font-bold mb-1">{title}</h3>
      {description && (
        <p className="text-gordemy-muted text-sm max-w-sm">{description}</p>
      )}
    </div>
  );
}