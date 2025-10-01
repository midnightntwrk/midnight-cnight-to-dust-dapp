# Console Logs Audit Report

**Total Console Statements:** 183 across 16 files

## Summary by Category

### 🔧 Core Libraries (High Volume - Production Critical)
- **dustTransactionsUtils.ts**: 59 console statements
  - Transaction building steps
  - Contract validation
  - UTXO queries
  - Error handling

- **dustProtocolUtils.ts**: 13 console statements
  - Protocol setup status checks
  - Version Oracle validation
  - Setup step verification

- **contractUtils.ts**: 16 console statements
  - Contract loading
  - Hash computation
  - Contract registry management

### 🎣 Hooks (Medium Volume - User Feedback)
- **useRegistrationUtxo.ts**: 17 console statements
  - UTXO search operations
  - Polling attempts
  - Datum deserialization

- **useGenerationStatus.ts**: 2 console statements

### 🌐 Contexts (Medium Volume - State Management)
- **WalletContext.tsx**: 14 console statements
  - Wallet connection/disconnection
  - Address management
  - Auto-reconnection
  - Redirect logic

- **TransactionContext.tsx**: 12 console statements
  - Transaction state changes
  - Confirmation polling
  - Progress tracking

- **DustProtocolContext.tsx**: 8 console statements
  - Contract loading
  - Protocol status

### 🖥️ Components (Low Volume - User Actions)
- **Onboard.tsx**: 6 console statements
- **MidnightWalletCard.tsx**: 14 console statements
- **Footer.tsx**: 1 console statement

### ⚙️ Configuration & API (Low Volume)
- **network.ts**: 4 console statements
- **utils.ts**: 6 console statements (5 commented out)
- **api/blockfrost/[...all]/route.ts**: 7 console statements
- **api/dust/generation-status/route.ts**: 1 console statement
- **api/dust/generation-status/[key]/route.ts**: 3 console statements

---

## Recommended Actions

### 1. **Keep for Production (Critical Debugging)**
Files where logs help debug production issues:
- ✅ All API routes (`src/app/api/**`)
- ✅ Error-only logs in critical paths
- ✅ Transaction submission/confirmation logs

### 2. **Remove for Production (Development Only)**
Files with verbose step-by-step logging:
- ❌ `dustTransactionsUtils.ts` - Step-by-step transaction building (59 logs)
- ❌ `dustProtocolUtils.ts` - Protocol status checks (13 logs)
- ❌ `contractUtils.ts` - Contract loading details (16 logs)
- ❌ `useRegistrationUtxo.ts` - Search/polling details (17 logs)

### 3. **Convert to Environment-Based Logging**
Replace with conditional logging based on `process.env.NODE_ENV`:
- 🔄 `WalletContext.tsx` - Connection/redirect logs
- 🔄 `TransactionContext.tsx` - Progress tracking
- 🔄 `DustProtocolContext.tsx` - Contract loading

### 4. **Strategy: Logger Utility**
Create a logger utility that:
- Respects `NODE_ENV` (dev/production)
- Allows feature-specific debug flags
- Provides consistent prefixes
- Can be toggled via environment variables

---

## Files Breakdown

### High Priority (Remove Most Logs)

#### `src/lib/dustTransactionsUtils.ts` (59 logs)
```
Lines with console.log:
- Transaction building steps (🔧, 🔨, 📎, 🔧)
- Contract queries (🔍, 📥, 🔎)
- Success confirmations (✅, 🎯)
- Error handling (❌)
```

#### `src/lib/contractUtils.ts` (16 logs)
```
Lines with console.log:
- Contract loading progress
- Hash/address computation
- Registry management
- Error handling
```

#### `src/hooks/useRegistrationUtxo.ts` (17 logs)
```
Lines with console.log:
- Search operations
- Polling attempts (20 max)
- UTXO validation
- Datum deserialization
```

### Medium Priority (Conditional Logging)

#### `src/contexts/WalletContext.tsx` (14 logs)
```
Lines with console.log:
- Wallet connection/disconnection
- Redirect logic debugging
- Auto-reconnection status
```

#### `src/contexts/TransactionContext.tsx` (12 logs)
```
Lines with console.log:
- Transaction state changes
- Polling confirmation attempts
- Progress updates
```

### Low Priority (Keep Most)

#### API Routes
- `src/app/api/**` - Keep for production debugging
- Error logs are essential for API monitoring

---

## Next Steps

Would you like me to:
1. **Create a logger utility** with environment-based controls?
2. **Clean up specific files** (start with high-priority ones)?
3. **Add conditional logging** to replace verbose console statements?
4. **Remove all non-essential logs** at once?
