"use client";

import { useEffect, useState } from "react";

export function EntryMessageModal() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setOpen(true);
  }, []);

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/75 p-4">
      <div className="w-full max-w-xl rounded border border-neon/60 bg-panel p-5 shadow-glow">
        <p className="text-center text-sm uppercase tracking-[0.18em] text-neon sm:text-base">
          NEVER FORGET WHERE YOU CAME FROM AND WHO GOT YOU THERE.
        </p>
        <div className="mt-4 flex justify-center">
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="rounded border border-neon/60 bg-neon/10 px-4 py-2 text-xs uppercase tracking-[0.14em] text-neon hover:bg-neon/20"
          >
            Enter
          </button>
        </div>
      </div>
    </div>
  );
}
