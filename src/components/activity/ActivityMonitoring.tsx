"use client";

import React, { useState, useEffect } from 'react';
import {
  ActivityIcon,
  RefreshCwIcon,
} from '@/components/ui/Icons';
import { ExecutionLog } from '@/types';

export function ActivityMonitoring() {
  const [logs, setLogs] = useState<ExecutionLog[]>([]);
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchLogs = async (isManual = false) => {
    if (isManual) setIsRefreshing(true);
    try {
      const url = filterStatus !== 'ALL' ? `/api/activity?status=${filterStatus}` : '/api/activity';
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setLogs(data.logs || []);
      }
    } catch {
      // ignore
    } finally {
      setIsLoading(false);
      if (isManual) setIsRefreshing(false);
    }
  };

  useEffect(() => {
    let ignore = false;
    const url = filterStatus !== 'ALL' ? `/api/activity?status=${filterStatus}` : '/api/activity';
    fetch(url)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!ignore && data) {
          setLogs(data.logs || []);
        }
      })
      .catch(() => {
        // ignore
      })
      .finally(() => {
        if (!ignore) {
          setIsLoading(false);
        }
      });

    return () => {
      ignore = true;
    };
  }, [filterStatus]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'SUCCESS':
        return <span className="royal-badge success">Success</span>;
      case 'FAILED':
        return <span className="royal-badge danger">Failed</span>;
      case 'RUNNING':
        return <span className="royal-badge warning animate-pulse-subtle">Running</span>;
      case 'SKIPPED':
        return <span className="royal-badge neutral">Skipped</span>;
      case 'RETRYING':
        return <span className="royal-badge info">Retrying</span>;
      default:
        return <span className="royal-badge neutral">{status}</span>;
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Header bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#f8fafc', letterSpacing: '-0.02em' }}>
            Automation Activity Monitoring
          </h2>
          <p style={{ fontSize: '0.85rem', color: '#94a3b8', marginTop: 2 }}>
            Real-time audit log of all server-side scheduled and manual dispatches.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {/* Status Filter */}
          <div style={{ display: 'flex', background: 'rgba(5, 8, 18, 0.7)', borderRadius: 8, padding: 3, border: '1px solid rgba(255, 255, 255, 0.08)' }}>
            {['ALL', 'SUCCESS', 'FAILED', 'SKIPPED'].map((st) => (
              <button
                key={st}
                onClick={() => setFilterStatus(st)}
                style={{
                  padding: '5px 12px',
                  borderRadius: 6,
                  border: 'none',
                  background: filterStatus === st ? 'rgba(79, 70, 229, 0.3)' : 'transparent',
                  color: filterStatus === st ? '#ffffff' : '#94a3b8',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                {st}
              </button>
            ))}
          </div>

          <button
            disabled={isRefreshing}
            onClick={() => fetchLogs(true)}
            style={{
              padding: '8px 12px',
              borderRadius: 8,
              background: 'rgba(255, 255, 255, 0.06)',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              color: '#f8fafc',
              cursor: isRefreshing ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              fontSize: '0.8rem',
            }}
          >
            <RefreshCwIcon className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Activity Table */}
      <div
        className="royal-glass-elevated"
        style={{
          background: 'rgba(12, 19, 38, 0.9)',
          overflowX: 'auto',
          border: '1px solid rgba(255, 255, 255, 0.08)',
        }}
      >
        {isLoading ? (
          <div style={{ padding: 48, textAlign: 'center', color: '#94a3b8' }}>
            Loading activity log history...
          </div>
        ) : logs.length === 0 ? (
          <div style={{ padding: 48, textAlign: 'center' }}>
            <div style={{ color: '#6366f1', marginBottom: 12 }}>
              <ActivityIcon className="w-8 h-8 mx-auto" />
            </div>
            <h4 style={{ fontSize: '1rem', fontWeight: 600, color: '#f8fafc' }}>
              No Execution Records Found
            </h4>
            <p style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: 4 }}>
              Activity logs will appear automatically once a scheduled or test dispatch executes.
            </p>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
            <thead>
              <tr
                style={{
                  borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                  background: 'rgba(6, 10, 22, 0.8)',
                  color: '#64748b',
                  fontSize: '0.75rem',
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                }}
              >
                <th style={{ padding: '14px 18px' }}>Status</th>
                <th style={{ padding: '14px 18px' }}>Action</th>
                <th style={{ padding: '14px 18px' }}>Schedule Name</th>
                <th style={{ padding: '14px 18px' }}>Channel</th>
                <th style={{ padding: '14px 18px' }}>Execution Time</th>
                <th style={{ padding: '14px 18px' }}>Duration</th>
                <th style={{ padding: '14px 18px' }}>Details / Error</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr
                  key={log.id}
                  style={{
                    borderBottom: '1px solid rgba(255, 255, 255, 0.04)',
                    transition: 'background 100ms ease',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255, 255, 255, 0.02)')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                >
                  <td style={{ padding: '14px 18px' }}>{getStatusBadge(log.status)}</td>
                  <td style={{ padding: '14px 18px' }}>
                    <span
                      style={{
                        fontWeight: 700,
                        color: log.actionType === 'OPENING' ? '#fbbf24' : '#818cf8',
                      }}
                    >
                      {log.actionType}
                    </span>
                  </td>
                  <td style={{ padding: '14px 18px', color: '#f8fafc', fontWeight: 600 }}>
                    {log.scheduleName || 'Daily Automation'}
                  </td>
                  <td style={{ padding: '14px 18px' }}>
                    <span style={{ color: '#818cf8', fontFamily: 'JetBrains Mono, monospace' }}>
                      {log.channel}
                    </span>
                  </td>
                  <td style={{ padding: '14px 18px', color: '#cbd5e1' }}>
                    {new Date(log.startedAt).toLocaleString('en-US', {
                      month: 'short',
                      day: '2-digit',
                      hour: '2-digit',
                      minute: '2-digit',
                      second: '2-digit',
                      hour12: true,
                    })}
                  </td>
                  <td style={{ padding: '14px 18px', color: '#94a3b8', fontFamily: 'JetBrains Mono, monospace' }}>
                    {log.durationMs}ms
                  </td>
                  <td style={{ padding: '14px 18px', maxWidth: 260 }}>
                    {log.errorMessage ? (
                      <span
                        style={{
                          color: '#f87171',
                          fontSize: '0.785rem',
                          display: 'block',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                        title={log.errorMessage}
                      >
                        ⚠️ {log.errorMessage}
                      </span>
                    ) : (
                      <span style={{ color: '#34d399', fontSize: '0.785rem' }}>
                        ✓ Delivered to Slack
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
