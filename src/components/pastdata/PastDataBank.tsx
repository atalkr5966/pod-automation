"use client";

import React, { useState, useEffect } from 'react';
import {
  SparklesIcon,
  PlusIcon,
  TrashIcon,
  PlayIcon,
  CheckCircleIcon,
} from '@/components/ui/Icons';
import { PastDataEntry } from '@/types';

export function PastDataBank() {
  const [pastDataList, setPastDataList] = useState<PastDataEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Form
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [category, setCategory] = useState('Core Engineering');
  const [rawTasks, setRawTasks] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  // Live Generator Preview State
  const [previewType, setPreviewType] = useState<'OPENING' | 'CLOSING'>('OPENING');
  const [customContext, setCustomContext] = useState('');
  const [generatedPod, setGeneratedPod] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const fetchPastData = async () => {
    try {
      const res = await fetch('/api/pod/past-data');
      if (res.ok) {
        const data = await res.json();
        setPastDataList(data.pastData || []);
      }
    } catch {
      // ignore
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    let ignore = false;
    fetch('/api/pod/past-data')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!ignore && data) {
          setPastDataList(data.pastData || []);
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

  const handleAddLog = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rawTasks.trim()) return;
    setIsAdding(true);
    setFeedback(null);

    try {
      const res = await fetch('/api/pod/past-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date,
          category,
          rawText: rawTasks,
          type: 'GENERAL',
        }),
      });

      if (res.ok) {
        setRawTasks('');
        setFeedback('Sprint log saved successfully to knowledge bank!');
        fetchPastData();
      }
    } catch {
      // ignore
    } finally {
      setIsAdding(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to remove this log?')) return;
    try {
      await fetch(`/api/pod/past-data?id=${id}`, { method: 'DELETE' });
      fetchPastData();
    } catch {
      // ignore
    }
  };

  const handleGeneratePreview = async () => {
    setIsGenerating(true);
    try {
      const res = await fetch('/api/pod/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: previewType, customContext }),
      });
      const data = await res.json();
      if (res.ok) {
        setGeneratedPod(data.pod || '');
      }
    } catch {
      // ignore
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Header */}
      <div>
        <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#f8fafc', letterSpacing: '-0.02em' }}>
          Sprint Task Bank &amp; AI Pattern Engine
        </h2>
        <p style={{ fontSize: '0.85rem', color: '#94a3b8', marginTop: 2 }}>
          Domain knowledge base powering deterministic task rotations and authentic NPCI/PSO bank reporting.
        </p>
      </div>

      {feedback && (
        <div
          style={{
            padding: '10px 14px',
            borderRadius: 8,
            background: 'rgba(16, 185, 129, 0.12)',
            border: '1px solid rgba(16, 185, 129, 0.28)',
            color: '#34d399',
            fontSize: '0.85rem',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <CheckCircleIcon className="w-4 h-4" />
          <span>{feedback}</span>
        </div>
      )}

      {/* Grid: Add log form + Live AI Generator Studio */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: 20 }}>
        {/* Form to add Sprint tasks */}
        <form
          onSubmit={handleAddLog}
          className="royal-glass-elevated"
          style={{
            padding: 24,
            background: 'rgba(12, 19, 38, 0.9)',
            display: 'flex',
            flexDirection: 'column',
            gap: 14,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#f8fafc', fontWeight: 700 }}>
            <PlusIcon className="w-4 h-4 text-indigo-400" />
            <span>Add New Sprint Log to Bank</span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.785rem', fontWeight: 600, color: '#cbd5e1', marginBottom: 4 }}>
                Log Date
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: 6,
                  background: 'rgba(6, 10, 22, 0.8)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  color: '#f8fafc',
                  fontSize: '0.85rem',
                  outline: 'none',
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.785rem', fontWeight: 600, color: '#cbd5e1', marginBottom: 4 }}>
                Category
              </label>
              <input
                type="text"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="e.g. Core Engineering"
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: 6,
                  background: 'rgba(6, 10, 22, 0.8)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  color: '#f8fafc',
                  fontSize: '0.85rem',
                  outline: 'none',
                }}
              />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.785rem', fontWeight: 600, color: '#cbd5e1', marginBottom: 4 }}>
              Tasks (One per line)
            </label>
            <textarea
              rows={4}
              value={rawTasks}
              onChange={(e) => setRawTasks(e.target.value)}
              placeholder="Tap and Pay testing with value chain&#10;Onboard Canara & ICICI banks for contextual payments&#10;Check U63 issue for Indian Bank"
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: 6,
                background: 'rgba(6, 10, 22, 0.8)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                color: '#f8fafc',
                fontSize: '0.85rem',
                outline: 'none',
                resize: 'vertical',
                fontFamily: 'JetBrains Mono, monospace',
              }}
            />
          </div>

          <button
            type="submit"
            disabled={isAdding}
            style={{
              padding: '9px 18px',
              borderRadius: 6,
              border: 'none',
              background: '#4f46e5',
              color: '#ffffff',
              fontSize: '0.85rem',
              fontWeight: 600,
              cursor: isAdding ? 'not-allowed' : 'pointer',
              alignSelf: 'flex-start',
            }}
          >
            {isAdding ? 'Adding...' : 'Save to Task Bank'}
          </button>
        </form>

        {/* Live AI Preview & Studio */}
        <div
          className="royal-glass-elevated"
          style={{
            padding: 24,
            background: 'rgba(12, 19, 38, 0.9)',
            display: 'flex',
            flexDirection: 'column',
            gap: 14,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#f8fafc', fontWeight: 700 }}>
              <SparklesIcon className="w-4 h-4 text-amber-400" />
              <span>Instant AI Generator Studio</span>
            </div>

            <div style={{ display: 'flex', gap: 4, background: 'rgba(6, 10, 22, 0.8)', padding: 2, borderRadius: 6 }}>
              <button
                type="button"
                onClick={() => setPreviewType('OPENING')}
                style={{
                  padding: '4px 10px',
                  borderRadius: 4,
                  border: 'none',
                  background: previewType === 'OPENING' ? '#4f46e5' : 'transparent',
                  color: previewType === 'OPENING' ? '#fff' : '#94a3b8',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Opening
              </button>
              <button
                type="button"
                onClick={() => setPreviewType('CLOSING')}
                style={{
                  padding: '4px 10px',
                  borderRadius: 4,
                  border: 'none',
                  background: previewType === 'CLOSING' ? '#4f46e5' : 'transparent',
                  color: previewType === 'CLOSING' ? '#fff' : '#94a3b8',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Closing
              </button>
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.785rem', fontWeight: 600, color: '#cbd5e1', marginBottom: 4 }}>
              Custom Context (Optional Focus Item)
            </label>
            <input
              type="text"
              value={customContext}
              onChange={(e) => setCustomContext(e.target.value)}
              placeholder="e.g. Prioritize Axis Bank UAT 3 certification"
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: 6,
                background: 'rgba(6, 10, 22, 0.8)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                color: '#f8fafc',
                fontSize: '0.85rem',
                outline: 'none',
              }}
            />
          </div>

          <button
            onClick={handleGeneratePreview}
            disabled={isGenerating}
            style={{
              padding: '9px 18px',
              borderRadius: 6,
              border: 'none',
              background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
              color: '#ffffff',
              fontSize: '0.85rem',
              fontWeight: 600,
              cursor: isGenerating ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              alignSelf: 'flex-start',
            }}
          >
            <PlayIcon className="w-3.5 h-3.5" />
            <span>{isGenerating ? 'Generating...' : `Generate ${previewType} Preview`}</span>
          </button>

          {generatedPod && (
            <div
              style={{
                marginTop: 6,
                maxHeight: 220,
                overflowY: 'auto',
                padding: '12px 14px',
                borderRadius: 8,
                background: 'rgba(5, 8, 16, 0.95)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                fontSize: '0.75rem',
                color: '#e2e8f0',
                fontFamily: 'JetBrains Mono, monospace',
                whiteSpace: 'pre-wrap',
                lineHeight: 1.45,
              }}
            >
              {generatedPod}
            </div>
          )}
        </div>
      </div>

      {/* Existing Sprint Logs List */}
      <div
        className="royal-glass"
        style={{
          padding: 24,
          background: 'rgba(10, 16, 32, 0.85)',
        }}
      >
        <h4 style={{ fontSize: '1rem', fontWeight: 700, color: '#f8fafc', marginBottom: 14 }}>
          Learned Sprint Entries ({pastDataList.length} logs)
        </h4>

        {isLoading ? (
          <p style={{ color: '#94a3b8', fontSize: '0.85rem' }}>Loading past sprint data...</p>
        ) : pastDataList.length === 0 ? (
          <p style={{ color: '#94a3b8', fontSize: '0.85rem' }}>No sprint data entries in bank.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {pastDataList.slice(0, 10).map((log) => (
              <div
                key={log.id}
                style={{
                  padding: '12px 16px',
                  borderRadius: 8,
                  background: 'rgba(6, 10, 22, 0.7)',
                  border: '1px solid rgba(255, 255, 255, 0.05)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 12,
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#f8fafc' }}>
                      {log.date}
                    </span>
                    <span style={{ fontSize: '0.725rem', color: '#818cf8', padding: '2px 6px', background: 'rgba(99, 102, 241, 0.15)', borderRadius: 4 }}>
                      {log.category || 'Sprint Tasks'}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: 3 }}>
                    {log.tasks.length} tasks registered (e.g. {log.tasks[0]?.substring(0, 50)}...)
                  </div>
                </div>

                <button
                  onClick={() => handleDelete(log.id)}
                  title="Delete log"
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
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
