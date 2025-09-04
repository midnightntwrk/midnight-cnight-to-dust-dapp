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
1. **Home** (`/`) - Landing with registration/login options, RequirementsCard, FAQs, Footer
2. **Onboard** (`/onboard`) - 3-step wallet connection process with custom stepper
3. **Dashboard** (`/dashboard`) - Main interface for DUST generation with wallet cards

## Key Components

### Home Page Components (`src/components/`)
- `Home.tsx` - Complete landing page with integrated UI components
- `ui/RequirementsCard.tsx` - Requirements section with wallet icon
- `ui/Faqs.tsx` - Accordion-based FAQ section
- `ui/Footer.tsx` - Full-featured footer with links, signup form, social media

### Onboarding Components (`src/components/onboard/`)
- `Stepper.tsx` - Custom 3-step progress indicator with responsive design
- `ConnectCardanoCard.tsx` - Complete Cardano wallet connection card (connect + connected states)
- `ConnectMidnightCard.tsx` - Complete Midnight wallet connection card (connect + connected states)  
- `MatchAddressesCard.tsx` - Final step showing both wallet details with match button
- `AddressMatchingModal.tsx` - Success modal with dashboard navigation

### Wallet Context (`src/contexts/WalletContext.tsx`)
- Unified state management for Cardano & Midnight wallets
- Auto-reconnection via localStorage
- Supports 8+ Cardano wallets + Midnight Lace
- Real-time balance tracking with UTXO parsing

### Navigation (`src/components/Navbar.tsx`)
- Simplified navigation (Home, Dashboard)
- Dynamic wallet status indicators
- Connection status badges

### Dashboard (`src/components/Dashboard.tsx`)
- Wallet status cards with generation info
- Raw wallet data display for debugging

## Recent Major Updates (Latest Session)

### 🎨 Complete UI Redesign
- **Home Page**: Added RequirementsCard, FAQs accordion, and full Footer
- **Onboarding Flow**: Complete redesign matching design mockups
- **Dark Theme**: Consistent `#70707040` card backgrounds, `#0000FE` primary buttons

### 🚀 Custom Onboarding System
- **Responsive Stepper**: Horizontal (desktop) / Vertical (mobile) layouts
- **Smart Card Visibility**: Hides previous steps when both wallets connected
- **Seamless Flow**: Step 1 → Step 2 → Step 3 with proper state management

### 💳 Wallet Cards
- **ConnectCardanoCard**: Both connection and connected states with Cardano logo
- **ConnectMidnightCard**: Both connection and connected states with Midnight logo  
- **MatchAddressesCard**: Final step combining both wallet information
- **Copy Functionality**: Address copying with icons
- **Disconnect Options**: Individual wallet disconnection

### 🎯 Enhanced Features
- **Address Formatting**: Consistent `first9...last9` truncation
- **Balance Display**: NIGHT tokens for Cardano, Shielded DUST for Midnight
- **Icon Integration**: Check, copy, info icons throughout
- **Modal System**: Separated address matching confirmation
- **Navigation**: Automatic redirect to dashboard after onboarding

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
- Full-width footer layout

### Layout (`src/app/layout.tsx`)
- Integrated Footer component
- Providers setup for themes and wallets

## Development Notes

### Current State
- **Complete Onboarding Flow**: Fully functional 3-step process
- **Responsive Design**: Mobile, tablet, desktop optimized
- **Dark Theme UI**: Professional dark interface throughout
- **Wallet Integration**: Full Cardano + Midnight support
- **Navigation System**: Clean routing between pages

### Environment Variables
- `NEXT_PUBLIC_BLOCKFROST_URL` - Cardano API endpoint
- `NEXT_PUBLIC_BLOCKFROST_API_KEY` - Blockfrost API key

### Supported Wallets
**Cardano**: Nami, Eternl, Lace, Flint, Typhon, NuFi, Gero, CCVault
**Midnight**: Lace (Midnight-enabled)

### Asset Integration
- `src/assets/cardano.svg` - Cardano logo for wallet cards
- `src/assets/midnight.svg` - Midnight logo for wallet cards
- `src/assets/icons/` - Various UI icons (copy, check, info, wallet, etc.)

## Component Architecture

### Responsive Design Patterns
- **Mobile-first**: Components designed for mobile, enhanced for desktop
- **Conditional Layouts**: Different layouts per breakpoint
- **Flexible Cards**: Consistent card system across all components
- **Icon System**: SVG icons with proper sizing and hover states

### State Management Flow
1. **WalletContext**: Central wallet state management
2. **Component Props**: Data flows down from context
3. **Event Callbacks**: Actions bubble up to context
4. **Local Storage**: Persistent wallet connections

## Common Tasks

### Adding New Onboarding Components
```bash
# Components go in src/components/onboard/
# Follow existing card patterns
# Use consistent styling: bg-[#70707040], max-w-2xl
# Include both states if applicable
```

### Wallet Integration
- Cardano wallets use CIP-30 standard
- Midnight wallets use custom API
- Both managed through unified WalletContext
- Address formatting: first9...last9 characters

### Styling Guidelines
- **Card Backgrounds**: `bg-[#70707040]` for main cards
- **Primary Buttons**: `bg-[#0000FE]` blue
- **Text Colors**: `text-white` primary, `text-[#FFFFFF50]` secondary
- **Icons**: 16x16px for UI icons, larger for logos
- **Spacing**: Consistent padding and margins

## Testing & Quality
- ESLint configuration present
- TypeScript strict mode
- Component-based architecture
- Responsive design testing needed

---
*Last updated: 2025-09-04 - Major UI redesign and onboarding system completion*