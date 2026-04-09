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
  const [uploading, setUploading] = useState(false);

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
          autoDownloadFontAwesome: true,
          toolbar: readOnly ? false : undefined,
          status: !readOnly,
          initialValue: content,
          onUpdate: () => {
            const value = easyMDERef.current?.value() || '';
            onChange(value);
          },
        });

        if (!readOnly) {
          const cm = easyMDERef.current.codemirror;
          const handlePaste = async (_instance: unknown, event: ClipboardEvent) => {
            const clipboardItems = event.clipboardData?.items;
            if (!clipboardItems) return;

            const imageItem = Array.from(clipboardItems).find((item) =>
              item.type.startsWith('image/')
            );

            if (!imageItem) return;

            const file = imageItem.getAsFile();
            if (!file) return;

            event.preventDefault();
            setUploading(true);

            const objectUrl = URL.createObjectURL(file);
            const tempMarkdown = `\n![pasted-image](${objectUrl})\n`;
            cm.replaceSelection(tempMarkdown);
            onChange(easyMDERef.current?.value() || '');

            try {
              const formData = new FormData();
              formData.append('image', file, file.name || 'pasted-image.png');

              const res = await fetch('/api/uploads', {
                method: 'POST',
                body: formData,
              });
              const json = await res.json();

              if (!json.ok || !json.data?.url) {
                throw new Error(json.error || '上传失败');
              }

              const currentValue = easyMDERef.current?.value() || '';
              easyMDERef.current?.value(currentValue.replace(objectUrl, json.data.url));
              onChange(easyMDERef.current?.value() || '');
            } catch (error) {
              console.error('Failed to upload pasted image:', error);
              const currentValue = easyMDERef.current?.value() || '';
              easyMDERef.current?.value(currentValue.replace(tempMarkdown, ''));
              onChange(easyMDERef.current?.value() || '');
              alert('图片粘贴失败，请重试');
            } finally {
              URL.revokeObjectURL(objectUrl);
              setUploading(false);
            }
          };

          cm.on('paste', handlePaste);
          (easyMDERef.current as any).__pasteHandler = handlePaste;
        }
      } catch (error) {
        console.error('Failed to initialize EasyMDE:', error);
      }
    });

    return () => {
      if (easyMDERef.current && easyMDERef.current.codemirror) {
        const pasteHandler = (easyMDERef.current as any).__pasteHandler;
        if (pasteHandler) {
          easyMDERef.current.codemirror.off('paste', pasteHandler);
        }
        try {
          easyMDERef.current.codemirror.toTextArea();
        } catch {
          // React 已移除 DOM 节点，忽略此清理错误
        }
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
      {uploading && (
        <div className="px-6 py-2 text-xs text-blue-600 border-b border-blue-100 bg-blue-50">
          正在上传粘贴图片...
        </div>
      )}
      <textarea ref={textareaRef} defaultValue={content} />
    </div>
  );
}
