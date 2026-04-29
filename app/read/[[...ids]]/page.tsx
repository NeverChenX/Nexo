'use client';

import { Suspense } from 'react';
import { useParams } from 'next/navigation';
import { ReaderShell } from '../_reader/ReaderShell';

function ReaderPageInner() {
  const params = useParams();
  const ids = params.ids as string[] | undefined;
  return <ReaderShell ids={ids} />;
}

export default function ReaderPage() {
  return (
    <Suspense
      fallback={
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: '#0f0f10',
            color: '#666',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <span aria-hidden style={{ animation: 'spin 1s linear infinite' }}>
            ⟳
          </span>
        </div>
      }
    >
      <ReaderPageInner />
    </Suspense>
  );
}
