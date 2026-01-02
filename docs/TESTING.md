# Testing Documentation

## Overview

This document describes the testing infrastructure and test coverage for the Blockfrost API optimization features implemented in the dApp.

## Testing Infrastructure

### Framework

**Vitest** - A fast, modern testing framework built on Vite.

**Key Dependencies:**

- `vitest` - Test runner
- `@vitest/ui` - Web-based test interface
- `@vitest/coverage-v8` - Code coverage reporting
- `@testing-library/react` - React component testing utilities
- `@testing-library/jest-dom` - DOM assertion matchers
- `happy-dom` - Lightweight DOM implementation

### Configuration Files

- `vitest.config.mts` - Main Vitest configuration
- `vitest.setup.mts` - Test setup and global mocks

### Requirements

- Node.js 20+ (required for coverage reporting)
- Node.js 18+ (sufficient for running tests without coverage)

## Running Tests

```bash
# Run all tests
yarn test

# Run tests with UI
yarn test:ui

# Run tests with coverage (requires Node 20+)
yarn test:coverage

# Run tests in watch mode
yarn test:watch
```

## Test Coverage

### Current Test Files

**1. Cache Implementation Tests**

- Location: `src/app/api/blockfrost/[...all]/__tests__/cache.test.ts`
- Tests: 20
- Status: Passing

**2. Exponential Backoff Tests**

- Location: `src/lib/__tests__/exponentialBackoff.test.ts`
- Tests: 14
- Status: Passing

**Total: 34 tests**

### What We Test

#### Cache Implementation

**Cache TTL (Time To Live)**

- Correct expiration time calculation
- Expired entry identification
- Valid entry identification within TTL

**Cache Key Generation**

- Unique keys for different URLs
- Same key for identical requests
- Query parameters included in cache key

**Cache Size Management**

- Size tracking accuracy
- Oldest entry removal when limit reached (500 entries max)

**Cache Statistics**

- Hit counter increments
- Miss counter increments
- Hit rate calculation

**Cache Cleanup**

- Expired entry removal
- Periodic cleanup execution (60 second interval)

**Cache Headers**

- X-Cache header on HIT
- X-Cache header on MISS
- X-Cache-Age header on HIT

**HTTP Method Filtering**

- GET requests cached
- POST requests bypass cache
- PUT requests bypass cache
- DELETE requests bypass cache

#### Exponential Backoff (Priority 2 Optimization)

**Registration UTXO Polling**

- Interval calculation: 3s, 4.5s, 6.75s, 10.1s, 15.2s, 22.8s, 30s...
- Maximum interval cap (30 seconds)
- Initial interval (3 seconds)
- Attempt count in 120 seconds (8-10 attempts)

**Transaction Confirmation Polling**

- Interval calculation: 10s, 13s, 16.9s, 22s, 28.6s, 30s...
- Maximum interval reached by attempt 6
- Attempt count in 15 minutes (25-35 attempts)

**Backoff Comparison**

- UTXO polling more aggressive than transaction polling
- UTXO faster growth rate (1.5x vs 1.3x)
- Both cap at same maximum interval

**Time Remaining Calculation**

- Wait only for remaining time if less than next interval
- Use full interval if enough time remaining

**API Call Reduction**

- Registration UTXO: 50% reduction verified (20 calls to 9 calls)
- Transaction confirmation: 50% reduction verified (60 calls to 27 calls)

## Test Organization

### Directory Structure

```
src/
├── app/
│   └── api/
│       └── blockfrost/
│           └── [...all]/
│               ├── route.ts
│               └── __tests__/
│                   └── cache.test.ts
└── lib/
    └── __tests__/
        └── exponentialBackoff.test.ts
```

### Test File Naming

- Test files use `.test.ts` extension
- Located in `__tests__` directory adjacent to source code
- Named after the feature being tested

## Covered Source Files

Tests cover the following optimizations:

**Priority 1: Duplicate UTXO Fetch Elimination**

- File: `src/hooks/useRegistrationUtxo.ts`
- Feature: Direct Blockfrost-to-Lucid UTXO conversion
- Impact: 50% reduction in registration-related API calls

**Priority 2: Exponential Backoff**

- Files: `src/hooks/useRegistrationUtxo.ts`, `src/contexts/TransactionContext.tsx`
- Feature: Progressive polling intervals
- Impact: 55% reduction in polling API calls

**Priority 4: Request Caching**

- File: `src/app/api/blockfrost/[...all]/route.ts`
- Feature: In-memory cache with 15-second TTL
- Impact: 30-40% reduction through cache hits

## Mock Configuration

Tests use the following mocks:

**Next.js Mocks**

- `next/navigation` - Router hooks
- `next/image` - Image component

**Browser APIs**

- `window.cardano` - Cardano wallet API
- `window.midnight` - Midnight wallet API

**Environment Variables**

- `NEXT_PUBLIC_CARDANO_NET=Preview`
- `NEXT_PUBLIC_DEBUG=false`

## Adding New Tests

1. Create test file in `__tests__` directory
2. Import test utilities: `import { describe, it, expect } from 'vitest'`
3. Write tests using describe/it blocks
4. Run tests: `yarn test`
