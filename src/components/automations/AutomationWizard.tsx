"use client";

import React, { useState } from 'react';
import {
  ChevronRightIcon,
  CheckCircleIcon,
  SparklesIcon,
} from '@/components/ui/Icons';
import { calculateNextRun, format12Hour } from '@/lib/timezone';
import { AutomationSchedule, ScheduleLivePreview } from '@/types';

interface AutomationWizardProps {
  onSaved: (schedule: AutomationSchedule, preview: ScheduleLivePreview) => void;
  onCancel?: () => void;
}

const TIMEZONES = [
  'Asia/Kolkata',
  'America/New_York',
  'America/Chicago',
  'America/Los_Angeles',
  'Europe/London',
  'Europe/Paris',
  'Asia/Dubai',
  'Asia/Singapore',
  'Asia/Tokyo',
  'Australia/Sydney',
  'UTC',
];

const DAYS = [
  { val: 1, label: 'Mon' },
  { val: 2, label: 'Tue' },
  { val: 3, label: 'Wed' },
  { val: 4, label: 'Thu' },
  { val: 5, label: 'Fri' },
  { val: 6, label: 'Sat' },
  { val: 0, label: 'Sun' },
];

export function AutomationWizard({ onSaved, onCancel }: AutomationWizardProps) {
  const [step, setStep] = useState<number>(1);

  // Form State
  const [name, setName] = useState('Daily Engineering POD');
  const [description, setDescription] = useState('Automated morning opening and evening closing sprint dispatch');
  const [timezone, setTimezone] = useState('Asia/Kolkata');
  const [channelId, setChannelId] = useState('#general');
  const [daysOfWeek, setDaysOfWeek] = useState<number[]>([1, 2, 3, 4, 5]);

  // Opening Config
  const [openingEnabled, setOpeningEnabled] = useState(true);
  const [openingTime, setOpeningTime] = useState('09:30');

  // Closing Config
  const [closingEnabled, setClosingEnabled] = useState(true);
  const [closingTime, setClosingTime] = useState('18:30');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const toggleDay = (dayVal: number) => {
    if (daysOfWeek.includes(dayVal)) {
      if (daysOfWeek.length > 1) {
        setDaysOfWeek(daysOfWeek.filter((d) => d !== dayVal));
      }
    } else {
      setDaysOfWeek([...daysOfWeek, dayVal]);
    }
  };

  const handleSave = async () => {
    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      const payload = {
        name,
        description,
        timezone,
        channelId,
        daysOfWeek,
        openingEnabled,
        openingTime,
        closingEnabled,
        closingTime,
        active: true,
      };

      const res = await fetch('/api/automations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error || 'Failed to save automation schedule');
        setIsSubmitting(false);
        return;
      }

      onSaved(data.schedule, data.preview);
    } catch {
      setErrorMsg('Network error occurred while saving.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Calculations for Step 4 Review
  const now = new Date();
  const nextOpening = openingEnabled ? calculateNextRun(openingTime, daysOfWeek, timezone, now) : null;
  const nextClosing = closingEnabled ? calculateNextRun(closingTime, daysOfWeek, timezone, now) : null;

  return (
    <div
      className="royal-glass-elevated animate-fade-in"
      style={{
        padding: '32px 28px',
        maxWidth: 680,
        margin: '0 auto',
        background: 'rgba(12, 19, 38, 0.95)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
      }}
    >
      {/* Wizard Progress Bar */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#818cf8', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Step {step} of 4: {step === 1 ? 'Schedule Profile' : step === 2 ? 'Opening Configuration' : step === 3 ? 'Closing Configuration' : 'Review & Deploy'}
          </span>
          <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Enterprise Wizard</span>
        </div>
        <div style={{ display: 'flex', gap: 6, height: 4, background: 'rgba(255, 255, 255, 0.08)', borderRadius: 2 }}>
          {[1, 2, 3, 4].map((s) => (
            <div
              key={s}
              style={{
                flex: 1,
                background: s <= step ? '#6366f1' : 'transparent',
                borderRadius: 2,
                transition: 'background 200ms ease',
              }}
            />
          ))}
        </div>
      </div>

      {errorMsg && (
        <div
          style={{
            padding: '10px 14px',
            borderRadius: 8,
            background: 'rgba(239, 68, 68, 0.12)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            color: '#fca5a5',
            fontSize: '0.825rem',
            marginBottom: 20,
          }}
        >
          {errorMsg}
        </div>
      )}

      {/* STEP 1: Name, Timezone, Channel */}
      {step === 1 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#f8fafc' }}>
              Define Automation Name &amp; Target
            </h2>
            <p style={{ fontSize: '0.825rem', color: '#94a3b8', marginTop: 4 }}>
              Set schedule name, timezone, and the target Slack channel.
            </p>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#cbd5e1', marginBottom: 6 }}>
              Automation Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Core Engineering Sprint Automation"
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
              Description (Optional)
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Daily Opening & Closing action items for PSO team"
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

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 14 }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#cbd5e1', marginBottom: 6 }}>
                Timezone (Required)
              </label>
              <select
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
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
              >
                {TIMEZONES.map((tz) => (
                  <option key={tz} value={tz}>
                    {tz}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#cbd5e1', marginBottom: 6 }}>
                Slack Channel
              </label>
              <input
                type="text"
                value={channelId}
                onChange={(e) => setChannelId(e.target.value)}
                placeholder="#general or #dev-sync"
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

          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#cbd5e1', marginBottom: 8 }}>
              Active Days of the Week
            </label>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {DAYS.map((d) => {
                const isSelected = daysOfWeek.includes(d.val);
                return (
                  <button
                    key={d.val}
                    type="button"
                    onClick={() => toggleDay(d.val)}
                    style={{
                      padding: '8px 14px',
                      borderRadius: 6,
                      border: isSelected ? '1px solid #6366f1' : '1px solid rgba(255, 255, 255, 0.1)',
                      background: isSelected ? 'rgba(79, 70, 229, 0.28)' : 'rgba(8, 14, 28, 0.6)',
                      color: isSelected ? '#ffffff' : '#94a3b8',
                      fontSize: '0.85rem',
                      fontWeight: isSelected ? 600 : 500,
                      cursor: 'pointer',
                    }}
                  >
                    {d.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* STEP 2: Opening Configuration */}
      {step === 2 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#f8fafc' }}>
              Configure Morning Opening Action
            </h2>
            <p style={{ fontSize: '0.825rem', color: '#94a3b8', marginTop: 4 }}>
              Set execution time for the daily morning sprint priorities dispatch.
            </p>
          </div>

          <div
            style={{
              padding: 16,
              borderRadius: 10,
              background: 'rgba(8, 14, 28, 0.7)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div>
              <div style={{ fontSize: '0.9rem', fontWeight: 600, color: '#f8fafc' }}>
                Enable Morning Opening Dispatch
              </div>
              <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                Automatically synthesizes priorities and dispatches to {channelId}
              </div>
            </div>
            <input
              type="checkbox"
              checked={openingEnabled}
              onChange={(e) => setOpeningEnabled(e.target.checked)}
              style={{ width: 20, height: 20, cursor: 'pointer', accentColor: '#4f46e5' }}
            />
          </div>

          {openingEnabled && (
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#cbd5e1', marginBottom: 6 }}>
                Opening Scheduled Time (24h format HH:MM)
              </label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <input
                  type="time"
                  value={openingTime}
                  onChange={(e) => setOpeningTime(e.target.value)}
                  style={{
                    padding: '10px 14px',
                    borderRadius: 8,
                    background: 'rgba(8, 14, 28, 0.85)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    color: '#f8fafc',
                    fontSize: '1rem',
                    fontFamily: 'JetBrains Mono, monospace',
                    outline: 'none',
                  }}
                />
                <span style={{ fontSize: '0.85rem', color: '#94a3b8' }}>
                  ({format12Hour(openingTime)} in {timezone})
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* STEP 3: Closing Configuration */}
      {step === 3 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#f8fafc' }}>
              Configure Evening Closing (EOD) Action
            </h2>
            <p style={{ fontSize: '0.825rem', color: '#94a3b8', marginTop: 4 }}>
              Set execution time for the daily evening closing summary with status checks.
            </p>
          </div>

          <div
            style={{
              padding: 16,
              borderRadius: 10,
              background: 'rgba(8, 14, 28, 0.7)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div>
              <div style={{ fontSize: '0.9rem', fontWeight: 600, color: '#f8fafc' }}>
                Enable Evening Closing Dispatch
              </div>
              <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                Generates EOD tasks with completion tags and sends to {channelId}
              </div>
            </div>
            <input
              type="checkbox"
              checked={closingEnabled}
              onChange={(e) => setClosingEnabled(e.target.checked)}
              style={{ width: 20, height: 20, cursor: 'pointer', accentColor: '#4f46e5' }}
            />
          </div>

          {closingEnabled && (
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#cbd5e1', marginBottom: 6 }}>
                Closing Scheduled Time (24h format HH:MM)
              </label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <input
                  type="time"
                  value={closingTime}
                  onChange={(e) => setClosingTime(e.target.value)}
                  style={{
                    padding: '10px 14px',
                    borderRadius: 8,
                    background: 'rgba(8, 14, 28, 0.85)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    color: '#f8fafc',
                    fontSize: '1rem',
                    fontFamily: 'JetBrains Mono, monospace',
                    outline: 'none',
                  }}
                />
                <span style={{ fontSize: '0.85rem', color: '#94a3b8' }}>
                  ({format12Hour(closingTime)} in {timezone})
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* STEP 4: Review & Live Execution Preview */}
      {step === 4 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#f8fafc' }}>
              Review &amp; Deploy Automation
            </h2>
            <p style={{ fontSize: '0.825rem', color: '#94a3b8', marginTop: 4 }}>
              Verify configuration and preview real-time next execution timestamps.
            </p>
          </div>

          <div
            style={{
              padding: 20,
              borderRadius: 10,
              background: 'rgba(6, 11, 24, 0.85)',
              border: '1px solid rgba(99, 102, 241, 0.25)',
              display: 'flex',
              flexDirection: 'column',
              gap: 14,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255, 255, 255, 0.07)', paddingBottom: 10 }}>
              <span style={{ color: '#94a3b8', fontSize: '0.85rem' }}>Automation Name:</span>
              <strong style={{ color: '#f8fafc', fontSize: '0.85rem' }}>{name}</strong>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255, 255, 255, 0.07)', paddingBottom: 10 }}>
              <span style={{ color: '#94a3b8', fontSize: '0.85rem' }}>Timezone:</span>
              <strong style={{ color: '#f8fafc', fontSize: '0.85rem' }}>{timezone}</strong>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255, 255, 255, 0.07)', paddingBottom: 10 }}>
              <span style={{ color: '#94a3b8', fontSize: '0.85rem' }}>Target Channel:</span>
              <strong style={{ color: '#818cf8', fontSize: '0.85rem' }}>{channelId}</strong>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255, 255, 255, 0.07)', paddingBottom: 10 }}>
              <span style={{ color: '#94a3b8', fontSize: '0.85rem' }}>Morning Opening:</span>
              <strong style={{ color: openingEnabled ? '#fbbf24' : '#64748b', fontSize: '0.85rem' }}>
                {openingEnabled ? `${format12Hour(openingTime)} (${timezone})` : 'Disabled'}
              </strong>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255, 255, 255, 0.07)', paddingBottom: 10 }}>
              <span style={{ color: '#94a3b8', fontSize: '0.85rem' }}>Evening Closing:</span>
              <strong style={{ color: closingEnabled ? '#818cf8' : '#64748b', fontSize: '0.85rem' }}>
                {closingEnabled ? `${format12Hour(closingTime)} (${timezone})` : 'Disabled'}
              </strong>
            </div>

            {/* Next run calculations */}
            <div style={{ paddingTop: 6 }}>
              <div style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 6 }}>
                Immediate Calculated Next Executions:
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: '0.825rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#34d399' }}>
                  <CheckCircleIcon className="w-4 h-4" />
                  <span>Next Opening: {nextOpening ? nextOpening.label : 'None'}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#34d399' }}>
                  <CheckCircleIcon className="w-4 h-4" />
                  <span>Next Closing: {nextClosing ? nextClosing.label : 'None'}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Navigation Buttons */}
      <div
        style={{
          marginTop: 28,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderTop: '1px solid rgba(255, 255, 255, 0.08)',
          paddingTop: 20,
        }}
      >
        <div>
          {step > 1 ? (
            <button
              type="button"
              onClick={() => setStep(step - 1)}
              style={{
                padding: '9px 16px',
                borderRadius: 8,
                background: 'rgba(255, 255, 255, 0.06)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                color: '#cbd5e1',
                fontSize: '0.85rem',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Back
            </button>
          ) : (
            onCancel && (
              <button
                type="button"
                onClick={onCancel}
                style={{
                  padding: '9px 16px',
                  borderRadius: 8,
                  background: 'transparent',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  color: '#94a3b8',
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
            )
          )}
        </div>

        <div>
          {step < 4 ? (
            <button
              type="button"
              onClick={() => {
                if (step === 1 && !name.trim()) {
                  setErrorMsg('Please specify an automation name.');
                  return;
                }
                setErrorMsg(null);
                setStep(step + 1);
              }}
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
                gap: 6,
                boxShadow: '0 4px 14px rgba(79, 70, 229, 0.35)',
              }}
            >
              <span>Continue</span>
              <ChevronRightIcon className="w-4 h-4" />
            </button>
          ) : (
            <button
              type="button"
              disabled={isSubmitting}
              onClick={handleSave}
              style={{
                padding: '11px 22px',
                borderRadius: 8,
                border: 'none',
                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                color: '#ffffff',
                fontSize: '0.9rem',
                fontWeight: 600,
                cursor: isSubmitting ? 'not-allowed' : 'pointer',
                opacity: isSubmitting ? 0.75 : 1,
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                boxShadow: '0 4px 16px rgba(16, 185, 129, 0.35)',
              }}
            >
              {isSubmitting ? (
                <span>Deploying...</span>
              ) : (
                <>
                  <SparklesIcon className="w-4 h-4" />
                  <span>Save Automation</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
