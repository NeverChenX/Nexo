import type { Metadata } from 'next';
import { I18nProvider } from '@/components/I18nProvider';
import './globals.css';

export const metadata: Metadata = {
  title: 'Nexo',
  description: 'Personal Knowledge Base Wiki System',
};

const PREFS_PREHYDRATION_SCRIPT = `
(function(){
  try{
    var raw = localStorage.getItem('never-wiki.reader.prefs');
    if(!raw) return;
    var p = JSON.parse(raw);
    window.__RD_PREFS__ = p;
    var html = document.documentElement;
    if (p && p.theme) html.setAttribute('data-rd-theme', p.theme);
    if (p && p.font) html.setAttribute('data-rd-font', p.font);
    if (p && p.fontSize) html.style.setProperty('--rd-font-size', p.fontSize + 'px');
    if (p && p.lineHeight) html.style.setProperty('--rd-line-height', p.lineHeight);
    if (p && p.width) html.setAttribute('data-rd-width', p.width);
  }catch(e){}
})();
`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{ __html: PREFS_PREHYDRATION_SCRIPT }}
        />
      </head>
      <body>
        <I18nProvider>{children}</I18nProvider>
      </body>
    </html>
  );
}
