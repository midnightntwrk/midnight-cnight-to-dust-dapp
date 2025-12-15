# Midnight NIGHT to DUST DApp

A cross-chain decentralized application that enables DUST token generation on the Midnight network based on cNIGHT token holdings on Cardano. The application creates an on-chain mapping between Cardano addresses and Midnight addresses through smart contract transactions.

## What It Does

The dApp allows users to:

1. **Register** a mapping between their Cardano wallet address (holding cNIGHT tokens) and their Midnight wallet address
2. **Generate DUST tokens** on Midnight based on their registered cNIGHT holdings on Cardano
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
NEXT_PUBLIC_PREVIEW_CNIGHT_CURRENCY_POLICY_ID="fb3cec684bc96575f4ba6ed7f11b1547114d7af41a9f38e552bcfbd2"
NEXT_PUBLIC_PREVIEW_CNIGHT_CURRENCY_ENCODEDNAME=""

# Server Configuration
NEXT_PUBLIC_REACT_SERVER_BASEURL="http://localhost"
NEXT_PUBLIC_REACT_SERVER_URL="$NEXT_PUBLIC_REACT_SERVER_BASEURL:3000"

# Optional: Simulation Mode (for development without indexer)
SIMULATION_MODE=false
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
  "data": [{
    "cardanoStakeKey": "stake1...",
    "dustAddress": "mn1q...",
    "registered": true,
    "nightBalance": "1000000",
    "generationRate": "8267000000",
    "currentCapacity": "2500000000000000000"
  }]
}
```

**Simulation Mode:**

For development without live indexer infrastructure, enable simulation mode to return mock data:

```bash
SIMULATION_MODE=true
```

### Migration Strategy

The application currently uses Blockfrost for UTXO searches and transaction confirmation. The indexer API integration is prepared but not yet active, pending indexer deployment. Once ready, the system will switch to faster indexer-based registration status queries.

See [**API.md**](./docs/API.md) for complete API documentation, error handling, security considerations, and migration plans.

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

- **[Tech-spec.md](./docs/Tech-spec.md)** - Functional and technical specifications with user workflows
- **[REGISTRATION.md](./docs/REGISTRATION.md)** - Complete registration process documentation
- **[UPDATE.md](./docs/UPDATE.md)** - Address update process documentation
- **[DEREGISTRATION.md](./docs/DEREGISTRATION.md)** - Deregistration process documentation
- **[API.md](./docs/API.md)** - API routes documentation with examples
- **[DAPP_INTEGRATION_GUIDE.md](./DAPP_INTEGRATION_GUIDE.md)** - Smart contract integration guide

---

**Network:** Cardano Preview Testnet
**Status:** Active Development
