import { describe, it, expect, beforeEach, vi } from 'vitest';
import { defaultConfig } from '@/config/runtime-config';
import type { RuntimeConfig } from '@/config/runtime-config';

const PREVIEW_VALIDATOR_ADDRESS = 'addr_test1wplxjzranravtp574s2wz00md7vz9rzpucu252je68u9a8qzjheng';
const MAINNET_VALIDATOR_ADDRESS = 'addr1w9e7ft4rrdd4rkdseguxr9hudfxyytm5ckh2qy0yhz7lfeg9lvhq7';

// Mock getRuntimeConfig so we can control CARDANO_NET per test
let mockCardanoNet: 'Mainnet' | 'Preview' | 'Preprod' = 'Preview';
vi.mock('@/config/runtime-config', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/config/runtime-config')>();
  return {
    ...actual,
    getRuntimeConfig: (): RuntimeConfig => ({
      ...defaultConfig,
      CARDANO_NET: mockCardanoNet,
    }),
    getServerRuntimeConfig: (): RuntimeConfig => ({
      ...defaultConfig,
      CARDANO_NET: mockCardanoNet,
    }),
  };
});

import * as Contracts from '../contract_blueprint';
import { getValidatorAddress } from '@/lib/contractUtils';

describe('CnightGeneratesDustCnightGeneratesDustElse', () => {
  beforeEach(() => {
    mockCardanoNet = 'Preview';
  });

  it('derives Preview validator address when CARDANO_NET is Preview', () => {
    mockCardanoNet = 'Preview';
    const dustGenerator = new Contracts.CnightGeneratesDustCnightGeneratesDustElse();
    const address = getValidatorAddress(dustGenerator.Script);
    expect(address).toBe(PREVIEW_VALIDATOR_ADDRESS);
  });

  it('derives Mainnet validator address when CARDANO_NET is Mainnet', () => {
    mockCardanoNet = 'Mainnet';
    const dustGenerator = new Contracts.CnightGeneratesDustCnightGeneratesDustElse();
    const address = getValidatorAddress(dustGenerator.Script);
    expect(address).toBe(MAINNET_VALIDATOR_ADDRESS);
  });

  it('derives Preprod validator address when CARDANO_NET is Preprod', () => {
    mockCardanoNet = 'Preprod';
    const dustGenerator = new Contracts.CnightGeneratesDustCnightGeneratesDustElse();
    const address = getValidatorAddress(dustGenerator.Script);
    expect(address).toBe(PREVIEW_VALIDATOR_ADDRESS);
  });
});
