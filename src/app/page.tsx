"use client";

import { useState, useEffect } from 'react';
import styles from './page.module.css';

interface UserProfile {
  id: string;
  username: string;
  name: string;
  email: string;
  channels: {
    slack?: { enabled: boolean; webhookUrl: string };
  };
  schedule: {
    timezone: string;
    opening: { enabled: boolean; time: string; days: number[] };
    closing: { enabled: boolean; time: string; days: number[] };
  };
}

interface PastDataEntry {
  id: string;
  date: string;
  type: 'OPENING' | 'CLOSING' | 'GENERAL';
  category?: string;
  tasks: string[];
  notes?: string;
}

interface AnalysisInsights {
  totalLogs: number;
  topCategories: { name: string; count: number }[];
  recurringTasks: string[];
  recentPendingTasks: string[];
  averageTasksPerDay: number;
}

interface HistoryItem {
  id: string;
  userId: string;
  username: string;
  type: 'OPENING' | 'CLOSING';
  channel: 'slack';
  content: string;
  status: 'SUCCESS' | 'FAILED' | 'SIMULATED';
  timestamp: string;
  error?: string;
}



export default function Home() {
  // Auth state
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [authTab, setAuthTab] = useState<'login' | 'register'>('login');
  
  // Auth Form
  const [loginIdentifier, setLoginIdentifier] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [regUsername, setRegUsername] = useState('');
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [authStatus, setAuthStatus] = useState({ type: '', message: '' });
  const [isSubmittingAuth, setIsSubmittingAuth] = useState(false);

  // App Navigation
  const [activeTab, setActiveTab] = useState<'studio' | 'analytics' | 'schedules' | 'slack_channel' | 'history'>('studio');

  // Studio State
  const [podType, setPodType] = useState<'OPENING' | 'CLOSING'>('OPENING');
  const [podContent, setPodContent] = useState('');
  const [customContext, setCustomContext] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [studioStatus, setStudioStatus] = useState({ type: '', message: '' });

  // Past Data & Analytics State
  const [pastDataList, setPastDataList] = useState<PastDataEntry[]>([]);
  const [insights, setInsights] = useState<AnalysisInsights | null>(null);
  const [isLoadingPastData, setIsLoadingPastData] = useState(false);
  
  // New Log Form
  const [newLogDate, setNewLogDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [newLogType, setNewLogType] = useState<'OPENING' | 'CLOSING' | 'GENERAL'>('GENERAL');
  const [newLogCategory, setNewLogCategory] = useState('Core Engineering');
  const [newLogTasksText, setNewLogTasksText] = useState('');
  const [newLogNotes, setNewLogNotes] = useState('');
  const [isAddingLog, setIsAddingLog] = useState(false);
  const [pastDataStatus, setPastDataStatus] = useState({ type: '', message: '' });

  // Schedules & Slack State
  const [openingEnabled, setOpeningEnabled] = useState(true);
  const [openingTime, setOpeningTime] = useState('09:30');
  const [openingDays, setOpeningDays] = useState<number[]>([1, 2, 3, 4, 5]);

  const [closingEnabled, setClosingEnabled] = useState(true);
  const [closingTime, setClosingTime] = useState('18:30');
  const [closingDays, setClosingDays] = useState<number[]>([1, 2, 3, 4, 5]);

  const [slackWebhook, setSlackWebhook] = useState('');
  const [showWebhookUrl, setShowWebhookUrl] = useState(false);
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [isSavingSlackOnly, setIsSavingSlackOnly] = useState(false);
  const [settingsStatus, setSettingsStatus] = useState({ type: '', message: '' });
  const [slackSaveStatus, setSlackSaveStatus] = useState({ type: '', message: '' });
  const [isTestingSlack, setIsTestingSlack] = useState(false);

  // History Logs
  const [historyLogs, setHistoryLogs] = useState<HistoryItem[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [selectedHistory, setSelectedHistory] = useState<HistoryItem | null>(null);

  // Check existing session on mount
  useEffect(() => {
    const savedToken = localStorage.getItem('pod_auth_token');
    if (savedToken) {
      setToken(savedToken);
      fetchUserProfile(savedToken);
    } else {
      setIsAuthLoading(false);
    }
  }, []);

  // Fetch User Profile
  const fetchUserProfile = async (authToken: string) => {
    try {
      const res = await fetch('/api/auth', {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
        syncUserSettings(data.user);
      } else {
        localStorage.removeItem('pod_auth_token');
        setToken(null);
      }
    } catch (err) {
      console.error('Session check failed:', err);
    } finally {
      setIsAuthLoading(false);
    }
  };

  const syncUserSettings = (userData: UserProfile) => {
    if (userData.schedule) {
      setOpeningEnabled(userData.schedule.opening?.enabled ?? true);
      setOpeningTime(userData.schedule.opening?.time ?? '09:30');
      setOpeningDays(userData.schedule.opening?.days ?? [1, 2, 3, 4, 5]);

      setClosingEnabled(userData.schedule.closing?.enabled ?? true);
      setClosingTime(userData.schedule.closing?.time ?? '18:30');
      setClosingDays(userData.schedule.closing?.days ?? [1, 2, 3, 4, 5]);
    }
    if (userData.channels?.slack?.webhookUrl) {
      setSlackWebhook(userData.channels.slack.webhookUrl);
    }
  };

  // Auth Handler
  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthStatus({ type: '', message: '' });
    setIsSubmittingAuth(true);

    try {
      const payload =
        authTab === 'login'
          ? { action: 'login', identifier: loginIdentifier, password: loginPassword }
          : {
              action: 'register',
              username: regUsername,
              name: regName || regUsername,
              email: regEmail,
              password: regPassword,
            };

      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (res.ok && data.token) {
        localStorage.setItem('pod_auth_token', data.token);
        setToken(data.token);
        setUser(data.user);
        syncUserSettings(data.user);
        setAuthStatus({ type: 'success', message: data.message || 'Authenticated successfully!' });
      } else {
        setAuthStatus({ type: 'error', message: data.error || 'Authentication failed.' });
      }
    } catch (err) {
      setAuthStatus({ type: 'error', message: 'Network error. Please try again.' });
    } finally {
      setIsSubmittingAuth(false);
    }
  };

  const handleLogout = async () => {
    if (token) {
      try {
        await fetch('/api/auth', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ action: 'logout' }),
        });
      } catch (e) {}
    }
    localStorage.removeItem('pod_auth_token');
    setToken(null);
    setUser(null);
  };


  // Fetch Past Data & Insights
  const fetchPastData = async () => {
    if (!token) return;
    setIsLoadingPastData(true);
    try {
      const res = await fetch('/api/pod/past-data', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setPastDataList(data.pastData || []);
        setInsights(data.insights || null);
      }
    } catch (err) {
      console.error('Failed to load past data:', err);
    } finally {
      setIsLoadingPastData(false);
    }
  };

  // Fetch Delivery History
  const fetchHistory = async () => {
    if (!token) return;
    setIsLoadingHistory(true);
    try {
      const res = await fetch('/api/pod/history', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setHistoryLogs(data.history || []);
      }
    } catch (err) {
      console.error('Failed to load history:', err);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const [currentTimeDisplay, setCurrentTimeDisplay] = useState('');
  const [autoScheduleNotice, setAutoScheduleNotice] = useState<string | null>(null);
  const [isManualCheckingCron, setIsManualCheckingCron] = useState(false);

  // Clock updater & In-App Auto-Scheduler Heartbeat
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTimeDisplay(
        now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })
      );
    };
    updateTime();
    const clockTimer = setInterval(updateTime, 1000);

    // Heartbeat check for scheduled Opening / Closing PODs every 20 seconds
    const checkSchedules = async () => {
      if (!token) return;
      try {
        const res = await fetch('/api/cron/trigger');
        if (res.ok) {
          const data = await res.json();
          if (data.triggered && data.triggered.length > 0) {
            const lastTrig = data.triggered[0];
            setAutoScheduleNotice(`🚀 Auto-Dispatched ${lastTrig.type} POD to Slack successfully at ${lastTrig.time}!`);
            fetchHistory();
            setTimeout(() => setAutoScheduleNotice(null), 10000);
          }
        }
      } catch (e) {
        // Heartbeat error ignore
      }
    };

    const heartbeatTimer = setInterval(checkSchedules, 20000);
    // Initial check
    if (token) checkSchedules();

    return () => {
      clearInterval(clockTimer);
      clearInterval(heartbeatTimer);
    };
  }, [token]);

  useEffect(() => {
    if (token) {
      fetchPastData();
      fetchHistory();
    }
  }, [token, activeTab]);

  // Generate POD from Past Data
  const handleGeneratePod = async () => {
    if (!token) return;
    setIsGenerating(true);
    setStudioStatus({ type: '', message: '' });

    try {
      const res = await fetch('/api/pod/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          type: podType,
          customContext: customContext.trim(),
        }),
      });

      const data = await res.json();
      if (res.ok && data.pod) {
        setPodContent(data.pod);
        if (data.insights) setInsights(data.insights);
        setStudioStatus({
          type: 'success',
          message: `✨ ${podType} POD synthesized from your past work patterns!`,
        });
      } else {
        setStudioStatus({ type: 'error', message: data.error || 'Failed to synthesize POD.' });
      }
    } catch (err) {
      setStudioStatus({ type: 'error', message: 'Network error occurred while generating POD.' });
    } finally {
      setIsGenerating(false);
    }
  };

  // Dispatch POD to Slack
  const handleSendPod = async () => {
    if (!token || !podContent.trim()) {
      setStudioStatus({ type: 'error', message: 'POD content cannot be empty.' });
      return;
    }

    setIsSending(true);
    setStudioStatus({ type: '', message: '' });

    try {
      const res = await fetch('/api/pod/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          type: podType,
          content: podContent,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setStudioStatus({
          type: 'success',
          message: `🚀 ${podType} POD sent successfully to Slack!`,
        });
        fetchHistory();
      } else {
        setStudioStatus({ type: 'error', message: data.message || data.error || 'Failed to send POD to Slack.' });
      }
    } catch (err) {
      setStudioStatus({ type: 'error', message: 'Network error occurred while sending POD.' });
    } finally {
      setIsSending(false);
    }
  };

  // Add Past Work Log
  const handleAddPastLog = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !newLogTasksText.trim()) {
      setPastDataStatus({ type: 'error', message: 'Please enter at least one task.' });
      return;
    }

    setIsAddingLog(true);
    setPastDataStatus({ type: '', message: '' });

    try {
      const res = await fetch('/api/pod/past-data', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          date: newLogDate,
          type: newLogType,
          category: newLogCategory,
          rawText: newLogTasksText,
          notes: newLogNotes,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setPastDataList(data.pastData || []);
        if (data.insights) setInsights(data.insights);
        setNewLogTasksText('');
        setNewLogNotes('');
        setPastDataStatus({ type: 'success', message: '✅ Past work log recorded and indexed into analyzer!' });
      } else {
        setPastDataStatus({ type: 'error', message: data.error || 'Failed to add work log.' });
      }
    } catch (err) {
      setPastDataStatus({ type: 'error', message: 'Network error occurred.' });
    } finally {
      setIsAddingLog(false);
    }
  };

  // Delete Past Log
  const handleDeletePastLog = async (id: string) => {
    if (!token) return;
    try {
      const res = await fetch(`/api/pod/past-data?id=${encodeURIComponent(id)}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setPastDataList(data.pastData || []);
        if (data.insights) setInsights(data.insights);
      }
    } catch (err) {
      console.error('Failed to delete log:', err);
    }
  };

  // Test Slack Webhook Connection
  const handleTestSlack = async () => {
    if (!token) return;
    setIsTestingSlack(true);
    setSettingsStatus({ type: '', message: '' });
    setSlackSaveStatus({ type: '', message: '' });

    try {
      const res = await fetch('/api/channels/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ webhookUrl: slackWebhook }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        const msg = data.simulated
          ? `⚠️ Slack Connection Simulated (No live URL provided)`
          : `✅ Slack Test Ping Delivered Successfully!`;
        setSettingsStatus({ type: 'success', message: msg });
        setSlackSaveStatus({ type: 'success', message: msg });
      } else {
        const errMsg = `❌ Slack Test Failed: ${data.error || 'Unknown error'}`;
        setSettingsStatus({ type: 'error', message: errMsg });
        setSlackSaveStatus({ type: 'error', message: errMsg });
      }
    } catch (err) {
      const netErr = 'Network error occurred while testing.';
      setSettingsStatus({ type: 'error', message: netErr });
      setSlackSaveStatus({ type: 'error', message: netErr });
    } finally {
      setIsTestingSlack(false);
    }
  };

  // Save Schedules & Slack Settings
  const handleSaveSettings = async () => {
    if (!token) return;
    setIsSavingSettings(true);
    setSettingsStatus({ type: '', message: '' });

    try {
      const payload = {
        channels: {
          slack: { enabled: !!slackWebhook, webhookUrl: slackWebhook },
        },
        schedule: {
          timezone: user?.schedule?.timezone || 'Asia/Kolkata',
          opening: {
            enabled: openingEnabled,
            time: openingTime,
            days: openingDays,
          },
          closing: {
            enabled: closingEnabled,
            time: closingTime,
            days: closingDays,
          },
        },
      };

      const res = await fetch('/api/user/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (res.ok) {
        if (data.token) {
          localStorage.setItem('pod_auth_token', data.token);
          setToken(data.token);
        }
        if (data.settings) {
          setUser((prev) => (prev ? { ...prev, ...data.settings } : prev));
        }
        setSettingsStatus({ type: 'success', message: '🎉 Schedule & Slack settings saved successfully to server!' });
      } else {
        setSettingsStatus({ type: 'error', message: data.error || 'Failed to save settings.' });
      }
    } catch (err) {
      setSettingsStatus({ type: 'error', message: 'Network error occurred while saving.' });
    } finally {
      setIsSavingSettings(false);
    }
  };

  // Instant Force Trigger POD to Slack
  const handleForceTrigger = async (type: 'OPENING' | 'CLOSING') => {
    if (!token) return;
    setIsManualCheckingCron(true);
    setSettingsStatus({ type: 'info', message: `🚀 Generating and dispatching ${type} POD to Slack now...` });

    try {
      // First ensure latest settings are saved
      const payload = {
        channels: {
          slack: { enabled: !!slackWebhook, webhookUrl: slackWebhook },
        },
        schedule: {
          timezone: user?.schedule?.timezone || 'Asia/Kolkata',
          opening: {
            enabled: openingEnabled,
            time: openingTime,
            days: openingDays,
          },
          closing: {
            enabled: closingEnabled,
            time: closingTime,
            days: closingDays,
          },
        },
      };

      await fetch('/api/user/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const res = await fetch(`/api/cron/trigger?force=true&type=${type}`);
      const data = await res.json();
      if (res.ok && data.triggered && data.triggered.length > 0) {
        const item = data.triggered[0];
        const slackRes = item.results?.[0];
        if (slackRes?.simulated) {
          setSettingsStatus({
            type: 'info',
            message: `⚠️ ${type} POD generated, but sent in Simulation Mode (No real Slack Webhook URL). Please connect your live Slack webhook in the Slack Channel tab!`,
          });
        } else if (slackRes?.success) {
          setSettingsStatus({
            type: 'success',
            message: `🎉 Success! ${type} POD generated and dispatched directly to your Slack channel right now!`,
          });
        } else {
          setSettingsStatus({
            type: 'error',
            message: `❌ Slack dispatch failed: ${slackRes?.error || 'Unknown error'}`,
          });
        }
        fetchHistory();
      } else {
        setSettingsStatus({
          type: 'error',
          message: '❌ Failed to trigger POD generation.',
        });
      }
    } catch (e: any) {
      setSettingsStatus({ type: 'error', message: `❌ Error: ${e.message || 'Network error'}` });
    } finally {
      setIsManualCheckingCron(false);
    }
  };

  // Convert 24h string "HH:MM" to friendly 12h label
  const formatTimeLabel = (timeStr: string) => {
    if (!timeStr || !timeStr.includes(':')) return timeStr;
    const [hStr, mStr] = timeStr.split(':');
    const h = parseInt(hStr, 10);
    const m = parseInt(mStr, 10);
    if (isNaN(h) || isNaN(m)) return timeStr;
    const period = h >= 12 ? 'PM' : 'AM';
    const h12 = h % 12 === 0 ? 12 : h % 12;
    const padM = m < 10 ? `0${m}` : `${m}`;
    const padH = h12 < 10 ? `0${h12}` : `${h12}`;
    let timeOfDay = 'Morning';
    if (h >= 12 && h < 17) timeOfDay = 'Afternoon (Dophar)';
    else if (h >= 17 && h < 21) timeOfDay = 'Evening (Shaam)';
    else if (h >= 21 || h < 4) timeOfDay = 'Night / Midnight (Raat)';
    else timeOfDay = 'Morning (Subah)';
    return `${padH}:${padM} ${period} (${timeOfDay})`;
  };

  // Quick preset tester (e.g. +2 mins from right now)
  const setQuickTestTimer = async (target: 'opening' | 'closing', offsetMinutes: number = 2) => {
    if (!token) return;
    const now = new Date();
    now.setMinutes(now.getMinutes() + offsetMinutes);
    const target24h = new Intl.DateTimeFormat('en-GB', {
      timeZone: user?.schedule?.timezone || 'Asia/Kolkata',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(now);

    const currentDay = now.getDay();
    const updatedOpeningDays = target === 'opening' && !openingDays.includes(currentDay) ? [...openingDays, currentDay].sort() : openingDays;
    const updatedClosingDays = target === 'closing' && !closingDays.includes(currentDay) ? [...closingDays, currentDay].sort() : closingDays;

    if (target === 'opening') {
      setOpeningTime(target24h);
      setOpeningEnabled(true);
      setOpeningDays(updatedOpeningDays);
    } else {
      setClosingTime(target24h);
      setClosingEnabled(true);
      setClosingDays(updatedClosingDays);
    }

    try {
      const payload = {
        schedule: {
          timezone: user?.schedule?.timezone || 'Asia/Kolkata',
          opening: {
            enabled: target === 'opening' ? true : openingEnabled,
            time: target === 'opening' ? target24h : openingTime,
            days: updatedOpeningDays,
          },
          closing: {
            enabled: target === 'closing' ? true : closingEnabled,
            time: target === 'closing' ? target24h : closingTime,
            days: updatedClosingDays,
          },
        },
      };

      const res = await fetch('/api/user/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setSettingsStatus({
          type: 'success',
          message: `⚡ ${target === 'opening' ? 'Opening' : 'Closing'} POD auto-scheduled for ${formatTimeLabel(target24h)} (in ${offsetMinutes} mins) and saved! Keep this tab open to watch auto-dispatch.`,
        });
      }
    } catch (e) {
      console.error('Quick test save failed:', e);
    }
  };

  // Dedicated Save Slack Webhook Handler
  const handleSaveSlackOnly = async () => {
    if (!token) return;
    setIsSavingSlackOnly(true);
    setSlackSaveStatus({ type: '', message: '' });

    try {
      const payload = {
        channels: {
          slack: { enabled: !!slackWebhook.trim(), webhookUrl: slackWebhook.trim() },
        },
      };

      const res = await fetch('/api/user/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (res.ok) {
        if (data.token) {
          localStorage.setItem('pod_auth_token', data.token);
          setToken(data.token);
        }
        if (data.settings) {
          setUser((prev) => (prev ? { ...prev, ...data.settings } : prev));
        }
        setSlackSaveStatus({
          type: 'success',
          message: slackWebhook.trim()
            ? '🎉 Slack Channel Webhook connected & saved as default destination!'
            : 'ℹ️ Slack Webhook cleared. PODs will run in simulation mode.',
        });
      } else {
        setSlackSaveStatus({ type: 'error', message: data.error || 'Failed to save Slack webhook.' });
      }
    } catch (err) {
      setSlackSaveStatus({ type: 'error', message: 'Network error occurred while saving.' });
    } finally {
      setIsSavingSlackOnly(false);
    }
  };

  // Clear / Disconnect Slack Webhook
  const handleClearSlackWebhook = async () => {
    if (!confirm('Are you sure you want to disconnect this Slack webhook?')) return;
    setSlackWebhook('');
    if (!token) return;

    try {
      const payload = {
        channels: {
          slack: { enabled: false, webhookUrl: '' },
        },
      };

      const res = await fetch('/api/user/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setSlackSaveStatus({
          type: 'info',
          message: '🗑️ Slack Webhook disconnected. You can connect a new one anytime.',
        });
      }
    } catch (err) {
      console.error('Failed to clear webhook:', err);
    }
  };

  const toggleDay = (day: number, currentDays: number[], setter: (days: number[]) => void) => {
    if (currentDays.includes(day)) {
      setter(currentDays.filter((d) => d !== day));
    } else {
      setter([...currentDays, day].sort());
    }
  };

  // Day of week labels
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  // Loading Screen
  if (isAuthLoading) {
    return (
      <main className={styles.container} style={{ alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <div className={styles.logoIcon} style={{ margin: '0 auto 16px', width: 56, height: 56, fontSize: '2rem' }}>
            ⚡
          </div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 600 }}>Loading POD Automation...</h2>
        </div>
      </main>
    );
  }

  // Not Logged In View
  if (!user || !token) {
    return (
      <main className={styles.container}>
        <div className={styles.authWrapper}>
          <div className={`glass-panel glass-panel-glow ${styles.authCard} animate-fade-in`}>
            <div className={styles.authHeader}>
              <div className={styles.logoIcon} style={{ margin: '0 auto 16px' }}>⚡</div>
              <h1 className={styles.title}>
                <span className="text-gradient">POD</span> Automation
              </h1>
              <p className={styles.subtitle} style={{ marginTop: 6 }}>
                AI-powered daily Opening & Closing generator with custom scheduled multi-channel dispatch
              </p>
            </div>

            <div className={styles.authTabs}>
              <button
                className={`${styles.authTab} ${authTab === 'login' ? styles.authTabActive : ''}`}
                onClick={() => setAuthTab('login')}
              >
                Log In
              </button>
              <button
                className={`${styles.authTab} ${authTab === 'register' ? styles.authTabActive : ''}`}
                onClick={() => setAuthTab('register')}
              >
                Create Account
              </button>
            </div>

            <form onSubmit={handleAuthSubmit} className={styles.authForm}>
              {authTab === 'register' && (
                <>
                  <div>
                    <label className={styles.label}>Full Name</label>
                    <input
                      type="text"
                      className="glass-input"
                      value={regName}
                      onChange={(e) => setRegName(e.target.value)}
                      placeholder="e.g. Alex Morgan"
                    />
                  </div>
                  <div>
                    <label className={styles.label}>Username *</label>
                    <input
                      type="text"
                      className="glass-input"
                      value={regUsername}
                      onChange={(e) => setRegUsername(e.target.value)}
                      placeholder="e.g. alex_m"
                      required
                    />
                  </div>
                  <div>
                    <label className={styles.label}>Email Address *</label>
                    <input
                      type="email"
                      className="glass-input"
                      value={regEmail}
                      onChange={(e) => setRegEmail(e.target.value)}
                      placeholder="alex@company.com"
                      required
                    />
                  </div>
                </>
              )}

              {authTab === 'login' && (
                <div>
                  <label className={styles.label}>Username or Email</label>
                  <input
                    type="text"
                    className="glass-input"
                    value={loginIdentifier}
                    onChange={(e) => setLoginIdentifier(e.target.value)}
                    placeholder="Username or email"
                    required
                  />
                </div>
              )}

              <div>
                <label className={styles.label}>Password</label>
                <input
                  type="password"
                  className="glass-input"
                  value={authTab === 'login' ? loginPassword : regPassword}
                  onChange={(e) =>
                    authTab === 'login' ? setLoginPassword(e.target.value) : setRegPassword(e.target.value)
                  }
                  placeholder="••••••••"
                  required
                />
              </div>

              <button type="submit" className="btn btn-primary" style={{ marginTop: 8 }} disabled={isSubmittingAuth}>
                {isSubmittingAuth ? 'Processing...' : authTab === 'login' ? '🔐 Log In' : '✨ Register Account'}
              </button>

              {authStatus.message && (
                <div className={`${styles.statusMessage} ${styles[authStatus.type]}`}>
                  {authStatus.message}
                </div>
              )}
            </form>
          </div>
        </div>
      </main>
    );
  }

  // Logged In Dashboard View
  return (
    <main className={styles.container}>
      {/* Top Navbar */}
      <header className={styles.header}>
        <div className={styles.brand}>
          <div className={styles.logoIcon}>⚡</div>
          <div>
            <h1 className={styles.title}>
              <span className="text-gradient">POD</span> Automation
            </h1>
            <p className={styles.subtitle}>Smart Standup & EOD Automation System</p>
          </div>
        </div>

        <div className={styles.headerActions}>
          <div className={styles.userBadge}>
            <div className={styles.avatar}>{user.name ? user.name[0].toUpperCase() : 'U'}</div>
            <div>
              <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{user.name || user.username}</div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>
                {user.schedule?.timezone || 'Asia/Kolkata'}
              </div>
            </div>
          </div>

          <span className="badge badge-emerald">
            <span style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: '#10b981' }}></span>
            Active
          </span>

          <button className="btn btn-secondary" onClick={handleLogout} style={{ padding: '8px 14px', fontSize: '0.85rem' }}>
            🚪 Logout
          </button>
        </div>
      </header>

      {/* Tabs Navigation */}
      <nav className={styles.tabsContainer}>
        <button
          className={`${styles.tabBtn} ${activeTab === 'studio' ? styles.tabBtnActive : ''}`}
          onClick={() => setActiveTab('studio')}
        >
          🌅 Daily POD Studio
        </button>
        <button
          className={`${styles.tabBtn} ${activeTab === 'analytics' ? styles.tabBtnActive : ''}`}
          onClick={() => setActiveTab('analytics')}
        >
          🧠 Past Data & Analyzer
        </button>
        <button
          className={`${styles.tabBtn} ${activeTab === 'schedules' ? styles.tabBtnActive : ''}`}
          onClick={() => setActiveTab('schedules')}
        >
          ⏰ Daily Timers & Schedule
        </button>
        <button
          className={`${styles.tabBtn} ${activeTab === 'slack_channel' ? styles.tabBtnActive : ''}`}
          onClick={() => setActiveTab('slack_channel')}
        >
          💬 Slack Channel Connection
          {slackWebhook ? (
            <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', backgroundColor: '#10b981', marginLeft: 4 }}></span>
          ) : (
            <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', backgroundColor: '#f59e0b', marginLeft: 4 }}></span>
          )}
        </button>
        <button
          className={`${styles.tabBtn} ${activeTab === 'history' ? styles.tabBtnActive : ''}`}
          onClick={() => setActiveTab('history')}
        >
          📜 Sent History ({historyLogs.length})
        </button>
      </nav>

      {/* Tab 1: Daily POD Studio */}
      {activeTab === 'studio' && (
        <div className={styles.studioGrid}>
          {/* Main POD Creator */}
          <div className="glass-panel animate-fade-in">
            <div className={styles.panelHeader}>
              <div className={styles.panelTitle}>
                {podType === 'OPENING' ? '🌅 Morning Opening POD' : '🌆 Evening Closing (EOD) POD'}
              </div>
              <span className="badge badge-emerald" style={{ fontSize: '0.8rem' }}>
                💬 Slack Format
              </span>
            </div>

            {/* Type Switcher */}
            <div className={styles.typeSelector}>
              <button
                className={`${styles.typeBtn} ${podType === 'OPENING' ? styles.typeBtnActiveSun : ''}`}
                onClick={() => setPodType('OPENING')}
              >
                🌅 Opening POD (Day Start)
              </button>
              <button
                className={`${styles.typeBtn} ${podType === 'CLOSING' ? styles.typeBtnActiveMoon : ''}`}
                onClick={() => setPodType('CLOSING')}
              >
                🌆 Closing POD (EOD Wrap-up)
              </button>
            </div>

            {/* Optional Context */}
            <div className={styles.formGroup}>
              <label className={styles.label}>
                <span>Custom Notes / Today's Blockers (Optional)</span>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                  Analyzer will blend with past sprint patterns
                </span>
              </label>
              <input
                type="text"
                className="glass-input"
                value={customContext}
                onChange={(e) => setCustomContext(e.target.value)}
                placeholder={
                  podType === 'OPENING'
                    ? "e.g. Waiting on API spec from design team, sprint demo at 4 PM"
                    : "e.g. Completed payment gateway PR, rollover remaining bugfix to tomorrow"
                }
              />
            </div>

            {/* POD Content Editor */}
            <div className={styles.formGroup}>
              <div className={styles.label}>
                <span>POD Content (Slack Markdown)</span>
                <button
                  className="btn btn-secondary"
                  style={{ padding: '4px 10px', fontSize: '0.75rem' }}
                  onClick={() => {
                    navigator.clipboard.writeText(podContent);
                    alert('Copied to clipboard!');
                  }}
                  disabled={!podContent}
                >
                  📋 Copy
                </button>
              </div>
              <textarea
                className={`glass-input ${styles.textarea}`}
                value={podContent}
                onChange={(e) => setPodContent(e.target.value)}
                placeholder="Click 'Synthesize from Past Data' below to generate clean Opening/Closing POD for Slack based on your historical sprint logs..."
              />
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', flexWrap: 'wrap', gap: 12, marginTop: 24 }}>
              <button className="btn btn-secondary" onClick={handleGeneratePod} disabled={isGenerating}>
                {isGenerating ? 'Synthesizing...' : '✨ Synthesize from Past Data'}
              </button>
              <button className="btn btn-primary" onClick={handleSendPod} disabled={isSending || !podContent.trim()}>
                {isSending ? 'Sending to Slack...' : '🚀 Send to Slack Now'}
              </button>
            </div>

            {studioStatus.message && (
              <div className={`${styles.statusMessage} ${styles[studioStatus.type]}`}>
                {studioStatus.message}
              </div>
            )}
          </div>

          {/* Quick Schedule & Insights Card */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div className="glass-panel animate-fade-in" style={{ animationDelay: '0.1s' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 14 }}>
                ⏰ Active Slack Automation Schedule
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ padding: 12, background: 'rgba(245, 158, 11, 0.08)', borderRadius: 10, border: '1px solid rgba(245, 158, 11, 0.2)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: 600, fontSize: '0.85rem', color: '#b45309' }}>🌅 Opening POD</span>
                    <span className="badge badge-amber">{openingTime}</span>
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 4 }}>
                    Days: {openingDays.map((d) => dayNames[d]).join(', ') || 'None'}
                  </div>
                </div>

                <div style={{ padding: 12, background: 'rgba(99, 102, 241, 0.08)', borderRadius: 10, border: '1px solid rgba(99, 102, 241, 0.2)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: 600, fontSize: '0.85rem', color: '#4338ca' }}>🌆 Closing POD</span>
                    <span className="badge badge-indigo">{closingTime}</span>
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 4 }}>
                    Days: {closingDays.map((d) => dayNames[d]).join(', ') || 'None'}
                  </div>
                </div>
              </div>
            </div>

            {/* Detected Recurring Patterns */}
            <div className="glass-panel animate-fade-in" style={{ animationDelay: '0.2s' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 12 }}>
                🔍 Recurring Habits Detected
              </h3>
              {insights && insights.recurringTasks && insights.recurringTasks.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {insights.recurringTasks.map((t, idx) => (
                    <div key={idx} style={{ fontSize: '0.82rem', padding: '8px 10px', background: '#f8fafc', borderRadius: 8, border: '1px solid var(--surface-border)' }}>
                      • {t}
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                  Add more past logs to detect recurring sprint patterns.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Past Data & Analyzer */}
      {activeTab === 'analytics' && (
        <div className="animate-fade-in">
          {/* Insights Grid */}
          <div className={styles.statsGrid}>
            <div className={styles.statCard}>
              <span className={styles.statLabel}>Total Work Logs</span>
              <span className={styles.statVal}>{insights?.totalLogs || pastDataList.length}</span>
              <span className="badge badge-indigo" style={{ alignSelf: 'flex-start' }}>Indexed</span>
            </div>
            <div className={styles.statCard}>
              <span className={styles.statLabel}>Avg Tasks / Day</span>
              <span className={styles.statVal}>{insights?.averageTasksPerDay || 0}</span>
              <span className="badge badge-emerald" style={{ alignSelf: 'flex-start' }}>Productivity</span>
            </div>
            <div className={styles.statCard}>
              <span className={styles.statLabel}>Top Category</span>
              <span className={styles.statVal} style={{ fontSize: '1.2rem', paddingTop: 6 }}>
                {insights?.topCategories?.[0]?.name || 'Engineering'}
              </span>
              <span className="badge badge-cyan" style={{ alignSelf: 'flex-start' }}>Focus Domain</span>
            </div>
            <div className={styles.statCard}>
              <span className={styles.statLabel}>Recurring Patterns</span>
              <span className={styles.statVal}>{insights?.recurringTasks?.length || 0}</span>
              <span className="badge badge-amber" style={{ alignSelf: 'flex-start' }}>Active</span>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: 24 }}>
            {/* Add New Past Data Entry */}
            <div className="glass-panel">
              <h3 className={styles.panelTitle}>📝 Add Past Work / Sprint Log</h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: 20 }}>
                Input previous day accomplishments, tickets, or standup updates.
              </p>
              <form onSubmit={handleAddPastLog} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label className={styles.label}>Date</label>
                    <input
                      type="date"
                      className="glass-input"
                      value={newLogDate}
                      onChange={(e) => setNewLogDate(e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <label className={styles.label}>Log Type</label>
                    <select
                      className="glass-input"
                      value={newLogType}
                      onChange={(e: any) => setNewLogType(e.target.value)}
                    >
                      <option value="GENERAL">General Sprint</option>
                      <option value="OPENING">Morning Opening</option>
                      <option value="CLOSING">Evening Closing</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className={styles.label}>Category / Project Domain</label>
                  <input
                    type="text"
                    className="glass-input"
                    value={newLogCategory}
                    onChange={(e) => setNewLogCategory(e.target.value)}
                    placeholder="e.g. Frontend UI, Backend API, Database Optimization"
                  />
                </div>

                <div>
                  <label className={styles.label}>Tasks (One per line)</label>
                  <textarea
                    className={`glass-input ${styles.textarea}`}
                    style={{ minHeight: 120 }}
                    value={newLogTasksText}
                    onChange={(e) => setNewLogTasksText(e.target.value)}
                    placeholder="1. Implemented Slack webhook integration&#10;2. Refactored user authentication&#10;3. Fixed date timezone calculation"
                    required
                  />
                </div>

                <div>
                  <label className={styles.label}>Additional Notes (Optional)</label>
                  <input
                    type="text"
                    className="glass-input"
                    value={newLogNotes}
                    onChange={(e) => setNewLogNotes(e.target.value)}
                    placeholder="e.g. Completed ahead of sprint milestone"
                  />
                </div>

                <button type="submit" className="btn btn-primary" disabled={isAddingLog}>
                  {isAddingLog ? 'Indexing...' : '➕ Add & Index Work Log'}
                </button>

                {pastDataStatus.message && (
                  <div className={`${styles.statusMessage} ${styles[pastDataStatus.type]}`}>
                    {pastDataStatus.message}
                  </div>
                )}
              </form>
            </div>

            {/* List of Past Work Logs */}
            <div className="glass-panel">
              <h3 className={styles.panelTitle}>
                📚 Indexed Work History ({pastDataList.length})
              </h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: 16 }}>
                These records are used by the AI engine to generate accurate, personalized Opening & Closing PODs.
              </p>

              {isLoadingPastData ? (
                <div style={{ textAlign: 'center', padding: 20, color: 'var(--text-muted)' }}>Loading history...</div>
              ) : pastDataList.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 30, color: 'var(--text-muted)' }}>
                  No past data entered yet. Add your first log on the left!
                </div>
              ) : (
                <div className={styles.logList} style={{ maxHeight: 440, overflowY: 'auto' }}>
                  {pastDataList.map((log) => (
                    <div key={log.id} className={styles.logCard}>
                      <div className={styles.logCardHeader}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span className="badge badge-indigo">{log.date}</span>
                          <span className="badge badge-cyan">{log.category || 'General'}</span>
                          <span className="badge badge-amber">{log.type}</span>
                        </div>
                        <button
                          onClick={() => handleDeletePastLog(log.id)}
                          style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--danger)', fontSize: '0.85rem' }}
                          title="Delete Log"
                        >
                          🗑️
                        </button>
                      </div>
                      <ul className={styles.logTasks}>
                        {log.tasks.map((task, tidx) => {
                          const trimmed = task.trim();
                          if (trimmed.startsWith('---')) {
                            return <hr key={tidx} className={styles.logTaskDivider} />;
                          }
                          if (trimmed.startsWith('@')) {
                            return (
                              <li key={tidx} className={styles.logMemberHeader}>
                                {trimmed}
                              </li>
                            );
                          }
                          if (trimmed.startsWith(':p') || trimmed.startsWith(':task')) {
                            return (
                              <li key={tidx} className={styles.logSubTag}>
                                {trimmed}
                              </li>
                            );
                          }
                          if (trimmed.toLowerCase().includes('action item') || trimmed.startsWith(':date:')) {
                            return (
                              <li key={tidx} style={{ fontWeight: 600, color: 'var(--text-dim)', fontSize: '0.82rem' }}>
                                {trimmed}
                              </li>
                            );
                          }
                          return (
                            <li key={tidx} className={styles.logTaskItem}>
                              <span className={styles.logTaskBullet}>•</span>
                              <span>{trimmed}</span>
                            </li>
                          );
                        })}
                      </ul>
                      {log.notes && (
                        <div style={{ marginTop: 8, fontSize: '0.8rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                          Note: {log.notes}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Daily Timers & Schedule */}
      {activeTab === 'schedules' && (
        <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Live Scheduler Pulse Banner */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 12,
            padding: '14px 20px',
            background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.08) 0%, rgba(99, 102, 241, 0.08) 100%)',
            border: '1px solid rgba(16, 185, 129, 0.25)',
            borderRadius: 14
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: '50%', backgroundColor: '#10b981', boxShadow: '0 0 10px #10b981' }}></span>
              <span style={{ fontWeight: 700, fontSize: '0.92rem', color: '#065f46' }}>
                In-App Auto-Scheduler Active
              </span>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                (Automatically checking every 20s while app is open)
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{ fontSize: '0.88rem', fontWeight: 600, color: '#3730a3', background: '#ffffff', padding: '6px 12px', borderRadius: 8, border: '1px solid #e2e8f0' }}>
                🕒 Current Time: {currentTimeDisplay || 'Loading...'}
              </div>

              <button
                className="btn btn-secondary"
                style={{ padding: '6px 12px', fontSize: '0.8rem' }}
                disabled={isManualCheckingCron}
                onClick={async () => {
                  setIsManualCheckingCron(true);
                  try {
                    const res = await fetch('/api/cron/trigger');
                    const data = await res.json();
                    if (data.triggered && data.triggered.length > 0) {
                      setSettingsStatus({
                        type: 'success',
                        message: `🚀 Dispatched ${data.triggered[0].type} POD to Slack at scheduled time ${data.triggered[0].time}!`,
                      });
                      fetchHistory();
                    } else {
                      const userStat = data.scheduleStatus?.[0];
                      setSettingsStatus({
                        type: 'info',
                        message: `ℹ️ Schedule checked! Current time (${userStat?.currentTime || currentTimeDisplay}) does not match Opening (${userStat?.opening?.scheduledTime}) or Closing (${userStat?.closing?.scheduledTime}) yet.`,
                      });
                    }
                  } catch (e) {
                    setSettingsStatus({ type: 'error', message: 'Failed to run schedule check.' });
                  } finally {
                    setIsManualCheckingCron(false);
                  }
                }}
              >
                {isManualCheckingCron ? 'Checking...' : '⚡ Check Schedules Now'}
              </button>
            </div>
          </div>

          {autoScheduleNotice && (
            <div className={`${styles.statusMessage} ${styles.success}`} style={{ margin: 0 }}>
              {autoScheduleNotice}
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
            {/* Left Column: Automated Timers */}
            <div className="glass-panel">
              <h3 className={styles.panelTitle}>⏰ Daily Slack Dispatch Timers</h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: 20 }}>
                Set exact times when Opening and Closing PODs should be automatically generated and sent to your connected Slack channel.
              </p>

              {/* Opening Schedule */}
              <div style={{ padding: 16, background: 'rgba(245, 158, 11, 0.05)', border: '1px solid rgba(245, 158, 11, 0.2)', borderRadius: 14, marginBottom: 20 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <span style={{ fontWeight: 700, fontSize: '1rem', color: '#b45309' }}>🌅 Opening POD Schedule</span>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={openingEnabled}
                      onChange={(e) => setOpeningEnabled(e.target.checked)}
                    />
                    <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>Enabled</span>
                  </label>
                </div>

                <div style={{ marginBottom: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <label className={styles.label} style={{ margin: 0 }}>Daily Dispatch Time</label>
                    <span className="badge badge-amber" style={{ fontSize: '0.78rem' }}>
                      {formatTimeLabel(openingTime)}
                    </span>
                  </div>
                  <input
                    type="time"
                    className="glass-input"
                    value={openingTime}
                    onChange={(e) => setOpeningTime(e.target.value)}
                  />
                </div>

                {/* Quick Presets for Opening */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    style={{ padding: '4px 10px', fontSize: '0.74rem', background: '#fef3c7', color: '#92400e', borderColor: '#fcd34d', fontWeight: 600 }}
                    onClick={() => setQuickTestTimer('opening', 2)}
                    title="Automatically sets Opening schedule to 2 minutes from now and saves"
                  >
                    ⚡ Quick Test (+2 Mins)
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    style={{ padding: '4px 8px', fontSize: '0.74rem' }}
                    onClick={() => setOpeningTime('09:30')}
                  >
                    🌅 09:30 AM
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    style={{ padding: '4px 8px', fontSize: '0.74rem' }}
                    onClick={() => setOpeningTime('10:00')}
                  >
                    🌅 10:00 AM
                  </button>
                </div>

                <div>
                  <label className={styles.label}>Active Days</label>
                  <div className={styles.daysGroup}>
                    {dayNames.map((dName, idx) => (
                      <button
                        key={idx}
                        type="button"
                        className={`${styles.dayBtn} ${openingDays.includes(idx) ? styles.dayBtnActive : ''}`}
                        onClick={() => toggleDay(idx, openingDays, setOpeningDays)}
                      >
                        {dName}
                      </button>
                    ))}
                    <button
                      type="button"
                      className="btn btn-secondary"
                      style={{ padding: '4px 8px', fontSize: '0.75rem' }}
                      onClick={() => setOpeningDays([1, 2, 3, 4, 5])}
                    >
                      Mon-Fri
                    </button>
                  </div>
                </div>
              </div>

              {/* Closing Schedule */}
              <div style={{ padding: 16, background: 'rgba(99, 102, 241, 0.05)', border: '1px solid rgba(99, 102, 241, 0.2)', borderRadius: 14, marginBottom: 20 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <span style={{ fontWeight: 700, fontSize: '1rem', color: '#4338ca' }}>🌆 Closing (EOD) Schedule</span>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={closingEnabled}
                      onChange={(e) => setClosingEnabled(e.target.checked)}
                    />
                    <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>Enabled</span>
                  </label>
                </div>

                <div style={{ marginBottom: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <label className={styles.label} style={{ margin: 0 }}>Daily Dispatch Time</label>
                    <span className="badge badge-indigo" style={{ fontSize: '0.78rem' }}>
                      {formatTimeLabel(closingTime)}
                    </span>
                  </div>
                  <input
                    type="time"
                    className="glass-input"
                    value={closingTime}
                    onChange={(e) => setClosingTime(e.target.value)}
                  />
                </div>

                {/* Quick Presets for Closing */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    style={{ padding: '4px 10px', fontSize: '0.74rem', background: '#e0e7ff', color: '#3730a3', borderColor: '#c7d2fe', fontWeight: 600 }}
                    onClick={() => setQuickTestTimer('closing', 2)}
                    title="Automatically sets Closing schedule to 2 minutes from now and saves"
                  >
                    ⚡ Quick Test (+2 Mins)
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    style={{ padding: '4px 8px', fontSize: '0.74rem' }}
                    onClick={() => setClosingTime('18:30')}
                  >
                    🌆 06:30 PM
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    style={{ padding: '4px 8px', fontSize: '0.74rem' }}
                    onClick={() => setClosingTime('19:00')}
                  >
                    🌆 07:00 PM
                  </button>
                </div>

                <div>
                  <label className={styles.label}>Active Days</label>
                  <div className={styles.daysGroup}>
                    {dayNames.map((dName, idx) => (
                      <button
                        key={idx}
                        type="button"
                        className={`${styles.dayBtn} ${closingDays.includes(idx) ? styles.dayBtnActive : ''}`}
                        onClick={() => toggleDay(idx, closingDays, setClosingDays)}
                      >
                        {dName}
                      </button>
                    ))}
                    <button
                      type="button"
                      className="btn btn-secondary"
                      style={{ padding: '4px 8px', fontSize: '0.75rem' }}
                      onClick={() => setClosingDays([1, 2, 3, 4, 5])}
                    >
                      Mon-Fri
                    </button>
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 16 }}>
                <button className="btn btn-primary" style={{ width: '100%', padding: '12px' }} onClick={handleSaveSettings} disabled={isSavingSettings}>
                  {isSavingSettings ? 'Saving...' : '💾 Save Dispatch Timers'}
                </button>

                {/* Instant Live Slack Trigger Section */}
                <div style={{ padding: 14, background: '#f8fafc', border: '1px dashed #cbd5e1', borderRadius: 12, marginTop: 6 }}>
                  <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: 8 }}>
                    ⚡ Instant Live Test (Direct Slack Dispatch)
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      style={{ padding: '8px 10px', fontSize: '0.78rem', background: '#fef3c7', color: '#92400e', borderColor: '#fcd34d', fontWeight: 600 }}
                      onClick={() => handleForceTrigger('OPENING')}
                      disabled={isManualCheckingCron}
                    >
                      🚀 Send Opening POD Now
                    </button>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      style={{ padding: '8px 10px', fontSize: '0.78rem', background: '#e0e7ff', color: '#3730a3', borderColor: '#c7d2fe', fontWeight: 600 }}
                      onClick={() => handleForceTrigger('CLOSING')}
                      disabled={isManualCheckingCron}
                    >
                      🚀 Send Closing POD Now
                    </button>
                  </div>
                </div>
              </div>

              {settingsStatus.message && (
                <div className={`${styles.statusMessage} ${styles[settingsStatus.type]}`} style={{ marginTop: 14 }}>
                  {settingsStatus.message}
                </div>
              )}
            </div>

            {/* Right Column: Connected Channel Summary & Fast Switch */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div className="glass-panel">
                <h3 className={styles.panelTitle}>📡 Target Destination Channel</h3>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: 16 }}>
                  All scheduled dispatches are automatically delivered to your connected Slack Webhook.
                </p>

                <div style={{ padding: 16, background: '#f8fafc', border: '1px solid var(--surface-border)', borderRadius: 12, marginBottom: 16 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <span style={{ fontWeight: 700, fontSize: '0.9rem', color: '#0f172a' }}>💬 Slack Integration</span>
                    {slackWebhook ? (
                      <span className="badge badge-emerald">🟢 Active & Connected</span>
                    ) : (
                      <span className="badge badge-amber">🟡 Simulated (No Link)</span>
                    )}
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', wordBreak: 'break-all' }}>
                    {slackWebhook ? `${slackWebhook.slice(0, 42)}...` : 'No live Slack Webhook configured yet.'}
                  </div>
                </div>

                <button
                  className="btn btn-secondary"
                  style={{ width: '100%', padding: '10px' }}
                  onClick={() => setActiveTab('slack_channel')}
                >
                  ⚙️ Setup / Change Slack Channel Link ➡️
                </button>
              </div>

              <div className="glass-panel">
                <h3 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: 8 }}>
                  🤖 Dual Auto-Dispatcher Modes
                </h3>
                <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', lineHeight: 1.6, display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <div>
                    <strong style={{ color: '#065f46' }}>1. In-App Browser Scheduler:</strong> Tab open rehne par app har 20 second me auto-check karti hai aur time aate hi Slack pe POD bhej deti hai.
                  </div>
                  <div>
                    <strong style={{ color: '#1e3a8a' }}>2. 24/7 Background Daemon:</strong> Agar browser band bhi ho, to aap <code>run-scheduler.bat</code> double-click karke background me daemon chalu rakh sakte hain!
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 4: Slack Channel Connection & Step-by-Step Guide */}
      {activeTab === 'slack_channel' && (
        <div className="animate-fade-in" style={{ display: 'grid', gridTemplateColumns: '1fr 1.15fr', gap: 24 }}>
          {/* Left Column: Connection Manager */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div className="glass-panel">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <h3 className={styles.panelTitle}>💬 Active Slack Channel</h3>
                {slackWebhook ? (
                  <span className="badge badge-emerald">🟢 Connected</span>
                ) : (
                  <span className="badge badge-amber">🟡 Simulated (No Link)</span>
                )}
              </div>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: 20 }}>
                Paste your Slack Incoming Webhook link below. All automated Morning Opening and Evening Closing PODs will always be posted directly to this channel.
              </p>

              {/* Webhook Input Field with Show/Hide and Paste */}
              <div className={styles.formGroup}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <label className={styles.label} style={{ margin: 0 }}>Slack Webhook URL</label>
                  <button
                    type="button"
                    onClick={() => setShowWebhookUrl(!showWebhookUrl)}
                    style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 600 }}
                  >
                    {showWebhookUrl ? '🙈 Hide URL' : '👁️ Show URL'}
                  </button>
                </div>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showWebhookUrl ? 'text' : 'password'}
                    className="glass-input"
                    style={{ paddingRight: 40 }}
                    value={slackWebhook}
                    onChange={(e) => setSlackWebhook(e.target.value)}
                    placeholder="https://hooks.slack.com/services/T0000/B0000/XXXXX"
                  />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                    Starts with <code>https://hooks.slack.com/services/</code>
                  </span>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    style={{ padding: '3px 8px', fontSize: '0.72rem' }}
                    onClick={async () => {
                      try {
                        const clip = await navigator.clipboard.readText();
                        if (clip) setSlackWebhook(clip.trim());
                      } catch (e) {
                        alert('Please paste manually using Ctrl+V');
                      }
                    }}
                  >
                    📋 Paste Clipboard
                  </button>
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 20 }}>
                <button
                  className="btn btn-primary"
                  style={{ width: '100%', padding: '12px' }}
                  onClick={handleSaveSlackOnly}
                  disabled={isSavingSlackOnly}
                >
                  {isSavingSlackOnly ? 'Saving...' : '💾 Save & Connect Channel'}
                </button>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <button
                    className="btn btn-secondary"
                    onClick={handleTestSlack}
                    disabled={isTestingSlack}
                  >
                    {isTestingSlack ? 'Sending...' : '🔔 Send Test Ping'}
                  </button>
                  <button
                    className="btn btn-danger"
                    onClick={handleClearSlackWebhook}
                    disabled={!slackWebhook}
                    style={{ padding: '8px 12px' }}
                  >
                    🗑️ Disconnect
                  </button>
                </div>
              </div>

              {slackSaveStatus.message && (
                <div className={`${styles.statusMessage} ${styles[slackSaveStatus.type]}`}>
                  {slackSaveStatus.message}
                </div>
              )}
              {settingsStatus.message && (
                <div className={`${styles.statusMessage} ${styles[settingsStatus.type]}`}>
                  {settingsStatus.message}
                </div>
              )}
            </div>

            {/* Quick Tips */}
            <div className="glass-panel" style={{ padding: 18 }}>
              <h4 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: 8, color: '#0f172a' }}>
                🔄 How to Change or Switch Channel?
              </h4>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                Agar aapko kisi dusre channel me message bhejna hai, to simply naya webhook link yaha paste karein aur <strong>"Save & Connect Channel"</strong> button dabayein. Old link automatically update ho jayega!
              </p>
            </div>
          </div>

          {/* Right Column: Step-by-Step Visual Guide */}
          <div className="glass-panel">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 className={styles.panelTitle}>📖 Step-by-Step Guide: Slack Webhook Kaise Le?</h3>
              <span className="badge badge-indigo">5 Easy Steps</span>
            </div>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: 16 }}>
              Follow these simple steps to generate a Slack Incoming Webhook URL in under 2 minutes:
            </p>

            <div className={styles.guideStepsList}>
              {/* Step 1 */}
              <div className={styles.stepCard}>
                <div className={styles.stepNumber}>1</div>
                <div className={styles.stepContent}>
                  <div className={styles.stepTitle}>
                    <span>🌐 Open Slack Apps Directory</span>
                  </div>
                  <div className={styles.stepDesc}>
                    Slack Developer Console me jayein aur "Create New App" par click karein:
                  </div>
                  <div style={{ marginTop: 8 }}>
                    <a
                      href="https://api.slack.com/apps"
                      target="_blank"
                      rel="noopener noreferrer"
                      className={styles.stepLink}
                    >
                      🔗 Open api.slack.com/apps ↗
                    </a>
                  </div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-dim)', marginTop: 4 }}>
                    Select <strong>"From scratch"</strong> ➡️ Enter App Name (e.g. <code>POD Automation</code>) ➡️ Pick your Workspace.
                  </div>
                </div>
              </div>

              {/* Step 2 */}
              <div className={styles.stepCard}>
                <div className={styles.stepNumber}>2</div>
                <div className={styles.stepContent}>
                  <div className={styles.stepTitle}>
                    <span>⚡ Activate Incoming Webhooks</span>
                  </div>
                  <div className={styles.stepDesc}>
                    Left sidebar menu me <strong>"Incoming Webhooks"</strong> par click karein aur toggle switch ko <strong>ON</strong> karein.
                  </div>
                </div>
              </div>

              {/* Step 3 */}
              <div className={styles.stepCard}>
                <div className={styles.stepNumber}>3</div>
                <div className={styles.stepContent}>
                  <div className={styles.stepTitle}>
                    <span>📌 Choose Your Target Channel</span>
                  </div>
                  <div className={styles.stepDesc}>
                    Page ke bottom me scroll karke <strong>"Add New Webhook to Workspace"</strong> button par click karein aur apna destination channel select karein (e.g. <code>#standup</code>, <code>#daily-pod</code>, ya <code>#general</code>).
                  </div>
                </div>
              </div>

              {/* Step 4 */}
              <div className={styles.stepCard}>
                <div className={styles.stepNumber}>4</div>
                <div className={styles.stepContent}>
                  <div className={styles.stepTitle}>
                    <span>📋 Copy the Webhook Link</span>
                  </div>
                  <div className={styles.stepDesc}>
                    Aapka Webhook URL generate ho jayega. Click <strong>"Copy"</strong> button.
                  </div>
                  <div className={styles.quickCodeBox}>
                    <span>https://hooks.slack.com/services/T000/B000/XXXX</span>
                  </div>
                </div>
              </div>

              {/* Step 5 */}
              <div className={styles.stepCard}>
                <div className={styles.stepNumber}>5</div>
                <div className={styles.stepContent}>
                  <div className={styles.stepTitle}>
                    <span>🚀 Paste, Save & Test Ping!</span>
                  </div>
                  <div className={styles.stepDesc}>
                    Us URL ko left side wale box me paste karein aur <strong>"Save & Connect Channel"</strong> dabayein. Phir <strong>"Send Test Ping"</strong> karke check karein!
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 5: Delivery History */}
      {activeTab === 'history' && (
        <div className="glass-panel animate-fade-in">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <h3 className={styles.panelTitle}>📜 Dispatched Message Audit Trail</h3>
            <button className="btn btn-secondary" onClick={fetchHistory} disabled={isLoadingHistory}>
              {isLoadingHistory ? 'Refreshing...' : '🔄 Refresh Logs'}
            </button>
          </div>

          {historyLogs.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>
              No messages dispatched yet. Use the Daily POD Studio to send your first Opening or Closing POD to Slack!
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className={styles.historyTable}>
                <thead>
                  <tr>
                    <th>Timestamp</th>
                    <th>Type</th>
                    <th>Destination Channel</th>
                    <th>Status</th>
                    <th>Content Preview</th>
                  </tr>
                </thead>
                <tbody>
                  {historyLogs.map((item) => (
                    <tr key={item.id}>
                      <td style={{ whiteSpace: 'nowrap', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                        {new Date(item.timestamp).toLocaleString()}
                      </td>
                      <td>
                        <span className={`badge ${item.type === 'OPENING' ? 'badge-amber' : 'badge-indigo'}`}>
                          {item.type === 'OPENING' ? '🌅 Opening' : '🌆 Closing'}
                        </span>
                      </td>
                      <td>
                        <span className="badge badge-emerald">💬 SLACK</span>
                      </td>
                      <td>
                        <span
                          className={`badge ${
                            item.status === 'SUCCESS'
                              ? 'badge-emerald'
                              : item.status === 'SIMULATED'
                              ? 'badge-amber'
                              : 'badge-rose'
                          }`}
                        >
                          {item.status}
                        </span>
                      </td>
                      <td>
                        <div style={{ maxWidth: 350, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '0.85rem' }}>
                          {item.content.split('\n')[0]}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </main>
  );
}
