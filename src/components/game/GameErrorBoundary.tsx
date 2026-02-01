"use client";

import { Component, type ReactNode } from "react";
import { Button } from "@/components/ui/button";

interface Props {
  children: ReactNode;
  fallbackLabel?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class GameErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error(`[GameErrorBoundary] ${this.props.fallbackLabel ?? "Component"} crashed:`, error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center p-8 text-center gap-4">
          <div className="rounded-lg bg-[var(--accent-red)]/10 border border-[var(--accent-red)]/30 p-6 max-w-md">
            <h3 className="text-sm font-medium text-[var(--accent-red)] mb-2">
              {this.props.fallbackLabel ?? "Component"} encountered an error
            </h3>
            <p className="text-xs text-[var(--foreground-muted)] mb-4">
              {this.state.error?.message ?? "An unexpected error occurred."}
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => this.setState({ hasError: false, error: null })}
            >
              Try Again
            </Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
