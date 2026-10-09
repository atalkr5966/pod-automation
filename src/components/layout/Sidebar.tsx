"use client";

import React from 'react';
import {
  ShieldIcon,
  ActivityIcon,
  ClockIcon,
  SlackIcon,
  CalendarIcon,
  DatabaseIcon,
  LogOutIcon,
} from '@/components/ui/Icons';
import { SafeUser, Workspace } from '@/types';

export type NavTab = 'dashboard' | 'automations' | 'schedules' | 'slack' | 'activity' | 'pastdata';

interface SidebarProps {
  activeTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  user: SafeUser;
  workspace?: Workspace;
  onLogout: () => void;
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
}

export function Sidebar({
  activeTab,
  onSelectTab,
  user,
  workspace,
  onLogout,
  isMobileOpen = false,
  onCloseMobile,
}: SidebarProps) {
  const navItems: { id: NavTab; label: string; icon: React.ReactNode }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: <ActivityIcon className="w-5 h-5" /> },
    { id: 'automations', label: 'Automations', icon: <ClockIcon className="w-5 h-5" /> },
    { id: 'schedules', label: 'Schedules', icon: <CalendarIcon className="w-5 h-5" /> },
    { id: 'slack', label: 'Slack Workspace', icon: <SlackIcon className="w-5 h-5" /> },
    { id: 'activity', label: 'Activity Logs', icon: <ActivityIcon className="w-5 h-5" /> },
    { id: 'pastdata', label: 'Sprint Task Bank', icon: <DatabaseIcon className="w-5 h-5" /> },
  ];

  const sidebarContent = (
    <aside
      style={{
        width: 260,
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        background: 'rgba(9, 14, 28, 0.96)',
        borderRight: '1px solid rgba(255, 255, 255, 0.08)',
        backdropFilter: 'blur(16px)',
        zIndex: 50,
      }}
    >
      {/* Brand Header */}
      <div
        style={{
          padding: '24px 20px',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
        }}
      >
        <div
          style={{
            width: 38,
            height: 38,
            borderRadius: 10,
            background: 'linear-gradient(135deg, #4f46e5 0%, #312e81 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#c7d2fe',
            border: '1px solid rgba(129, 140, 248, 0.3)',
            boxShadow: '0 4px 14px rgba(79, 70, 229, 0.3)',
          }}
        >
          <ShieldIcon className="w-5 h-5" />
        </div>
        <div>
          <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#f8fafc', letterSpacing: '-0.02em' }}>
            POD Automation
          </div>
          <div style={{ fontSize: '0.72rem', color: '#94a3b8', letterSpacing: '0.01em' }}>
            Enterprise Scheduler
          </div>
        </div>
      </div>

      {/* Navigation Links */}
      <nav style={{ flex: 1, padding: '16px 12px', display: 'flex', flexDirection: 'column', gap: 4, overflowY: 'auto' }}>
        {navItems.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => {
                onSelectTab(item.id);
                if (onCloseMobile) onCloseMobile();
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                width: '100%',
                padding: '10px 14px',
                borderRadius: 8,
                border: 'none',
                background: isActive ? 'rgba(79, 70, 229, 0.22)' : 'transparent',
                color: isActive ? '#ffffff' : '#94a3b8',
                fontWeight: isActive ? 600 : 500,
                fontSize: '0.875rem',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'all 150ms ease',
                borderLeft: isActive ? '3px solid #6366f1' : '3px solid transparent',
              }}
            >
              <div style={{ color: isActive ? '#818cf8' : '#64748b' }}>{item.icon}</div>
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Bottom Profile & Workspace */}
      <div
        style={{
          padding: '16px',
          borderTop: '1px solid rgba(255, 255, 255, 0.06)',
          background: 'rgba(6, 10, 20, 0.6)',
        }}
      >
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: '0.725rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Active Workspace
          </div>
          <div
            style={{
              fontSize: '0.815rem',
              fontWeight: 600,
              color: '#cbd5e1',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              marginTop: 2,
            }}
          >
            {workspace?.name || 'Production Core'}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
          <div style={{ overflow: 'hidden' }}>
            <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#f1f5f9', textOverflow: 'ellipsis', overflow: 'hidden' }}>
              {user.name}
            </div>
            <div style={{ fontSize: '0.75rem', color: '#64748b' }}>@{user.username}</div>
          </div>

          <button
            onClick={onLogout}
            title="Sign Out"
            style={{
              padding: 8,
              borderRadius: 6,
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.2)',
              color: '#f87171',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <LogOutIcon className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );

  return (
    <>
      {/* Desktop view */}
      <div style={{ display: 'none' }} className="hidden md:block">
        {sidebarContent}
      </div>

      {/* Inline styles for responsive display */}
      <div style={{ display: 'block' }}>
        {/* Render for desktop */}
        <div className="sidebar-desktop">{sidebarContent}</div>

        {/* Mobile drawer backdrop */}
        {isMobileOpen && (
          <div
            onClick={onCloseMobile}
            style={{
              position: 'fixed',
              inset: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.65)',
              zIndex: 40,
              backdropFilter: 'blur(4px)',
            }}
          />
        )}
      </div>
    </>
  );
}
