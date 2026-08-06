"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

// Keeps every open tab/device current without a manual reload — no new
// infrastructure, just re-fetching this page's Server Component data at
// the moments it's actually likely to be stale:
//   1. The tab regains focus / becomes visible again (you switched back
//      after adding/deleting something elsewhere — the common case).
//   2. A periodic safety net while a tab is left open and visible for a
//      long stretch, so a booking or Stripe webhook that lands while
//      you're staring at the Dashboard still shows up on its own.
// Refreshing re-renders Server Components with fresh data; it doesn't
// touch client-side state (in-progress form input, scroll position), so
// it's safe to run in the background without interrupting anything.
const BACKGROUND_REFRESH_MS = 45_000;
const MIN_GAP_BETWEEN_REFRESHES_MS = 3_000;

export function AutoRevalidate() {
  const router = useRouter();
  const lastRefreshRef = useRef(0);

  useEffect(() => {
    function refreshIfDue() {
      const now = Date.now();
      if (now - lastRefreshRef.current < MIN_GAP_BETWEEN_REFRESHES_MS) return;
      lastRefreshRef.current = now;
      router.refresh();
    }

    function handleVisibilityChange() {
      if (document.visibilityState === "visible") refreshIfDue();
    }

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("focus", refreshIfDue);

    const interval = setInterval(() => {
      if (document.visibilityState === "visible") refreshIfDue();
    }, BACKGROUND_REFRESH_MS);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("focus", refreshIfDue);
      clearInterval(interval);
    };
  }, [router]);

  return null;
}
