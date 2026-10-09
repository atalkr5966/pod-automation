"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function SlackRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/');
  }, [router]);

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--bg-base)',
        color: '#94a3b8',
        fontSize: '0.9rem',
      }}
    >
      Redirecting to POD Automation Workspace...
    </div>
  );
}
