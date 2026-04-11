'use client';

import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { useEditor, EditorContent, ReactRenderer } from '@tiptap/react';
import { Extension } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import { Suggestion } from '@tiptap/suggestion';
import { Image } from '@tiptap/extension-image';
import { Markdown } from 'tiptap-markdown';
import {
  Type, Heading1, Heading2, Heading3,
  List, ListOrdered, Code, Quote, Minus, ImageIcon, FilePlus,
} from 'lucide-react';

// ─────────────── Slash Commands ───────────────

type CommandItem = {
  title: string;
  subtitle: string;
  Icon: React.ComponentType<{ className?: string }>;
  command: (props: { editor: any; range: any }) => void;
};

const FORMAT_COMMANDS: CommandItem[] = [
  {
    title: '正文', subtitle: '普通段落', Icon: Type,
    command: ({ editor, range }) =>
      editor.chain().focus().deleteRange(range).setParagraph().run(),
  },
  {
    title: '一级标题', subtitle: '大标题 H1', Icon: Heading1,
    command: ({ editor, range }) =>
      editor.chain().focus().deleteRange(range).setHeading({ level: 1 }).run(),
  },
  {
    title: '二级标题', subtitle: '中标题 H2', Icon: Heading2,
    command: ({ editor, range }) =>
      editor.chain().focus().deleteRange(range).setHeading({ level: 2 }).run(),
  },
  {
    title: '三级标题', subtitle: '小标题 H3', Icon: Heading3,
    command: ({ editor, range }) =>
      editor.chain().focus().deleteRange(range).setHeading({ level: 3 }).run(),
  },
  {
    title: '无序列表', subtitle: '项目符号', Icon: List,
    command: ({ editor, range }) =>
      editor.chain().focus().deleteRange(range).toggleBulletList().run(),
  },
  {
    title: '有序列表', subtitle: '编号列表', Icon: ListOrdered,
    command: ({ editor, range }) =>
      editor.chain().focus().deleteRange(range).toggleOrderedList().run(),
  },
  {
    title: '代码块', subtitle: '代码片段', Icon: Code,
    command: ({ editor, range }) =>
      editor.chain().focus().deleteRange(range).toggleCodeBlock().run(),
  },
  {
    title: '引用', subtitle: '引用块', Icon: Quote,
    command: ({ editor, range }) =>
      editor.chain().focus().deleteRange(range).toggleBlockquote().run(),
  },
  {
    title: '分割线', subtitle: '水平分隔线', Icon: Minus,
    command: ({ editor, range }) =>
      editor.chain().focus().deleteRange(range).setHorizontalRule().run(),
  },
  {
    title: '图片', subtitle: '上传本地图片', Icon: ImageIcon,
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).run();
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.onchange = async (e) => {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (!file) return;
        const formData = new FormData();
        formData.append('image', file, file.name);
        try {
          const res = await fetch('/api/uploads', { method: 'POST', body: formData });
          const json = await res.json();
          if (json.ok && json.data?.url) {
            editor.chain().focus().setImage({ src: json.data.url, alt: file.name }).run();
          }
        } catch { alert('图片上传失败'); }
      };
      input.click();
    },
  },
];

// ─────────────── Slash Menu List ───────────────

type SlashMenuRef = { onKeyDown: (props: { event: KeyboardEvent }) => boolean };

