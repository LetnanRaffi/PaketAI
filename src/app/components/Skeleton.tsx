'use client';

import React from 'react';

function SkeletonBlock({ className = '' }: { className?: string }) {
  return (
    <div className={`animate-[skeleton-pulse_2s_cubic-bezier(0.4,0,0.6,1)_infinite] rounded-xl bg-outline-variant/30 ${className}`} />
  );
}

/* ── Dashboard (/) ── */
export function DashboardSkeleton() {
  return (
    <div className="flex flex-col space-y-6">
      <div className="space-y-2">
        <SkeletonBlock className="h-2.5 w-28 rounded-full" />
        <SkeletonBlock className="h-5 w-36 rounded-full" />
      </div>
      <div className="rounded-2xl bg-surface-elevated border border-outline-variant/20 p-5 space-y-3">
        <SkeletonBlock className="h-5 w-20 rounded-full" />
        <SkeletonBlock className="h-5 w-48" />
        <SkeletonBlock className="h-3 w-64" />
      </div>
      <div className="grid grid-cols-2 gap-4">
        {[1, 2].map((i) => (
          <div key={i} className="rounded-2xl border border-outline-variant/20 bg-surface-elevated p-4 space-y-3">
            <div className="flex items-center justify-between">
              <SkeletonBlock className="h-9 w-9 rounded-xl" />
              <SkeletonBlock className="h-2.5 w-16 rounded-full" />
            </div>
            <SkeletonBlock className="h-7 w-10 rounded-full" />
            <SkeletonBlock className="h-2.5 w-24 rounded-full" />
          </div>
        ))}
      </div>
      <div className="space-y-3">
        <SkeletonBlock className="h-2.5 w-24 rounded-full" />
        <div className="grid grid-cols-2 gap-3">
          {[1, 2].map((i) => (
            <div key={i} className="flex items-center gap-3 rounded-xl border border-outline-variant/20 bg-surface-elevated p-3">
              <SkeletonBlock className="h-8 w-8 rounded-lg shrink-0" />
              <div className="space-y-1.5 flex-1">
                <SkeletonBlock className="h-3 w-16 rounded-full" />
                <SkeletonBlock className="h-2 w-20 rounded-full" />
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <SkeletonBlock className="h-2.5 w-32 rounded-full" />
          <SkeletonBlock className="h-2.5 w-16 rounded-full" />
        </div>
        <div className="divide-y divide-outline-variant/20 rounded-2xl border border-outline-variant/20 bg-surface-elevated overflow-hidden">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <SkeletonBlock className="h-10 w-10 rounded-lg shrink-0" />
                <div className="space-y-1.5 flex-1 min-w-0">
                  <SkeletonBlock className="h-3 w-32 rounded-full" />
                  <SkeletonBlock className="h-2.5 w-40 rounded-full" />
                </div>
              </div>
              <SkeletonBlock className="h-5 w-14 rounded-full ml-2" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ── Packages (/packages) ── */
export function PackagesSkeleton() {
  return (
    <div className="flex flex-col space-y-5">
      <div className="space-y-1.5">
        <SkeletonBlock className="h-5 w-32 rounded-full" />
        <SkeletonBlock className="h-3 w-56 rounded-full" />
      </div>
      <SkeletonBlock className="h-11 w-full rounded-xl" />
      <div className="flex gap-1.5 border-b border-outline-variant/20 pb-1">
        <SkeletonBlock className="h-8 w-20 rounded-lg" />
        <SkeletonBlock className="h-8 w-24 rounded-lg" />
        <SkeletonBlock className="h-8 w-28 rounded-lg" />
      </div>
      <div className="space-y-3">
        <SkeletonBlock className="h-2.5 w-28 rounded-full" />
        <div className="divide-y divide-outline-variant/20 rounded-2xl border border-outline-variant/20 bg-surface-elevated overflow-hidden">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3.5 min-w-0 flex-1">
                <SkeletonBlock className="h-12 w-12 rounded-xl shrink-0" />
                <div className="space-y-1.5 flex-1 min-w-0">
                  <SkeletonBlock className="h-3 w-36 rounded-full" />
                  <SkeletonBlock className="h-2.5 w-48 rounded-full" />
                  <SkeletonBlock className="h-2 w-28 rounded-full" />
                </div>
              </div>
              <SkeletonBlock className="h-5 w-14 rounded-full ml-2" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ── Employees (/employees) ── */
export function EmployeesSkeleton() {
  return (
    <div className="flex flex-col space-y-5 pb-8">
      <div className="flex items-center justify-between">
        <div className="space-y-1.5 flex-1">
          <SkeletonBlock className="h-5 w-36 rounded-full" />
          <SkeletonBlock className="h-3 w-48 rounded-full" />
        </div>
        <div className="flex gap-2">
          <SkeletonBlock className="h-10 w-10 rounded-xl" />
          <SkeletonBlock className="h-10 w-28 rounded-xl" />
        </div>
      </div>
      <SkeletonBlock className="h-11 w-full rounded-xl" />
      <div className="space-y-3">
        <SkeletonBlock className="h-2.5 w-32 rounded-full" />
        <div className="divide-y divide-outline-variant/20 rounded-2xl border border-outline-variant/20 bg-surface-elevated overflow-hidden">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex items-center justify-between p-4">
              <div className="space-y-1.5 flex-1 min-w-0">
                <SkeletonBlock className="h-3 w-36 rounded-full" />
                <div className="flex gap-3">
                  <SkeletonBlock className="h-2.5 w-24 rounded-full" />
                  <SkeletonBlock className="h-2.5 w-28 rounded-full" />
                </div>
              </div>
              <div className="flex gap-1 ml-2">
                <SkeletonBlock className="h-7 w-7 rounded-md" />
                <SkeletonBlock className="h-7 w-7 rounded-md" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ── Billing (/billing) ── */
export function BillingSkeleton() {
  return (
    <div className="flex flex-col space-y-6">
      <div className="space-y-1.5">
        <SkeletonBlock className="h-5 w-28 rounded-full" />
        <SkeletonBlock className="h-3 w-44 rounded-full" />
      </div>
      <div className="rounded-2xl border border-outline-variant/20 bg-surface-elevated p-5 space-y-3">
        <div className="flex items-start gap-3">
          <SkeletonBlock className="h-5 w-5 rounded-full shrink-0 mt-0.5" />
          <div className="space-y-2 flex-1">
            <SkeletonBlock className="h-4 w-36 rounded-full" />
            <SkeletonBlock className="h-3 w-48 rounded-full" />
          </div>
        </div>
      </div>
      <div className="rounded-2xl border border-outline-variant/20 bg-surface-elevated p-5 space-y-4">
        <SkeletonBlock className="h-2.5 w-28 rounded-full" />
        <SkeletonBlock className="h-8 w-36 rounded-full" />
        <div className="space-y-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex items-center gap-2">
              <SkeletonBlock className="h-3.5 w-3.5 rounded-full" />
              <SkeletonBlock className="h-3 w-36 rounded-full" />
            </div>
          ))}
        </div>
      </div>
      <SkeletonBlock className="h-12 w-full rounded-xl" />
    </div>
  );
}

/* ── Account (/account) ── */
export function AccountSkeleton() {
  return (
    <div className="flex flex-col space-y-6">
      <div className="rounded-2xl border border-outline-variant/20 bg-surface-elevated p-5">
        <div className="flex items-center gap-4">
          <SkeletonBlock className="h-14 w-14 rounded-full shrink-0" />
          <div className="space-y-2 flex-1">
            <SkeletonBlock className="h-4 w-32 rounded-full" />
            <SkeletonBlock className="h-3 w-40 rounded-full" />
            <SkeletonBlock className="h-2.5 w-24 rounded-full" />
          </div>
        </div>
      </div>
      <div className="rounded-2xl border border-outline-variant/20 bg-surface-elevated overflow-hidden">
        <div className="px-5 pt-4 pb-3">
          <SkeletonBlock className="h-2.5 w-24 rounded-full" />
        </div>
        <div className="px-5 pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <SkeletonBlock className="h-5 w-5 rounded-full" />
              <div className="space-y-1.5">
                <SkeletonBlock className="h-4 w-20 rounded-full" />
                <SkeletonBlock className="h-2.5 w-24 rounded-full" />
              </div>
            </div>
            <SkeletonBlock className="h-3 w-12 rounded-full" />
          </div>
        </div>
      </div>
      <div className="rounded-2xl border border-outline-variant/20 bg-surface-elevated overflow-hidden divide-y divide-outline-variant/20">
        {[1, 2].map((i) => (
          <div key={i} className="flex items-center gap-3 px-5 py-4">
            <SkeletonBlock className="h-4 w-4 rounded" />
            <SkeletonBlock className="h-4 w-36 rounded-full flex-1" />
            <SkeletonBlock className="h-4 w-4 rounded" />
          </div>
        ))}
      </div>
      <SkeletonBlock className="h-12 w-full rounded-2xl" />
    </div>
  );
}

/* ── Package Detail (/packages/[id]) ── */
export function PackageDetailSkeleton() {
  return (
    <div className="flex flex-col space-y-6">
      <div className="flex items-center gap-3">
        <SkeletonBlock className="h-8 w-8 rounded-lg shrink-0" />
        <div className="space-y-1.5">
          <SkeletonBlock className="h-5 w-28 rounded-full" />
          <SkeletonBlock className="h-3 w-40 rounded-full" />
        </div>
      </div>
      <SkeletonBlock className="aspect-video w-full rounded-2xl" />
      <div className="space-y-4">
        <div className="space-y-3">
          <SkeletonBlock className="h-2.5 w-32 rounded-full" />
          <div className="rounded-2xl border border-outline-variant/20 bg-surface-elevated p-4 space-y-3">
            <div className="flex items-center gap-3">
              <SkeletonBlock className="h-8 w-8 rounded-lg shrink-0" />
              <div className="space-y-1.5 flex-1">
                <SkeletonBlock className="h-2.5 w-28 rounded-full" />
                <SkeletonBlock className="h-4 w-36 rounded-full" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 pt-2 border-t border-outline-variant/20">
              <div className="space-y-1">
                <SkeletonBlock className="h-2.5 w-16 rounded-full" />
                <SkeletonBlock className="h-3 w-24 rounded-full" />
              </div>
              <div className="space-y-1">
                <SkeletonBlock className="h-2.5 w-16 rounded-full" />
                <SkeletonBlock className="h-3 w-32 rounded-full" />
              </div>
            </div>
          </div>
        </div>
        <div className="space-y-3">
          <SkeletonBlock className="h-2.5 w-36 rounded-full" />
          <div className="rounded-2xl border border-outline-variant/20 bg-surface-elevated p-4 space-y-3">
            <div className="flex items-center gap-3">
              <SkeletonBlock className="h-8 w-8 rounded-lg shrink-0" />
              <div className="space-y-1.5 flex-1">
                <SkeletonBlock className="h-2.5 w-28 rounded-full" />
                <SkeletonBlock className="h-4 w-32 rounded-full" />
              </div>
            </div>
          </div>
        </div>
      </div>
      <SkeletonBlock className="h-12 w-full rounded-xl" />
    </div>
  );
}
