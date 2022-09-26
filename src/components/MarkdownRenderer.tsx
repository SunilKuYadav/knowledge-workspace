'use client';

import { useState, useCallback, type ComponentPropsWithoutRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';

interface MarkdownRendererProps {
  children: string;
  className?: string;
}

function CopyButton({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers
      const textarea = document.createElement('textarea');
      textarea.value = code;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [code]);

  return (
    <button
      onClick={handleCopy}
      className="absolute top-2 right-2 p-1.5 rounded-md text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700 transition-colors"
      aria-label={copied ? 'Copied' : 'Copy code'}
      title={copied ? 'Copied!' : 'Copy code'}
    >
      {copied ? (
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-green-400">
          <polyline points="20 6 9 17 4 12" />
        </svg>
      ) : (
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
        </svg>
      )}
    </button>
  );
}

function extractTextContent(node: React.ReactNode): string {
  if (typeof node === 'string') return node;
  if (typeof node === 'number') return String(node);
  if (!node) return '';
  if (Array.isArray(node)) return node.map(extractTextContent).join('');
  if (typeof node === 'object' && 'props' in node) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const element = node as any;
    return extractTextContent(element.props.children);
  }
  return '';
}

/**
 * Shared markdown renderer with syntax highlighting for code blocks.
 * Supports TypeScript, JavaScript, Python, Java, C++, and more.
 * Includes a copy button on code blocks.
 */
export function MarkdownRenderer({ children, className }: MarkdownRendererProps) {
  const content = (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      rehypePlugins={[rehypeHighlight]}
      components={{
        pre({ children: preChildren, ...props }: ComponentPropsWithoutRef<'pre'>) {
          const code = extractTextContent(preChildren);
          return (
            <pre {...props} className={`relative group ${props.className ?? ''}`}>
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
