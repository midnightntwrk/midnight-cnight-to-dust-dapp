# Registration Process Documentation

## Overview

The registration process creates an on-chain mapping between a user's Cardano address and their Midnight address. This mapping is stored as a UTXO at the DUST Mapping Validator address with an inline datum containing both addresses and an authentication token proving ownership.

## Prerequisites

Before registration can begin, the following conditions must be met:

- Both Cardano and Midnight wallets connected (or manual Midnight address entry)
- Minimum 2.5 ADA balance in Cardano wallet (covers fees and UTXO requirements)
- DUST protocol contracts deployed and initialized on-chain
- No other transaction currently executing

### Midnight Wallet Connection Options

Users can provide their Midnight address through two methods:

1. **Wallet Connection** (Recommended): Connect a Midnight wallet extension which provides both the address and coin public key through the wallet API
2. **Manual Address Entry**: Paste a Midnight shielded address directly into the input field

Both methods produce identical registration results because the coin public key is cryptographically extracted from the address when entered manually.

## Entry Point

User clicks "MATCH ADDRESSES" button in the onboarding interface.

**Location**: `src/components/onboard/MatchAddressesCard.tsx`

The button is disabled until all prerequisites are satisfied. UI validation checks protocol readiness, balance requirements, and transaction state before allowing interaction.

## Step 1: Validation

**Location**: `src/components/Onboard.tsx:59-78`

The `handleMatchAddresses` function performs three critical validations:

1. **Cardano wallet connection**: Verifies `cardano.lucid` instance exists for transaction building
2. **Protocol readiness**: Confirms DUST protocol contracts are deployed via `protocolStatus.isReady`
3. **Midnight coin public key**: Ensures `midnight.coinPublicKey` is available

The `midnight.coinPublicKey` value is obtained through one of two methods:

### Wallet Connection Method

When a user connects a Midnight wallet extension:

**Location**: `src/contexts/WalletContext.tsx:278-279`

```typescript
const address = walletState?.address || null;
const coinPublicKey = walletState?.coinPublicKeyLegacy || null;
```

The wallet API provides:
- `address`: Full Midnight shielded address (132 characters, bech32m encoded)
- `coinPublicKeyLegacy`: 64-character hex string representing the coin public key

### Manual Address Entry Method

When a user manually enters a Midnight address:

**Location**: `src/contexts/WalletContext.tsx:328-365`

The coin public key is extracted from the address using bech32m decoding:

**Location**: `src/lib/utils.ts:extractCoinPublicKeyFromMidnightAddress()`

```typescript
// Decode the Bech32m address
const { prefix, words } = bech32m.decode(address, 200);

// Convert from 5-bit words to 8-bit bytes
const data = bech32m.fromWords(words);

// Extract first 32 bytes as coin public key
const coinPublicKeyBytes = data.slice(0, 32);

// Convert to hex string (64 characters)
const coinPublicKeyHex = Buffer.from(coinPublicKeyBytes).toString('hex');
```

Midnight shielded addresses are structured as:
- First 32 bytes: Coin public key
- Remaining bytes: Encryption public key (up to 36 bytes)

Both methods produce identical 64-character hex coin public keys, ensuring consistent registration behavior regardless of input method.

If any validation fails, the process terminates with an appropriate error message.

## Step 2: Create Registration Executor

**Location**: `src/components/Onboard.tsx:84-88`

```typescript
const registrationExecutor = DustTransactionsUtils.createRegistrationExecutor(
    cardano.lucid as LucidEvolution,
    contracts,
    dustPKHValue
);
```

This factory method returns a function (not executed yet) that will build, sign, and submit the transaction. The executor pattern allows `TransactionContext` to control timing and progress tracking independently of transaction construction logic.

## Step 3: Execute Transaction

**Location**: `src/components/Onboard.tsx:90-95`

```typescript
const transactionState = await transaction.executeTransaction(
    'register',
    registrationExecutor,
    {},
    cardano.lucid as LucidEvolution
);
```

The `TransactionContext` manages the transaction lifecycle through several states:
- `preparing` - Building transaction
- `signing` - Awaiting user approval
- `submitting` - Broadcasting to network
- `confirming` - Polling for confirmation
- `success` or `error` - Final states

Progress callbacks update the UI from 0-100% throughout execution.

## Step 4: Build Registration Transaction

**Location**: `src/lib/dustTransactionsUtils.ts:11-174`

The transaction builder constructs a Cardano transaction with the following structure:

### Reference Inputs
- Version Oracle UTXO containing the auth token minting policy reference script

### Mints
1. DUST Auth Token Minting Policy - 1 token with empty asset name
   - Redeemer: `Constructor 0 []`
2. DUST Auth Token Policy - 1 token named "DUST production auth token"
   - Redeemer: `Constructor 0 []`

### Output to DUST Mapping Validator
- Assets: 1.586080 ADA + 1 DUST Auth Token
- Inline Datum: `Constructor 0 [cardanoPKH, dustPKH]`
  - `cardanoPKH`: User's payment key hash (28 bytes)
  - `dustPKH`: Midnight coin public key encoded as hex bytes

