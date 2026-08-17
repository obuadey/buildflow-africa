import Link from "next/link";

export function BrandMark({ light = false }: { light?: boolean }) {
  return (
    <Link href="/" className="inline-flex items-center gap-3" aria-label="BuildFlow Africa home">
      <span className="relative grid h-9 w-9 place-items-center overflow-hidden rounded-xl bg-gradient-to-br from-blue-600 via-sky-500 to-slate-950 shadow-sm">
        <span className="absolute inset-0 bg-[radial-gradient(circle_at_72%_20%,rgba(255,255,255,.5),transparent_24%)]" />
        <span className="relative grid h-5 w-5 grid-cols-2 gap-0.5">
          <span className="rounded-sm bg-white/95" />
          <span className="rounded-sm bg-cyan-200/95" />
          <span className="rounded-sm bg-blue-100/95" />
          <span className="rounded-sm bg-white/80" />
        </span>
      </span>
      <span className={`text-lg font-extrabold tracking-tight ${light ? "text-white" : "text-slate-950"}`}>BuildFlow Africa</span>
    </Link>
  );
}
