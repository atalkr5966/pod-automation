import type { Metadata } from 'next';
import React from 'react';
import './globals.css';

export const metadata: Metadata = {
  title: 'POD Automation — Intelligent Opening & Closing Automation',
  description: 'Enterprise daily Opening and Closing status generator with scheduled, browser-independent server-side Slack dispatch.',
  icons: {
    icon: '/favicon.ico',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
