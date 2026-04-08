'use client';

import React from 'react';
import type { DeploymentStatus } from '@pageforge/shared';

// ─── Status Badge ────────────────────────────────────────────────

interface StatusBadgeProps {
  status: DeploymentStatus | string;
  size?: 'sm' | 'md';
}

const statusConfig: Record<string, { label: string; color: string; dot: string }> = {
  queued: { label: 'Queued', color: 'bg-ctp-yellow/10 text-ctp-yellow border-ctp-yellow/20', dot: 'bg-ctp-yellow' },
  building: { label: 'Building', color: 'bg-ctp-blue/10 text-ctp-blue border-ctp-blue/20', dot: 'bg-ctp-blue animate-pulse' },
  uploading: { label: 'Uploading', color: 'bg-ctp-mauve/10 text-ctp-mauve border-ctp-mauve/20', dot: 'bg-ctp-mauve animate-pulse' },
  ready: { label: 'Ready', color: 'bg-ctp-green/10 text-ctp-green border-ctp-green/20', dot: 'bg-ctp-green' },
  failed: { label: 'Failed', color: 'bg-ctp-red/10 text-ctp-red border-ctp-red/20', dot: 'bg-ctp-red' },
};

export function StatusBadge({ status, size = 'md' }: StatusBadgeProps) {
  const config = statusConfig[status] || {
    label: status,
    color: 'bg-ctp-overlay1/10 text-ctp-overlay1 border-ctp-overlay1/20',
    dot: 'bg-ctp-overlay1',
  };

  const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs';

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border font-medium ${config.color} ${sizeClasses}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${config.dot}`} />
      {config.label}
    </span>
  );
}

// ─── Empty State ─────────────────────────────────────────────────

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      {icon && <div className="mb-4 text-ctp-overlay0">{icon}</div>}
      <h3 className="text-lg font-medium text-ctp-subtext0">{title}</h3>
      {description && <p className="mt-1 text-sm text-ctp-overlay1 max-w-sm">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

// ─── Loading State ───────────────────────────────────────────────

interface LoadingStateProps {
  message?: string;
}

export function LoadingState({ message = 'Loading...' }: LoadingStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-ctp-surface1 border-t-ctp-blue" />
      <p className="mt-3 text-sm text-ctp-overlay1">{message}</p>
    </div>
  );
}

// ─── Error State ─────────────────────────────────────────────────

interface ErrorStateProps {
  message: string;
  onRetry?: () => void;
}

export function ErrorState({ message, onRetry }: ErrorStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-ctp-red/10">
        <svg className="h-6 w-6 text-ctp-red" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
        </svg>
      </div>
      <h3 className="text-lg font-medium text-ctp-subtext0">Something went wrong</h3>
      <p className="mt-1 text-sm text-ctp-red">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-4 rounded-lg bg-ctp-surface0 px-4 py-2 text-sm font-medium text-ctp-subtext0 hover:bg-ctp-surface1 transition-colors"
        >
          Try again
        </button>
      )}
    </div>
  );
}

// ─── Card ────────────────────────────────────────────────────────

interface CardProps {
  children: React.ReactNode;
  className?: string;
  padding?: boolean;
}

export function Card({ children, className = '', padding = true }: CardProps) {
  return (
    <div className={`rounded-xl border border-ctp-surface0 bg-ctp-mantle/50 ${padding ? 'p-6' : ''} ${className}`}>
      {children}
    </div>
  );
}

// ─── Modal ───────────────────────────────────────────────────────

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

export function Modal({ open, onClose, title, children }: ModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-ctp-crust/60" onClick={onClose} />
      <div className="relative z-10 w-full max-w-md rounded-xl border border-ctp-surface0 bg-ctp-mantle p-6 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-ctp-text">{title}</h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-ctp-overlay1 hover:text-ctp-subtext1 hover:bg-ctp-surface0 transition-colors"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

// ─── Tab Navigation ──────────────────────────────────────────────

interface TabNavProps {
  tabs: { id: string; label: string; href: string }[];
  activeTab: string;
}

export function TabNav({ tabs, activeTab }: TabNavProps) {
  return (
    <nav className="flex border-b border-ctp-surface0">
      {tabs.map((tab) => (
        <a
          key={tab.id}
          href={tab.href}
          className={`px-4 py-3 text-sm font-medium transition-colors border-b-2 -mb-px ${
            activeTab === tab.id
              ? 'border-ctp-blue text-ctp-blue'
              : 'border-transparent text-ctp-overlay1 hover:text-ctp-subtext1'
          }`}
        >
          {tab.label}
        </a>
      ))}
    </nav>
  );
}

// ─── Skeleton ────────────────────────────────────────────────────

interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className = '' }: SkeletonProps) {
  return <div className={`animate-pulse rounded bg-ctp-surface0 ${className}`} />;
}
