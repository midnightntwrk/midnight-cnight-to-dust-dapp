# Update Midnight Wallet Integration to v4 API with Dust Address Support

## Summary

This PR updates the Midnight wallet integration to use the v4.x DApp Connector API and implements proper Dust address handling throughout the application. The changes ensure compatibility with the latest Midnight wallet standards and improve validation and user experience.

## Key Changes

### 🔍 Dynamic Wallet Discovery
- Removed hardcoded `mnLace` limitation
- Now dynamically discovers all available Midnight wallets from `window.midnight`
- Supports any wallet that implements the v4 API standard

### 🔄 API Migration to v4.x
- Migrated from legacy `enable()` method to new `connect(networkId)` API
- Updated type definitions to use official `InitialAPI` and `ConnectedAPI` from `@midnight-ntwrk/dapp-connector-api`
- Removed custom type definitions in favor of official SDK types

### 💎 Dust Address Integration
- **Registration**: Now uses `getDustAddress()` instead of `getUnshieldedAddress()`
- **Balance Display**: Shows Dust balance from `getDustBalance()` when wallet is connected
- **Address Validation**: Implemented proper Dust address validation using `@midnight-ntwrk/wallet-sdk-address-format`
- All registration and unregistration flows now use Dust addresses

### ✅ Address Validation
- Replaced basic bech32m validation with SDK-based Dust address validation
- Validates address format, type (Dust vs other), and network compatibility
- Applied to both onboarding manual input and update address modal

### 📊 Enhanced Dashboard
- Displays Dust balance and address directly from wallet when connected
- Falls back to indexer data for manual address entries
- Clear tooltips indicating data source (wallet vs indexer)

### 🐛 Bug Fixes
- Fixed TypeScript errors with dynamic wallet name lookups
- Improved error handling and logging throughout wallet connection flow

## Technical Details

### Files Modified
- `src/contexts/WalletContext.tsx` - Core wallet connection logic
- `src/types/midnight.d.ts` - Updated type definitions
- `src/lib/utils.ts` - Added Dust address validation utilities
- `src/components/dashboard/MidnightWalletCard.tsx` - Dashboard display logic
- `src/components/onboard/ConnectMidnightCard.tsx` - Onboarding validation
- `src/components/modals/UpdateAddressModal.tsx` - Update modal validation
- `src/components/wallet-connect/ConnectMidnightWallet.tsx` - Wallet connection UI

### Dependencies
- `@midnight-ntwrk/dapp-connector-api@^4.0.0-beta.2` - v4 API support
- `@midnight-ntwrk/wallet-sdk-address-format@^3.0.0-beta.9` - Address validation

## Testing Checklist

- [x] Connect Midnight wallet and verify Dust address/balance display
- [x] Manual address input validation works correctly
- [x] Registration uses Dust address correctly
- [x] Update address modal validates Dust addresses
- [x] Unregistration uses correct coinPublicKey from Dust address
- [x] Network detection (mainnet/preview) works correctly
- [x] Dynamic wallet discovery finds all available wallets

## Breaking Changes

None - This is a backward-compatible update that enhances functionality.

## Related Issues

Implements requirements for Midnight wallet v4 API integration and Dust address support.

