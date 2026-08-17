import { AlertTriangle, Info } from "lucide-react";
import type { Block } from "../../lib/blog";

export function PostBody({ blocks }: { blocks: Block[] }) {
  return (
    <div className="space-y-5">
      {blocks.map((block, i) => {
        switch (block.type) {
          case "h2":
            return <h2 key={i} className="pt-6 text-[30px] font-semibold leading-[1.15] tracking-[-0.03em] sm:text-[36px]">{block.text}</h2>;
          case "h3":
            return <h3 key={i} className="pt-3 text-xl font-semibold tracking-[-0.02em]">{block.text}</h3>;
          case "p":
            return <p key={i} className="max-w-[70ch] text-lg leading-[1.75] text-[#26303C] sm:text-[19px]">{block.text}</p>;
          case "ul":
            return (
              <ul key={i} className="max-w-[70ch] space-y-2.5">
                {block.items.map((item) => (
                  <li key={item} className="flex gap-3 text-lg leading-[1.7] text-[#26303C]">
                    <span className="mt-[11px] h-1 w-1 shrink-0 rounded-full bg-[#2563EB]" aria-hidden />
                    {item}
                  </li>
                ))}
              </ul>
            );
          case "ol":
            return (
              <ol key={i} className="max-w-[70ch] space-y-2.5">
                {block.items.map((item, k) => (
                  <li key={item} className="flex gap-3 text-lg leading-[1.7] text-[#26303C]">
                    <span className="num mt-0.5 shrink-0 text-base font-semibold text-[#2563EB]">{k + 1}.</span>
                    {item}
                  </li>
                ))}
              </ol>
            );
          case "formula":
            return (
              <pre key={i} className="num overflow-x-auto rounded-lg border border-hairline bg-sunken px-4 py-3 text-sm leading-relaxed text-fg">
                {block.lines.join("\n")}
              </pre>
            );
          case "table":
            return (
              <figure key={i} className="overflow-hidden rounded-lg border border-hairline">
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="border-b border-hairline bg-sunken/70">
                        {block.head.map((h, k) => (
                          <th key={h} scope="col" className={`px-3 py-2 text-2xs font-medium uppercase tracking-wider text-muted ${k > 0 ? "text-right" : "text-left"}`}>
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {block.rows.map((row, r) => (
                        <tr key={r} className="border-b border-hairline last:border-0">
                          {row.map((cell, c) => (
                            <td key={c} className={`px-3 py-2 text-sm ${c > 0 ? "num text-right" : "text-left font-medium"}`}>{cell}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {block.caption ? (
                  <figcaption className="border-t border-hairline bg-sunken/40 px-3 py-2 text-xs text-muted">{block.caption}</figcaption>
                ) : null}
              </figure>
            );
          case "callout":
            return (
              <aside
                key={i}
                className={`max-w-[68ch] rounded-lg border p-4 ${
                  block.tone === "warning"
                    ? "border-warning/30 bg-warning/[0.08]"
                    : "border-[#2563EB]/25 bg-[#2563EB]/[0.06]"
                }`}
              >
                <p className={`flex items-center gap-2 text-base font-semibold ${block.tone === "warning" ? "text-warning" : "text-[#2563EB]"}`}>
                  {block.tone === "warning" ? <AlertTriangle className="h-4 w-4" /> : <Info className="h-4 w-4" />}
                  {block.title}
                </p>
                <p className="mt-1.5 text-base leading-relaxed text-fg/90">{block.text}</p>
              </aside>
            );
          case "quote":
            return (
              <blockquote key={i} className="max-w-[68ch] border-l-2 border-[#2563EB] pl-5">
                <p className="text-2xl font-medium leading-snug tracking-tight">{block.text}</p>
                {block.cite ? <cite className="mt-2 block text-sm not-italic text-muted"> {block.cite}</cite> : null}
              </blockquote>
            );
          default:
            return null;
        }
      })}
    </div>
  );
}
