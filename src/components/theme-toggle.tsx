"use client";

import { useEffect, useState } from "react";

type ThemeMode = "system" | "light" | "dark";

const THEME_STORAGE_KEY = "pulsefeed-theme-mode";

function applyTheme(mode: ThemeMode) {
  const root = document.documentElement;
  if (mode === "system") {
    root.removeAttribute("data-theme");
    return;
  }
  root.setAttribute("data-theme", mode);
}

export function ThemeToggle() {
  const [mode, setMode] = useState<ThemeMode>(() => {
    if (typeof window === "undefined") return "system";
    const saved = localStorage.getItem(THEME_STORAGE_KEY);
    return saved === "light" || saved === "dark" || saved === "system" ? saved : "system";
  });

  useEffect(() => {
    applyTheme(mode);
  }, [mode]);

  function onChange(nextMode: ThemeMode) {
    setMode(nextMode);
    localStorage.setItem(THEME_STORAGE_KEY, nextMode);
    applyTheme(nextMode);
  }

  return (
    <select
      aria-label="Theme mode"
      value={mode}
      onChange={(e) => onChange(e.target.value as ThemeMode)}
      className="rounded-md border px-3 py-1.5 text-sm"
    >
      <option value="system">System</option>
      <option value="light">Light</option>
      <option value="dark">Dark</option>
    </select>
  );
}