const SlashMenuList = forwardRef<SlashMenuRef, { items: CommandItem[]; command: (item: CommandItem) => void }>(
  ({ items, command }, ref) => {
    const [selectedIndex, setSelectedIndex] = useState(0);

    useEffect(() => setSelectedIndex(0), [items]);

    useImperativeHandle(ref, () => ({
      onKeyDown: ({ event }) => {
        if (event.key === 'ArrowUp') {
          setSelectedIndex((i) => (i - 1 + items.length) % items.length);
          return true;
        }
        if (event.key === 'ArrowDown') {
          setSelectedIndex((i) => (i + 1) % items.length);
          return true;
        }
        if (event.key === 'Enter') {
          if (items[selectedIndex]) command(items[selectedIndex]);
          return true;
        }
        return false;
      },
    }));

    if (!items.length) {
      return (
        <div className="bg-white rounded-xl shadow-xl border border-slate-200 px-3 py-2 w-56">
          <p className="text-sm text-slate-400">没有匹配的命令</p>
        </div>
      );
    }

    return (
      <div className="bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden w-60 py-1">
        <p className="px-3 pt-2 pb-1 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
          插入块
        </p>
        {items.map((item, index) => {
          const Icon = item.Icon;
          return (
            <button
              key={item.title}
              className={`w-full flex items-center gap-3 px-3 py-2 text-left transition-colors ${
                index === selectedIndex ? 'bg-slate-100' : 'hover:bg-slate-50'
              }`}
              onMouseEnter={() => setSelectedIndex(index)}
              onClick={() => command(item)}
            >
              <div className="w-8 h-8 flex items-center justify-center rounded-md border border-slate-200 bg-white flex-shrink-0">
                <Icon className="h-3.5 w-3.5 text-slate-600" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-slate-700">{item.title}</p>
                <p className="text-xs text-slate-400">{item.subtitle}</p>
              </div>
            </button>
          );
        })}
      </div>
    );
  }
);
SlashMenuList.displayName = 'SlashMenuList';

// ─────────────── Slash Command Extension ───────────────

function createSlashCommand(commands: CommandItem[]) {
  return Extension.create({
  name: 'slashCommand',
  addProseMirrorPlugins() {
    return [
      Suggestion({
        editor: this.editor,
        char: '/',
        items: ({ query }: { query: string }) =>
          commands.filter(
            (c) =>
              c.title.toLowerCase().includes(query.toLowerCase()) ||
              c.subtitle.toLowerCase().includes(query.toLowerCase())
          ),
        render: () => {
          let component: ReactRenderer<SlashMenuRef>;
          let popupEl: HTMLDivElement;

          const place = (clientRect: (() => DOMRect | null) | null) => {
            if (!clientRect || !popupEl) return;
            const rect = clientRect();
            if (!rect) return;
            const vH = window.innerHeight;
            const pH = popupEl.offsetHeight || 380;
            const top = rect.bottom + pH + 4 > vH ? rect.top - pH - 4 : rect.bottom + 4;
            popupEl.style.left = `${Math.max(4, rect.left)}px`;
            popupEl.style.top = `${top}px`;
          };

          return {
            onStart: (props: any) => {
              component = new ReactRenderer(SlashMenuList, { props, editor: props.editor });
              popupEl = document.createElement('div');
              popupEl.style.cssText = 'position:fixed;z-index:9999;pointer-events:auto;';
              popupEl.appendChild(component.element);
              document.body.appendChild(popupEl);
              place(props.clientRect);
            },
            onUpdate: (props: any) => {
              component.updateProps(props);
              place(props.clientRect);
            },
            onKeyDown: (props: any) => {
              if (props.event.key === 'Escape') { popupEl?.remove(); return true; }
              return component.ref?.onKeyDown(props) ?? false;
            },
            onExit: () => {
              popupEl?.remove();
              component.destroy();
            },
          };
        },
        command: ({ editor, range, props }: any) => {
          props.command({ editor, range });
        },
      }),
    ];
  },
  });
}

// ─────────────── BlockEditor Component ───────────────

interface BlockEditorProps {
  content: string;
  articlePath: string;
  articleId: string | null;
  onCreatePage?: (parentPath: string) => void;
  readOnly?: boolean;
}

