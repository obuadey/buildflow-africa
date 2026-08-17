"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { usePathname } from "next/navigation";

type LoadingContextValue = {
  pending: boolean;
  begin: () => () => void;
  run: <T>(work: Promise<T>) => Promise<T>;
};

const LoadingContext = createContext<LoadingContextValue | null>(null);
const IGNORED_PATHS = ["/_next/", "/favicon", "/icon", "/apple-icon"];

function shouldTrackFetch(input: RequestInfo | URL, init?: RequestInit) {
  if (typeof window === "undefined") return false;
  const request = input instanceof Request ? input : null;
  const rawUrl = request?.url ?? String(input);
  const method = (init?.method ?? request?.method ?? "GET").toUpperCase();
  let url: URL;
  try {
    url = new URL(rawUrl, window.location.href);
  } catch {
    return false;
  }
  if (url.origin !== window.location.origin) return false;
  if (IGNORED_PATHS.some((path) => url.pathname.startsWith(path))) return false;
  return url.pathname.startsWith("/api/") || !["GET", "HEAD", "OPTIONS"].includes(method);
}

function shouldTrackLink(event: MouseEvent) {
  if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
    return false;
  }
  const target = event.target as Element | null;
  const anchor = target?.closest<HTMLAnchorElement>("a[href]");
  if (!anchor || anchor.target || anchor.hasAttribute("download")) return false;
  const url = new URL(anchor.href, window.location.href);
  if (url.origin !== window.location.origin) return false;
  if (url.pathname === window.location.pathname && url.search === window.location.search && url.hash) return false;
  return url.pathname !== window.location.pathname || url.search !== window.location.search;
}

export function GlobalLoadingOverlayProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [count, setCount] = useState(0);
  const [visible, setVisible] = useState(false);
  const navEndRef = useRef<(() => void) | null>(null);

  const begin = useCallback(() => {
    let ended = false;
    setCount((value) => value + 1);
    return () => {
      if (ended) return;
      ended = true;
      setCount((value) => Math.max(0, value - 1));
    };
  }, []);

  const run = useCallback(async <T,>(work: Promise<T>) => {
    const end = begin();
    try {
      return await work;
    } finally {
      end();
    }
  }, [begin]);

  useEffect(() => {
    if (count <= 0) {
      setVisible(false);
      return;
    }
    const timer = window.setTimeout(() => setVisible(true), 220);
    return () => window.clearTimeout(timer);
  }, [count]);

  useEffect(() => {
    const originalFetch = window.fetch.bind(window);
    window.fetch = async (input, init) => {
      const tracked = shouldTrackFetch(input, init);
      const end = tracked ? begin() : null;
      try {
        return await originalFetch(input, init);
      } finally {
        end?.();
      }
    };
    return () => {
      window.fetch = originalFetch;
    };
  }, [begin]);

  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      if (!shouldTrackLink(event)) return;
      navEndRef.current?.();
      const end = begin();
      navEndRef.current = end;
      window.setTimeout(() => {
        if (navEndRef.current === end) {
          navEndRef.current = null;
          end();
        }
      }, 12000);
    };
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, [begin]);

  useEffect(() => {
    navEndRef.current?.();
    navEndRef.current = null;
  }, [pathname]);

  const value = useMemo(() => ({ pending: count > 0, begin, run }), [begin, count, run]);

  return (
    <LoadingContext.Provider value={value}>
      {children}
      {visible ? <LoadingOverlay /> : null}
    </LoadingContext.Provider>
  );
}

export function useLoadingOverlay() {
  const value = useContext(LoadingContext);
  if (!value) {
    throw new Error("useLoadingOverlay must be used inside GlobalLoadingOverlayProvider.");
  }
  return value;
}

function LoadingOverlay() {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-label="Loading"
      className="fixed inset-0 z-[100] flex items-center justify-center bg-canvas/45 backdrop-blur-[2px]"
    >
      <div className="flex min-w-[220px] items-center gap-3 rounded-lg border border-hairline bg-raised px-4 py-3 shadow-overlay">
        <span className="relative flex h-9 w-9 items-center justify-center">
          <span className="absolute h-9 w-9 animate-ping rounded-full bg-accent/20" />
          <span className="h-7 w-7 animate-spin rounded-full border-2 border-accent/20 border-t-accent" />
        </span>
        <span>
          <span className="block text-sm font-semibold">Working</span>
          <span className="block text-xs text-muted">Retrieving your data ...</span>
        </span>
      </div>
    </div>
  );
}