### Scripts Attached
- DUST Auth Token Minting Policy script
- DUST Auth Token Policy script

The transaction is completed by Lucid, which calculates fees and adds a change output back to the user's wallet.

## Step 5: Sign Transaction

**Location**: `src/lib/dustTransactionsUtils.ts:189`

```typescript
const signedTx = await completedTx.sign.withWallet().complete();
```

The user's Cardano wallet extension displays a popup showing transaction details:
- Fee estimate (typically 0.3-0.5 ADA)
- Tokens to be minted (2 auth tokens)
- Output to script address (1.586080 ADA)
- Change output back to user

User must approve to proceed. Rejection throws an error caught by the try/catch block.

## Step 6: Submit to Blockchain

**Location**: `src/lib/dustTransactionsUtils.ts:193`

```typescript
const txHash = await signedTx.submit();
```

The signed transaction is broadcast to the Cardano mempool. The function returns immediately with a transaction hash. At this point, the transaction is submitted but not yet confirmed.

## Step 7: Poll for Confirmation

**Location**: `src/contexts/TransactionContext.tsx:52-103`

The system polls Blockfrost every 15 seconds to check transaction confirmation status. This step uses Blockfrost and will continue to do so as it monitors blockchain transaction confirmation, which is independent of registration status indexing.

```typescript
const pollTransactionConfirmation = async (lucid, txHash) => {
    const maxAttempts = 60;  // 15 minutes maximum

    const pollInterval = setInterval(async () => {
        attempts++;
        const progress = 60 + ((attempts / maxAttempts) * 40);
        setTransactionProgress(progress);

        const txInfo = await lucid.awaitTx(txHash, 3000);

        if (txInfo) {
            clearInterval(pollInterval);
            setTransactionProgress(100);
            setTransactionState('success');
            return;
        }

        if (attempts >= maxAttempts) {
            setTransactionError('Transaction confirmation timeout');
            setTransactionState('error');
        }
    }, 15000);
};
```

Progress updates from 60% to 100% during this phase. Confirmation typically takes 20-60 seconds depending on network conditions. Maximum timeout is 15 minutes (60 attempts at 15-second intervals).

## Step 8: Poll for Registration UTXO

**Location**: `src/components/Onboard.tsx:102`

After transaction confirmation, the system polls for the newly created registration UTXO:

```typescript
if (transactionState === 'success') {
    transaction.resetTransaction();
    refetchGenerationStatus();
    await pollRegistrationUtxo();
}
```

### Current Implementation: Blockfrost API

This step currently uses Blockfrost to search for the registration UTXO. The additional polling is necessary because Blockfrost requires a few seconds to index the new UTXO after transaction confirmation.

**Location**: `src/hooks/useRegistrationUtxo.ts:37-158`

The search process:

1. Query Blockfrost for all UTXOs at the DUST Mapping Validator address containing the auth token
2. Filter UTXOs that have both the auth token asset and an inline datum
3. Deserialize each datum and extract the Cardano PKH and DUST PKH
4. Match against the user's credentials to find the correct registration

```typescript
const searchRegistrationUtxo = async () => {
    const response = await fetch(
        `/api/blockfrost/addresses/${dustMappingValidator.address}/utxos/${dustAuthTokenAssetName}`
    );
    const utxos = await response.json();

    const validUtxos = utxos.filter(utxo =>
        utxo.amount.some(asset => asset.unit === dustAuthTokenAssetName) &&
        utxo.inline_datum !== null
    );

    for (const utxo of validUtxos) {
        const datumData = Data.from(utxo.inline_datum);
        const [datumCardanoPKH, dustPKHBytes] = datumData.fields;

        const dustPKHFromDatum = new TextDecoder().decode(
            new Uint8Array(dustPKHBytes.match(/.{2}/g).map(byte => parseInt(byte, 16)))
        );

        if (datumCardanoPKH === cardanoPKH && dustPKHFromDatum === dustPKH) {
            return utxo;
        }
    }

    return null;
};
```

The system polls every 3 seconds with a maximum of 20 attempts (60 seconds total). The UTXO is typically found within 3-15 seconds.

### Future Implementation: Midnight Indexer

The application is prepared to migrate from Blockfrost to the Midnight Indexer for registration status queries. The indexer integration is already implemented but not yet active.

**Implementation Status**:
- GraphQL client: `src/lib/subgraph/query.ts` (ready)
- API route: `src/app/api/dust/generation-status/[key]/route.ts` (ready)
- Hook: `src/hooks/useGenerationStatus.ts` (ready, currently uses hardcoded stake key)

**When the indexer becomes available**, the process will query the `dustGenerationStatus` GraphQL endpoint:

```graphql
query GetDustGenerationStatus($cardanoStakeKeys: [HexEncoded!]!) {
    dustGenerationStatus(cardanoStakeKeys: $cardanoStakeKeys) {
        cardanoStakeKey
        dustAddress
        registered
        nightBalance
        generationRate
        currentCapacity
    }
}
```

