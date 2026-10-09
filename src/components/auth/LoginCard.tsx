"use client";

import React, { useState } from 'react';
import { ShieldIcon, EyeIcon, EyeOffIcon, SparklesIcon } from '@/components/ui/Icons';
import { SafeUser } from '@/types';

interface LoginCardProps {
  onSuccess: (user: SafeUser, token: string) => void;
}

export function LoginCard({ onSuccess }: LoginCardProps) {
  const [tab, setTab] = useState<'signin' | 'signup'>('signin');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Sign up fields
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');

  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setIsLoading(true);

    try {
      const payload =
        tab === 'signin'
          ? { action: 'login', identifier, password }
          : { action: 'register', username, email, name, password };

      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        setErrorMsg(data.error || 'Authentication failed. Please check your credentials.');
        setIsLoading(false);
        return;
      }

      if (data.user && data.token) {
        onSuccess(data.user, data.token);
      }
    } catch {
      setErrorMsg('Network error. Unable to connect to server.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto animate-fade-in" style={{ maxWidth: 440, width: '100%' }}>
      {/* Brand Header */}
      <div style={{ textAlign: 'center', marginBottom: 28 }}>
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 52,
            height: 52,
            borderRadius: 14,
            background: 'linear-gradient(135deg, rgba(79, 70, 229, 0.3) 0%, rgba(30, 27, 75, 0.8) 100%)',
            border: '1px solid rgba(129, 140, 248, 0.35)',
            boxShadow: '0 8px 24px -4px rgba(79, 70, 229, 0.4)',
            marginBottom: 16,
          }}
        >
          <div style={{ color: '#818cf8', width: 26, height: 26 }}>
            <ShieldIcon className="w-6 h-6" />
          </div>
        </div>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#f8fafc', letterSpacing: '-0.03em' }}>
          POD Automation
        </h1>
        <p style={{ fontSize: '0.875rem', color: '#94a3b8', marginTop: 4 }}>
          Intelligent Opening &amp; Closing Automation
        </p>
      </div>

      {/* Main Glass Card */}
      <div
        className="royal-glass-elevated"
        style={{
          padding: '32px 28px',
          background: 'rgba(12, 19, 36, 0.85)',
          border: '1px solid rgba(255, 255, 255, 0.09)',
        }}
      >
        {/* Tab Toggle */}
        <div
          style={{
            display: 'flex',
            background: 'rgba(5, 8, 18, 0.7)',
            padding: 4,
            borderRadius: 8,
            border: '1px solid rgba(255, 255, 255, 0.06)',
            marginBottom: 24,
          }}
        >
          <button
            type="button"
            onClick={() => {
              setTab('signin');
              setErrorMsg(null);
            }}
            style={{
              flex: 1,
              padding: '8px 14px',
              fontSize: '0.85rem',
              fontWeight: 600,
              borderRadius: 6,
              border: 'none',
              cursor: 'pointer',
              transition: 'all 150ms ease',
              background: tab === 'signin' ? 'rgba(79, 70, 229, 0.35)' : 'transparent',
              color: tab === 'signin' ? '#ffffff' : '#94a3b8',
            }}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => {
              setTab('signup');
              setErrorMsg(null);
            }}
            style={{
              flex: 1,
              padding: '8px 14px',
              fontSize: '0.85rem',
              fontWeight: 600,
              borderRadius: 6,
              border: 'none',
              cursor: 'pointer',
              transition: 'all 150ms ease',
              background: tab === 'signup' ? 'rgba(79, 70, 229, 0.35)' : 'transparent',
              color: tab === 'signup' ? '#ffffff' : '#94a3b8',
            }}
          >
            Create Account
          </button>
        </div>

        {/* Error Feedback */}
        {errorMsg && (
          <div
            style={{
              padding: '10px 14px',
              borderRadius: 8,
              background: 'rgba(239, 68, 68, 0.12)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              color: '#fca5a5',
              fontSize: '0.815rem',
              lineHeight: 1.4,
              marginBottom: 18,
            }}
          >
            {errorMsg}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {tab === 'signin' ? (
            <>
              <div>
                <label style={{ display: 'block', fontSize: '0.785rem', fontWeight: 600, color: '#cbd5e1', marginBottom: 6 }}>
                  Email or Username
                </label>
                <input
                  type="text"
                  required
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="name@company.com or username"
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: 8,
                    background: 'rgba(8, 14, 28, 0.8)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    color: '#f8fafc',
                    fontSize: '0.9rem',
                    outline: 'none',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.785rem', fontWeight: 600, color: '#cbd5e1', marginBottom: 6 }}>
                  Password
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    style={{
                      width: '100%',
                      padding: '10px 42px 10px 14px',
                      borderRadius: 8,
                      background: 'rgba(8, 14, 28, 0.8)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      color: '#f8fafc',
                      fontSize: '0.9rem',
                      outline: 'none',
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{
                      position: 'absolute',
                      right: 12,
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      color: '#94a3b8',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                    }}
                  >
                    {showPassword ? <EyeOffIcon className="w-4 h-4" /> : <EyeIcon className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </>
          ) : (
            <>
              <div>
                <label style={{ display: 'block', fontSize: '0.785rem', fontWeight: 600, color: '#cbd5e1', marginBottom: 6 }}>
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Lead Engineer"
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: 8,
                    background: 'rgba(8, 14, 28, 0.8)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    color: '#f8fafc',
                    fontSize: '0.9rem',
                    outline: 'none',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.785rem', fontWeight: 600, color: '#cbd5e1', marginBottom: 6 }}>
                  Username
                </label>
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="e.g. lead_dev"
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: 8,
                    background: 'rgba(8, 14, 28, 0.8)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    color: '#f8fafc',
                    fontSize: '0.9rem',
                    outline: 'none',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.785rem', fontWeight: 600, color: '#cbd5e1', marginBottom: 6 }}>
                  Work Email
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="engineer@company.com"
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: 8,
                    background: 'rgba(8, 14, 28, 0.8)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    color: '#f8fafc',
                    fontSize: '0.9rem',
                    outline: 'none',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.785rem', fontWeight: 600, color: '#cbd5e1', marginBottom: 6 }}>
                  Password (min 6 characters)
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Create a strong password"
                    style={{
                      width: '100%',
                      padding: '10px 42px 10px 14px',
                      borderRadius: 8,
                      background: 'rgba(8, 14, 28, 0.8)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      color: '#f8fafc',
                      fontSize: '0.9rem',
                      outline: 'none',
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{
                      position: 'absolute',
                      right: 12,
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      color: '#94a3b8',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                    }}
                  >
                    {showPassword ? <EyeOffIcon className="w-4 h-4" /> : <EyeIcon className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </>
          )}

          <button
            type="submit"
            disabled={isLoading}
            style={{
              marginTop: 10,
              padding: '12px 20px',
              borderRadius: 8,
              border: 'none',
              background: 'linear-gradient(135deg, #4f46e5 0%, #4338ca 100%)',
              color: '#ffffff',
              fontSize: '0.925rem',
              fontWeight: 600,
              cursor: isLoading ? 'not-allowed' : 'pointer',
              opacity: isLoading ? 0.75 : 1,
              boxShadow: '0 4px 16px rgba(79, 70, 229, 0.35)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              transition: 'all 150ms ease',
            }}
          >
            {isLoading ? (
              <span>Authenticating...</span>
            ) : (
              <>
                <SparklesIcon className="w-4 h-4" />
                <span>{tab === 'signin' ? 'Sign In' : 'Create Account'}</span>
              </>
            )}
          </button>
        </form>

        <div style={{ marginTop: 20, textAlign: 'center' }}>
          <span style={{ fontSize: '0.775rem', color: '#64748b' }}>
            Enterprise Protected · Server-Side Execution Engine
          </span>
        </div>
      </div>
    </div>
  );
}
