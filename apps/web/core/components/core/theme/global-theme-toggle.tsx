/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { useCallback, useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useUserProfile } from "@/hooks/store/user";

export function GlobalThemeToggle() {
  const [mounted, setMounted] = useState(false);
  const { resolvedTheme, setTheme } = useTheme();
  const { data: userProfile, updateUserTheme } = useUserProfile();

  useEffect(() => {
    setMounted(true);
  }, []);

  const isDark = mounted && resolvedTheme?.includes("dark");
  const nextTheme = isDark ? "light" : "dark";
  const handleToggle = useCallback(() => {
    if (!mounted) return;

    setTheme(nextTheme);

    if (userProfile?.id) {
      void updateUserTheme({ theme: nextTheme }).catch((error) => {
        console.error("Failed to persist theme preference:", error);
      });
    }
  }, [mounted, nextTheme, setTheme, updateUserTheme, userProfile?.id]);

  return (
    <button
      type="button"
      className="flyers-soft-global-theme-toggle"
      data-mode={isDark ? "dark" : "light"}
      onClick={handleToggle}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      aria-pressed={isDark}
      title={isDark ? "Switch to light mode" : "Switch to dark mode"}
      disabled={!mounted}
    >
      <span className="flyers-soft-global-theme-toggle-icon flyers-soft-toggle-sun" aria-hidden="true">
        <Sun strokeWidth={2.2} />
      </span>
      <span className="flyers-soft-global-theme-toggle-icon flyers-soft-toggle-moon" aria-hidden="true">
        <Moon strokeWidth={2.2} />
      </span>
    </button>
  );
}
