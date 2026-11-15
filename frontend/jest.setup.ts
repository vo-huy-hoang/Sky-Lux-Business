import '@testing-library/jest-dom';

// Official Ant Design window.matchMedia mock for JSDOM
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

if (typeof global.ResizeObserver === 'undefined') {
  class MockResizeObserver {
    observe = jest.fn();
    unobserve = jest.fn();
    disconnect = jest.fn();
  }
  if (typeof window !== 'undefined') {
    (window as any).ResizeObserver = MockResizeObserver;
  }
  (global as any).ResizeObserver = MockResizeObserver;
}

if (typeof global.MessageChannel === 'undefined') {
  (global as any).MessageChannel = class MockMessageChannel {
    port1: any;
    port2: any;
    constructor() {
      this.port1 = {
        onmessage: null,
        postMessage: (data: any) => {
          if (typeof this.port2.onmessage === 'function') {
            queueMicrotask(() => this.port2.onmessage({ data }));
          }
        },
        close: () => {},
      };
      this.port2 = {
        onmessage: null,
        postMessage: (data: any) => {
          if (typeof this.port1.onmessage === 'function') {
            queueMicrotask(() => this.port1.onmessage({ data }));
          }
        },
        close: () => {},
      };
    }
  };
}

// Global Next.js navigation mocks for App Router
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
    back: jest.fn(),
    forward: jest.fn(),
    refresh: jest.fn(),
  }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
  useParams: () => ({}),
}));
