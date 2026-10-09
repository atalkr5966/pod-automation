"use client";

import React, { useState, useEffect } from 'react';
import {
  SlackIcon,
  CheckCircleIcon,
  AlertTriangleIcon,
  PlayIcon,
  RefreshCwIcon,
} from '@/components/ui/Icons';

export function SlackSettingsCard() {
  const [webhookUrl, setWebhookUrl] = useState('');
  const [botToken, setBotToken] = useState('');
  const [defaultChannel, setDefaultChannel] = useState('#general');
  const [teamName, setTeamName] = useState('NPCI PSO Team');

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [slackData, setSlackData] = useState<{
    connected: boolean;
    status: string;
    teamName: string;
    defaultChannel: string;
    maskedWebhookUrl: string;
    hasBotToken: boolean;
    lastTestedAt?: string;
    lastDeliveryAt?: string;
  } | null>(null);

  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const fetchSlackStatus = async () => {
    try {
      const res = await fetch('/api/slack');
      if (res.ok) {
        const data = await res.json();
        setSlackData(data);
        if (data.defaultChannel) setDefaultChannel(data.defaultChannel);
        if (data.teamName) setTeamName(data.teamName);
      }
    } catch {
      // ignore
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    let ignore = false;
    fetch('/api/slack')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!ignore && data) {
          setSlackData(data);
          if (data.defaultChannel) setDefaultChannel(data.defaultChannel);
          if (data.teamName) setTeamName(data.teamName);
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
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setFeedback(null);

    try {
      const res = await fetch('/api/slack', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          webhookUrl,
          botAccessToken: botToken,
          defaultChannel,
          slackTeamName: teamName,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setFeedback({ type: 'success', message: 'Slack settings saved & connected successfully!' });
        setWebhookUrl('');
        setBotToken('');
        fetchSlackStatus();
      } else {
        setFeedback({ type: 'error', message: data.error || 'Failed to save Slack settings.' });
      }
    } catch {
      setFeedback({ type: 'error', message: 'Network error saving Slack settings.' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleTestPing = async () => {
    setIsTesting(true);
    setFeedback(null);
    try {
      const res = await fetch('/api/slack/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'ping', channel: defaultChannel }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setFeedback({
          type: 'success',
          message: data.simulated
            ? 'Test Ping simulated! (Configure live Webhook or Bot Token to post directly into Slack).'
            : `Test Ping delivered to ${data.channel} successfully!`,
        });
        fetchSlackStatus();
      } else {
        setFeedback({ type: 'error', message: data.error || 'Failed to deliver test ping.' });
      }
    } catch {
      setFeedback({ type: 'error', message: 'Network error sending test ping.' });
    } finally {
      setIsTesting(false);
    }
  };

  const handleTestOpening = async () => {
    setIsTesting(true);
    setFeedback(null);
    try {
      const res = await fetch('/api/slack/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'test-opening', channel: defaultChannel }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setFeedback({
          type: 'success',
          message: `Live Opening POD dispatched to ${data.channel}! Check Slack or Activity Logs.`,
        });
        fetchSlackStatus();
      } else {
        setFeedback({ type: 'error', message: data.error || 'Opening dispatch test failed.' });
      }
    } catch {
      setFeedback({ type: 'error', message: 'Network error dispatching Opening POD.' });
    } finally {
      setIsTesting(false);
    }
  };

  const handleTestClosing = async () => {
    setIsTesting(true);
    setFeedback(null);
    try {
      const res = await fetch('/api/slack/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'test-closing', channel: defaultChannel }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setFeedback({
          type: 'success',
          message: `Live Closing POD dispatched to ${data.channel}! Check Slack or Activity Logs.`,
        });
        fetchSlackStatus();
      } else {
        setFeedback({ type: 'error', message: data.error || 'Closing dispatch test failed.' });
      }
    } catch {
      setFeedback({ type: 'error', message: 'Network error dispatching Closing POD.' });
    } finally {
      setIsTesting(false);
    }
  };

  const handleDisconnect = async () => {
    if (!confirm('Are you sure you want to disconnect this Slack workspace?')) return;
    try {
      await fetch('/api/slack', { method: 'DELETE' });
      setFeedback({ type: 'success', message: 'Slack workspace disconnected.' });
      fetchSlackStatus();
    } catch {
      // ignore
    }
  };

  if (isLoading) {
    return (
      <div className="royal-glass" style={{ padding: 32, textAlign: 'center' }}>
        <p style={{ color: '#94a3b8' }}>Loading Slack connection state...</p>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 760, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Overview status card */}
      <div
        className="royal-glass-elevated"
        style={{
          padding: '24px 28px',
          background: 'rgba(12, 19, 38, 0.92)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 10,
                background: 'rgba(79, 70, 229, 0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#818cf8',
                border: '1px solid rgba(99, 102, 241, 0.35)',
              }}
            >
              <SlackIcon className="w-6 h-6" />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#f8fafc' }}>
                  {slackData?.teamName || 'Slack Workspace'}
                </h3>
                <span className={`royal-badge ${slackData?.connected ? 'success' : 'neutral'}`}>
                  {slackData?.connected ? 'Connected' : 'Not Connected'}
                </span>
              </div>
              <p style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: 3 }}>
                Channel: <strong style={{ color: '#cbd5e1' }}>{slackData?.defaultChannel || '#general'}</strong> · Webhook:{' '}
                <strong style={{ color: '#94a3b8' }}>{slackData?.maskedWebhookUrl || 'None'}</strong>
              </p>
            </div>
          </div>

          {slackData?.connected && (
            <button
              onClick={handleDisconnect}
              style={{
                padding: '7px 14px',
                borderRadius: 6,
                background: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.25)',
                color: '#f87171',
                fontSize: '0.8rem',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Disconnect
            </button>
          )}
        </div>

        {/* Last Delivery Status */}
        {slackData?.lastDeliveryAt && (
          <div
            style={{
              marginTop: 18,
              padding: '10px 14px',
              borderRadius: 6,
              background: 'rgba(16, 185, 129, 0.08)',
              border: '1px solid rgba(16, 185, 129, 0.2)',
              fontSize: '0.785rem',
              color: '#34d399',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <CheckCircleIcon className="w-4 h-4" />
            <span>Last successful delivery dispatched at {new Date(slackData.lastDeliveryAt).toLocaleString()}</span>
          </div>
        )}
      </div>

      {/* Test Buttons Row */}
      <div
        className="royal-glass"
        style={{
          padding: '20px 24px',
          background: 'rgba(10, 16, 32, 0.85)',
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
        }}
      >
        <div style={{ fontSize: '0.875rem', fontWeight: 700, color: '#f8fafc' }}>
          Verification &amp; Test Dispatches
        </div>
        <p style={{ fontSize: '0.785rem', color: '#94a3b8' }}>
          Trigger immediate test deliveries to verify your Slack webhook or bot token connection without waiting for scheduled times.
        </p>

        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 4 }}>
          <button
            disabled={isTesting}
            onClick={handleTestPing}
            style={{
              padding: '9px 16px',
              borderRadius: 6,
              background: 'rgba(255, 255, 255, 0.07)',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              color: '#f8fafc',
              fontSize: '0.825rem',
              fontWeight: 600,
              cursor: isTesting ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <RefreshCwIcon className="w-4 h-4" />
            <span>Test Connection Ping</span>
          </button>

          <button
            disabled={isTesting}
            onClick={handleTestOpening}
            style={{
              padding: '9px 16px',
              borderRadius: 6,
              background: 'rgba(245, 158, 11, 0.15)',
              border: '1px solid rgba(245, 158, 11, 0.3)',
              color: '#fbbf24',
              fontSize: '0.825rem',
              fontWeight: 600,
              cursor: isTesting ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <PlayIcon className="w-4 h-4" />
            <span>Send Test Opening</span>
          </button>

          <button
            disabled={isTesting}
            onClick={handleTestClosing}
            style={{
              padding: '9px 16px',
              borderRadius: 6,
              background: 'rgba(99, 102, 241, 0.15)',
              border: '1px solid rgba(99, 102, 241, 0.3)',
              color: '#818cf8',
              fontSize: '0.825rem',
              fontWeight: 600,
              cursor: isTesting ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <PlayIcon className="w-4 h-4" />
            <span>Send Test Closing</span>
          </button>
        </div>
      </div>

      {/* Feedback banner */}
      {feedback && (
        <div
          style={{
            padding: '12px 16px',
            borderRadius: 8,
            background: feedback.type === 'success' ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)',
            border: feedback.type === 'success' ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid rgba(239, 68, 68, 0.3)',
            color: feedback.type === 'success' ? '#34d399' : '#fca5a5',
            fontSize: '0.85rem',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
          }}
        >
          {feedback.type === 'success' ? <CheckCircleIcon className="w-5 h-5" /> : <AlertTriangleIcon className="w-5 h-5" />}
          <span>{feedback.message}</span>
        </div>
      )}

      {/* Update Credentials Form */}
      <form
        onSubmit={handleSave}
        className="royal-glass"
        style={{
          padding: '24px 28px',
          background: 'rgba(12, 19, 38, 0.9)',
          display: 'flex',
          flexDirection: 'column',
          gap: 18,
        }}
      >
        <div>
          <h4 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#f8fafc' }}>
            Update Slack Connection Credentials
          </h4>
          <p style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: 2 }}>
            Credentials are strictly stored server-side and never exposed to the client bundle.
          </p>
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#cbd5e1', marginBottom: 6 }}>
            Slack Incoming Webhook URL
          </label>
          <input
            type="url"
            value={webhookUrl}
            onChange={(e) => setWebhookUrl(e.target.value)}
            placeholder="https://hooks.slack.com/services/T00/B00/..."
            style={{
              width: '100%',
              padding: '10px 14px',
              borderRadius: 8,
              background: 'rgba(8, 14, 28, 0.85)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              color: '#f8fafc',
              fontSize: '0.9rem',
              outline: 'none',
            }}
          />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#cbd5e1', marginBottom: 6 }}>
              Default Channel
            </label>
            <input
              type="text"
              value={defaultChannel}
              onChange={(e) => setDefaultChannel(e.target.value)}
              placeholder="#general"
              style={{
                width: '100%',
                padding: '10px 14px',
                borderRadius: 8,
                background: 'rgba(8, 14, 28, 0.85)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                color: '#f8fafc',
                fontSize: '0.9rem',
                outline: 'none',
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#cbd5e1', marginBottom: 6 }}>
              Team Name
            </label>
            <input
              type="text"
              value={teamName}
              onChange={(e) => setTeamName(e.target.value)}
              placeholder="e.g. NPCI PSO Team"
              style={{
                width: '100%',
                padding: '10px 14px',
                borderRadius: 8,
                background: 'rgba(8, 14, 28, 0.85)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                color: '#f8fafc',
                fontSize: '0.9rem',
                outline: 'none',
              }}
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={isSaving}
          style={{
            alignSelf: 'flex-start',
            padding: '10px 22px',
            borderRadius: 8,
            border: 'none',
            background: 'linear-gradient(135deg, #4f46e5 0%, #4338ca 100%)',
            color: '#ffffff',
            fontSize: '0.875rem',
            fontWeight: 600,
            cursor: isSaving ? 'not-allowed' : 'pointer',
            opacity: isSaving ? 0.75 : 1,
            boxShadow: '0 4px 14px rgba(79, 70, 229, 0.35)',
          }}
        >
          {isSaving ? 'Saving...' : 'Save & Verify Connection'}
        </button>
      </form>
    </div>
  );
}
