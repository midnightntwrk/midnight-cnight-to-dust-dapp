# Update Address Process Documentation

## Overview

The update address process allows users to change the Midnight address where their DUST tokens are generated while maintaining their existing Cardano address registration. This is accomplished by consuming the existing registration UTXO and creating a new one with the updated Midnight dust address, preserving the same DUST NFT.

## Prerequisites

Before the update process can begin:

- Cardano wallet must be connected
- Existing registration UTXO must exist
- DUST Generator contract
- User must provide a valid new Midnight shielded address
- No other transaction currently executing

## Entry Point

User clicks "CHANGE ADDRESS" button in the dashboard's Midnight Wallet Card.

**Location**: `src/components/dashboard/MidnightWalletCard.tsx:276-295`

The button is disabled if:

- Registration UTXO is still loading
- No registration UTXO found
- Another transaction is currently running

## Step 1: User Input

### Modal Display

**Location**: `src/components/modals/UpdateAddressModal.tsx`

The modal prompts the user to enter a new Midnight shielded address in a textarea field.

**Validation**: Bech32m format validation occurs on input change:

```typescript
const validateBech32Address = (address: string): boolean => {
    try {
        bech32m.decode(address, 200);
        return true;
    } catch {
        return false;
    }
};
```

The address must be a valid bech32m-encoded Midnight shielded address with the format: `mn_shield-addr_test1...` (testnet) or `mn_shield-addr1...` (mainnet).

## Step 2: Coin Public Key Extraction

**Location**: `src/components/modals/UpdateAddressModal.tsx:46-74`

When the user clicks "CHANGE ADDRESS", the modal extracts the coin public key from the entered address:

```typescript
const newCoinPublicKey = extractCoinPublicKeyFromMidnightAddress(newAddress.trim());

if (!newCoinPublicKey) {
    showToast({
        message: 'Failed to extract coin public key from address.',
        type: 'error',
    });
    return;
}
```

The extraction process uses the same bech32m decoding algorithm as manual registration:

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

This ensures the new address is properly parsed and the coin public key is correctly extracted.

## Step 3: Handler Invocation

**Location**: `src/components/modals/UpdateAddressModal.tsx:67`

The modal invokes the parent handler with both the new address and extracted coin public key:

```typescript
await onAddressUpdate(newAddress.trim(), newCoinPublicKey);
```

## Step 4: Validation and Preparation

**Location**: `src/components/dashboard/MidnightWalletCard.tsx:136-153`

The `handleUpdateAddress` function performs validation:

1. **Cardano wallet connection**: Verifies `cardano.lucid` instance exists
2. **New coin public key**: Validates the extracted key is not null
3. **Registration UTXO**: Ensures existing registration UTXO is available

The handler receives the new address parameters rather than using the currently connected Midnight wallet, allowing users to update to any valid Midnight address without needing to connect that wallet.

## Step 5: Build Update Transaction

**Location**: `src/lib/dustTransactionsUtils.ts:297-493`

The `buildUpdateTransaction` function constructs a Cardano transaction with the following structure:

### Stake Registration Check

- First checks if DUST Generator stake address is registered
- If not registered: executes stake registration transaction only
- If already registered: proceeds with update transaction

### Contract Instantiation

- DUST Generator contract: `new Contracts.CnightGeneratesDustCnightGeneratesDustElse()`
- Validator and stake addresses derived from contract script

### Consumed Input (Update Only)

- Existing registration UTXO from DUST Generator
- Redeemer: `Data.void()` (unit type for update)

### Output to DUST Generator (Update Only)

**Location**: `src/lib/dustTransactionsUtils.ts:440-470`

Creates a new registration UTXO with:

```typescript
// Build updated datum
const updatedRegistrationDatumData: Contracts.DustMappingDatum = {
    c_wallet: {
        VerificationKey: [stakeKeyHash!], // Stake key hash (28 bytes hex string)
    },
    dust_address: newDustPKH, // DUST PKH (32 bytes hex string)
};

// Preserve the existing DUST NFT
const dustNFTAssetName = getPolicyId(dustGenerator.Script) + '';

// Create new UTXO
txBuilder.pay.ToContract(
    dustGeneratorAddress,
    { kind: 'inline', value: serializedUpdatedRegistrationDatum },
    {
        lovelace: LOVELACE_FOR_REGISTRATION,
        [dustNFTAssetName]: 1n,
    }
);
```

**Key Points**:

- `c_wallet.VerificationKey[0]` contains the stake key hash (unchanged for same wallet)
- `dust_address` is updated with the new value
- The same DUST NFT is preserved from the consumed UTXO
- Minimum ADA amount remains `LOVELACE_FOR_REGISTRATION`

### Withdrawal (Update Only)

**Location**: `src/lib/dustTransactionsUtils.ts:474-478`

```typescript
txBuilder.withdraw(dustGeneratorStakeAddress, 0n, Data.void());
```

