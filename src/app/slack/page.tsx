"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import styles from '../page.module.css';

interface UserProfile {
  id: string;
  username: string;
  name: string;
  email: string;
  channels: {
    slack?: { enabled: boolean; webhookUrl: string };
  };
}



export default function SlackSetupPage() {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);

  const [slackWebhook, setSlackWebhook] = useState('');
  const [showWebhookUrl, setShowWebhookUrl] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [status, setStatus] = useState({ type: '', message: '' });

  useEffect(() => {
    const savedToken = localStorage.getItem('pod_auth_token');
    if (savedToken) {
      setToken(savedToken);
      fetchProfile(savedToken);
    } else {
      setIsAuthLoading(false);
    }
  }, []);

  const fetchProfile = async (authToken: string) => {
    try {
      const res = await fetch('/api/auth', {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
        if (data.user.channels?.slack?.webhookUrl) {
          setSlackWebhook(data.user.channels.slack.webhookUrl);
        }
      }
    } catch (err) {
      console.error('Session check failed:', err);
    } finally {
      setIsAuthLoading(false);
    }
  };

  const handleSaveSlack = async () => {
    if (!token) return;
    setIsSaving(true);
    setStatus({ type: '', message: '' });

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
        setStatus({
          type: 'success',
          message: slackWebhook.trim()
            ? '🎉 Slack Channel Webhook connected & saved as default destination!'
            : 'ℹ️ Slack Webhook cleared. PODs will run in simulation mode.',
        });
      } else {
        setStatus({ type: 'error', message: data.error || 'Failed to save Slack webhook.' });
      }
    } catch (err) {
      setStatus({ type: 'error', message: 'Network error occurred while saving.' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleTestPing = async () => {
    if (!token) return;
    setIsTesting(true);
    setStatus({ type: '', message: '' });

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
        setStatus({
          type: 'success',
          message: data.simulated
            ? '⚠️ Slack Connection Simulated (No live URL provided)'
            : '✅ Slack Test Ping Delivered to your Channel Successfully!',
        });
      } else {
        setStatus({
          type: 'error',
          message: `❌ Slack Test Failed: ${data.error || 'Unknown error'}`,
        });
      }
    } catch (err) {
      setStatus({ type: 'error', message: 'Network error occurred while testing.' });
    } finally {
      setIsTesting(false);
    }
  };

  const handleClearWebhook = async () => {
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
        setStatus({
          type: 'info',
          message: '🗑️ Slack Webhook disconnected. You can connect a new one anytime.',
        });
      }
    } catch (err) {
      console.error('Failed to clear webhook:', err);
    }
  };

  if (isAuthLoading) {
    return (
      <main className={styles.container} style={{ alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <div className={styles.logoIcon} style={{ margin: '0 auto 16px', width: 56, height: 56, fontSize: '2rem' }}>
            💬
          </div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 600 }}>Loading Slack Integration...</h2>
        </div>
      </main>
    );
  }

  if (!token || !user) {
    return (
      <main className={styles.container}>
        <div style={{ maxWidth: 520, margin: '60px auto', textAlign: 'center' }} className="glass-panel">
          <div className={styles.logoIcon} style={{ margin: '0 auto 16px', width: 56, height: 56, fontSize: '2rem' }}>
            💬
          </div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: 12 }}>Slack Channel Setup</h2>
          <p style={{ color: 'var(--text-muted)', marginBottom: 24, fontSize: '0.95rem' }}>
            Please login to your POD Automation account to configure and manage your Slack channel webhook.
          </p>
          <Link href="/" className="btn btn-primary" style={{ display: 'inline-block', padding: '12px 24px' }}>
            🔐 Go to Login Page
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className={styles.container}>

      {/* Top Header */}
      <header className={styles.header}>
        <div className={styles.headerBrand}>
          <div className={styles.logoIcon}>💬</div>
          <div>
            <h1 className={styles.title}>
              <span className="text-gradient">Slack</span> Channel Setup
            </h1>
            <p className={styles.subtitle}>Direct Webhook Integration & Setup Guide</p>
          </div>
        </div>

        <div className={styles.headerActions}>
          <div className={styles.userBadge}>
            <div className={styles.avatar}>{user.name ? user.name[0].toUpperCase() : 'U'}</div>
            <div>
              <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{user.name || user.username}</div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>
                {slackWebhook ? '🟢 Slack Connected' : '🟡 Not Connected'}
              </div>
            </div>
          </div>

          <Link href="/" className="btn btn-secondary" style={{ padding: '8px 14px', fontSize: '0.85rem' }}>
            ⬅️ Back to Main Dashboard
          </Link>
        </div>
      </header>

      {/* Main Grid */}
      <div className="animate-fade-in" style={{ display: 'grid', gridTemplateColumns: '1fr 1.15fr', gap: 24, marginTop: 24 }}>
        {/* Left: Active Webhook Management */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div className="glass-panel">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <h3 className={styles.panelTitle}>💬 Active Slack Webhook</h3>
              {slackWebhook ? (
                <span className="badge badge-emerald">🟢 Connected & Ready</span>
              ) : (
                <span className="badge badge-amber">🟡 Simulated (No Link)</span>
              )}
            </div>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: 20 }}>
              Paste your Slack Incoming Webhook URL below. All your daily scheduled Opening and Closing PODs will automatically be dispatched directly to this channel.
            </p>

            {/* Input Box */}
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

              <input
                type={showWebhookUrl ? 'text' : 'password'}
                className="glass-input"
                value={slackWebhook}
                onChange={(e) => setSlackWebhook(e.target.value)}
                placeholder="https://hooks.slack.com/services/T0000/B0000/XXXXX"
              />

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

            {/* Actions */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 20 }}>
              <button
                className="btn btn-primary"
                style={{ width: '100%', padding: '12px' }}
                onClick={handleSaveSlack}
                disabled={isSaving}
              >
                {isSaving ? 'Saving...' : '💾 Save & Connect Channel'}
              </button>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <button
                  className="btn btn-secondary"
                  onClick={handleTestPing}
                  disabled={isTesting}
                >
                  {isTesting ? 'Sending...' : '🔔 Send Test Ping'}
                </button>
                <button
                  className="btn btn-danger"
                  onClick={handleClearWebhook}
                  disabled={!slackWebhook}
                  style={{ padding: '8px 12px' }}
                >
                  🗑️ Disconnect
                </button>
              </div>
            </div>

            {status.message && (
              <div className={`${styles.statusMessage} ${styles[status.type]}`}>
                {status.message}
              </div>
            )}
          </div>

          {/* Tips Card */}
          <div className="glass-panel" style={{ padding: 18 }}>
            <h4 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: 8, color: '#0f172a' }}>
              🔄 Channel Change Kaise Karein?
            </h4>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
              Agar aapko apna Slack channel change karna hai, to simply naya webhook URL yaha paste karein aur <strong>"Save & Connect Channel"</strong> click karein. Aage ke saare Opening & Closing updates naye channel me aane lagenge!
            </p>
          </div>
        </div>

        {/* Right: Step-by-Step Guide */}
        <div className="glass-panel">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 className={styles.panelTitle}>📖 Step-by-Step Guide: Slack Webhook Link Kaise Le?</h3>
            <span className="badge badge-indigo">5 Easy Steps</span>
          </div>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: 16 }}>
            Apne Slack Workspace me 2 minute ke andar webhook generate karne ke liye ye steps follow karein:
          </p>

          <div className={styles.guideStepsList}>
            {/* Step 1 */}
            <div className={styles.stepCard}>
              <div className={styles.stepNumber}>1</div>
              <div className={styles.stepContent}>
                <div className={styles.stepTitle}>
                  <span>🌐 Slack Apps Console Open Karein</span>
                </div>
                <div className={styles.stepDesc}>
                  Slack Developer Console me jayein aur <strong>"Create New App"</strong> par click karein:
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
                  <span>⚡ Incoming Webhooks Activate Karein</span>
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
                  <span>📌 Target Slack Channel Select Karein</span>
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
                  <span>📋 Webhook URL Copy Karein</span>
                </div>
                <div className={styles.stepDesc}>
                  Generate hue Webhook URL ke aage <strong>"Copy"</strong> button dabayein:
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
                  <span>🚀 Link Paste & Save Karein!</span>
                </div>
                <div className={styles.stepDesc}>
                  Us URL ko left side wale box me paste karein aur <strong>"Save & Connect Channel"</strong> dabayein. Phir <strong>"Send Test Ping"</strong> karke check karein!
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