**Indexer Benefits**:
- Faster confirmation (typically 3-15 seconds vs 3-60 seconds)
- No manual datum deserialization required
- Additional metadata available (generation rate, capacity, balance)
- Native Midnight infrastructure
- Pre-indexed data optimized for queries

The migration will require:
1. Setting `INDEXER_ENDPOINT` environment variable
2. Updating `useGenerationStatus` hook to extract actual stake key from wallet address
3. Optional feature flag to switch between Blockfrost and Indexer approaches

Both implementations will coexist to allow gradual migration and fallback mechanisms.

## Step 9: Automatic Redirect

**Location**: `src/contexts/WalletContext.tsx:360-393`

Once the registration UTXO is found and stored in state, a React effect detects the change and triggers an automatic redirect:

```typescript
useEffect(() => {
    if (isAutoReconnecting || isLoadingRegistrationUtxo) {
        return;
    }

    if (!cardanoState.isConnected) {
        return;
    }

    if (registrationUtxo) {
        if (pathname !== '/dashboard') {
            router.push('/dashboard');
        }
    } else {
        if (pathname === '/dashboard') {
            router.push('/');
        }
    }
}, [registrationUtxo, isLoadingRegistrationUtxo, cardanoState.isConnected, pathname, router]);
```

The `registrationUtxo` acts as the single source of truth for registration status. Its presence in state indicates a successful registration and triggers navigation to the dashboard.

## Timeline Summary

```
User clicks "MATCH ADDRESSES"
    |
    v
Validation (prerequisites check)
    |
    v
Create executor function
    |
    v
Build transaction (construct inputs, outputs, mints)
    |
    v
Sign transaction (user approves in wallet)
    |
    v
Submit to blockchain (broadcast to mempool)
    |
    v
Poll for confirmation (15s intervals, max 15 min)
    |
    v
Transaction confirmed
    |
    v
Poll for UTXO (3s intervals, max 60s)
    |
    v
UTXO found and stored in state
    |
    v
Automatic redirect to dashboard
```

## Progress Indicators

- 0-20%: Building transaction
- 20-40%: Signing transaction
- 40-60%: Submitting transaction
- 60-100%: Confirming transaction

## Error Handling

Errors at any stage are caught and displayed to the user via toast notifications. Common failure points:

- User rejects wallet signature
- Insufficient ADA balance for fees
- Network timeout during confirmation
- Blockfrost API errors during UTXO search

All errors are logged via the application logger for debugging purposes.

## Registration UTXO Structure

The registration creates a UTXO at the DUST Mapping Validator address with:

```
Address: DUST Mapping Validator script address
Assets:
  - 1.586080 ADA (minimum UTXO requirement)
  - 1 DUST Auth Token (policyId + "DUST production auth token")
Datum (inline):
  Constructor 0
    Field 0: Cardano payment key hash (28 bytes hex string)
    Field 1: Midnight coin public key (hex-encoded bytes)
```

### Datum Field Details

**Field 0: Cardano Payment Key Hash**

Extracted from the connected Cardano wallet address:

**Location**: `src/lib/dustTransactionsUtils.ts:68-69`

```typescript
const cardanoAddress = await lucid.wallet().address();
const cardanoPKH = getAddressDetails(cardanoAddress)?.paymentCredential?.hash;
```

Value: 28-byte hex string (56 characters) representing the payment credential hash.

**Field 1: Midnight Coin Public Key**

The Midnight coin public key is encoded as UTF-8 bytes and then converted to hex:

**Location**: `src/lib/dustTransactionsUtils.ts:130-133`

```typescript
const registrationDatumData = new Constr(0, [
    cardanoPKH!,
    toHex(new TextEncoder().encode(dustPKH)), // dustPKH is the coin public key
]);
```

The encoding process:
1. Take coin public key: `"99934362fefa4068d10966e934e9f66003b3c6e2648df3b3f7794adeb8a10a45"` (64 hex chars)
2. Encode as UTF-8 bytes: `TextEncoder().encode()` converts the string to byte array
3. Convert to hex: `toHex()` creates hex representation of those bytes

**Important**: Both wallet connection and manual address entry produce the **same coin public key value** (64-character hex string), ensuring identical on-chain datums regardless of input method.

### UTXO Lookup and Matching

When searching for a user's registration UTXO, the process reverses the encoding:

**Location**: `src/hooks/useRegistrationUtxo.ts:199-204`

```typescript
const datumData = Data.from(utxo.inline_datum);
const [datumCardanoPKH, dustPKHBytes] = datumData.fields;

// Reverse the encoding: hex bytes → UTF-8 string
const dustPKHFromDatum = new TextDecoder().decode(
    new Uint8Array(dustPKHBytes.match(/.{2}/g).map(byte => parseInt(byte, 16)))
);
```

The UTXO is matched when both fields match the user's credentials:
- `datumCardanoPKH === cardanoPKH` (Cardano payment key hash matches)
- `dustPKHFromDatum === dustPKH` (Midnight coin public key matches)

This UTXO serves as the on-chain proof of registration and enables the Midnight network to generate DUST tokens for the registered Cardano address.