Withdrawal from the script stake address with 0 ADA amount.

### Scripts Attached (Update Only)

```typescript
txBuilder.attach.SpendingValidator(blazeToLucidScript(dustGenerator.Script));
txBuilder.attach.WithdrawalValidator(blazeToLucidScript(dustGenerator.Script));
```

Both the spending validator and withdrawal validator scripts must be attached for script execution.

## Step 6: Sign Transaction

The completed transaction is signed by the user's Cardano wallet:

```typescript
const signedTx = await completedTx.sign.withWallet().complete();
```

The user sees a wallet popup displaying:

- Fee estimate
- Input: Existing registration UTXO
- Withdrawal: 0 ADA from stake address
- Output: New registration UTXO with updated datum (preserving same NFT)
- Change output back to user

## Step 7: Submit to Blockchain

```typescript
const txHash = await signedTx.submit();
```

The signed transaction is broadcast to the Cardano network and returns immediately with a transaction hash.

## Step 8: Poll for Confirmation

**Location**: `src/contexts/TransactionContext.tsx:52-103`

The system polls Blockfrost every 15 seconds to verify transaction confirmation, with a maximum timeout of 15 minutes.

Progress updates from 60% to 100% during this phase.

## Step 9: Post-Update Actions

**Location**: `src/components/dashboard/MidnightWalletCard.tsx:175-181`

Once the transaction succeeds:

```typescript
if (transactionState === 'success') {
    transaction.resetTransaction();
    refetchGenerationStatus(); // Refresh generation status from indexer
    findRegistrationUtxo(); // Find new registration UTXO
}
```

The new registration UTXO is searched using the same polling mechanism as initial registration.

## Timeline Summary

```
User clicks "CHANGE ADDRESS"
    |
    v
Modal opens with address input field
    |
    v
User enters new Midnight address
    |
    v
Bech32m format validation
    |
    v
User clicks "CHANGE ADDRESS" in modal
    |
    v
Extract coin public key from address
    |
    v
Validation (wallet, protocol, UTXO existence)
    |
    v
Build update transaction
    |
    v
Sign transaction (user approves in wallet)
    |
    v
Submit to blockchain
    |
    v
Poll for confirmation (15s intervals, max 15 min)
    |
    v
Transaction confirmed
    |
    v
Poll for new registration UTXO
    |
    v
New UTXO found
    |
    v
Success modal displays new address
    |
    v
User clicks "GO TO DASHBOARD"
```

## Progress Indicators

During transaction execution, the modal displays loading states:

- Building transaction (20%)
- Signing transaction (40%)
- Submitting transaction (60%)
- Confirming transaction (60-100%)

## Transaction Comparison

### Initial Registration

```
Inputs:
  - User's wallet UTXOs (for fees)

Mints:
  - DUST Auth Token Minting Policy (1 token)
  - DUST Auth Token Policy (1 token)

Outputs:
  - New UTXO at mapping validator with auth token and datum
```

### Update Registration

```
Inputs:
  - Existing registration UTXO (consumed)
  - User's wallet UTXOs (for fees)

Mints:
  - DUST Mapping Validator Spend Policy (1 token)

Outputs:
  - New UTXO at mapping validator (same auth token, updated datum)
```

The key difference is that update **consumes** the existing UTXO and **preserves** the auth token, while registration creates both from scratch.

## On-Chain Result

Before update:

```
UTXO at DUST Mapping Validator:
  Assets: 1.586080 ADA + 1 Auth Token
  Datum:
    Field 0: {stakeKeyHash}
    Field 1: {oldMidnightCoinPublicKey}
```

After update:

```
UTXO at DUST Mapping Validator:
  Assets: 1.586080 ADA + 1 Auth Token (same token)
  Datum:
    Field 0: {stakeKeyHash}                  (unchanged)
    Field 1: {newMidnightCoinPublicKey}      (updated)
```

The Cardano stake address association remains unchanged, but DUST generation will now occur for the new Midnight address.

## Error Handling

Common failure scenarios:

- **Invalid address format**: Modal validation prevents submission
- **Extraction failure**: Shows toast error if coin public key cannot be extracted
- **Missing registration UTXO**: Cannot proceed if no existing registration found
- **Transaction rejection**: User cancels wallet signature
- **Confirmation timeout**: Transaction not confirmed within 15 minutes
- **Concurrent UTXO consumption**: Another transaction consumed the UTXO first

All errors are logged and displayed to the user via toast notifications.

## Security Considerations

1. **Address validation**: Bech32m format validation ensures structural correctness
2. **Coin public key extraction**: Cryptographically derived from the provided address
3. **Auth token preservation**: The same authentication token proves continuity of registration
4. **Cardano wallet signature**: Only the registered Cardano address owner can update
5. **On-chain validation**: Smart contracts enforce update rules

Users can update to any valid Midnight address without needing to connect or control that wallet, providing flexibility for address management strategies.
