'use client';

import React, { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Spin } from 'antd';
import { useAuthStore } from '@/lib/stores/auth-store';
import {
  ClientHeader,
  ClientHero,
  ClientFeaturesBento,
  ClientWorkflowSection,
  ClientTrustMetrics,
  ClientCookieConsent,
  ClientFloatingActions,
  ClientFooter,
} from '@/components/client';

function ClientLandingContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const user = useAuthStore((state) => state.user);
  const hasHydrated = useAuthStore((state) => state.hasHydrated);
  const allowPublic = searchParams?.get('public') === 'true';

  useEffect(() => {
    if (hasHydrated && user && !allowPublic) {
      router.replace('/dashboard');
    }
  }, [hasHydrated, user, allowPublic, router]);

  if (hasHydrated && user && !allowPublic) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-white">
        <Spin size="large" />
        <p className="mt-4 text-sm font-medium text-[var(--color-text-muted)]">
          Đang chuyển hướng vào bảng điều khiển...
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] flex flex-col bg-white overflow-x-hidden relative">
      {/* 1. Frosted Sticky Navigation Header */}
      <ClientHeader />

      {/* 2. Main Showcase Sections */}
      <main className="flex-1">
        {/* Centered Editorial Brand Hero Section */}
        <ClientHero />

        {/* 4 Pillars Bento Grid */}
        <ClientFeaturesBento />

        {/* 5-Step Operational Workflow Timeline */}
        <ClientWorkflowSection />

        {/* Architectural Superiority & Trust Metrics */}
        <ClientTrustMetrics />
      </main>

      {/* 3. Comprehensive Enterprise Corporate Footer */}
      <ClientFooter />

      {/* 4. Privacy Cookie Consent Floating Banner */}
      <ClientCookieConsent />

      {/* 5. Floating Consultation Hotline & Zalo Widgets */}
      <ClientFloatingActions />
    </div>
  );
}

export default function ClientLandingPage() {
  return (
    <React.Suspense fallback={<div className="min-h-screen bg-white" />}>
      <ClientLandingContent />
    </React.Suspense>
  );
}
