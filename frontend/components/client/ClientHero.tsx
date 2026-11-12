'use client';

import React, { useEffect, useRef } from 'react';
import Link from 'next/link';
import { ArrowRightOutlined, ArrowDownOutlined } from '@ant-design/icons';

export function ClientHero() {
  const orbitWrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = orbitWrapperRef.current;
    if (!el || typeof window === 'undefined') return;

    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const finePointer = window.matchMedia('(pointer: fine)').matches;
    if (prefersReduced || !finePointer) return;

    let rafId: number | null = null;
    let targetX = 0;
    let targetY = 0;

    const handlePointerMove = (e: PointerEvent) => {
      const nx = (e.clientX / window.innerWidth - 0.5) * 2;
      const ny = (e.clientY / window.innerHeight - 0.5) * 2;
      targetX = nx * 10;
      targetY = ny * 10;

      if (rafId === null) {
        rafId = window.requestAnimationFrame(() => {
          el.style.transform = `translate3d(${targetX.toFixed(1)}px, ${targetY.toFixed(1)}px, 0)`;
          rafId = null;
        });
      }
    };

    window.addEventListener('pointermove', handlePointerMove, { passive: true });
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      if (rafId !== null) window.cancelAnimationFrame(rafId);
    };
  }, []);

  const scrollToSection = (e: React.MouseEvent<HTMLAnchorElement>, targetId: string) => {
    e.preventDefault();
    const element = document.getElementById(targetId);
    if (element) {
      const headerOffset = 90;
      const elementPosition = element.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - headerOffset;
      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth',
      });
    }
  };

  return (
    <section className="relative min-h-[calc(100dvh-92px)] flex items-center justify-center pt-14 pb-24 sm:pt-20 sm:pb-28 px-4 sm:px-6 lg:px-8 overflow-hidden bg-[var(--color-surface)] select-none">
      {/* Subtle Architectural Dot Matrix */}
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-[radial-gradient(#cbd4d0_1px,transparent_1px)] [background-size:28px_28px] opacity-40 pointer-events-none"
      />

      {/* Kinetic Orbital Rings Layer (Subtle Compass / Globe Motion, Pointer-Reactive) */}
      <div
        ref={orbitWrapperRef}
        aria-hidden="true"
        className="absolute inset-0 pointer-events-none flex items-center justify-center transition-transform duration-500 ease-out will-change-transform"
      >
        {/* Outer Dashed Orbit */}
        <div className="relative w-[680px] h-[680px] sm:w-[880px] sm:h-[880px] rounded-full border border-dashed border-[var(--color-primary-900)]/[0.11] hero-orbit-ccw">
          <span className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-[var(--color-primary-700)]/35" />
          <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-[var(--color-border-input)]" />
        </div>

        {/* Inner Crisp Hairline Orbit */}
        <div className="absolute w-[460px] h-[460px] sm:w-[620px] sm:h-[620px] rounded-full border border-[var(--color-primary-900)]/[0.09] hero-orbit-cw">
          <span className="absolute top-1/2 -right-1 -translate-y-1/2 w-2 h-2 rounded-full bg-[var(--color-gold)]/80 ring-4 ring-[var(--color-gold)]/15" />
          <span className="absolute top-1/2 -left-1 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-[var(--color-primary-700)]/45" />
        </div>
      </div>

      {/* Gentle Edge Vignette to Blend Seamlessly into Page Edges */}
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_48%,rgba(248,249,248,0.88)_100%)] pointer-events-none"
      />

      {/* Centered Editorial Content */}
      <div className="relative z-10 max-w-4xl mx-auto w-full text-center flex flex-col items-center">
        {/* Main Editorial Headline with Staggered Line Reveal */}
        <h1 className="text-3xl sm:text-5xl lg:text-[50px] font-extrabold text-[var(--color-text)] leading-[1.2] tracking-[-0.025em] [text-wrap:balance]">
          <span
            className="block hero-reveal"
            style={{ animationDelay: '40ms' }}
          >
            Nền tảng quản trị và điều hành tour
          </span>
          <span
            className="block text-[var(--color-primary-900)] hero-reveal"
            style={{ animationDelay: '140ms' }}
          >
            chuyên biệt dành cho công ty lữ hành
          </span>
        </h1>

        {/* Expanding Champagne Gold Accent Rule */}
        <div
          aria-hidden="true"
          className="w-14 h-[2px] bg-[var(--color-gold)] rounded-full my-7 sm:my-8 hero-line-expand"
          style={{ animationDelay: '240ms' }}
        />

        {/* Centered Brand Taglines */}
        <div className="space-y-2 max-w-2xl mx-auto mb-10 sm:mb-12">
          <p
            className="text-lg sm:text-xl lg:text-[22px] font-bold tracking-tight text-[var(--color-primary-950)] hero-reveal"
            style={{ animationDelay: '300ms' }}
          >
            OPTRIP <span className="text-[var(--color-gold)] mx-1">–</span> One Platform. Every Trip
          </p>
          <p
            className="text-base sm:text-lg font-medium text-[var(--color-text-muted)] leading-relaxed hero-reveal"
            style={{ animationDelay: '380ms' }}
          >
            Một nền tảng – Quản trị mọi hành trình.
          </p>
        </div>

        {/* Centered Dual CTAs with Subtle Tactile Hover Sheen */}
        <div
          className="flex flex-col sm:flex-row items-center justify-center gap-3.5 sm:gap-4 w-full sm:w-auto hero-reveal"
          style={{ animationDelay: '460ms' }}
        >
          <Link href="/login" className="w-full sm:w-auto">
            <button
              type="button"
              className="relative overflow-hidden w-full sm:w-auto min-h-[48px] pl-7 pr-2.5 py-2 rounded-full bg-[var(--color-primary-900)] hover:bg-[var(--color-primary-800)] text-white font-bold text-sm sm:text-[15px] shadow-sm hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] transition-all duration-200 inline-flex items-center justify-between sm:justify-center gap-3.5 group cursor-pointer"
            >
              {/* Subtle Light Reflection Sweep on Hover */}
              <span
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-out bg-[linear-gradient(105deg,transparent_25%,rgba(255,255,255,0.16)_50%,transparent_75%)]"
              />
              <span className="relative z-10">Đăng ký Demo</span>
              <span className="relative z-10 w-8 h-8 rounded-full bg-white/15 flex items-center justify-center transition-all duration-200 group-hover:translate-x-0.5 group-hover:bg-white/25">
                <ArrowRightOutlined className="text-[13px]" aria-hidden="true" />
              </span>
            </button>
          </Link>

          <a
            href="#workflow"
            onClick={(e) => scrollToSection(e, 'workflow')}
            className="w-full sm:w-auto"
          >
            <button
              type="button"
              className="w-full sm:w-auto min-h-[48px] pl-7 pr-2.5 py-2 rounded-full bg-[var(--color-surface)] hover:bg-[var(--color-surface-muted)] text-[var(--color-text)] hover:text-[var(--color-primary-900)] font-bold text-sm sm:text-[15px] border border-[var(--color-border-input)] hover:border-[var(--color-primary-700)] shadow-2xs hover:shadow-sm hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] transition-all duration-200 inline-flex items-center justify-between sm:justify-center gap-3.5 group cursor-pointer"
            >
              <span>Xem quy trình</span>
              <span className="w-8 h-8 rounded-full bg-[var(--color-surface-muted)] group-hover:bg-[var(--color-primary-soft)] text-[var(--color-text-muted)] group-hover:text-[var(--color-primary-900)] flex items-center justify-center transition-all duration-200 group-hover:translate-y-0.5">
                <ArrowDownOutlined className="text-[13px]" aria-hidden="true" />
              </span>
            </button>
          </a>
        </div>
      </div>

      {/* Subtle Bottom Scroll Cue */}
      <div className="absolute bottom-5 sm:bottom-7 left-1/2 -translate-x-1/2 z-10">
        <a
          href="#features"
          onClick={(e) => scrollToSection(e, 'features')}
          className="inline-flex flex-col items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--color-text-soft)] hover:text-[var(--color-primary-900)] transition-colors duration-200 hero-reveal"
          style={{ animationDelay: '600ms' }}
        >
          <span>Khám phá</span>
          <span
            aria-hidden="true"
            className="relative w-[1.5px] h-6 rounded-full bg-[var(--color-border)] overflow-hidden"
          >
            <span className="absolute top-0 left-0 w-full h-3 rounded-full bg-[var(--color-primary-700)] hero-scroll-drop" />
          </span>
        </a>
      </div>
    </section>
  );
}
