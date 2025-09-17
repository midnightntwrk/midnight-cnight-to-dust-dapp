# Midnight NIGHT to DUST DApp

A sophisticated cross-chain decentralized application that enables seamless generation of DUST tokens on the Midnight network based on cNIGHT token holdings on Cardano.

## 🚀 Features

### Core Functionality
- **🔗 Dual-Wallet Integration**: Connect both Cardano and Midnight wallets simultaneously
- **🎯 Smart Registration**: Automatic registration status detection with redirect to dashboard
- **🔄 Address Mapping**: Register and manage address mappings between Cardano and Midnight networks
- **💰 DUST Generation**: Real-time tracking of DUST token generation rates
- **📊 Dashboard**: Comprehensive view of generation status, balances, and connected wallets
- **🔒 Privacy-First**: Midnight network integration for privacy-preserving DUST operations

### User Experience
- **✨ Streamlined Onboarding**: Step-by-step wallet connection with progress tracking
- **🌐 Manual Address Input**: Option to input DUST addresses manually without wallet connection
- **📋 Copy to Clipboard**: One-click address copying with toast notifications
- **🔄 Loading States**: Smooth loading experiences with backdrop and progress indicators
- **📱 Responsive Design**: Optimized for both desktop and mobile devices

## 🏗️ Architecture

### Technology Stack
- **Frontend**: Next.js 15 with App Router and Turbopack
- **UI Framework**: HeroUI with Tailwind CSS 4.x
- **Type Safety**: TypeScript throughout the application
- **Blockchain Integration**:
  - Cardano: Lucid Evolution for transaction building
  - Midnight: Midnight SDK with shielded address support
- **State Management**: React Context for wallet and registration status
- **API Integration**: GraphQL subgraph integration with REST endpoints

### Dual-Wallet System
The application manages two distinct wallet ecosystems:

#### Cardano Wallets
- **Supported**: Nami, Eternl, Lace, Flint, Typhon, Nufi, Gero, CCVault
- **Purpose**: cNIGHT token holdings and transaction signing
- **Network**: Cardano Preview testnet with Blockfrost API
- **Features**: UTXO management, balance calculation, auto-reconnection

#### Midnight Wallets
- **Supported**: mnLace (Midnight Lace extension)
- **Purpose**: DUST token generation and privacy operations
- **Features**: Shielded addresses, privacy-preserving transactions
- **Integration**: Client-side balance calculations, manual address input support

### Smart Registration Flow
```mermaid
graph TD
    A[User Connects Cardano] → B[Check Registration Status]
    B → C{Is Registered?}
    C →|Yes| D[Redirect to Dashboard]
    C →|No| E[Continue Onboarding]
    E → F[Connect Midnight Wallet]
    F → G[Register Address Mapping]
    G → H[Redirect to Dashboard]
```

## 🛠️ Development

### Prerequisites
- Node.js 18+
- Yarn 1.22.22 (specified in packageManager)
- Git

### Installation
```bash
# Clone the repository
git clone <repository-url>
cd midnight-cnight-to-dust-dapp

# Install dependencies
yarn install

# Start development server
yarn dev

# Build for production
yarn build

# Run linter
yarn lint
```

### Environment Setup
```bash
# Copy environment template
cp .env.example .env.local

# Configure required variables
BLOCKFROST_API_KEY=your_blockfrost_key
INDEXER_ENDPOINT=http://localhost:8088/api/v1/graphql
```

## 📡 API Integration

### GraphQL Subgraph
The application integrates with a GraphQL subgraph for registration status queries:

```graphql
query GetDustGenerationStatus($cardanoStakeKeys: [String!]!) {
  dustGenerationStatus(cardanoStakeKeys: $cardanoStakeKeys) {
    cardanoStakeKey
    dustAddress
    isRegistered
    generationRate
  }
}
```

### REST Endpoints
- `GET /api/dust/generation-status` - Query all generation statuses
- `GET /api/dust/generation-status/[key]` - Query specific stake key status

## 🎨 Design System

### Custom Theme
The application uses a custom theme built on Tailwind CSS 4.x:

```css
@theme {
  --color-brand-primary: #0000FE;
  --color-brand-primary-hover: #0000CC;
}
```

Usage:
```jsx
<Button className="bg-brand-primary hover:bg-brand-primary-hover">
  Primary Action
</Button>
```

### Component Architecture
- **Reusable UI Components**: Toast notifications, loading backdrops, wallet cards
- **Context Providers**: Centralized wallet state and registration status management
- **Custom Hooks**: `useGenerationStatus`, `useToast` for business logic encapsulation

## 🔒 Security & Privacy

### Privacy Considerations
- **Shielded Addresses**: Midnight integration uses privacy-preserving shielded addresses
- **Client-Side Operations**: Sensitive calculations performed client-side
- **No Server Storage**: No sensitive data stored on application servers
- **Wallet Security**: Standard CIP-30 and Midnight wallet security practices

### Network Configuration
- **Cardano**: Preview testnet for development and testing
- **Midnight**: Testnet integration with privacy features
- **WebAssembly**: Configured for cryptographic operations

## 📱 User Flows

### Registration Flow
1. **Landing Page**: User views application overview
2. **Cardano Connection**: Connect CIP-30 compatible wallet
3. **Registration Check**: Automatic query for existing registration
4. **Midnight Setup**: Connect Midnight wallet or input address manually
5. **Address Mapping**: Register mapping via smart contract
6. **Dashboard Access**: View generation status and manage settings

### Dashboard Features
- **Wallet Cards**: Display connected wallet information with copy functionality
- **Generation Metrics**: Real-time DUST generation rates and totals
- **Address Management**: Update or disconnect wallet connections
- **Action Buttons**: Change addresses, stop generation, manage settings

## 🧪 Testing

The application includes comprehensive testing approaches:
- **Unit Tests**: Component and hook testing
- **Integration Tests**: Wallet connection and API integration
- **E2E Testing**: Complete user flows from connection to dashboard

## 🚀 Deployment

### Production Considerations
- **Environment Variables**: Configure production API endpoints
- **Performance**: Optimized builds with Next.js 15 and Turbopack
- **Monitoring**: Error tracking and user analytics integration
- **Security**: HTTPS enforcement and CSP headers

### Build Optimization
- **Code Splitting**: Automatic splitting for optimal loading
- **Tree Shaking**: Remove unused dependencies
- **Asset Optimization**: Image and font optimization
- **Bundle Analysis**: Monitor bundle sizes and performance

## 🤝 Contributing

### Development Guidelines
- **Code Style**: ESLint with Next.js configuration
- **Type Safety**: Strict TypeScript enforcement
- **Component Structure**: Follow established patterns in `/src/components`
- **State Management**: Use provided contexts for wallet and registration state

### Commit Convention
- `feat:` New features
- `fix:` Bug fixes
- `docs:` Documentation updates
- `style:` Code style changes
- `refactor:` Code refactoring
- `test:` Test additions or updates

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🔗 Links

- **Cardano**: [cardano.org](https://cardano.org)
- **Midnight**: [midnight.network](https://midnight.network)
- **Lucid Evolution**: [lucid.spacebudz.io](https://lucid.spacebudz.io)
- **HeroUI**: [heroui.com](https://heroui.com)

---

**Status**: 🚧 Active Development

This application is under continuous development with regular updates and improvements. Check the [CHANGELOG](CHANGELOG.md) for recent updates and the [roadmap](docs/ROADMAP.md) for upcoming features.