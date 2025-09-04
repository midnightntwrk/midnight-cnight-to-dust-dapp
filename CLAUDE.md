# Claude Development Notes

## Project Overview
**Midnight cNIGHT to DUST DApp** - A Next.js application for generating private DUST tokens from cNIGHT holdings using Cardano and Midnight blockchain integrations.

## Development Commands
```bash
# Development server
npm run dev
# or with Turbopack (faster)
npm run dev --turbopack

# Build & Production
npm run build
npm run start

# Linting
npm run lint
```

## Key Architecture

### Tech Stack
- **Framework**: Next.js 15.4.6 with App Router
- **UI Library**: HeroUI (NextUI successor) + TailwindCSS v4
- **Font**: Outfit (Google Fonts)
- **Wallet Integration**: Dual blockchain (Cardano + Midnight)
- **State Management**: React Context API

### Core Dependencies
- `@midnight-ntwrk/dapp-connector-api` - Midnight wallet integration
- `@lucid-evolution/lucid` - Cardano blockchain interaction
- `@heroui/react` - UI component library
- `framer-motion` - Animations
- `next-themes` - Dark/light theme support

### Application Flow
1. **Home** (`/`) - Landing with registration/login options
2. **Onboard** (`/onboard`) - 3-step wallet connection process
3. **Dashboard** (`/dashboard`) - Main interface for DUST generation
4. **Connect** (`/connect`) - Direct wallet connection

## Key Components

### Wallet Context (`src/contexts/WalletContext.tsx`)
- Unified state management for Cardano & Midnight wallets
- Auto-reconnection via localStorage
- Supports 8+ Cardano wallets + Midnight Lace
- Real-time balance tracking

### UI Components
- `Home.tsx` - Landing page with action buttons
- `Onboard.tsx` - Step-by-step wallet connection with progress
- `Dashboard.tsx` - Main dashboard with wallet cards
- `Navbar.tsx` - Navigation with wallet status indicators
- Dashboard cards: `CardanoWalletCard.tsx`, `MidnightWalletCard.tsx`

### Wallet Integration
- **Cardano**: CIP-30 standard wallets via Lucid + Blockfrost
- **Midnight**: Native wallet API for privacy features
- **Networks**: Cardano Preview testnet

## Configuration Notes

### Next.js Config (`next.config.ts`)
- WASM support for cryptographic operations
- Async WebAssembly experiments enabled

### TailwindCSS (`tailwind.config.js`)
- HeroUI integration
- Dark mode class-based
- Custom content paths

### Styling (`src/app/globals.css`)
- Google Fonts Outfit import
- Tailwind directives
- Custom HeroUI plugin integration

## Development Notes

### Current State
- Functional wallet connection system
- Placeholder DUST generation logic
- Well-structured TypeScript codebase
- Mobile-responsive UI design

### Environment Variables
- `NEXT_PUBLIC_BLOCKFROST_URL` - Cardano API endpoint
- `NEXT_PUBLIC_BLOCKFROST_API_KEY` - Blockfrost API key

### Supported Wallets
**Cardano**: Nami, Eternl, Lace, Flint, Typhon, NuFi, Gero, CCVault
**Midnight**: Lace (Midnight-enabled)

## Common Tasks

### Adding New Components
```bash
# UI components go in src/components/
# Use HeroUI components for consistency
# Follow existing naming conventions
```

### Wallet Integration
- Cardano wallets use CIP-30 standard
- Midnight wallets use custom API
- Both managed through unified WalletContext

### Styling Guidelines
- Use TailwindCSS classes
- HeroUI components for UI consistency
- Custom colors via CSS variables
- Outfit font family throughout

## Testing & Quality
- ESLint configuration present
- TypeScript strict mode
- No current test setup (consider adding)

---
*Last updated: 2025-09-04*