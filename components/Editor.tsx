'use client';

import { useEffect, useRef, useState } from 'react';
import 'easymde/dist/easymde.min.css';

interface EditorProps {
  content: string;
  onChange: (content: string) => void;
  readOnly?: boolean;
}

export function Editor({ content, onChange, readOnly = false }: EditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const easyMDERef = useRef<any>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted || !textareaRef.current || easyMDERef.current) return;

    import('easymde').then((module) => {
      const EasyMDE = module.default;
      try {
        easyMDERef.current = new EasyMDE({
          element: textareaRef.current!,
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
      } catch (error) {
        console.error('Failed to initialize EasyMDE:', error);
      }
    });

    return () => {
      if (easyMDERef.current && easyMDERef.current.codemirror) {
        easyMDERef.current.codemirror.toTextArea();
        easyMDERef.current = null;
      }
    };
  }, [mounted]);

  useEffect(() => {
    if (easyMDERef.current && content) {
      easyMDERef.current.value(content);
    }
  }, [content]);

  return (
    <div className="h-full overflow-auto bg-white">
      <textarea ref={textareaRef} defaultValue={content} />
    </div>
  );
}
