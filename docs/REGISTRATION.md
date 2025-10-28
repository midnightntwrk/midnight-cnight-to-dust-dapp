# Registration Process Documentation

## Overview

The registration process creates an on-chain mapping between a user's Cardano address and their Midnight address. This creates a UTXO at the DUST Generator address with an inline datum containing the Cardano payment key hash and Midnight dust address, along with a minted DUST NFT as authentication.

## Prerequisites

Before registration can begin, the following conditions must be met:

- Both Cardano and Midnight wallets connected (or manual Midnight address entry)
- Minimum ADA balance in Cardano wallet for fees and UTXO requirements
- DUST Generator contract
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
    dustPKHValue
);
```

This factory method returns a function that will build, sign, and submit the transaction.

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

The `TransactionContext` manages the transaction lifecycle:
- `preparing` - Building transaction
- `signing` - Awaiting user approval
- `submitting` - Broadcasting to network
- `confirming` - Polling for confirmation
- `success` or `error` - Final states

## Step 4: Build Registration Transaction

**Location**: `src/lib/dustTransactionsUtils.ts:11-125`

The transaction builder constructs a Cardano transaction with the following structure:

### Contract Instantiation
- DUST Generator contract: `new Contracts.CnightGeneratesDustCnightGeneratesDustElse()`
- Validator address derived from contract script

### Mint DUST NFT
- Mints 1 NFT token with empty asset name
- Uses policy ID from DUST Generator contract
- Redeemer: `DustAction.Create` (serialized to CBOR)

### Output to DUST Generator
- Assets: `LOVELACE_FOR_REGISTRATION` ADA + 1 DUST NFT
- Inline Datum: `DustMappingDatum` with structure:
  ```
  {
    c_wallet: {
      VerificationKey: [cardanoPKH]  // Cardano PKH (28 bytes hex string)
    },
    dust_address: newDustPKH         // DUST PKH (32 bytes hex string)
  }
  ```

### Scripts Attached
- DUST Generator minting policy script

## Step 5: Sign Transaction

**Location**: `src/lib/dustTransactionsUtils.ts:140`

```typescript
const signedTx = await completedTx.sign.withWallet().complete();
```

The user's Cardano wallet extension displays a popup showing transaction details:
- Fee estimate
- Mint: 1 DUST NFT token
- Output to DUST Generator validator address (ADA + NFT)
- Change output back to user

User must approve to proceed. Rejection throws an error caught by the try/catch block.

## Step 6: Submit to Blockchain

**Location**: `src/lib/dustTransactionsUtils.ts:144`

```typescript
const txHash = await signedTx.submit();
```

The signed transaction is broadcast to the Cardano network and returns immediately with a transaction hash.

## Step 7: Poll for Confirmation

**Location**: `src/contexts/TransactionContext.tsx:52-103`

The system polls Blockfrost every 15 seconds to check transaction confirmation status:

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

Progress updates from 60% to 100% during this phase. Confirmation typically takes 20-60 seconds. Maximum timeout is 15 minutes.

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

This step currently uses Blockfrost to search for the registration UTXO.

**Location**: `src/hooks/useRegistrationUtxo.ts:37-158`

The search process:

1. Query Blockfrost for all UTXOs at the DUST Generator address
2. Filter UTXOs that have inline datums
3. Deserialize each datum using Aiken data types
4. Match against the user's Cardano PKH and DUST PKH

```typescript
const searchRegistrationUtxo = async () => {
    const response = await fetch(
        `/api/blockfrost/addresses/${dustGeneratorAddress}/utxos`
    );
    const utxos = await response.json();

    const validUtxos = utxos.filter(utxo => utxo.inline_datum !== null);

    for (const utxo of validUtxos) {
        const datumData = deserialize(Contracts.DustMappingDatum, utxo.inline_datum);
        
        if (datumData.c_wallet.VerificationKey[0] === cardanoPKH && 
            datumData.dust_address === dustPKH) {
            return utxo;
        }
    }

    return null;
};
```

The system polls every 3 seconds with a maximum of 20 attempts (60 seconds total).

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
Build transaction (mint NFT, create UTXO with datum)
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

Errors are caught and displayed to the user via toast notifications. Common failure points:

- User rejects wallet signature
- Insufficient ADA balance for fees
- Network timeout during confirmation
- Blockfrost API errors during UTXO search

All errors are logged for debugging purposes.

## Registration UTXO Structure

The registration creates a UTXO at the DUST Generator validator address with:

```
Address: DUST Generator script address
Assets:
  - LOVELACE_FOR_REGISTRATION ADA (minimum UTXO requirement)
  - 1 DUST NFT (policyId + "") - authentication token
Datum (inline):
  DustMappingDatum:
    c_wallet:
      VerificationKey: [cardanoPKH]     // Cardano PKH (28 bytes hex string)
    dust_address: dustPKH               // DUST PKH (32 bytes hex string)
```

### Datum Field Details

**Field 0: Cardano Payment Key Hash (c_wallet.VerificationKey)**

Extracted from the connected Cardano wallet address:

**Location**: `src/lib/dustTransactionsUtils.ts:68-69`

```typescript
const cardanoAddress = await lucid.wallet().address();
const cardanoPKH = getAddressDetails(cardanoAddress)?.paymentCredential?.hash;
```

Value: 28-byte hex string (56 characters) representing the payment credential hash.

**Field 1: Midnight Dust Address (dust_address)**

The Midnight dust address is stored directly as a 32-byte hex string:

**Location**: `src/lib/dustTransactionsUtils.ts:84-89`

```typescript
const dustMappingDatum: Contracts.DustMappingDatum = {
    c_wallet: {
        VerificationKey: [cardanoPKH!], // Cardano PKH (28 bytes hex string)
    },
    dust_address: dustPKH,              // DUST PKH (32 bytes hex string)
};
```

The dust address is stored directly as the 32-byte hex string coin public key.

### UTXO Lookup and Matching

When searching for a user's registration UTXO, the process deserializes the datum using Aiken data types:

**Location**: `src/hooks/useRegistrationUtxo.ts:199-204`

```typescript
const datumData = deserialize(Contracts.DustMappingDatum, utxo.inline_datum);

// Extract Cardano PKH and dust address
dustPKHFromDatum = datumData.dust_address;
datumCardanoPKH = datumData.c_wallet.VerificationKey[0];
```

The UTXO is matched when both fields match the user's credentials:
- `datumCardanoPKH === cardanoPKH` (Cardano payment key hash matches)
- `dustPKHFromDatum === dustPKH` (Midnight dust address matches)

This UTXO serves as the on-chain proof of registration and enables the Midnight network to generate DUST tokens for the registered Cardano address.
