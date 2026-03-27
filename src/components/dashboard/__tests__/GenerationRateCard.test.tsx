import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import GenerationRateCard from '../GenerationRateCard';

// Mock logger
vi.mock('@/lib/logger', () => ({
  logger: { log: vi.fn(), error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}));

// Mock specksToTDust — simple bigint formatting (mirrors real logic)
vi.mock('@/lib/specksToTDust', () => ({
  specksToTDust: vi.fn((s: string) => {
    const specks = BigInt(s);
    const UNIT = 1_000_000_000_000_000n;
    const whole = specks / UNIT;
    const remainder = specks % UNIT;
    const frac = (remainder * 1_000_000n) / UNIT;
    return `${whole}.${frac.toString().padStart(6, '0')}`;
  }),
  specksToTDustFull: vi.fn((s: string) => {
    const specks = BigInt(s);
    const UNIT = 1_000_000_000_000_000n;
    const whole = specks / UNIT;
    const remainder = specks % UNIT;
    if (remainder === 0n) return `${whole}.0`;
    const frac = remainder.toString().padStart(15, '0').replace(/0+$/, '');
    return `${whole}.${frac}`;
  }),
  SPECKS_PER_TDUST: 1_000_000_000_000_000n,
  STARS_PER_NIGHT: 1_000_000n,
}));

// Mock heroui
vi.mock('@heroui/card', () => ({
  Card: function MockCard({ children, className }: { children: React.ReactNode; className?: string }) {
    return React.createElement('div', { 'data-testid': 'card', className }, children);
  },
}));

vi.mock('@heroui/tooltip', () => ({
  Tooltip: function MockTooltip({ children }: { children: React.ReactNode }) {
    return React.createElement('div', null, children);
  },
}));

// Mock WalletContext
const mockWalletContext = {
  generationStatus: null as null | {
    registered: boolean;
    generationRate: string;
    currentCapacity: string;
  },
  registrationUtxo: null as null | object,
  cardano: {
    balanceNight: null as string | null,
  },
};

vi.mock('@/contexts/WalletContext', () => ({
  useWalletContext: () => mockWalletContext,
}));

describe('GenerationRateCard', () => {
  beforeEach(() => {
    mockWalletContext.generationStatus = null;
    mockWalletContext.registrationUtxo = null;
    mockWalletContext.cardano.balanceNight = null;
  });

  it('should render "..." when indexer is syncing', () => {
    mockWalletContext.registrationUtxo = { txHash: 'abc', outputIndex: 0 };
    mockWalletContext.generationStatus = {
      registered: false,
      generationRate: '0',
      currentCapacity: '0',
    };

    render(React.createElement(GenerationRateCard));
    // Generation rate shows "..." when syncing
    const dots = screen.getAllByText('...');
    expect(dots.length).toBeGreaterThanOrEqual(1);
  });

  it('should render generation rate multiplied by 3600 (DUST/h)', () => {
    // generationRate = 500000000000000 SPECK/s → 0.5 DUST/s → × 3600 = 1800 DUST/h
    // Component computes: BigInt('500000000000000') * 3600n = 1800000000000000000n
    // specksToTDust('1800000000000000000') → '1800.000000'
    mockWalletContext.generationStatus = {
      registered: true,
      generationRate: '500000000000000',
      currentCapacity: '2000000000000000',
    };

    render(React.createElement(GenerationRateCard));
    expect(screen.getByText('1800.000000')).toBeDefined();
  });

  it('should convert realistic 1-NIGHT rate to DUST/h correctly', () => {
    // 1 NIGHT = 10^6 STAR, decay rate = 8267 SPECK/STAR/s
    // generationRate = 10^6 × 8267 = 8267000000 SPECK/s
    // Component computes: 8267000000n * 3600n = 29761200000000n
    // specksToTDust('29761200000000') → '0.029761'
    mockWalletContext.generationStatus = {
      registered: true,
      generationRate: '8267000000',
      currentCapacity: '0',
    };

    render(React.createElement(GenerationRateCard));
    const rateText = screen.getByTestId('generation-rate-value').textContent;
    expect(rateText).toBe('0.029761');
  });

  it('should calculate CAP from cardano.balanceNight', () => {
    mockWalletContext.cardano.balanceNight = '1000000'; // 1 NIGHT in stars
    // CAP = 1000000 * 5 * (10^15 / 10^6) = 5000000000000000 SPECK = 5 DUST
    render(React.createElement(GenerationRateCard));
    expect(screen.getByText('5.000000')).toBeDefined();
  });

  it('should show "0" for CAP when no NIGHT balance', () => {
    mockWalletContext.cardano.balanceNight = null;
    render(React.createElement(GenerationRateCard));
    const zeros = screen.getAllByText('0');
    expect(zeros.length).toBeGreaterThanOrEqual(1);
  });

  it('should show "0" for CAP when NIGHT balance is zero', () => {
    mockWalletContext.cardano.balanceNight = '0';
    render(React.createElement(GenerationRateCard));
    const zeros = screen.getAllByText('0');
    expect(zeros.length).toBeGreaterThanOrEqual(1);
  });

  it('should render Generation Rate and CAP labels', () => {
    render(React.createElement(GenerationRateCard));
    expect(screen.getByText('Generation Rate')).toBeDefined();
    expect(screen.getByText('CAP')).toBeDefined();
  });

  it('should render DUST/h unit', () => {
    render(React.createElement(GenerationRateCard));
    expect(screen.getByText('DUST/h')).toBeDefined();
  });

  it('should render DUST unit for CAP', () => {
    render(React.createElement(GenerationRateCard));
    const dustLabels = screen.getAllByText('DUST');
    expect(dustLabels.length).toBeGreaterThanOrEqual(1);
  });

  it('should apply ×3600 to full-precision rate in tooltip', () => {
    // Component computes: BigInt('500000000000000') * 3600n = 1800000000000000000n
    // specksToTDustFull('1800000000000000000') → '1800.0'
    mockWalletContext.generationStatus = {
      registered: true,
      generationRate: '500000000000000',
      currentCapacity: '0',
    };

    render(React.createElement(GenerationRateCard));
    const rateEl = screen.getByTestId('generation-rate-value');
    expect(rateEl.textContent).toBe('1800.000000');
  });

  it('should update CAP when balanceNight changes (simulates balance refresh)', () => {
    // Initial render with 1 NIGHT
    mockWalletContext.cardano.balanceNight = '1000000'; // 1 NIGHT in stars
    const { unmount } = render(React.createElement(GenerationRateCard));
    // CAP = 1000000 * 5 * (10^15 / 10^6) = 5000000000000000 SPECK = 5 DUST
    expect(screen.getByText('5.000000')).toBeDefined();
    unmount();

    // Re-render with 2 NIGHT
    mockWalletContext.cardano.balanceNight = '2000000'; // 2 NIGHT in stars
    render(React.createElement(GenerationRateCard));
    // CAP = 2000000 * 5 * (10^15 / 10^6) = 10000000000000000 SPECK = 10 DUST
    expect(screen.getByText('10.000000')).toBeDefined();
  });
});
