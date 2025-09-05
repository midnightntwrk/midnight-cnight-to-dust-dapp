# cNIGHT Generates DUST DApp

A cross-chain DApp that enables users to generate DUST tokens on Midnight network based on their cNIGHT token holdings on Cardano.

## What it does

This application allows users to:

- **Register address mapping** between Cardano wallet (holding cNIGHT tokens) and Midnight wallet
- **Generate DUST tokens** automatically over time based on cNIGHT holdings
- **Track generation cycles** with real-time balance visualization and decay timeline
- **Manage mappings** (update or deregister addresses as needed)

## How it works

1. Connect both Cardano and Midnight wallets
2. Register mapping between your addresses via Cardano smart contract
3. DUST tokens are generated on Midnight based on your cNIGHT holdings
4. View your private DUST balance and generation timeline
5. Update or deregister mappings as needed

## Tech Stack

- **Frontend**: Next.js 15 with TypeScript, React, Tailwind CSS, HeroUI
- **Cardano Integration**: Lucid Evolution for transaction building
- **Midnight Integration**: Midnight Wallet API for privacy-preserving operations
- **Supported Wallets**: Cardano (Lace, Eternl, Nami, CIP-30 compatible) + Midnight (mnLace)

## Development

```bash
# Install dependencies
npm install
# or
yarn install

# Start development server
npm run dev
# or
yarn dev

# Build for production
npm run build

# Run linter
npm run lint
```

## Status

🚧 **Work in Progress** 🚧

This project is currently under active development.

- Cardano mapping validator smart contract
- DUST generation data API endpoints
- Cross-chain event handling documentation

## Architecture

The app bridges public (Cardano) and private (Midnight) blockchains:
- cNIGHT tokens remain on Cardano's public ledger
- DUST tokens are generated on Midnight's privacy-preserving network
- Address mapping connects both ecosystems while maintaining privacy

## Privacy

Following Midnight's privacy-first approach:
- DUST balances are only visible to wallet owners via shielded addresses
- Client-side balance calculations for enhanced privacy
- No server-side storage of sensitive information