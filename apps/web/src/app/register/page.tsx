'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { signIn } from 'next-auth/react';
import { Button, Input } from '@/components/ui/form-elements';
import { Card } from '@/components/ui/index';

type Step = 'form' | 'otp';

export default function RegisterPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>('form');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Resend cooldown timer
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendCooldown]);

  // ─── Step 1: Submit registration form ─────────────────────────
  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (name.trim().length < 2) {
      setError('Name must be at least 2 characters');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          password,
        }),
      });

      const data = (await res.json()) as { error?: string };

      if (!res.ok) {
        setError(data.error || 'Registration failed');
        setLoading(false);
        return;
      }

      // Move to OTP step
      setStep('otp');
      setResendCooldown(60);
      setLoading(false);

      // Focus first OTP input
      setTimeout(() => otpRefs.current[0]?.focus(), 100);
    } catch {
      setError('Something went wrong. Please try again.');
      setLoading(false);
    }
  };

  // ─── Step 2: Verify OTP ───────────────────────────────────────
  const handleVerifyOTP = async (otpCode?: string) => {
    setError(null);
    const code = otpCode || otp.join('');

    if (code.length !== 6) {
      setError('Please enter the full 6-digit code');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/auth/otp/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim(),
          otp: code,
          purpose: 'register',
        }),
      });

      const data = (await res.json()) as { error?: string };

      if (!res.ok) {
        setError(data.error || 'Verification failed');
        setOtp(['', '', '', '', '', '']);
        otpRefs.current[0]?.focus();
        setLoading(false);
        return;
      }

      // Account created — auto sign-in
      const signInResult = await signIn('credentials', {
        email: email.trim(),
        password,
        redirect: false,
      });

      if (signInResult?.error) {
        router.push('/login');
        return;
      }

      router.push('/');
      router.refresh();
    } catch {
      setError('Something went wrong. Please try again.');
      setLoading(false);
    }
  };

  // ─── Resend OTP ───────────────────────────────────────────────
  const handleResend = async () => {
    if (resendCooldown > 0) return;
    setError(null);

    try {
      const res = await fetch('/api/auth/otp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim(),
          purpose: 'register',
        }),
      });

      const data = (await res.json()) as { error?: string };

      if (!res.ok) {
        setError(data.error || 'Failed to resend code');
        return;
      }

      setResendCooldown(60);
      setOtp(['', '', '', '', '', '']);
      otpRefs.current[0]?.focus();
    } catch {
      setError('Failed to resend code. Please try again.');
    }
  };

  // ─── OTP Input Handlers ───────────────────────────────────────
  const handleOtpChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return; // digits only

    const newOtp = [...otp];
    newOtp[index] = value.slice(-1); // take last char only
    setOtp(newOtp);

    // Auto-advance to next input
    if (value && index < 5) {
      otpRefs.current[index + 1]?.focus();
    }

    // Auto-submit when all 6 digits entered
    const code = newOtp.join('');
    if (code.length === 6) {
      handleVerifyOTP(code);
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  };

  const handleOtpPaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (!pasted) return;

    const newOtp = [...otp];
    for (let i = 0; i < 6; i++) {
      newOtp[i] = pasted[i] || '';
    }
    setOtp(newOtp);

    // Focus the next empty slot or last slot
    const nextEmpty = newOtp.findIndex((d) => !d);
    otpRefs.current[nextEmpty === -1 ? 5 : nextEmpty]?.focus();

    // Auto-submit if full
    if (pasted.length === 6) {
      handleVerifyOTP(pasted);
    }
  };

  // ─── Render ───────────────────────────────────────────────────
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-blue-600">
            <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0112 15a9.065 9.065 0 00-6.23.693L5 14.5m14.8.8l1.402 1.402c1.232 1.232.65 3.318-1.067 3.611l-.772.13a18.142 18.142 0 01-6.126 0l-.772-.13c-1.717-.293-2.3-2.379-1.067-3.61L5 14.5" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-zinc-100">
            {step === 'form' ? 'Create an account' : 'Verify your email'}
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            {step === 'form'
              ? 'Get started with PageForge'
              : `Enter the 6-digit code sent to ${email}`}
          </p>
        </div>

        <Card>
          {step === 'form' ? (
            <form onSubmit={handleSubmitForm} className="space-y-4">
              <Input
                label="Name"
                type="text"
                placeholder="Your name"
                value={name}
                onChange={(e) => setName((e.target as HTMLInputElement).value)}
                required
                autoFocus
                autoComplete="name"
              />

              <Input
                label="Email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail((e.target as HTMLInputElement).value)}
                required
                autoComplete="email"
              />

              <Input
                label="Password"
                type="password"
                placeholder="At least 8 characters"
                value={password}
                onChange={(e) => setPassword((e.target as HTMLInputElement).value)}
                required
                autoComplete="new-password"
              />

              <Input
                label="Confirm Password"
                type="password"
                placeholder="Repeat your password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword((e.target as HTMLInputElement).value)}
                required
                autoComplete="new-password"
              />

              {error && (
                <div className="rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
                  {error}
                </div>
              )}

              <Button type="submit" loading={loading} className="w-full">
                Create Account
              </Button>
            </form>
          ) : (
            <div className="space-y-6">
              {/* OTP Input */}
              <div className="flex justify-center gap-2" onPaste={handleOtpPaste}>
                {otp.map((digit, i) => (
                  <input
                    key={i}
                    ref={(el) => { otpRefs.current[i] = el; }}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleOtpChange(i, e.target.value)}
                    onKeyDown={(e) => handleOtpKeyDown(i, e)}
                    disabled={loading}
                    className="h-12 w-10 rounded-lg border border-zinc-700 bg-zinc-900 text-center text-lg font-medium text-zinc-100 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-colors disabled:opacity-50"
                  />
                ))}
              </div>

              {error && (
                <div className="rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
                  {error}
                </div>
              )}

              <Button
                onClick={() => handleVerifyOTP()}
                loading={loading}
                className="w-full"
                disabled={otp.join('').length !== 6}
              >
                Verify & Create Account
              </Button>

              <div className="text-center">
                <button
                  type="button"
                  onClick={handleResend}
                  disabled={resendCooldown > 0}
                  className="text-sm text-zinc-500 hover:text-zinc-300 transition-colors disabled:cursor-not-allowed"
                >
                  {resendCooldown > 0
                    ? `Resend code in ${resendCooldown}s`
                    : 'Resend code'}
                </button>
              </div>

              <button
                type="button"
                onClick={() => {
                  setStep('form');
                  setOtp(['', '', '', '', '', '']);
                  setError(null);
                }}
                className="w-full text-sm text-zinc-500 hover:text-zinc-300 transition-colors"
              >
                Back to registration
              </button>
            </div>
          )}
        </Card>

        <p className="mt-6 text-center text-sm text-zinc-500">
          Already have an account?{' '}
          <Link href="/login" className="text-blue-400 hover:text-blue-300 transition-colors">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
