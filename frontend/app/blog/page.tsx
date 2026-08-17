"use client";

import { useState } from "react";
import Link from "next/link";
import { MarketingShell } from "../../components/marketing/MarketingShell";
import { MediaFrame } from "../../components/marketing/MediaFrame";
import { Band, EditorialLink, Eyebrow, Lede, Shell, Statement } from "../../components/marketing/editorial";
import { CATEGORIES, POSTS } from "../../lib/blog";
import { formatDate } from "../../lib/format";

export default function BlogIndexPage() {
  const [category, setCategory] = useState<string>("All");
  const [subscribed, setSubscribed] = useState(false);
  const featured = POSTS.find((p) => p.featured) ?? POSTS[0];
  const rest = POSTS.filter((p) => p.slug !== featured.slug);
  const filtered = category === "All" ? rest : rest.filter((p) => p.category === category);

  return (
    <MarketingShell>
      <Band className="pt-16 sm:pt-24">
        <Shell>
          <Eyebrow>Field notes</Eyebrow>
          <Statement as="h1" className="mt-6 max-w-5xl text-[44px] sm:text-[64px] lg:text-[78px]">
            Estimating, contracts and getting paid.
          </Statement>
          <Lede className="mt-8 text-[#3A4351]">
            Worked examples, arithmetic you can check, and the mistakes we see most often in real contractor estimates.
            Written for people who price construction work in Ghana.
          </Lede>
        </Shell>
      </Band>

      <Band className="py-16 sm:py-20">
        <Shell>
          <Link href={`/blog/${featured.slug}`} className="group block border-t border-[#0B1220]/12 pt-10">
            <div className="grid gap-10 lg:grid-cols-[1.15fr_1fr] lg:items-start">
              <div>
                <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-[#5B6470]">
                  {featured.category} · {featured.readMinutes} min read
                </p>
                <Statement className="mt-5 text-[34px] leading-[1.05] sm:text-[52px] group-hover:text-[#2563EB]">
                  {featured.title}
                </Statement>
                <p className="mt-6 max-w-[60ch] text-lg leading-[1.6] text-[#3A4351]">{featured.deck}</p>
                <p className="mt-7 text-sm text-[#5B6470]">
                  {featured.author.name} · {featured.author.role} ·{" "}
                  <time dateTime={featured.date}>{formatDate(featured.date)}</time>
                </p>
              </div>
              <pre className="num overflow-x-auto border border-[#0B1220]/12 bg-[#F5F6F7] p-6 text-[13px] leading-relaxed">
{`markup %  =  (price − cost) ÷ cost × 100
margin %  =  (price − cost) ÷ price × 100

cost      GHS 400,000
+ 20%     GHS  80,000
price     GHS 480,000
margin         16.7%   ← not 20%`}
              </pre>
            </div>
          </Link>
        </Shell>
      </Band>

      <Band className="pb-6">
        <Shell>
          <div className="flex flex-wrap items-center gap-x-7 gap-y-3 border-t border-[#0B1220]/12 pt-5">
            {["All", ...CATEGORIES].map((c) => (
              <button
                key={c}
                onClick={() => setCategory(c)}
                aria-pressed={category === c}
                className={`text-[15px] font-medium transition-colors ${
                  category === c
                    ? "text-[#0B1220] underline decoration-[#2563EB] decoration-2 underline-offset-[6px]"
                    : "text-[#5B6470] hover:text-[#0B1220]"
                }`}
              >
                {c}
              </button>
            ))}
            <span className="num ml-auto text-sm text-[#9AA1AC]">{filtered.length} articles</span>
          </div>
        </Shell>
      </Band>

      <Band className="pb-20 sm:pb-24">
        <Shell>
          <ul>
            {filtered.map((post) => (
              <li key={post.slug} className="border-b border-[#0B1220]/12">
                <Link href={`/blog/${post.slug}`} className="group grid gap-4 py-8 lg:grid-cols-[0.8fr_2fr_auto] lg:items-baseline lg:gap-10">
                  <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-[#5B6470]">
                    {post.category}
                  </p>
                  <div>
                    <p className="text-2xl font-semibold leading-[1.2] tracking-[-0.025em] group-hover:text-[#2563EB] sm:text-[28px]">
                      {post.title}
                    </p>
                    <p className="mt-2 max-w-[68ch] text-[15px] leading-relaxed text-[#3A4351]">{post.deck}</p>
                  </div>
                  <p className="num text-sm text-[#5B6470] lg:text-right">
                    {formatDate(post.date)}
                    <span className="block text-[#9AA1AC]">{post.readMinutes} min</span>
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        </Shell>
      </Band>

      <Band className="pb-20"><Shell><MediaFrame slot="blogHero" /></Shell></Band>

      <Band tone="dark" className="py-20 sm:py-24">
        <Shell>
          <div className="grid gap-10 lg:grid-cols-[1.1fr_1fr] lg:items-end">
            <div>
              <Statement className="text-[32px] sm:text-[44px]">
                One article a month, when we have something worth writing.
              </Statement>
              <p className="mt-5 max-w-[56ch] text-lg leading-[1.6] text-white/70">
                Estimating method, contract practice and cash discipline. No product announcements dressed up as
                advice. Unsubscribe in one click.
              </p>
            </div>
            {subscribed ? (
              <p role="status" className="border-t border-white/20 pt-6 text-lg text-white">
                You are on the list. The next piece will come to your inbox.
              </p>
            ) : (
              <form onSubmit={(e) => { e.preventDefault(); setSubscribed(true); }} className="border-t border-white/20 pt-6">
                <label className="block text-[11px] font-medium uppercase tracking-[0.18em] text-white/50" htmlFor="subscribe-email">
                  Email address
                </label>
                <div className="mt-3 flex items-baseline gap-6">
                  <input
                    id="subscribe-email"
                    type="email"
                    required
                    placeholder="you@company.com"
                    className="h-11 flex-1 border-0 border-b border-white/25 bg-transparent px-0 text-base text-white outline-none placeholder:text-white/35 focus:border-white"
                  />
                  <button type="submit" className="group inline-flex items-baseline gap-2 text-base font-medium text-white underline decoration-white/35 underline-offset-[6px] hover:decoration-white">
                    Subscribe <span aria-hidden className="transition-transform group-hover:translate-x-1">→</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </Shell>
      </Band>
    </MarketingShell>
  );
}
