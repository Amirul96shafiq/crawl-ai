"use client";

import { marked } from "marked";
import { memo, useMemo, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/utils";

/**
 * parseMarkdownIntoBlocks function logic.
 * Inputs: function parameters.
 * Outputs: function return value.
 * Side effects: none unless stated in implementation.
 * Failure behavior: follows guard clauses and thrown/runtime errors in this block.
 */
function sanitizeImageUrl(url: string): string {
  const secondProto = url.indexOf("https://", 8);
  if (secondProto > 0) return url.slice(secondProto);
  const secondHttp = url.indexOf("http://", 7);
  if (secondHttp > 0) return url.slice(secondHttp);
  return url;
}

function MarkdownImage({
  src,
  alt,
  className,
  ...props
}: React.ComponentPropsWithoutRef<"img">) {
  const raw = typeof src === "string" ? src : "";
  const srcStr = sanitizeImageUrl(raw);
  const isExternal =
    srcStr.startsWith("http://") || srcStr.startsWith("https://");
  const [useProxy, setUseProxy] = useState(false);

  const imgSrc =
    isExternal && srcStr
      ? useProxy
        ? `/api/image-proxy?url=${encodeURIComponent(srcStr)}`
        : srcStr
      : srcStr;

  return (
    <img
      src={imgSrc}
      alt={alt ?? ""}
      loading="lazy"
      decoding="async"
      referrerPolicy="no-referrer"
      className={cn("rounded-lg max-w-full h-auto my-2", className)}
      onError={() => isExternal && !useProxy && setUseProxy(true)}
      {...props}
    />
  );
}

function parseMarkdownIntoBlocks(markdown: string): string[] {
  try {
    const tokens = marked.lexer(markdown);
    return tokens.map((token) => token.raw);
  } catch {
    return [markdown];
  }
}

const MarkdownBlock = memo(
  ({ content, className }: { content: string; className?: string }) => {
    return (
      <div className={cn("chat-markdown", className)}>
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={{
            p: ({ children }) => <p className="mb-4 last:mb-0">{children}</p>,
            strong: ({ children }) => (
              <strong className="font-semibold">{children}</strong>
            ),
            em: ({ children }) => <em className="italic">{children}</em>,
            code: ({ className, children, ...props }) => {
              const isInline = !className;
              if (isInline) {
                return (
                  <code
                    className="rounded bg-muted px-1.5 py-0.5 font-mono text-[0.9em]"
                    {...props}
                  >
                    {children}
                  </code>
                );
              }
              return (
                <code
                  className={cn(
                    "block overflow-x-auto rounded-md bg-muted p-3 font-mono text-sm",
                    className,
                  )}
                  {...props}
                >
                  {children}
                </code>
              );
            },
            pre: ({ children }) => (
              <pre className="mb-2 overflow-x-auto rounded-md bg-muted p-3 text-sm last:mb-0">
                {children}
              </pre>
            ),
            ul: ({ children }) => (
              <ul className="mb-2 list-disc pl-5 last:mb-0">{children}</ul>
            ),
            ol: ({ children }) => (
              <ol className="mb-2 list-decimal pl-5 last:mb-0">{children}</ol>
            ),
            li: ({ children }) => <li className="mb-0.5">{children}</li>,
            blockquote: ({ children }) => (
              <blockquote className="border-l-4 border-muted-foreground/30 pl-4 italic text-muted-foreground">
                {children}
              </blockquote>
            ),
            a: ({ href, children }) => (
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:opacity-80"
              >
                {children}
              </a>
            ),
            h1: ({ children }) => (
              <h1 className="mb-2 mt-3 text-lg font-bold first:mt-0">
                {children}
              </h1>
            ),
            h2: ({ children }) => (
              <h2 className="mb-2 mt-3 text-base font-bold first:mt-0">
                {children}
              </h2>
            ),
            h3: ({ children }) => (
              <h3 className="mb-1 mt-2 text-sm font-bold first:mt-0">
                {children}
              </h3>
            ),
            img: ({ src, alt, className, ...props }) => (
              <MarkdownImage src={src} alt={alt} className={className} {...props} />
            ),
            table: ({ children }) => (
              <div className="my-4 overflow-x-auto rounded-md border border-border">
                <table className="w-max min-w-full border-collapse text-sm">
                  {children}
                </table>
              </div>
            ),
            thead: ({ children }) => (
              <thead className="border-b border-border bg-muted/50">
                {children}
              </thead>
            ),
            tbody: ({ children }) => <tbody>{children}</tbody>,
            tr: ({ children }) => (
              <tr className="border-b border-border last:border-b-0">
                {children}
              </tr>
            ),
            th: ({ children }) => (
              <th className="whitespace-nowrap border-r border-border px-4 py-2 text-left font-semibold last:border-r-0">
                {children}
              </th>
            ),
            td: ({ children }) => (
              <td className="border-r border-border px-4 py-2 align-top last:border-r-0">
                {children}
              </td>
            ),
          }}
        >
          {content}
        </ReactMarkdown>
      </div>
    );
  },
);
MarkdownBlock.displayName = "MarkdownBlock";

export const MemoizedMarkdown = memo(
  ({ content, id }: { content: string; id: string }) => {
    const blocks = useMemo(() => parseMarkdownIntoBlocks(content), [content]);

    return (
      <>
        {blocks.map((block, index) => (
          <MarkdownBlock content={block} key={`${id}-block_${index}`} />
        ))}
      </>
    );
  },
);
MemoizedMarkdown.displayName = "MemoizedMarkdown";
