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

  // Mock Midnight wallet API (UUID-keyed object with wallet metadata)
  // @ts-expect-error - Mocking browser globals
  global.window.midnight = {
    'c389fe2c-18c7-4537-bac4-93b17c8218cc': {
      apiVersion: '4.0.1',
      name: 'lace',
      icon: '',
      rdns: 'io.lace.wallet',
      connect: vi.fn(),
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
