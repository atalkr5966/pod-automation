"use client";

import React from 'react';
import { ClockIcon, CalendarIcon, CheckCircleIcon } from '@/components/ui/Icons';
import { ScheduleLivePreview } from '@/types';

interface LiveSchedulePreviewProps {
  preview: ScheduleLivePreview;
}

export function LiveSchedulePreviewCard({ preview }: LiveSchedulePreviewProps) {
  return (
    <div
      className="royal-glass-elevated animate-fade-in"
      style={{
        padding: '24px',
        background: 'rgba(12, 19, 38, 0.92)',
        border: '1px solid rgba(99, 102, 241, 0.25)',
        boxShadow: '0 8px 30px rgba(0, 0, 0, 0.4), 0 0 20px rgba(79, 70, 229, 0.12)',
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 12,
          marginBottom: 20,
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          paddingBottom: 16,
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span
              style={{
                display: 'inline-block',
                width: 8,
                height: 8,
                borderRadius: '50%',
                backgroundColor: preview.active ? '#10b981' : '#64748b',
                boxShadow: preview.active ? '0 0 8px #10b981' : 'none',
              }}
            />
            <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#f8fafc' }}>
              {preview.scheduleName}
            </h3>
            <span className={`royal-badge ${preview.active ? 'success' : 'neutral'}`}>
              {preview.active ? 'Active' : 'Paused'}
            </span>
          </div>
          <p style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: 4 }}>
            Timezone: <strong style={{ color: '#cbd5e1' }}>{preview.timezone}</strong> · Channel: <strong style={{ color: '#818cf8' }}>{preview.channel}</strong>
          </p>
        </div>

        <div
          style={{
            fontSize: '0.75rem',
            padding: '4px 10px',
            borderRadius: 6,
            background: 'rgba(79, 70, 229, 0.15)',
            border: '1px solid rgba(99, 102, 241, 0.3)',
            color: '#a5b4fc',
            fontWeight: 600,
          }}
        >
          Server-Side Independent
        </div>
      </div>

      {/* Opening & Closing Row */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: 16,
        }}
      >
        {/* Morning Opening Block */}
        <div
          style={{
            padding: '18px 20px',
            borderRadius: 10,
            background: 'rgba(8, 14, 30, 0.75)',
            border: '1px solid rgba(255, 255, 255, 0.07)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 6,
                  background: 'rgba(245, 158, 11, 0.15)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#fbbf24',
                }}
              >
                <ClockIcon className="w-4 h-4" />
              </div>
              <span style={{ fontSize: '0.925rem', fontWeight: 700, color: '#f8fafc' }}>
                Opening Action
              </span>
            </div>
            <span className={`royal-badge ${preview.opening.enabled ? 'warning' : 'neutral'}`}>
              {preview.opening.enabled ? 'Enabled' : 'Disabled'}
            </span>
          </div>

          <div style={{ marginBottom: 10 }}>
            <div style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
              Configured Time
            </div>
            <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#fbbf24', marginTop: 2, fontFamily: 'JetBrains Mono, monospace' }}>
              {preview.opening.configuredTime}
            </div>
          </div>

          <div
            style={{
              paddingTop: 10,
              borderTop: '1px solid rgba(255, 255, 255, 0.06)',
            }}
          >
            <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Next Calculated Execution:</div>
            <div
              style={{
                fontSize: '0.875rem',
                fontWeight: 600,
                color: preview.opening.nextRun ? '#34d399' : '#64748b',
                marginTop: 2,
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              {preview.opening.nextRun ? (
                <>
                  <CheckCircleIcon className="w-4 h-4" />
                  <span>{preview.opening.nextRun.label}</span>
                </>
              ) : (
                <span>Schedule paused or disabled</span>
              )}
            </div>
          </div>
        </div>

        {/* Evening Closing Block */}
        <div
          style={{
            padding: '18px 20px',
            borderRadius: 10,
            background: 'rgba(8, 14, 30, 0.75)',
            border: '1px solid rgba(255, 255, 255, 0.07)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 6,
                  background: 'rgba(99, 102, 241, 0.15)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#818cf8',
                }}
              >
                <CalendarIcon className="w-4 h-4" />
              </div>
              <span style={{ fontSize: '0.925rem', fontWeight: 700, color: '#f8fafc' }}>
                Closing Action
              </span>
            </div>
            <span className={`royal-badge ${preview.closing.enabled ? 'info' : 'neutral'}`}>
              {preview.closing.enabled ? 'Enabled' : 'Disabled'}
            </span>
          </div>

          <div style={{ marginBottom: 10 }}>
            <div style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
              Configured Time
            </div>
            <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#818cf8', marginTop: 2, fontFamily: 'JetBrains Mono, monospace' }}>
              {preview.closing.configuredTime}
            </div>
          </div>

          <div
            style={{
              paddingTop: 10,
              borderTop: '1px solid rgba(255, 255, 255, 0.06)',
            }}
          >
            <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Next Calculated Execution:</div>
            <div
              style={{
                fontSize: '0.875rem',
                fontWeight: 600,
                color: preview.closing.nextRun ? '#34d399' : '#64748b',
                marginTop: 2,
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              {preview.closing.nextRun ? (
                <>
                  <CheckCircleIcon className="w-4 h-4" />
                  <span>{preview.closing.nextRun.label}</span>
                </>
              ) : (
                <span>Schedule paused or disabled</span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