export function BlockEditor({ content, articlePath, articleId, onCreatePage, readOnly = false }: BlockEditorProps) {
  const [saveState, setSaveState] = useState<'saved' | 'saving' | 'unsaved'>('saved');
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isLoadingRef = useRef(false);
  const prevContentRef = useRef(content);
  const editorRef = useRef<import('@tiptap/react').Editor | null>(null);

  // 用 ref 持有最新的回调和路径，避免 extension 重建
  const onCreatePageRef = useRef(onCreatePage);
  useEffect(() => { onCreatePageRef.current = onCreatePage; }, [onCreatePage]);
  const articlePathRef = useRef(articlePath);
  useEffect(() => { articlePathRef.current = articlePath; }, [articlePath]);

  const slashCommandExt = useMemo(() => {
    const pageCommand: CommandItem = {
      title: '新建页面', subtitle: '创建子页面', Icon: FilePlus,
      command: ({ editor, range }) => {
        editor.chain().focus().deleteRange(range).run();
        const path = articlePathRef.current;
        const parentDir = path.includes('/')
          ? path.substring(0, path.lastIndexOf('/'))
          : '';
        onCreatePageRef.current?.(parentDir);
      },
    };
    return createSlashCommand([...FORMAT_COMMANDS, pageCommand]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const save = useCallback(
    async (markdown: string) => {
      if (!articlePath) return;
      setSaveState('saving');
      try {
        const res = await fetch('/api/articles', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ path: articlePath, content: markdown }),
        });
        const json = await res.json();
        setSaveState(json.ok ? 'saved' : 'unsaved');
      } catch {
        setSaveState('unsaved');
      }
    },
    [articlePath]
  );

  const editor = useEditor({
    immediatelyRender: false,
    editable: !readOnly,
    extensions: [
      StarterKit,
      Placeholder.configure({ placeholder: readOnly ? '' : '开始写作，或输入 / 插入内容块...' }),
      Markdown.configure({ html: false }),
      ...(readOnly ? [] : [slashCommandExt]),
      Image.configure({ inline: false }),
    ],
    content,
    editorProps: {
      attributes: { class: 'prose-preview outline-none min-h-[200px]' },
      handlePaste: (_view, event) => {
        const items = event.clipboardData?.items;
        if (!items) return false;
        const imgItem = Array.from(items).find((i) => i.type.startsWith('image/'));
        if (!imgItem) return false;
        const file = imgItem.getAsFile();
        if (!file) return false;
        event.preventDefault();
        void (async () => {
          const fd = new FormData();
          fd.append('image', file, file.name || 'pasted.png');
          const res = await fetch('/api/uploads', { method: 'POST', body: fd });
          const json = await res.json();
          if (json.ok && json.data?.url)
            editorRef.current?.chain().focus().setImage({ src: json.data.url }).run();
        })();
        return true;
      },
      handleDrop: (_view, event) => {
        const de = event as DragEvent;
        const files = Array.from(de.dataTransfer?.files ?? []).filter((f) =>
          f.type.startsWith('image/')
        );
        if (!files.length) return false;
        event.preventDefault();
        for (const file of files) {
          void (async () => {
            const fd = new FormData();
            fd.append('image', file, file.name);
            const res = await fetch('/api/uploads', { method: 'POST', body: fd });
            const json = await res.json();
            if (json.ok && json.data?.url)
              editorRef.current?.chain().focus().setImage({ src: json.data.url, alt: file.name }).run();
          })();
        }
        return true;
      },
    },
    onUpdate: ({ editor }) => {
      if (readOnly || isLoadingRef.current) return;
      const md = (editor.storage as any).markdown.getMarkdown();
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      setSaveState('unsaved');
      saveTimerRef.current = setTimeout(() => void save(md), 1200);
    },
  });

  useEffect(() => { editorRef.current = editor; }, [editor]);

  // 切换文章时更新内容
  useEffect(() => {
    if (!editor || content === prevContentRef.current) return;
    prevContentRef.current = content;
    isLoadingRef.current = true;
    editor.commands.setContent(content);
    setSaveState('saved');
    requestAnimationFrame(() => { isLoadingRef.current = false; });
  }, [content, editor]);

  // Ctrl+S 强制保存
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        if (editor && articlePath) {
          const md = (editor.storage as any).markdown.getMarkdown();
          if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
          void save(md);
        }
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [editor, articlePath, save]);

  useEffect(() => () => { if (saveTimerRef.current) clearTimeout(saveTimerRef.current); }, []);

  return (
    <div className="h-full flex flex-col">
      {articleId && (
        <div className="flex items-center justify-end px-6 py-1 border-b border-slate-100">
          <span
            className={`text-xs transition-colors ${
              saveState === 'saving'
                ? 'text-blue-400'
                : saveState === 'unsaved'
                ? 'text-amber-400'
                : 'text-slate-300'
            }`}
          >
            {saveState === 'saving' ? '保存中...' : saveState === 'unsaved' ? '未保存' : '已保存'}
          </span>
        </div>
      )}
      <div className="flex-1 overflow-auto px-10 py-8">
        <EditorContent editor={editor} className="max-w-[800px] mx-auto" />
      </div>
    </div>
  );
}
