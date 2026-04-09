'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Copy, Check, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

function CodeBlock({ title, method, url, body, description }: {
  title: string;
  method: string;
  url: string;
  body?: string;
  description: string;
}) {
  const [copied, setCopied] = useState(false);

  const curlCmd = body
    ? `curl -X ${method} {BASE_URL}${url} \\\n  -H "Content-Type: application/json" \\\n  -d '${body}'`
    : `curl -X ${method} {BASE_URL}${url}`;

  const copy = async () => {
    await navigator.clipboard.writeText(curlCmd.replace('{BASE_URL}', window.location.origin));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const methodColors: Record<string, string> = {
    GET: 'bg-green-100 text-green-700',
    POST: 'bg-blue-100 text-blue-700',
    PUT: 'bg-amber-100 text-amber-700',
    PATCH: 'bg-purple-100 text-purple-700',
    DELETE: 'bg-red-100 text-red-700',
  };

  return (
    <div className="border border-slate-200 rounded-lg overflow-hidden">
      <div className="flex items-center gap-3 px-4 py-3 bg-slate-50 border-b border-slate-200">
        <span className={`px-2 py-0.5 rounded text-xs font-bold ${methodColors[method] || ''}`}>{method}</span>
        <code className="text-sm font-mono text-slate-700">{url}</code>
        <span className="text-sm text-slate-500 ml-auto">{title}</span>
      </div>
      <div className="px-4 py-3">
        <p className="text-sm text-slate-600 mb-3">{description}</p>
        {body && (
          <div className="mb-3">
            <p className="text-xs text-slate-400 mb-1">Request Body:</p>
            <pre className="bg-slate-900 text-slate-100 p-3 rounded text-sm overflow-x-auto">{body}</pre>
          </div>
        )}
        <div className="flex items-center gap-2">
          <p className="text-xs text-slate-400">cURL:</p>
          <button onClick={copy} className="text-xs text-blue-500 hover:text-blue-700 flex items-center gap-1">
            {copied ? <><Check className="h-3 w-3" /> 已复制</> : <><Copy className="h-3 w-3" /> 复制命令</>}
          </button>
        </div>
        <pre className="bg-slate-900 text-slate-100 p-3 rounded text-sm overflow-x-auto mt-1">{curlCmd}</pre>
      </div>
    </div>
  );
}

export default function ApiDocsPage() {
  const [baseUrl, setBaseUrl] = useState('');

  useEffect(() => {
    setBaseUrl(window.location.origin);
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto py-8 px-4">
        {/* 顶部 */}
        <div className="flex items-center gap-4 mb-8">
          <Link href="/editor">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-1" /> 返回编辑器
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">Nexo API 文档</h1>
            <p className="text-sm text-slate-500">通过 API 接口让 AI 平台（OpenClaw、Claude、GPT 等）自动写入 wiki 内容</p>
          </div>
        </div>

        {/* Base URL */}
        <Card className="p-4 mb-8">
          <p className="text-sm font-medium mb-1">Base URL</p>
          <code className="text-lg font-mono text-blue-600">{baseUrl || 'http://your-ip:3000'}</code>
          <p className="text-xs text-slate-400 mt-1">局域网内其他设备也可以用这个地址访问</p>
        </Card>

        {/* 快速开始 */}
        <Card className="p-6 mb-8 bg-blue-50 border-blue-200">
          <h2 className="text-lg font-bold mb-3">AI 接入快速指南</h2>
          <p className="text-sm text-slate-700 mb-4">
            让 AI 平台通过 HTTP 请求写入 wiki，只需要两步：
          </p>
          <ol className="text-sm text-slate-700 space-y-2 list-decimal list-inside">
            <li><strong>创建文件夹</strong>（可选）：<code className="bg-white px-1 rounded">POST /api/folders</code></li>
            <li><strong>创建/更新文章</strong>：<code className="bg-white px-1 rounded">POST /api/articles</code> 创建，<code className="bg-white px-1 rounded">PUT /api/articles</code> 更新</li>
          </ol>
          <p className="text-sm text-slate-500 mt-4">
            所有接口返回 JSON 格式：<code className="bg-white px-1 rounded">{`{"ok": true, "data": {...}}`}</code> 或 <code className="bg-white px-1 rounded">{`{"ok": false, "error": "..."}`}</code>
          </p>
        </Card>

        {/* API 列表 */}
        <div className="space-y-6">
          <h2 className="text-lg font-bold border-b pb-2">文件夹管理</h2>

          <CodeBlock
            title="创建文件夹"
            method="POST"
            url="/api/folders"
            body='{"path": "notes/daily"}'
            description="创建一个文件夹。支持嵌套路径，父目录会自动创建。"
          />

          <CodeBlock
            title="获取文件树"
            method="GET"
            url="/api/folders?tree=true"
            description="获取完整的文件夹和文章树结构。"
          />

          <CodeBlock
            title="获取文件夹内容"
            method="GET"
            url="/api/folders?path=notes"
            description="获取指定文件夹下的直接子项（不递归）。"
          />

          <CodeBlock
            title="重命名文件夹"
            method="PUT"
            url="/api/folders"
            body='{"oldPath": "notes", "newPath": "my-notes"}'
            description="重命名文件夹。文件夹内的所有内容会一起移动。"
          />

          <CodeBlock
            title="删除文件夹"
            method="DELETE"
            url="/api/folders/{path}"
            description="删除文件夹及其所有内容。path 需要 URL 编码。"
          />

          <h2 className="text-lg font-bold border-b pb-2 mt-10">文章管理</h2>

          <CodeBlock
            title="创建文章"
            method="POST"
            url="/api/articles"
            body='{"path": "notes/hello", "content": "# Hello\\n\\nMarkdown content here."}'
            description="创建一篇新文章。content 是 Markdown 格式。path 不含 .md 后缀。"
          />

          <CodeBlock
            title="读取文章"
            method="GET"
            url="/api/articles?path=notes/hello"
            description="读取一篇文章的 Markdown 内容。"
          />

          <CodeBlock
            title="更新文章"
            method="PUT"
            url="/api/articles"
            body='{"path": "notes/hello", "content": "# Updated\\n\\nNew content."}'
            description="更新一篇已有文章的内容。"
          />

          <CodeBlock
            title="重命名文章"
            method="PATCH"
            url="/api/articles"
            body='{"oldPath": "notes/hello", "newPath": "notes/greeting"}'
            description="重命名一篇文章。"
          />

          <CodeBlock
            title="删除文章"
            method="DELETE"
            url="/api/articles/{path}"
            description="删除一篇文章。path 需要 URL 编码。"
          />

          <h2 className="text-lg font-bold border-b pb-2 mt-10">分享管理</h2>

          <CodeBlock
            title="创建分享链接"
            method="POST"
            url="/api/share"
            body='{"path": "notes/hello", "type": "article"}'
            description='生成永久分享链接。type 为 "article" 或 "folder"。返回 token 用于拼接访问链接。'
          />

          <CodeBlock
            title="查看所有分享"
            method="GET"
            url="/api/share"
            description="列出所有已创建的分享链接。"
          />

          <CodeBlock
            title="通过 token 获取内容"
            method="GET"
            url="/api/share/{token}"
            description="通过分享 token 获取文章或文件夹内容。公开访问，无需认证。"
          />

          <CodeBlock
            title="删除分享链接"
            method="DELETE"
            url="/api/share?token={token}"
            description="删除一个分享链接。"
          />

          <h2 className="text-lg font-bold border-b pb-2 mt-10">AI 接入示例</h2>

          <Card className="p-6">
            <h3 className="font-bold mb-3">Python 示例：让 AI 写入 wiki</h3>
            <pre className="bg-slate-900 text-slate-100 p-4 rounded text-sm overflow-x-auto">{`import requests

WIKI_URL = "${baseUrl || 'http://your-ip:3000'}"

# 1. 创建文件夹
requests.post(f"{WIKI_URL}/api/folders", json={
    "path": "ai-notes"
})

# 2. 写入文章
requests.post(f"{WIKI_URL}/api/articles", json={
    "path": "ai-notes/meeting-summary",
    "content": "# 会议纪要\\n\\n- 讨论了项目进度\\n- 确定了下周计划"
})

# 3. 更新文章
requests.put(f"{WIKI_URL}/api/articles", json={
    "path": "ai-notes/meeting-summary",
    "content": "# 会议纪要（更新版）\\n\\n更多内容..."
})

# 4. 生成分享链接
resp = requests.post(f"{WIKI_URL}/api/share", json={
    "path": "ai-notes/meeting-summary",
    "type": "article"
})
token = resp.json()["data"]["token"]
print(f"分享链接: {WIKI_URL}/share/{token}")
`}</pre>
          </Card>

          <Card className="p-6">
            <h3 className="font-bold mb-3">OpenClaw / Claude 接入提示词模板</h3>
            <pre className="bg-slate-900 text-slate-100 p-4 rounded text-sm overflow-x-auto whitespace-pre-wrap">{`你可以通过以下 API 将内容写入 wiki 系统：

Base URL: ${baseUrl || 'http://your-ip:3000'}

创建文章: POST /api/articles
Body: {"path": "文件夹/文章名", "content": "Markdown 内容"}

更新文章: PUT /api/articles
Body: {"path": "文件夹/文章名", "content": "新内容"}

创建文件夹: POST /api/folders
Body: {"path": "文件夹路径"}

请将你的输出以 Markdown 格式写入对应的 wiki 路径。`}</pre>
          </Card>
        </div>

        {/* 底部 */}
        <div className="mt-12 text-center text-sm text-slate-400">
          Nexo API Documentation
        </div>
      </div>
    </div>
  );
}
