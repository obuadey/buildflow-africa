"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

export function useDismiss(onClose: () => void) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [onClose]);
  return ref;
}

export function Menu({ trigger, children, align = "right", width = "w-56", placement = "bottom" }: {
  trigger: (props: { open: boolean; toggle: () => void }) => ReactNode;
  children: (close: () => void) => ReactNode;
  align?: "left" | "right";
  width?: string;
  placement?: "bottom" | "top";
}) {
  const [open, setOpen] = useState(false);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const ref = useDismiss(() => setOpen(false));
  useEffect(() => {
    if (!open) return;
    const update = () => {
      const triggerRect = ref.current?.getBoundingClientRect() ?? null;
      setRect(triggerRect);
    };
    update();
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [open, ref]);

  const content = open && rect ? (
    <div
      role="menu"
      onMouseDown={(event) => event.stopPropagation()}
      style={{
        position: "fixed",
        left: align === "right" ? Math.max(8, rect.right - menuWidth(width)) : rect.left,
        top: placement === "top" ? undefined : rect.bottom + 6,
        bottom: placement === "top" ? Math.max(8, window.innerHeight - rect.top + 6) : undefined
      }}
      className={`z-[90] ${width} animate-slide-up overflow-hidden rounded-lg border border-hairline bg-raised p-1 shadow-overlay`}
    >
      {children(() => setOpen(false))}
    </div>
  ) : null;

  return (
    <div className="relative" ref={ref}>
      {trigger({ open, toggle: () => setOpen((v) => !v) })}
      {content ? createPortal(content, document.body) : null}
    </div>
  );
}

export function MenuItem({ children, onClick, icon: Icon, danger, shortcut }: {
  children: ReactNode; onClick?: () => void; icon?: React.ComponentType<{ className?: string }>; danger?: boolean; shortcut?: string;
}) {
  return (
    <button
      role="menuitem"
      onClick={onClick}
      className={`flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-base transition-colors hover:bg-sunken ${danger ? "text-danger" : "text-fg"}`}
    >
      {Icon ? <Icon className="h-4 w-4 shrink-0 text-muted" /> : null}
      <span className="min-w-0 flex-1 truncate">{children}</span>
      {shortcut ? <kbd className="rounded border border-hairline px-1 text-2xs text-subtle">{shortcut}</kbd> : null}
    </button>
  );
}

export function MenuLabel({ children }: { children: ReactNode }) {
  return <p className="px-2 pb-1 pt-2 text-2xs font-medium uppercase tracking-wider text-subtle">{children}</p>;
}

export function MenuSeparator() {
  return <div className="my-1 h-px bg-hairline" />;
}

function menuWidth(width: string) {
  const match = width.match(/w-(\d+)/);
  if (!match) return 224;
  return Number(match[1]) * 4;
}
