import '@testing-library/jest-dom';
import { beforeAll, afterEach, vi } from 'vitest';

// Mock Next.js navigation hooks
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
  }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
  useParams: () => ({}),
}));

// Mock Next.js Image component
vi.mock('next/image', () => ({
  default: () => null,
}));

// Mock window.cardano and window.midnight wallet APIs
beforeAll(() => {
  // @ts-expect-error - Mocking browser globals
  global.window = global.window || {};

  // Mock Cardano wallet API
  // @ts-expect-error - Mocking browser globals
  global.window.cardano = {
    nami: {
      enable: vi.fn(),
      isEnabled: vi.fn(),
      apiVersion: '1.0.0',
      name: 'Nami',
      icon: 'data:image/svg+xml;base64,...',
    },
    eternl: {
      enable: vi.fn(),
      isEnabled: vi.fn(),
      apiVersion: '1.0.0',
      name: 'Eternl',
      icon: 'data:image/svg+xml;base64,...',
    },
  };

  // Mock Midnight wallet API
  // @ts-expect-error - Mocking browser globals
  global.window.midnight = {
    mnLace: {
      enable: vi.fn(),
      isEnabled: vi.fn(),
      apiVersion: '1.0.0',
      name: 'Midnight Lace',
    },
  };
});

// Cleanup after each test
afterEach(() => {
  vi.clearAllMocks();
});

// Mock environment variables
process.env.NEXT_PUBLIC_CARDANO_NET = 'Preview';
process.env.NEXT_PUBLIC_DEBUG = 'false';
