"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { LoginCard } from '@/components/auth/LoginCard';
import { Sidebar, NavTab } from '@/components/layout/Sidebar';
import { TopNavbar } from '@/components/layout/TopNavbar';
import { DashboardOverview } from '@/components/dashboard/DashboardOverview';
import { AutomationList } from '@/components/automations/AutomationList';
import { AutomationWizard } from '@/components/automations/AutomationWizard';
import { SlackSettingsCard } from '@/components/slack/SlackSettingsCard';
import { ActivityMonitoring } from '@/components/activity/ActivityMonitoring';
import { PastDataBank } from '@/components/pastdata/PastDataBank';
import { LiveSchedulePreviewCard } from '@/components/automations/LiveSchedulePreview';
import { SafeUser, Workspace, AutomationSchedule, ScheduleLivePreview } from '@/types';

export default function Home() {
  // Authentication State
  const [user, setUser] = useState<SafeUser | null>(null);
  const [workspace, setWorkspace] = useState<Workspace | undefined>(undefined);
  const [isAuthLoading, setIsAuthLoading] = useState(true);

  // App Navigation
  const [activeTab, setActiveTab] = useState<NavTab>('dashboard');
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const [isCreatingWizard, setIsCreatingWizard] = useState(false);

  // System & Schedule State
  const [schedules, setSchedules] = useState<AutomationSchedule[]>([]);
  const [previews, setPreviews] = useState<ScheduleLivePreview[]>([]);
  const [isSlackConnected, setIsSlackConnected] = useState(false);
  const [databaseType, setDatabaseType] = useState<'supabase' | 'fallback'>('supabase');
  const [stats, setStats] = useState<{
    activeSchedulesCount: number;
    totalDeliveriesCount: number;
    successDeliveriesCount: number;
    failedDeliveriesCount: number;
    lastDelivery?: Record<string, unknown> | null;
  } | null>(null);

  // Global Toast
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 6000);
  };

  // Check existing session
  const verifySession = useCallback(async () => {
    try {
      const res = await fetch('/api/auth');
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
        setWorkspace(data.workspace);
        setIsSlackConnected(Boolean(data.slackConnected));
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
    } finally {
      setIsAuthLoading(false);
    }
  }, []);

  useEffect(() => {
    let ignore = false;
    fetch('/api/auth')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!ignore) {
          if (data && data.user) {
            setUser(data.user);
            setWorkspace(data.workspace);
            setIsSlackConnected(Boolean(data.slackConnected));
          } else {
            setUser(null);
          }
        }
      })
      .catch(() => {
        if (!ignore) setUser(null);
      })
      .finally(() => {
        if (!ignore) setIsAuthLoading(false);
      });

    return () => {
      ignore = true;
    };
  }, []);

  // Load schedules, database status, and activity stats
  const refreshAppData = useCallback(async () => {
    if (!user) return;

    try {
      const [schedulesRes, activityRes, dbRes] = await Promise.all([
        fetch('/api/automations'),
        fetch('/api/activity'),
        fetch('/api/db/status'),
      ]);

      if (schedulesRes.ok) {
        const sData = await schedulesRes.json();
        setSchedules(sData.schedules || []);
        setPreviews(sData.previews || []);
      }

      if (activityRes.ok) {
        const aData = await activityRes.json();
        setStats(aData.stats || null);
      }

      if (dbRes.ok) {
        const dbData = await dbRes.json();
        setDatabaseType(dbData.supabaseConfigured ? 'supabase' : 'fallback');
      }
    } catch {
      // ignore
    }
  }, [user]);

  useEffect(() => {
    if (!user) return;
    let ignore = false;

    Promise.all([
      fetch('/api/automations').then((r) => (r.ok ? r.json() : null)),
      fetch('/api/activity').then((r) => (r.ok ? r.json() : null)),
      fetch('/api/db/status').then((r) => (r.ok ? r.json() : null)),
    ])
      .then(([sData, aData, dbData]) => {
        if (ignore) return;
        if (sData) {
          setSchedules(sData.schedules || []);
          setPreviews(sData.previews || []);
        }
        if (aData) {
          setStats(aData.stats || null);
        }
        if (dbData) {
          setDatabaseType(dbData.supabaseConfigured ? 'supabase' : 'fallback');
        }
      })
      .catch(() => {
        // ignore
      });

    return () => {
      ignore = true;
    };
  }, [user]);

  const handleAuthSuccess = (authenticatedUser: SafeUser, token: string) => {
    setUser(authenticatedUser);
    localStorage.setItem('pod_auth_token', token);
    verifySession();
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'logout' }),
      });
    } catch {
      // ignore
    }
    localStorage.removeItem('pod_auth_token');
    setUser(null);
    setWorkspace(undefined);
  };

  const handleTriggerQuickTest = async (type: 'OPENING' | 'CLOSING') => {
    showToast(`Triggering manual ${type} test dispatch...`, 'success');
    try {
      const res = await fetch(`/api/slack/test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: type === 'OPENING' ? 'test-opening' : 'test-closing',
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        showToast(
          data.simulated
            ? `Dispatched simulated ${type} POD! (Configure live Slack webhook to post directly).`
            : `Delivered ${type} POD to ${data.channel} successfully!`,
          'success'
        );
        refreshAppData();
      } else {
        showToast(data.error || `Failed to dispatch ${type} test.`, 'error');
      }
    } catch {
      showToast('Network error during test dispatch.', 'error');
    }
  };

  // Loading Screen
  if (isAuthLoading) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'var(--bg-base)',
        }}
      >
        <div style={{ textAlign: 'center' }}>
          <div
            style={{
              width: 44,
              height: 44,
              margin: '0 auto 16px auto',
              borderRadius: '50%',
              border: '3px solid rgba(79, 70, 229, 0.25)',
              borderTopColor: '#6366f1',
              animation: 'spin 1s linear infinite',
            }}
          />
          <p style={{ color: '#94a3b8', fontSize: '0.875rem' }}>
            Initializing POD Automation Engine...
          </p>
        </div>
      </div>
    );
  }

  // Unauthenticated: Show Royal Login Card
  if (!user) {
    return (
      <main
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px 16px',
        }}
      >
        <LoginCard onSuccess={handleAuthSuccess} />
      </main>
    );
  }

  // Authenticated Application Shell
  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg-base)' }}>
      {/* Sidebar */}
      <Sidebar
        activeTab={activeTab}
        onSelectTab={(tab) => {
          setActiveTab(tab);
          setIsCreatingWizard(false);
        }}
        user={user}
        workspace={workspace}
        onLogout={handleLogout}
        isMobileOpen={isMobileNavOpen}
        onCloseMobile={() => setIsMobileNavOpen(false)}
      />

      {/* Main Content Area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <TopNavbar
          timezone={schedules[0]?.timezone || 'Asia/Kolkata'}
          isSlackConnected={isSlackConnected}
          databaseType={databaseType}
          onToggleMobileMenu={() => setIsMobileNavOpen(!isMobileNavOpen)}
        />

        {/* Global Toast Notification */}
        {toast && (
          <div
            style={{
              position: 'fixed',
              top: 76,
              right: 24,
              zIndex: 9999,
              padding: '12px 20px',
              borderRadius: 8,
              background: toast.type === 'success' ? 'rgba(16, 185, 129, 0.95)' : 'rgba(239, 68, 68, 0.95)',
              color: '#ffffff',
              fontSize: '0.85rem',
              fontWeight: 600,
              boxShadow: '0 8px 24px rgba(0, 0, 0, 0.5)',
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              backdropFilter: 'blur(8px)',
              transition: 'all 200ms ease',
            }}
          >
            <span>{toast.message}</span>
            <button
              onClick={() => setToast(null)}
              style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', padding: 2 }}
            >
              ✕
            </button>
          </div>
        )}

        <main style={{ flex: 1, padding: '28px 32px', overflowY: 'auto' }}>
          {/* TAB 1: Dashboard */}
          {activeTab === 'dashboard' && (
            <DashboardOverview
              schedules={schedules}
              previews={previews}
              stats={stats}
              isSlackConnected={isSlackConnected}
              onNavigateTab={(tab) => {
                setActiveTab(tab as NavTab);
                if (tab === 'automations') setIsCreatingWizard(true);
              }}
              onTriggerTest={handleTriggerQuickTest}
            />
          )}

          {/* TAB 2: Automations (Wizard or List) */}
          {activeTab === 'automations' && (
            <div>
              {isCreatingWizard ? (
                <div>
                  <AutomationWizard
                    onSaved={() => {
                      setIsCreatingWizard(false);
                      refreshAppData();
                      showToast('Automation successfully deployed and scheduled!', 'success');
                    }}
                    onCancel={() => setIsCreatingWizard(false)}
                  />
                </div>
              ) : (
                <AutomationList
                  schedules={schedules}
                  onCreateNew={() => setIsCreatingWizard(true)}
                  onRefresh={refreshAppData}
                />
              )}
            </div>
          )}

          {/* TAB 3: Schedules */}
          {activeTab === 'schedules' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
              <div>
                <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#f8fafc', letterSpacing: '-0.02em' }}>
                  Live Schedule Monitoring
                </h2>
                <p style={{ fontSize: '0.85rem', color: '#94a3b8', marginTop: 2 }}>
                  Exact calculated execution times across configured timezones.
                </p>
              </div>

              {previews.map((prev) => (
                <LiveSchedulePreviewCard key={prev.scheduleId} preview={prev} />
              ))}

              <AutomationList
                schedules={schedules}
                onCreateNew={() => {
                  setActiveTab('automations');
                  setIsCreatingWizard(true);
                }}
                onRefresh={refreshAppData}
              />
            </div>
          )}

          {/* TAB 4: Slack */}
          {activeTab === 'slack' && <SlackSettingsCard />}

          {/* TAB 5: Activity Logs */}
          {activeTab === 'activity' && <ActivityMonitoring />}

          {/* TAB 6: Past Data / Task Bank */}
          {activeTab === 'pastdata' && <PastDataBank />}
        </main>
      </div>
    </div>
  );
}
