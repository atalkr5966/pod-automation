"use client";

import React from 'react';
import {
  ClockIcon,
  CalendarIcon,
  CheckCircleIcon,
  AlertTriangleIcon,
  SlackIcon,
  PlayIcon,
  SparklesIcon,
} from '@/components/ui/Icons';
import { ScheduleLivePreview, AutomationSchedule } from '@/types';
import { LiveSchedulePreviewCard } from '@/components/automations/LiveSchedulePreview';

interface DashboardOverviewProps {
  schedules: AutomationSchedule[];
  previews: ScheduleLivePreview[];
  stats: {
    activeSchedulesCount: number;
    totalDeliveriesCount: number;
    successDeliveriesCount: number;
    failedDeliveriesCount: number;
    lastDelivery?: {
      status?: string;
      created_at?: string;
      [key: string]: unknown;
    } | null;
  } | null;
  isSlackConnected: boolean;
  onNavigateTab: (tab: string) => void;
  onTriggerTest: (type: 'OPENING' | 'CLOSING') => void;
}

export function DashboardOverview({
  schedules,
  previews,
  stats,
  isSlackConnected,
  onNavigateTab,
  onTriggerTest,
}: DashboardOverviewProps) {
  // Find primary preview
  const primaryPreview = previews[0] || null;

  // Next scheduled action
  const nextOpening = primaryPreview?.opening.nextRun;
  const nextClosing = primaryPreview?.closing.nextRun;

  let nextAction: { title: string; label: string; type: 'OPENING' | 'CLOSING' } | null = null;
  if (nextOpening && nextClosing) {
    if (nextOpening.daysRemaining < nextClosing.daysRemaining) {
      nextAction = { title: 'Opening POD', label: nextOpening.label, type: 'OPENING' };
    } else if (nextClosing.daysRemaining < nextOpening.daysRemaining) {
      nextAction = { title: 'Closing POD', label: nextClosing.label, type: 'CLOSING' };
    } else {
      nextAction = { title: 'Opening POD', label: nextOpening.label, type: 'OPENING' };
    }
  } else if (nextOpening) {
    nextAction = { title: 'Opening POD', label: nextOpening.label, type: 'OPENING' };
  } else if (nextClosing) {
    nextAction = { title: 'Closing POD', label: nextClosing.label, type: 'CLOSING' };
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Top Banner / Welcome */}
      <div
        className="royal-glass-elevated"
        style={{
          padding: '24px 28px',
          background: 'linear-gradient(135deg, rgba(14, 22, 44, 0.95) 0%, rgba(20, 32, 64, 0.8) 100%)',
          border: '1px solid rgba(99, 102, 241, 0.25)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 16,
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span className="royal-badge warning" style={{ fontSize: '0.7rem' }}>
              Autonomous Server Engine
            </span>
            <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
              Executes 24/7 without open browser tabs
            </span>
          </div>
          <h2 style={{ fontSize: '1.45rem', fontWeight: 800, color: '#f8fafc', marginTop: 6, letterSpacing: '-0.02em' }}>
            Daily POD Automation Center
          </h2>
          <p style={{ fontSize: '0.85rem', color: '#94a3b8', marginTop: 2 }}>
            Central orchestrator for AI-powered engineering Opening &amp; Closing reports and Slack dispatch.
          </p>
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={() => onTriggerTest('OPENING')}
            style={{
              padding: '9px 16px',
              borderRadius: 8,
              background: 'rgba(245, 158, 11, 0.15)',
              border: '1px solid rgba(245, 158, 11, 0.35)',
              color: '#fbbf24',
              fontSize: '0.825rem',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <PlayIcon className="w-3.5 h-3.5" />
            <span>Test Opening</span>
          </button>

          <button
            onClick={() => onTriggerTest('CLOSING')}
            style={{
              padding: '9px 16px',
              borderRadius: 8,
              background: 'rgba(99, 102, 241, 0.18)',
              border: '1px solid rgba(99, 102, 241, 0.35)',
              color: '#a5b4fc',
              fontSize: '0.825rem',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <PlayIcon className="w-3.5 h-3.5" />
            <span>Test Closing</span>
          </button>
        </div>
      </div>

      {/* 6 Executive Metric Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: 16,
        }}
      >
        {/* Card 1: Active Automations */}
        <div
          className="royal-glass"
          style={{
            padding: '20px',
            background: 'rgba(12, 19, 38, 0.85)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: '#94a3b8' }}>
            <span style={{ fontSize: '0.785rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.03em' }}>
              Active Automations
            </span>
            <ClockIcon className="w-4 h-4 text-indigo-400" />
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#f8fafc', marginTop: 8 }}>
            {stats?.activeSchedulesCount ?? schedules.filter((s) => s.active).length}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#10b981', marginTop: 4, fontWeight: 500 }}>
            Scheduled &amp; Monitored
          </div>
        </div>

        {/* Card 2: Next Scheduled Action */}
        <div
          className="royal-glass"
          style={{
            padding: '20px',
            background: 'rgba(12, 19, 38, 0.85)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: '#94a3b8' }}>
            <span style={{ fontSize: '0.785rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.03em' }}>
              Next Scheduled Action
            </span>
            <SparklesIcon className="w-4 h-4 text-amber-400" />
          </div>
          <div style={{ fontSize: '1.05rem', fontWeight: 700, color: '#fbbf24', marginTop: 8, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {nextAction ? nextAction.title : 'None Scheduled'}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#cbd5e1', marginTop: 4, fontWeight: 500 }}>
            {nextAction ? nextAction.label : 'Configure a schedule'}
          </div>
        </div>

        {/* Card 3: Slack Integration */}
        <div
          className="royal-glass"
          style={{
            padding: '20px',
            background: 'rgba(12, 19, 38, 0.85)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: '#94a3b8' }}>
            <span style={{ fontSize: '0.785rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.03em' }}>
              Slack Workspace
            </span>
            <SlackIcon className="w-4 h-4 text-indigo-400" />
          </div>
          <div style={{ fontSize: '1.35rem', fontWeight: 800, color: isSlackConnected ? '#34d399' : '#f87171', marginTop: 8 }}>
            {isSlackConnected ? 'Connected' : 'Disconnected'}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: 4 }}>
            {primaryPreview?.channel || '#general'}
          </div>
        </div>

        {/* Card 4: Successful Deliveries */}
        <div
          className="royal-glass"
          style={{
            padding: '20px',
            background: 'rgba(12, 19, 38, 0.85)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: '#94a3b8' }}>
            <span style={{ fontSize: '0.785rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.03em' }}>
              Successful Deliveries
            </span>
            <CheckCircleIcon className="w-4 h-4 text-emerald-400" />
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#34d399', marginTop: 8 }}>
            {stats?.successDeliveriesCount ?? 0}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: 4 }}>
            Verified on Slack
          </div>
        </div>

        {/* Card 5: Failed Deliveries */}
        <div
          className="royal-glass"
          style={{
            padding: '20px',
            background: 'rgba(12, 19, 38, 0.85)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: '#94a3b8' }}>
            <span style={{ fontSize: '0.785rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.03em' }}>
              Failed Deliveries
            </span>
            <AlertTriangleIcon className="w-4 h-4 text-rose-400" />
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: (stats?.failedDeliveriesCount ?? 0) > 0 ? '#f87171' : '#64748b', marginTop: 8 }}>
            {stats?.failedDeliveriesCount ?? 0}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: 4 }}>
            Requires attention
          </div>
        </div>

        {/* Card 6: Last Delivery */}
        <div
          className="royal-glass"
          style={{
            padding: '20px',
            background: 'rgba(12, 19, 38, 0.85)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: '#94a3b8' }}>
            <span style={{ fontSize: '0.785rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.03em' }}>
              Last Delivery
            </span>
            <CalendarIcon className="w-4 h-4 text-sky-400" />
          </div>
          <div style={{ fontSize: '1rem', fontWeight: 700, color: '#cbd5e1', marginTop: 8 }}>
            {stats?.lastDelivery ? `${stats.lastDelivery.status}` : 'No Deliveries Yet'}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: 4, textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
            {stats?.lastDelivery?.created_at ? new Date(stats.lastDelivery.created_at).toLocaleTimeString() : 'Awaiting schedule'}
          </div>
        </div>
      </div>

      {/* Live Schedule Preview Section */}
      {primaryPreview ? (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#f8fafc' }}>
              Live Schedule Execution Preview
            </h3>
            <button
              onClick={() => onNavigateTab('schedules')}
              style={{
                fontSize: '0.785rem',
                color: '#818cf8',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                fontWeight: 600,
              }}
            >
              View All Schedules &rarr;
            </button>
          </div>
          <LiveSchedulePreviewCard preview={primaryPreview} />
        </div>
      ) : (
        <div className="royal-glass" style={{ padding: 32, textAlign: 'center' }}>
          <p style={{ color: '#94a3b8' }}>No schedules configured yet.</p>
          <button
            onClick={() => onNavigateTab('automations')}
            style={{
              marginTop: 12,
              padding: '8px 16px',
              borderRadius: 6,
              background: '#4f46e5',
              color: '#ffffff',
              border: 'none',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Create New Automation Wizard
          </button>
        </div>
      )}
    </div>
  );
}
