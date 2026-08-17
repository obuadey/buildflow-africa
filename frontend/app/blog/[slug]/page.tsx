import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { MarketingShell } from "../../../components/marketing/MarketingShell";
import { PostBody } from "../../../components/marketing/PostBody";
import { Band, EditorialLink, Eyebrow, Shell, Statement } from "../../../components/marketing/editorial";
import { POSTS, getPost, relatedPosts } from "../../../lib/blog";
import { formatDate } from "../../../lib/format";

export function generateStaticParams() {
  return POSTS.map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const post = getPost(slug);
  return post ? { title: post.title, description: post.deck } : { title: "Article not found" };
}

export default async function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = getPost(slug);
  if (!post) notFound();
  const related = relatedPosts(slug);
  const headings = post.blocks.filter((b) => b.type === "h2") as { type: "h2"; text: string }[];

  return (
    <MarketingShell>
      <Band className="pt-12 sm:pt-16">
        <Shell>
          <Link href="/blog" className="inline-flex items-center gap-2 text-sm text-[#5B6470] hover:text-[#0B1220]">
            <ArrowLeft className="h-3.5 w-3.5" /> Field notes
          </Link>

          <div className="mt-10 border-t border-[#0B1220]/12 pt-10">
            <Eyebrow>{post.category} · {post.readMinutes} min read</Eyebrow>
            <Statement as="h1" className="mt-6 max-w-5xl text-[40px] sm:text-[58px] lg:text-[68px]">
              {post.title}
            </Statement>
            <p className="mt-7 max-w-[62ch] text-xl leading-[1.55] text-[#3A4351]">{post.deck}</p>
            <p className="mt-8 text-sm text-[#5B6470]">
              <span className="font-medium text-[#0B1220]">{post.author.name}</span> · {post.author.role} ·{" "}
              <time dateTime={post.date}>{formatDate(post.date)}</time>
            </p>
          </div>
        </Shell>
      </Band>

      <Band className="py-14 sm:py-16">
        <Shell>
          <div className="grid gap-14 lg:grid-cols-[minmax(0,1fr)_240px]">
            <article className="max-w-[74ch]">
              <PostBody blocks={post.blocks} />
            </article>

            <aside className="hidden lg:block">
              <div className="sticky top-28 border-t border-[#0B1220]/12 pt-5">
                <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-[#5B6470]">In this article</p>
                <ul className="mt-4 space-y-3">
                  {headings.map((h) => (
                    <li key={h.text} className="text-sm leading-snug text-[#3A4351]">{h.text}</li>
                  ))}
                </ul>
              </div>
            </aside>
          </div>
        </Shell>
      </Band>

      <Band tone="dark" className="py-20 sm:py-24">
        <Shell>
          <div className="grid gap-10 lg:grid-cols-[1.1fr_1fr] lg:items-end">
            <div>
              <Statement className="text-[32px] sm:text-[44px]">Put this into practice.</Statement>
              <p className="mt-5 max-w-[56ch] text-lg leading-[1.6] text-white/70">
                The platform applies the arithmetic in this article automatically  markup against margin, overhead
                before profit, waste inside the quantity  using your own supplier and labour rates.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-10 lg:justify-end">
              <EditorialLink href="/register" tone="light">Get Started</EditorialLink>
              <EditorialLink href="/contact" tone="light">Book a walkthrough</EditorialLink>
            </div>
          </div>
        </Shell>
      </Band>

      <Band className="py-16 sm:py-20">
        <Shell>
          <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-[#5B6470]">Keep reading</p>
          <ul className="mt-8 border-t border-[#0B1220]/12">
            {related.map((item) => (
              <li key={item.slug} className="border-b border-[#0B1220]/12">
                <Link href={`/blog/${item.slug}`} className="group grid gap-3 py-7 lg:grid-cols-[0.8fr_2fr] lg:gap-10">
                  <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-[#5B6470]">{item.category}</p>
                  <div>
                    <p className="text-2xl font-semibold leading-[1.2] tracking-[-0.025em] group-hover:text-[#2563EB]">
                      {item.title}
                    </p>
                    <p className="mt-2 max-w-[66ch] text-[15px] leading-relaxed text-[#3A4351]">{item.deck}</p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </Shell>
      </Band>
    </MarketingShell>
  );
}
