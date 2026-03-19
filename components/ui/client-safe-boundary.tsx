"use client";

import React from "react";

class ClientSafeBoundary extends React.Component<
  { children: React.ReactNode; title?: string },
  { hasError: boolean }
> {
  constructor(props: { children: React.ReactNode; title?: string }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: unknown) {
    console.error("Client render error:", error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="rounded border border-amber/50 bg-amber/10 p-4 text-xs text-amber">
          {this.props.title || "A visualization failed to load. Please refresh or switch years."}
        </div>
      );
    }

    return this.props.children;
  }
}

export default ClientSafeBoundary;
