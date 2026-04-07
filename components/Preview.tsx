'use client';

import React from 'react';
import ReactMarkdown from 'react-markdown';

interface PreviewProps {
  content: string;
}

class MarkdownErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  override componentDidUpdate(prevProps: { children: React.ReactNode }) {
    if (prevProps.children !== this.props.children && this.state.hasError) {
      this.setState({ hasError: false });
    }
  }

  override render() {
    if (this.state.hasError) {
      return (
        <div className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          预览渲染失败，请检查 Markdown 链接格式是否正确。
        </div>
      );
    }
    return this.props.children;
  }
}

function safeUrlTransform(url: string): string {
  const next = url.trim();
  if (!next) return '';
  const lower = next.toLowerCase();
  if (lower.startsWith('javascript:')) return '';
  return next;
}

export function Preview({ content }: PreviewProps) {
  if (!content) return null;

  return (
    <div className="h-full overflow-auto bg-white p-8">
      <div className="max-w-none prose-preview">
        <MarkdownErrorBoundary>
          <ReactMarkdown urlTransform={safeUrlTransform}>{content}</ReactMarkdown>
        </MarkdownErrorBoundary>
      </div>
    </div>
  );
}
