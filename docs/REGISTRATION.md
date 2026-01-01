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

The button is disabled until all prerequisites are satisfied. UI validation checks balance requirements and transaction state before allowing interaction.

## Step 1: Validation

**Location**: `src/components/Onboard.tsx:53-65`

The `handleMatchAddresses` function performs validations:

1. **Cardano wallet connection**: Verifies `cardano.lucid` instance exists
2. **Midnight coin public key**: Ensures `midnight.coinPublicKey` is available

The `midnight.coinPublicKey` value is obtained through one of two methods:

### Wallet Connection Method

When a user connects a Midnight wallet extension:

**Location**: `src/contexts/WalletContext.tsx:282-283`

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

**Location**: `src/components/Onboard.tsx:71`

```typescript
const registrationExecutor = DustTransactionsUtils.createRegistrationExecutor(
    cardano.lucid as LucidEvolution,
    dustPKHValue
);
```

This factory method returns a function that will build, sign, and submit the transaction.

## Step 3: Execute Transaction

**Location**: `src/components/Onboard.tsx:73`

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
      VerificationKey: [stakeKeyHash]  // Stake key hash (28 bytes hex string)
    },
    dust_address: newDustPKH           // DUST PKH (32 bytes hex string)
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

**Location**: `src/components/Onboard.tsx:76-80`

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

1. Get DUST Generator contract and address
2. Get Cardano PKH from user's address
3. Construct NFT asset name (policyId + empty string)
4. Query Blockfrost for UTXOs at DUST Generator address filtered by NFT asset
5. Filter UTXOs that have the NFT token and inline datum
6. Deserialize datum and match against user's credentials

```typescript
const searchRegistrationUtxo = async () => {
    // Get DUST Generator contract
    const dustGenerator = new Contracts.CnightGeneratesDustCnightGeneratesDustElse();
    const dustGeneratorAddress = getValidatorAddress(dustGenerator.Script);
    
    // Get current user's Cardano PKH
    const cardanoPKH = getAddressDetails(cardanoAddress)?.paymentCredential?.hash;
    
    // Construct the expected NFT asset name
    const dustNFTTokenName = '';
    const dustNFTAssetName = getPolicyId(dustGenerator.Script) + dustNFTTokenName;
    
    // Query UTXOs at the mapping validator address using Blockfrost proxy
    const response = await fetch(
        `/api/blockfrost/addresses/${dustGeneratorAddress}/utxos/${dustNFTAssetName}`
    );
    const utxos = await response.json();
    
    // Filter UTXOs that contain the DUST Auth Token
    const validUtxos = utxos.filter((utxo) => {
        const hasAuthToken = utxo.amount?.some((asset) => 
            asset.unit === dustNFTAssetName && asset.quantity === '1'
        );
        const hasInlineDatum = utxo.inline_datum !== null;
        return hasAuthToken && hasInlineDatum;
    });
    
    // Check each valid UTXO's datum to find matching registration
    for (const utxo of validUtxos) {
        // Deserialize the inline datum
        const datumData = Data.from(utxo.inline_datum);
        
        // Check if datumData is a Constr with the expected structure
        if (datumData instanceof Constr && datumData.index === 0 && datumData.fields.length === 2) {
            const [datumCardanoPKHConstr, dustPKHFromDatum] = datumData.fields;
            
            if (datumCardanoPKHConstr instanceof Constr && 
                datumCardanoPKHConstr.index === 0 && 
                datumCardanoPKHConstr.fields.length === 1) {
                const datumCardanoPKH = datumCardanoPKHConstr.fields[0];
                
                if (datumCardanoPKH === cardanoPKH && dustPKHFromDatum === dustPKH) {
                    return utxo;
                }
            }
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
      VerificationKey: [stakeKeyHash]   // Stake key hash (28 bytes hex string)
    dust_address: dustPKH               // DUST PKH (32 bytes hex string)
```

### Datum Field Details

**Field 0: Cardano Stake Key Hash (c_wallet.VerificationKey)**

Extracted from the connected Cardano wallet address:

**Location**: `src/lib/dustTransactionsUtils.ts:16-18`

```typescript
const cardanoAddress = await lucid.wallet().address();
const addressDetails = getAddressDetails(cardanoAddress);
const stakeKeyHash = addressDetails?.stakeCredential?.hash;
```

Value: 28-byte hex string (56 characters) representing the stake credential hash.

**Field 1: Midnight Dust Address (dust_address)**

The Midnight dust address is stored directly as a 32-byte hex string:

**Location**: `src/lib/dustTransactionsUtils.ts:84-89`

```typescript
const dustMappingDatum: Contracts.DustMappingDatum = {
    c_wallet: {
        VerificationKey: [stakeKeyHash!], // Stake key hash (28 bytes hex string)
    },
    dust_address: dustPKH,                // DUST PKH (32 bytes hex string)
};
```

The dust address is stored directly as the 32-byte hex string coin public key.

### UTXO Lookup and Matching

When searching for a user's registration UTXO, the process deserializes the datum:

**Location**: `src/hooks/useRegistrationUtxo.ts:98-113`

```typescript
const datumData = Data.from(utxo.inline_datum);

// Check if datumData is a Constr with the expected structure
if (datumData instanceof Constr && datumData.index === 0 && datumData.fields.length === 2) {
    const [datumStakeKeyHashConstr, dustPKHFromDatum] = datumData.fields;
    
    if (datumStakeKeyHashConstr instanceof Constr && 
        datumStakeKeyHashConstr.index === 0 && 
        datumStakeKeyHashConstr.fields.length === 1) {
        const datumStakeKeyHash = datumStakeKeyHashConstr.fields[0];
        
        // Match credentials
        if (datumStakeKeyHash === stakeKeyHash && dustPKHFromDatum === dustPKH) {
            return utxo;
        }
    }
}
```

The UTXO is matched when both fields match the user's credentials:
- `datumStakeKeyHash === stakeKeyHash` (Stake key hash matches)
- `dustPKHFromDatum === dustPKH` (Midnight dust address matches)

This UTXO serves as the on-chain proof of registration and enables the Midnight network to generate DUST tokens for the registered Cardano address.
