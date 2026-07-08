"use client";

import type { ComponentPropsWithoutRef } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import { CopyButton } from "./components/CopyButton";
import { extractTextContent } from "./utils";
import type { MarkdownRendererProps } from "./types";

/**
 * Shared markdown renderer with syntax highlighting for code blocks.
 * Supports TypeScript, JavaScript, Python, Java, C++, and more.
 * Includes a copy button on code blocks.
 */
export function MarkdownRenderer({
  children,
  className,
}: MarkdownRendererProps) {
  const content = (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      rehypePlugins={[rehypeHighlight]}
      components={{
        pre({
          children: preChildren,
          ...props
        }: ComponentPropsWithoutRef<"pre">) {
          const code = extractTextContent(preChildren);
          return (
            <pre
              {...props}
              className={`relative group ${props.className ?? ""}`}
            >
              {preChildren}
              <CopyButton code={code} />
            </pre>
          );
        },
      }}
    >
      {children}
    </ReactMarkdown>
  );

  if (className) {
    return <div className={className}>{content}</div>;
  }

  return content;
}
