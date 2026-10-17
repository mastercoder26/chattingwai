'use client';
import React, { useRef, useState, type ComponentPropsWithoutRef } from 'react';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeHighlight from 'rehype-highlight';
import rehypeKatex from 'rehype-katex';
import { Check, Copy, ImageIcon } from 'lucide-react';
import { IntelligentUIRenderer } from './intelligent-ui';

function extractRawText(node: React.ReactNode): string {
  if (node === null || node === undefined) return '';
  if (typeof node === 'string') return node;
  if (typeof node === 'number') return String(node);
  if (Array.isArray(node)) {
    return node.map(extractRawText).join('');
  }
  if (typeof node === 'object' && 'props' in node) {
    const el = node as React.ReactElement<{ children?: React.ReactNode }>;
    return extractRawText(el.props.children);
  }
  return '';
}

function CodeBlock({ children, ...props }: ComponentPropsWithoutRef<'pre'>) {
  const ref = useRef<HTMLPreElement>(null);
  const [copied, setCopied] = useState(false);
  const [failed, setFailed] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(ref.current?.innerText || '');
      setCopied(true);
      setFailed(false);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      setFailed(true);
    }
  }
  return (
    <div className="code-block">
      <div className="code-toolbar">
        <span>Code</span>
        <button onClick={copy} aria-label="Copy code">
          {copied ? <Check size={13} /> : <Copy size={13} />}{' '}
          {failed ? 'Copy unavailable' : copied ? 'Copied' : 'Copy code'}
        </button>
      </div>
      <pre ref={ref} {...props}>
        {children}
      </pre>
    </div>
  );
}

export function RichText({
  content,
  nested = false,
}: {
  content: string;
  nested?: boolean;
}) {
  return (
    <div className="markdown">
      <Markdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeHighlight, [rehypeKatex, { strict: false }]]}
        components={{
          pre: ({ children, ...props }) => {
            const codeElement = React.isValidElement(children) ? children : null;
            const className =
              (codeElement?.props as { className?: string } | undefined)?.className ||
              (props as { className?: string }).className ||
              '';
            const isIntelligentUI = /(?:^|\s)language-(?:intelligent-ui|ui)(?:\s|$)/i.test(
              className,
            );

            if (isIntelligentUI && !nested) {
              const rawText = extractRawText(
                (codeElement?.props as { children?: React.ReactNode } | undefined)
                  ?.children ?? children,
              );
              return <IntelligentUIRenderer raw={rawText} />;
            }

            return <CodeBlock {...props}>{children}</CodeBlock>;
          },
          table: ({ children }) => (
            <div className="table-scroll">
              <table>{children}</table>
            </div>
          ),
          a: ({ href, children }) => (
            <a href={href} target="_blank" rel="noopener noreferrer">
              {children}
            </a>
          ),
          img: ({ src, alt }) =>
            typeof src === 'string' ? (
              <a href={src} target="_blank" rel="noopener noreferrer" className="image-link">
                <ImageIcon size={15} />
                {alt || 'View image'}
              </a>
            ) : null,
        }}
      >
        {content}
      </Markdown>
    </div>
  );
}
