'use client';

import { useState, useEffect } from 'react';

/**
 * /clip —— 信息采集说明页
 * 提供：
 *  1) 一个 Bookmarklet（拖到书签栏一键剪藏当前页面选区）
 *  2) 一个说明如何配置 WIKI_API_KEY 的指引（用于跨域采集）
 */
export default function ClipPage() {
  const [origin, setOrigin] = useState('');
  const [apiKey, setApiKey] = useState('');

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  // Bookmarklet 源码（生产版：用选区 + URL + title 调 /api/inbox，默认 target=item）
  const bookmarkletSrc = (base: string, key: string) => {
    const code = `
      (function(){
        var sel = (window.getSelection && window.getSelection().toString()) || '';
        var title = document.title || '';
        var url = location.href;
        var content = sel || prompt('采集说明（留空则仅保存链接+标题）:', '') || '';
        fetch('${base}/api/inbox', {
          method: 'POST',
          mode: 'cors',
          headers: {
            'Content-Type': 'application/json',
            ${key ? `'Authorization': 'Bearer ${key}',` : ''}
          },
          body: JSON.stringify({ kind: 'web', title: title, url: url, content: content, target: 'item' }),
        }).then(function(r){ return r.json(); }).then(function(j){
          if (j.ok) { alert('✓ 已保存到 Nexo: ' + j.data.path); }
          else { alert('× 失败: ' + (j.error || '未知')); }
        }).catch(function(e){ alert('× 网络错误: ' + e.message); });
      })();
    `.replace(/\s+/g, ' ').trim();
    return `javascript:${encodeURIComponent(code)}`;
  };

  const href = origin ? bookmarkletSrc(origin, apiKey) : '';

  return (
    <div style={{ maxWidth: '760px', margin: '0 auto', padding: '60px 24px 120px', color: 'var(--c-texPri)' }}>
      <h1 style={{ fontSize: '28px', fontWeight: 700, marginBottom: '8px' }}>📥 采集到 Nexo</h1>
      <p style={{ color: 'var(--c-texTer)', marginBottom: '24px' }}>
        把任意网页的选中文字/链接一键存进 Wiki 的 Inbox。
      </p>

      <div style={{ padding: '16px', background: 'var(--c-bacSec)', borderRadius: '8px', marginBottom: '24px' }}>
        <h2 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '8px' }}>1. 设置 API Key（仅跨域采集需要）</h2>
        <p style={{ fontSize: '13px', color: 'var(--c-texTer)', marginBottom: '8px' }}>
          在 <code style={{ background: 'var(--c-bacTer)', padding: '1px 6px', borderRadius: '3px' }}>.env.local</code> 中设置 <code style={{ background: 'var(--c-bacTer)', padding: '1px 6px', borderRadius: '3px' }}>WIKI_API_KEY=你的密钥</code>，然后把密钥粘贴到下面：
        </p>
        <input
          type="text"
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          placeholder="留空也行（从本 wiki 域名发起的采集会自动放行）"
          style={{ width: '100%', padding: '8px 12px', fontSize: '13px', border: '1px solid var(--c-borPri)', borderRadius: '6px', outline: 'none', background: 'var(--c-bacPri)', color: 'var(--c-texPri)' }}
        />
      </div>

      <div style={{ padding: '16px', background: 'var(--c-bacSec)', borderRadius: '8px', marginBottom: '24px' }}>
        <h2 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '8px' }}>2. 拖此按钮到浏览器书签栏</h2>
        <p style={{ fontSize: '13px', color: 'var(--c-texTer)', marginBottom: '12px' }}>
          之后在任何网页上点一下这个书签，就会把当前选中文字（或弹窗让你输入）连同页面 URL、标题一起存进 <code style={{ background: 'var(--c-bacTer)', padding: '1px 6px', borderRadius: '3px' }}>Inbox/YYYY-MM-DD/</code>。
        </p>
        {href && (
          <a
            href={href}
            onClick={(e) => e.preventDefault()}
            draggable
            style={{
              display: 'inline-block',
              padding: '10px 18px',
              background: 'var(--nx-blue)', color: '#fff',
              borderRadius: '6px', textDecoration: 'none',
              fontSize: '14px', fontWeight: 600,
              cursor: 'grab',
              boxShadow: '0 2px 8px rgba(46,170,220,0.3)',
            }}
          >
            📥 采集到 Nexo
          </a>
        )}
        <p style={{ fontSize: '12px', color: 'var(--c-texDis)', marginTop: '8px' }}>
          👆 拖拽这个按钮到浏览器的书签栏（不是点击！）
        </p>
      </div>

      <div style={{ padding: '16px', background: 'var(--c-bacSec)', borderRadius: '8px', marginBottom: '24px' }}>
        <h2 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '8px' }}>3. Quick Capture（站内）</h2>
        <p style={{ fontSize: '13px', color: 'var(--c-texTer)' }}>
          在 Wiki 的任何页面按 <kbd style={{ padding: '2px 6px', border: '1px solid var(--c-borPri)', borderRadius: '3px', fontSize: '11px' }}>Cmd/Ctrl+Shift+N</kbd> 调出快速采集面板：
        </p>
        <ul style={{ fontSize: '13px', color: 'var(--c-texTer)', marginTop: '6px', paddingLeft: '20px' }}>
          <li>追加到当日快速笔记：<code>Inbox/快速笔记/YYYY-MM-DD.md</code></li>
          <li>独立文档：<code>Inbox/YYYY-MM-DD/${'{title}'}.md</code></li>
        </ul>
      </div>

      <div style={{ padding: '16px', background: 'var(--c-bacSec)', borderRadius: '8px' }}>
        <h2 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '8px' }}>4. 程序化 API</h2>
        <p style={{ fontSize: '13px', color: 'var(--c-texTer)', marginBottom: '8px' }}>给 Telegram Bot / 手机捷径 / 其他工具发送：</p>
        <pre style={{ background: 'var(--c-bacTer)', padding: '12px', borderRadius: '6px', fontSize: '12px', overflow: 'auto', fontFamily: 'ui-monospace, monospace' }}>
{`POST ${origin}/api/inbox
Authorization: Bearer <WIKI_API_KEY>
Content-Type: application/json

{
  "title": "文章标题",
  "url": "https://...",
  "content": "正文或备注",
  "tags": ["灵感", "技术"],
  "target": "item"   // 或 "quick"
}`}
        </pre>
      </div>
    </div>
  );
}
