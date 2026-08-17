"use client";

import { useEffect, useRef, useState } from "react";
import { LogoMark } from "../brand/Logo";
import { MEDIA, RATIO_CLASS, type MediaSlot } from "../../lib/media";

/**
 * Captioned media frame.
 *
 * Renders the motion loop where a slot defines one, the still artwork otherwise, and a designed
 * placeholder if an asset is ever missing  so a layout is never broken by a file.
 * Motion is suppressed for `prefers-reduced-motion`, which falls back to the poster.
 */
export function MediaFrame({
  slot, className = "", priority, showCaption = true, ratio, still = false
}: {
  slot: keyof typeof MEDIA | MediaSlot;
  className?: string;
  priority?: boolean;
  showCaption?: boolean;
  ratio?: MediaSlot["ratio"];
  /** Force the still, even when the slot has a video. */
  still?: boolean;
}) {
  const media = typeof slot === "string" ? MEDIA[slot] : slot;
  const [failed, setFailed] = useState(false);
  const [motionOk, setMotionOk] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const aspect = RATIO_CLASS[ratio ?? media.ratio];
  const useVideo = Boolean(media.video) && !still && motionOk && !failed;

  useEffect(() => {
    setMotionOk(!window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }, []);

  // Only play while the frame is on screen.
  useEffect(() => {
    const node = videoRef.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) node.play().catch(() => {}); else node.pause(); },
      { threshold: 0.2 }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [useVideo]);

  return (
    <figure className={className}>
      <div className={`relative w-full overflow-hidden bg-[#0B1220] ${aspect}`}>
        {failed ? (
          <Placeholder src={media.src} />
        ) : useVideo ? (
          <video
            ref={videoRef}
            className="h-full w-full object-cover"
            poster={media.video!.poster}
            muted
            loop
            playsInline
            autoPlay
            preload={priority ? "auto" : "metadata"}
            aria-label={media.alt}
            onError={() => setFailed(true)}
          >
            <source src={media.video!.mp4} type="video/mp4" />
            {media.video!.webm ? <source src={media.video!.webm} type="video/webm" /> : null}
          </video>
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={media.video && !motionOk ? media.video.poster : media.src}
            alt={media.alt}
            loading={priority ? "eager" : "lazy"}
            decoding="async"
            onError={() => setFailed(true)}
            className="h-full w-full object-cover"
          />
        )}
      </div>
      {showCaption ? (
        <figcaption className="mt-3 text-[13px] leading-snug text-[#5B6470]">
          <span className="font-medium text-[#0B1220]">{media.caption}</span>
          {media.credit ? <span className="before:mx-1.5 before:content-['']">{media.credit}</span> : null}
        </figcaption>
      ) : null}
    </figure>
  );
}

function Placeholder({ src }: { src: string }) {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-[#0B1220] text-center">
      <div
        aria-hidden
        className="absolute inset-0 opacity-[0.16]"
        style={{ backgroundImage: "repeating-linear-gradient(135deg, rgba(255,255,255,.65) 0 1px, transparent 1px 22px)" }}
      />
      <LogoMark size={34} className="relative opacity-90" />
      <p className="relative px-6 text-[11px] uppercase tracking-[0.18em] text-white/55">
        Media slot · {src.replace("/media/", "")}
      </p>
    </div>
  );
}
