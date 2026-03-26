import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import ReplicateRegistrationBanner from '../ReplicateRegistrationBanner';
import { UTxO } from '@lucid-evolution/lucid';

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

vi.mock('@heroui/spinner', () => ({
  Spinner: function MockSpinner() {
    return React.createElement('span', { 'data-testid': 'spinner' }, 'loading');
  },
}));

vi.mock('next/image', () => ({
  default: function MockImage(props: Record<string, unknown>) {
    return React.createElement('img', props);
  },
}));

const makeUtxo = (txHash: string, outputIndex: number): UTxO => ({
  txHash,
  outputIndex,
  address: 'addr_test1qz...',
  assets: { lovelace: 2000000n },
});

describe('ReplicateRegistrationBanner', () => {
  it('should render nothing when isVisible is false', () => {
    const { container } = render(
      React.createElement(ReplicateRegistrationBanner, {
        isVisible: false,
        replicateUtxos: [makeUtxo('abc123ff', 0)],
        onRemoveReplicate: vi.fn(),
        removingTxHash: null,
      })
    );
    expect(container.innerHTML).toBe('');
  });

  it('should render nothing when replicateUtxos is empty', () => {
    const { container } = render(
      React.createElement(ReplicateRegistrationBanner, {
        isVisible: true,
        replicateUtxos: [],
        onRemoveReplicate: vi.fn(),
        removingTxHash: null,
      })
    );
    expect(container.innerHTML).toBe('');
  });

  it('should render banner with correct count for 1 replicate', () => {
    render(
      React.createElement(ReplicateRegistrationBanner, {
        isVisible: true,
        replicateUtxos: [makeUtxo('aabbccdd11223344556677889900aabbccddeeff11223344556677889900aabb', 0)],
        onRemoveReplicate: vi.fn(),
        removingTxHash: null,
      })
    );
    expect(screen.getByText('Replicate Registrations Detected (1)')).toBeDefined();
  });

  it('should render banner with correct count for multiple replicates', () => {
    const utxos = [
      makeUtxo('aabbccdd11223344556677889900aabbccddeeff11223344556677889900aabb', 0),
      makeUtxo('11223344556677889900aabbccddeeff11223344556677889900aabbccddeeff', 1),
      makeUtxo('ffeeddccbbaa00998877665544332211ffeeddccbbaa00998877665544332211', 2),
    ];
    render(
      React.createElement(ReplicateRegistrationBanner, {
        isVisible: true,
        replicateUtxos: utxos,
        onRemoveReplicate: vi.fn(),
        removingTxHash: null,
      })
    );
    expect(screen.getByText('Replicate Registrations Detected (3)')).toBeDefined();
    // Should have 3 Remove buttons
    const removeButtons = screen.getAllByText('Remove');
    expect(removeButtons).toHaveLength(3);
  });

  it('should call onRemoveReplicate with the correct utxo when Remove is clicked', () => {
    const onRemove = vi.fn();
    const utxo = makeUtxo('aabbccdd11223344556677889900aabbccddeeff11223344556677889900aabb', 0);
    render(
      React.createElement(ReplicateRegistrationBanner, {
        isVisible: true,
        replicateUtxos: [utxo],
        onRemoveReplicate: onRemove,
        removingTxHash: null,
      })
    );
    fireEvent.click(screen.getByText('Remove'));
    expect(onRemove).toHaveBeenCalledWith(utxo);
  });

  it('should show spinner and disable buttons when a replicate is being removed', () => {
    const txHash = 'aabbccdd11223344556677889900aabbccddeeff11223344556677889900aabb';
    const utxos = [
      makeUtxo(txHash, 0),
      makeUtxo('11223344556677889900aabbccddeeff11223344556677889900aabbccddeeff', 1),
    ];
    render(
      React.createElement(ReplicateRegistrationBanner, {
        isVisible: true,
        replicateUtxos: utxos,
        onRemoveReplicate: vi.fn(),
        removingTxHash: txHash,
      })
    );
    // The one being removed shows "Removing..."
    expect(screen.getByText('Removing...')).toBeDefined();
    expect(screen.getByTestId('spinner')).toBeDefined();
    // All buttons should be disabled
    const buttons = screen.getAllByRole('button');
    buttons.forEach((btn) => {
      expect(btn.hasAttribute('disabled') || btn.getAttribute('disabled') !== null).toBe(true);
    });
  });

  it('should display truncated tx hashes', () => {
    const txHash = 'aabbccdd11223344556677889900aabbccddeeff11223344556677889900aabb';
    render(
      React.createElement(ReplicateRegistrationBanner, {
        isVisible: true,
        replicateUtxos: [makeUtxo(txHash, 5)],
        onRemoveReplicate: vi.fn(),
        removingTxHash: null,
      })
    );
    // Should show truncated hash: first 8 + ... + last 8 + #outputIndex
    expect(screen.getByText('aabbccdd...9900aabb#5')).toBeDefined();
  });
});
