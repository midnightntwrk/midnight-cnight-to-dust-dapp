import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import GenerationRateCard from '../GenerationRateCard';

// Mock logger
vi.mock('@/lib/logger', () => ({
  logger: { log: vi.fn(), error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}));

// Mock specksToTDust
vi.mock('@/lib/specksToTDust', () => ({
  specksToTDust: vi.fn((s: string) => `converted_${s}`),
}));

// Mock formatNumber
vi.mock('@/lib/utils', () => ({
  formatNumber: vi.fn((n: number) => `${n}`),
}));

// Mock heroui
vi.mock('@heroui/react', () => ({
  Card: ({ children, className }: { children: React.ReactNode; className?: string }) =>
    React.createElement('div', { 'data-testid': 'card', className }, children),
  Tooltip: ({ children }: { children: React.ReactNode }) => React.createElement('div', null, children),
}));

// Mock WalletContext
const mockWalletContext = {
  generationStatus: null as null | { registered: boolean; generationRate: string; currentCapacity: string },
  cardano: { balanceNight: null as string | null },
  registrationUtxo: null as null | object,
};

vi.mock('@/contexts/WalletContext', () => ({
  useWalletContext: () => mockWalletContext,
}));

describe('GenerationRateCard', () => {
  beforeEach(() => {
    mockWalletContext.generationStatus = null;
    mockWalletContext.cardano = { balanceNight: null };
    mockWalletContext.registrationUtxo = null;
  });

  it('should render "0" for generation rate when no data and not syncing', () => {
    render(React.createElement(GenerationRateCard));
    expect(screen.getByText('0')).toBeDefined();
  });

  it('should render "..." when indexer is syncing', () => {
    mockWalletContext.registrationUtxo = { txHash: 'abc', outputIndex: 0 };
    mockWalletContext.generationStatus = { registered: false, generationRate: '0', currentCapacity: '0' };

    render(React.createElement(GenerationRateCard));
    // Both generation rate and CAP show "..." when syncing/no balance
    const dots = screen.getAllByText('...');
    expect(dots.length).toBeGreaterThanOrEqual(1);
  });

  it('should render converted generation rate when indexer is synced', () => {
    mockWalletContext.generationStatus = {
      registered: true,
      generationRate: '500000000000000',
      currentCapacity: '2000000000000000',
    };

    render(React.createElement(GenerationRateCard));
    expect(screen.getByText('converted_500000000000000')).toBeDefined();
  });

  it('should show "..." for CAP when no NIGHT balance', () => {
    mockWalletContext.cardano = { balanceNight: null };
    render(React.createElement(GenerationRateCard));
    // There should be "..." text for CAP
    const dots = screen.getAllByText('...');
    expect(dots.length).toBeGreaterThanOrEqual(1);
  });

  it('should calculate CAP as NIGHT balance * 5', () => {
    mockWalletContext.cardano = { balanceNight: '100' };
    render(React.createElement(GenerationRateCard));
    // 100 * 5 = 500, formatNumber returns "500"
    expect(screen.getByText('500')).toBeDefined();
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
});
