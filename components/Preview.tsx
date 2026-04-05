'use client';

import ReactMarkdown from 'react-markdown';

interface PreviewProps {
  content: string;
}

export function Preview({ content }: PreviewProps) {
  if (!content) return null;

  return (
    <div className="h-full overflow-auto bg-white p-8">
      <div className="max-w-none prose-preview">
        <ReactMarkdown>
          {content}
        </ReactMarkdown>
      </div>
    </div>
  );
}
