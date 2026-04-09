import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Nexo',
  description: 'Personal Knowledge Base Wiki System',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
