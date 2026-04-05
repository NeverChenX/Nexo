'use client';

import { useEffect, useRef } from 'react';
import EasyMDE from 'easymde';
import 'easymde/dist/easymde.min.css';

interface EditorProps {
  content: string;
  onChange: (content: string) => void;
  readOnly?: boolean;
}

export function Editor({ content, onChange, readOnly = false }: EditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const easyMDERef = useRef<EasyMDE | null>(null);

  useEffect(() => {
    if (textareaRef.current && !easyMDERef.current) {
      easyMDERef.current = new EasyMDE({
        element: textareaRef.current,
        spellChecker: false,
        autoDownloadFontAwesome: false,
        toolbar: readOnly ? false : undefined,
        status: !readOnly,
        initialValue: content,
        onUpdate: () => {
          const value = easyMDERef.current?.value() || '';
          onChange(value);
        },
      });
    }

    return () => {
      if (easyMDERef.current && !readOnly) {
        // 保留编辑器实例，不销毁
      }
    };
  }, []);

  // 更新内容
  useEffect(() => {
    if (easyMDERef.current && content) {
      easyMDERef.current.value(content);
    }
  }, [content]);

  return (
    <div className="editor-area">
      <textarea ref={textareaRef} defaultValue={content} />
    </div>
  );
}
