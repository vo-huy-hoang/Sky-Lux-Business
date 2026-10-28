'use client';

import React from 'react';
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

export default function ClientLandingPage() {
  return (
    <div className="min-h-[100dvh] flex flex-col bg-white overflow-x-hidden relative">
      {/* 1. Frosted Sticky Navigation Header */}
      <ClientHeader />

      {/* 2. Main Showcase Sections */}
      <main className="flex-1">
        {/* Hero Section with Interactive MacOS Role Preview */}
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
