"use client";

import React, { useState } from 'react';
import {
  ClockIcon,
  TrashIcon,
  PlayIcon,
  PlusIcon,
} from '@/components/ui/Icons';
import { AutomationSchedule } from '@/types';
import { format12Hour } from '@/lib/timezone';

interface AutomationListProps {
  schedules: AutomationSchedule[];
  onCreateNew: () => void;
  onRefresh: () => void;
}

export function AutomationList({
  schedules,
  onCreateNew,
  onRefresh,
}: AutomationListProps) {
  const [triggeringId, setTriggeringId] = useState<string | null>(null);
  const [actionFeedback, setActionFeedback] = useState<{ id: string; msg: string; type: 'success' | 'error' } | null>(null);

  const handleToggleActive = async (schedule: AutomationSchedule) => {
    try {
      await fetch(`/api/automations/${schedule.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: !schedule.active }),
      });
      onRefresh();
    } catch {
      // ignore
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this automation schedule?')) return;
    try {
      await fetch(`/api/automations/${id}`, { method: 'DELETE' });
      onRefresh();
    } catch {
      // ignore
    }
  };

  const handleManualRun = async (scheduleId: string, actionType: 'OPENING' | 'CLOSING') => {
    setTriggeringId(`${scheduleId}_${actionType}`);
    setActionFeedback(null);
    try {
      const res = await fetch(`/api/cron/execute?force=true&scheduleId=${scheduleId}&actionType=${actionType}`, {
        method: 'POST',
      });
      const data = await res.json();
      if (res.ok) {
        setActionFeedback({
          id: scheduleId,
          type: 'success',
          msg: `Dispatched ${actionType} successfully! Check Activity Logs or Slack.`,
        });
      } else {
        setActionFeedback({
          id: scheduleId,
          type: 'error',
          msg: data.error || 'Failed to dispatch.',
        });
      }
    } catch {
      setActionFeedback({
        id: scheduleId,
        type: 'error',
        msg: 'Network error executing action.',
      });
    } finally {
      setTriggeringId(null);
      setTimeout(() => setActionFeedback(null), 8000);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Header bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#f8fafc', letterSpacing: '-0.02em' }}>
            Automation Schedules
          </h2>
          <p style={{ fontSize: '0.85rem', color: '#94a3b8', marginTop: 2 }}>
            Manage background scheduled Opening and Closing dispatches.
          </p>
        </div>

        <button
          onClick={onCreateNew}
          style={{
            padding: '10px 18px',
            borderRadius: 8,
            border: 'none',
            background: 'linear-gradient(135deg, #4f46e5 0%, #4338ca 100%)',
            color: '#ffffff',
            fontSize: '0.875rem',
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            boxShadow: '0 4px 14px rgba(79, 70, 229, 0.35)',
          }}
        >
          <PlusIcon className="w-4 h-4" />
          <span>New Automation</span>
        </button>
      </div>

      {schedules.length === 0 ? (
        <div
          className="royal-glass"
          style={{
            padding: '48px 24px',
            textAlign: 'center',
            background: 'rgba(10, 16, 32, 0.7)',
          }}
        >
          <div style={{ color: '#6366f1', marginBottom: 14 }}>
            <ClockIcon className="w-10 h-10 mx-auto" />
          </div>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#f8fafc', marginBottom: 6 }}>
            No Automations Configured
          </h3>
          <p style={{ fontSize: '0.85rem', color: '#94a3b8', maxWidth: 440, margin: '0 auto 20px auto' }}>
            Create your first automated schedule to dispatch daily sprint Opening and Closing items directly to Slack.
          </p>
          <button
            onClick={onCreateNew}
            style={{
              padding: '10px 20px',
              borderRadius: 8,
              border: 'none',
              background: '#4f46e5',
              color: '#ffffff',
              fontSize: '0.875rem',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Create Automation Now
          </button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: 16 }}>
          {schedules.map((schedule) => (
            <div
              key={schedule.id}
              className="royal-glass"
              style={{
                padding: '22px',
                background: 'rgba(12, 19, 38, 0.85)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
              }}
            >
              <div>
                {/* Title & Status */}
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 12 }}>
                  <div>
                    <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#f8fafc' }}>
                      {schedule.name}
                    </h3>
                    <p style={{ fontSize: '0.775rem', color: '#94a3b8', marginTop: 2 }}>
                      {schedule.description || 'Automated POD Dispatch'}
                    </p>
                  </div>
                  <button
                    onClick={() => handleToggleActive(schedule)}
                    className={`royal-badge ${schedule.active ? 'success' : 'neutral'}`}
                    style={{ cursor: 'pointer', border: 'none' }}
                  >
                    {schedule.active ? 'Active' : 'Paused'}
                  </button>
                </div>

                {/* Details Pills */}
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16, fontSize: '0.75rem' }}>
                  <span style={{ padding: '3px 8px', borderRadius: 4, background: 'rgba(255, 255, 255, 0.06)', color: '#cbd5e1' }}>
                    🌐 {schedule.timezone}
                  </span>
                  <span style={{ padding: '3px 8px', borderRadius: 4, background: 'rgba(99, 102, 241, 0.15)', color: '#a5b4fc' }}>
                    💬 {schedule.channelId}
                  </span>
                </div>

                {/* Opening & Closing Row */}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: 10,
                    padding: '12px',
                    borderRadius: 8,
                    background: 'rgba(6, 10, 22, 0.7)',
                    border: '1px solid rgba(255, 255, 255, 0.05)',
                    marginBottom: 16,
                  }}
                >
                  <div>
                    <div style={{ fontSize: '0.7rem', color: '#fbbf24', fontWeight: 600 }}>
                      🌅 OPENING
                    </div>
                    <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#f8fafc', marginTop: 2, fontFamily: 'JetBrains Mono, monospace' }}>
                      {schedule.openingEnabled ? format12Hour(schedule.openingTime) : 'Disabled'}
                    </div>
                  </div>

                  <div>
                    <div style={{ fontSize: '0.7rem', color: '#818cf8', fontWeight: 600 }}>
                      🌆 CLOSING
                    </div>
                    <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#f8fafc', marginTop: 2, fontFamily: 'JetBrains Mono, monospace' }}>
                      {schedule.closingEnabled ? format12Hour(schedule.closingTime) : 'Disabled'}
                    </div>
                  </div>
                </div>

                {/* Action Feedback */}
                {actionFeedback && actionFeedback.id === schedule.id && (
                  <div
                    style={{
                      padding: '8px 12px',
                      borderRadius: 6,
                      background: actionFeedback.type === 'success' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                      border: actionFeedback.type === 'success' ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid rgba(239, 68, 68, 0.3)',
                      color: actionFeedback.type === 'success' ? '#34d399' : '#fca5a5',
                      fontSize: '0.775rem',
                      marginBottom: 12,
                    }}
                  >
                    {actionFeedback.msg}
                  </div>
                )}
              </div>

              {/* Action Controls */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  borderTop: '1px solid rgba(255, 255, 255, 0.06)',
                  paddingTop: 12,
                }}
              >
                <div style={{ display: 'flex', gap: 6 }}>
                  <button
                    disabled={triggeringId !== null}
                    onClick={() => handleManualRun(schedule.id, 'OPENING')}
                    title="Run Opening Now"
                    style={{
                      padding: '6px 10px',
                      borderRadius: 6,
                      background: 'rgba(245, 158, 11, 0.12)',
                      border: '1px solid rgba(245, 158, 11, 0.25)',
                      color: '#fbbf24',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                    }}
                  >
                    <PlayIcon className="w-3 h-3" />
                    <span>Run Opening</span>
                  </button>

                  <button
                    disabled={triggeringId !== null}
                    onClick={() => handleManualRun(schedule.id, 'CLOSING')}
                    title="Run Closing Now"
                    style={{
                      padding: '6px 10px',
                      borderRadius: 6,
                      background: 'rgba(99, 102, 241, 0.12)',
                      border: '1px solid rgba(99, 102, 241, 0.25)',
                      color: '#818cf8',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                    }}
                  >
                    <PlayIcon className="w-3 h-3" />
                    <span>Run Closing</span>
                  </button>
                </div>

                <button
                  onClick={() => handleDelete(schedule.id)}
                  title="Delete schedule"
                  style={{
                    padding: 6,
                    borderRadius: 6,
                    background: 'none',
                    border: 'none',
                    color: '#64748b',
                    cursor: 'pointer',
                  }}
                >
                  <TrashIcon className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
