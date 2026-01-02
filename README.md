# Midnight NIGHT to DUST DApp

[![CI](https://github.com/midnightntwrk/midnight-cnight-to-dust-dapp/actions/workflows/ci.yml/badge.svg)](https://github.com/midnightntwrk/midnight-cnight-to-dust-dapp/actions/workflows/ci.yml)
[![Coverage](https://img.shields.io/badge/coverage-report-blue)](https://github.com/midnightntwrk/midnight-cnight-to-dust-dapp/actions/workflows/ci.yml)

A cross-chain decentralized application that enables DUST token generation on the Midnight network based on NIGHT token holdings on Cardano. The application creates an on-chain mapping between Cardano addresses and Midnight addresses through smart contract transactions.

> **Note on Token Naming:** The token is technically called "cNIGHT" (Cardano NIGHT) in configuration and environment variables, but is displayed as "NIGHT" throughout the user interface for simplicity.

## What It Does

The dApp allows users to:

1. **Register** a mapping between their Cardano wallet address (holding NIGHT tokens) and their Midnight wallet address
2. **Generate DUST tokens** on Midnight based on their registered NIGHT holdings on Cardano
3. **Update** their registered Midnight address while maintaining the same Cardano address registration
4. **Deregister** their address mapping to permanently stop DUST token generation

The system uses 8 Plutus smart contracts deployed on Cardano to manage registration UTXOs containing address mappings and authentication tokens.

## Quick Start

### Prerequisites

- Node.js 18+
- Yarn 1.22.22
- Cardano wallet (Nami, Eternl, Lace, etc.)
- Midnight wallet (mnLace) or Midnight address

### Installation and Execution

```bash
# Clone the repository
git clone <repository-url>
cd midnight-cnight-to-dust-dapp

# Install dependencies
yarn install

# Configure environment variables
cp .env.local.example .env.local
# Edit .env.local with your Blockfrost API keys and network settings

# Start development server
yarn dev

# Build for production
yarn build

# Start production server
yarn start
```

The application runs on `http://localhost:3000` by default.

### Environment Configuration

Required environment variables in `.env.local`:

```bash
# Network Selection
NEXT_PUBLIC_CARDANO_NET="Preview"

# Blockfrost API Keys (server-side only)
BLOCKFROST_KEY_MAINNET=""
BLOCKFROST_KEY_PREVIEW="your_preview_key_here"
BLOCKFROST_KEY_PREPROD=""

# cNIGHT Token Configuration
NEXT_PUBLIC_PREVIEW_CNIGHT_CURRENCY_POLICY_ID="03cf16101d110dcad9cacb225f0d1e63a8809979e7feb60426995414"
NEXT_PUBLIC_PREVIEW_CNIGHT_CURRENCY_ENCODEDNAME=""

# Server Configuration
NEXT_PUBLIC_REACT_SERVER_BASEURL="http://localhost"
NEXT_PUBLIC_REACT_SERVER_URL="$NEXT_PUBLIC_REACT_SERVER_BASEURL:3000"
```

## Transaction Processes

The application supports three main transaction types for managing address mappings:

### Registration Process

Creates a new on-chain mapping between a Cardano address and a Midnight address.

**Key Steps:**

1. Connect Cardano wallet
2. Connect Midnight wallet or enter Midnight address manually
3. Execute registration transaction (mints authentication token, creates registration UTXO)
4. Poll for transaction confirmation and UTXO indexing
5. Automatic redirect to dashboard

**Transaction Structure:**

- Mints: 2 authentication tokens (minting policy + named token)
- Output: Registration UTXO with 1.586080 ADA, auth token, and inline datum containing address mapping
- On-chain result: UTXO at DUST Mapping Validator address proving registration

See [**REGISTRATION.md**](./docs/REGISTRATION.md) for complete technical details.

### Update Process

Modifies the Midnight address in an existing registration while keeping the Cardano address unchanged.

**Key Steps:**

1. Enter new Midnight address in dashboard
2. Execute update transaction (consumes old UTXO, creates new one)
3. Poll for confirmation and new UTXO
4. Dashboard updates with new address

**Transaction Structure:**

- Consumes: Existing registration UTXO
- Mints: 1 spend policy token (Constructor 1 = Update)
- Output: New registration UTXO with updated datum (same auth token preserved)
- On-chain result: Updated UTXO with new Midnight address

See [**UPDATE.md**](./docs/UPDATE.md) for complete technical details.

### Deregistration Process

Permanently removes the address mapping and stops DUST generation.

**Key Steps:**

1. Click "Stop Generation" in dashboard
2. Confirm deregistration warning
3. Execute deregistration transaction (consumes UTXO, burns auth token)
4. Automatic wallet disconnect and redirect to home

**Transaction Structure:**

- Consumes: Registration UTXO
- Mints: 2 tokens (burning policy + spend policy Constructor 0 = Deregister)
- Burns: -1 auth token (negative mint)
- Outputs: None (UTXO fully consumed, ADA returned as change)
- On-chain result: No UTXO exists, registration completely removed

See [**DEREGISTRATION.md**](./docs/DEREGISTRATION.md) for complete technical details.

## API Integration

The application provides three API routes for blockchain interaction and registration status queries.

### Blockfrost Proxy

**Endpoint:** `/api/blockfrost/*`

Server-side proxy that forwards requests to Blockfrost API while keeping API keys secure. Supports all HTTP methods and streams responses for optimal performance.

**Purpose:**

- Hide Blockfrost API keys from client-side code
- Enable client-side Lucid transaction building
- Query blockchain data for UTXO searches and transaction confirmation

### DUST Generation Status API

**Endpoints:**

- `GET /api/dust/generation-status/[key]` - Query single stake key
- `GET /api/dust/generation-status` - Query multiple stake keys (batch)

GraphQL-based API for querying registration status from the Midnight Indexer.

**Response Format:**

```json
{
  "success": true,
  "data": [
    {
      "cardanoRewardAddress": "stake1...",
      "dustAddress": "mn1q...",
      "registered": true,
      "nightBalance": "1000000",
      "generationRate": "8267000000",
      "currentCapacity": "2500000000000000000"
    }
  ]
}
```

**Field Descriptions:**

- `cardanoRewardAddress`: The Cardano stake address (bech32 format: `stake1...` or `stake_test1...`)
- `dustAddress`: The Midnight address where DUST is generated (null if not registered)
- `registered`: Boolean flag indicating if the address mapping is active
- `nightBalance`: Current NIGHT token balance in lovelace format (raw integer)
- `generationRate`: DUST generation rate in the smallest unit
- `currentCapacity`: Current DUST balance capacity in the smallest unit

**Simulation Mode:**

For development without live indexer infrastructure, enable simulation mode to return mock data:

```bash
SIMULATION_MODE=true
```

### Migration Strategy

The application currently uses Blockfrost for UTXO searches and transaction confirmation. The indexer API integration is prepared but not yet active, pending indexer deployment. Once ready, the system will switch to faster indexer-based registration status queries.

See [**API.md**](./docs/API.md) for complete API documentation, error handling, security considerations, and migration plans.

## Dashboard Features

### DUST Lifecycle Chart

The dashboard includes an interactive lifecycle chart that visualizes DUST generation progress over time. The chart automatically displays different states:

- **Generating** - NIGHT balance is actively generating DUST (green indicator)
- **Capped** - Generation has reached maximum capacity (orange indicator)
- **Decaying** - DUST balance is decreasing (red indicator)
- **Syncing** - Indexer is syncing registration data (amber indicator with pulse animation)

**Availability:** The chart accordion is automatically disabled when:

- The indexer is still syncing registration data
- The current DUST balance is 0 (no generation has started yet)

Users will see a helpful tooltip explaining why the chart is unavailable and when it will become accessible.

### Generation Rate & CAP

The Generation Rate card displays two key metrics:

- **Generation Rate:** Real-time DUST generation rate from indexer data (DUST/H)
- **CAP:** Maximum DUST generation capacity calculated from wallet balance

**Important:** The CAP is always calculated from the user's current wallet balance (`NIGHT Balance × 10`) to ensure accuracy. This real-time calculation prevents displaying outdated values if the indexer data lags behind actual wallet state.

### Indexer Sync Banner

When a user successfully registers on-chain but the indexer hasn't yet synced the registration, a banner appears at the top of the dashboard:

- Explains that registration was successful on Cardano
- Indicates the indexer is currently syncing
- Shows estimated sync time
- Provides reassurance that DUST generation will begin once sync completes

This prevents user confusion during the brief period between blockchain confirmation and indexer synchronization.

## Smart Contract Integration

The application integrates with 8 Plutus smart contracts deployed on Cardano that manage the DUST generation system.

### Contract System Overview

1. **Version Oracle Validator** - Stores reference scripts for other contracts
2. **DUST Mapping Validator** - Holds registration UTXOs with address mappings
3. **DUST Auth Token Minting Policy** - Mints initial auth token during registration
4. **DUST Auth Token Policy** - Main authentication token policy
5. **DUST Auth Token Burning Policy** - Enables auth token burning during deregistration
6. **DUST Mapping Validator Spend Policy** - Controls spending from mapping validator
7. **Versioning Policy** - Manages contract version upgrades
8. **Multi-Sig Governance Policy** - Governance for system administration

### Key Features

- **Parameterized Contracts:** All contracts reference a genesis UTXO to ensure deployment uniqueness
- **Version Oracle Pattern:** Upgradeable contract logic using reference scripts stored in version oracle UTXOs
- **Authentication Tokens:** Each registration mints a unique auth token proving ownership
- **Reference Scripts:** Contracts use reference inputs to reduce transaction size and costs

### Integration Approach

The dApp loads contract bytecode from the `/public` directory, parses addresses and policy IDs, and uses Lucid Evolution to build transactions that interact with the smart contracts. The `DustProtocolContext` manages contract loading and provides a registry to transaction builders.

See [**DAPP_INTEGRATION_GUIDE.md**](./DAPP_INTEGRATION_GUIDE.md) for complete smart contract specifications, deployment procedures, transaction structures, and integration patterns.

## Technology Stack

- **Framework:** Next.js 15 with App Router and Turbopack
- **UI:** HeroUI component library with Tailwind CSS 4.x
- **Type Safety:** TypeScript with strict mode
- **Blockchain:**
  - Cardano: Lucid Evolution v0.4.29 for transaction building
  - Midnight: Wallet API v5.0.0 for shielded address support
- **State Management:** React Context API
- **Data Fetching:** GraphQL via graphql-request, REST endpoints

## Development Guidelines

### Project Structure

```
src/
├── app/              # Next.js App Router pages
├── components/       # React components (onboard, dashboard, modals, ui)
├── contexts/         # React Context providers (wallet, protocol, transaction)
├── hooks/            # Custom hooks (useToast, useGenerationStatus, useRegistrationUtxo)
├── lib/              # Utilities (transaction builders, contract utils, logger)
├── config/           # Configuration (network, protocol parameters, contracts)
└── types/            # TypeScript type definitions
```

### Commands

```bash
yarn dev      # Start development server with Turbopack
yarn build    # Build production application
yarn start    # Start production server
yarn lint     # Run ESLint
```

### Commit Convention

- `feat:` New features
- `fix:` Bug fixes
- `docs:` Documentation updates
- `style:` Code style changes
- `refactor:` Code refactoring
- `test:` Test additions or updates

## Additional Documentation

- **[REGISTRATION.md](./docs/REGISTRATION.md)** - Complete registration process documentation
- **[UPDATE.md](./docs/UPDATE.md)** - Address update process documentation
- **[DEREGISTRATION.md](./docs/DEREGISTRATION.md)** - Deregistration process documentation
- **[API.md](./docs/API.md)** - API routes documentation with examples
- **[DAPP_INTEGRATION_GUIDE.md](./DAPP_INTEGRATION_GUIDE.md)** - Smart contract integration guide
