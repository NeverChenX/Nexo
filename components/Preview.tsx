'use client';

import { useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import { Card } from '@/components/ui/card';

interface PreviewProps {
  content: string;
}

export function Preview({ content }: PreviewProps) {
  // 使用 useMemo 避免重复渲染
  const markdownContent = useMemo(() => {
    if (!content) return null;
    return (
      <ReactMarkdown
        components={{
          h1: ({ node, ...props }) => <h1 className="text-3xl font-bold mb-4 mt-6" {...props} />,
          h2: ({ node, ...props }) => <h2 className="text-2xl font-bold mb-3 mt-5" {...props} />,
          h3: ({ node, ...props }) => <h3 className="text-xl font-bold mb-2 mt-4" {...props} />,
          p: ({ node, ...props }) => <p className="mb-3 leading-7" {...props} />,
          ul: ({ node, ...props }) => <ul className="list-disc list-inside mb-3 ml-4" {...props} />,
          ol: ({ node, ...props }) => <ol className="list-decimal list-inside mb-3 ml-4" {...props} />,
          li: ({ node, ...props }) => <li className="mb-1" {...props} />,
          code: ({ node, inline, ...props }: any) =>
            inline ? (
              <code className="bg-gray-100 px-2 py-1 rounded text-sm font-mono" {...props} />
            ) : (
              <pre className="bg-gray-900 text-gray-100 p-4 rounded mb-3 overflow-auto">
                <code {...props} />
              </pre>
            ),
          blockquote: ({ node, ...props }) => (
            <blockquote className="border-l-4 border-gray-300 pl-4 mb-3 italic text-gray-600" {...props} />
          ),
          a: ({ node, ...props }) => <a className="text-blue-500 hover:underline" {...props} />,
        }}
      >
        {content}
      </ReactMarkdown>
    );
  }, [content]);

  return (
    <Card className="h-full flex flex-col border-0 rounded-none overflow-auto p-6">
      <div className="prose prose-sm max-w-none text-gray-700">
        {markdownContent}
      </div>
    </Card>
  );
}
