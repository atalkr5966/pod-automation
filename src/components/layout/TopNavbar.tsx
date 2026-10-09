"use client";

import React, { useState, useEffect } from 'react';
import { DatabaseIcon, SlackIcon, ClockIcon } from '@/components/ui/Icons';

interface TopNavbarProps {
  timezone?: string;
  isSlackConnected?: boolean;
  databaseType?: 'supabase' | 'fallback';
  onToggleMobileMenu?: () => void;
}

export function TopNavbar({
  timezone = 'Asia/Kolkata',
  isSlackConnected = false,
  databaseType = 'supabase',
  onToggleMobileMenu,
}: TopNavbarProps) {
  const [timeStr, setTimeStr] = useState<string>('');

  useEffect(() => {
    const update = () => {
      const now = new Date();
      try {
        const formatted = new Intl.DateTimeFormat('en-US', {
          timeZone: timezone,
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: true,
          timeZoneName: 'short',
        }).format(now);
        setTimeStr(formatted);
      } catch {
        setTimeStr(now.toLocaleTimeString());
      }
    };

    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [timezone]);

  return (
    <header
      style={{
        height: 64,
        padding: '0 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        background: 'rgba(10, 16, 32, 0.85)',
        borderBottom: '1px solid rgba(255, 255, 255, 0.07)',
        backdropFilter: 'blur(12px)',
        position: 'sticky',
        top: 0,
        zIndex: 30,
      }}
    >
      {/* Left: Mobile hamburger & Title badge */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        {onToggleMobileMenu && (
          <button
            onClick={onToggleMobileMenu}
            style={{
              padding: 8,
              borderRadius: 6,
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              color: '#f8fafc',
              cursor: 'pointer',
              display: 'inline-flex',
            }}
            className="md:hidden"
          >
            <svg style={{ width: 18, height: 18 }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>
        )}

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span className="royal-badge success" style={{ fontSize: '0.7rem' }}>
            ● Engine Active
          </span>
          <span style={{ fontSize: '0.8rem', color: '#64748b' }} className="hidden sm:inline">
            Browser Independent
          </span>
        </div>
      </div>

      {/* Right: Live Clock & System Status Badges */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        {/* Timezone Clock */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 7,
            padding: '5px 12px',
            borderRadius: 8,
            background: 'rgba(5, 9, 20, 0.7)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            fontSize: '0.8rem',
            color: '#cbd5e1',
          }}
        >
          <div style={{ color: '#818cf8' }}>
            <ClockIcon className="w-4 h-4" />
          </div>
          <span style={{ fontFamily: 'JetBrains Mono, monospace', fontWeight: 500 }}>
            {timeStr || 'Loading clock...'}
          </span>
        </div>

        {/* Database Status */}
        <div
          title={databaseType === 'supabase' ? 'Connected to Supabase PostgreSQL' : 'Local Fallback Storage Active'}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '5px 10px',
            borderRadius: 8,
            background: databaseType === 'supabase' ? 'rgba(16, 185, 129, 0.12)' : 'rgba(245, 158, 11, 0.12)',
            border: databaseType === 'supabase' ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid rgba(245, 158, 11, 0.3)',
            fontSize: '0.75rem',
            fontWeight: 600,
            color: databaseType === 'supabase' ? '#34d399' : '#fbbf24',
          }}
        >
          <DatabaseIcon className="w-3.5 h-3.5" />
          <span className="hidden lg:inline">{databaseType === 'supabase' ? 'PostgreSQL' : 'Local DB'}</span>
        </div>

        {/* Slack Status */}
        <div
          title={isSlackConnected ? 'Slack Workspace Connected' : 'Slack Not Connected'}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '5px 10px',
            borderRadius: 8,
            background: isSlackConnected ? 'rgba(79, 70, 229, 0.15)' : 'rgba(100, 116, 139, 0.15)',
            border: isSlackConnected ? '1px solid rgba(99, 102, 241, 0.35)' : '1px solid rgba(100, 116, 139, 0.25)',
            fontSize: '0.75rem',
            fontWeight: 600,
            color: isSlackConnected ? '#818cf8' : '#94a3b8',
          }}
        >
          <SlackIcon className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">{isSlackConnected ? 'Slack Connected' : 'Slack Disconnected'}</span>
        </div>
      </div>
    </header>
  );
}
