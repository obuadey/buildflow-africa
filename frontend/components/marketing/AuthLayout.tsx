"use client";

import Link from "next/link";
import { LogoBadge } from "../brand/Logo";
import { useLightPalette } from "./editorial";

export function AuthLayout({ title, description, children, aside }: {
  title: string; description: string; children: React.ReactNode; aside?: React.ReactNode;
}) {
  useLightPalette();
  return (
    <div className="grid min-h-screen bg-white text-[#0B1220] [color-scheme:light] lg:grid-cols-[1fr_1.05fr]">
      <div className="flex flex-col px-5 py-8 sm:px-10">
        <Link href="/" aria-label="Home"><LogoBadge height={52} /></Link>
        <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center py-12">
          <h1 className="text-[40px] font-semibold leading-[1.05] tracking-[-0.035em] sm:text-[52px]">{title}</h1>
          <p className="mt-4 text-lg leading-[1.6] text-[#3A4351]">{description}</p>
          <div className="mt-9">{children}</div>
        </div>
        <p className="text-sm text-[#5B6470]">
          By continuing you agree to our{" "}
          <Link href="/terms" className="underline underline-offset-4">terms</Link> and{" "}
          <Link href="/privacy" className="underline underline-offset-4">privacy policy</Link>.
        </p>
      </div>

      <div className="relative hidden overflow-hidden bg-[#0B1220] text-white lg:flex lg:flex-col lg:justify-center lg:px-14">
        <div
          aria-hidden
          className="absolute inset-0 opacity-[0.14]"
          style={{ backgroundImage: "repeating-linear-gradient(135deg, rgba(255,255,255,.6) 0 1px, transparent 1px 26px)" }}
        />
        <div className="relative max-w-lg">{aside}</div>
      </div>
    </div>
  );
}
