# Deregistration Process Documentation

## Overview

The deregistration process removes a user's Cardano-to-Midnight address mapping and stops DUST token generation. This is accomplished by consuming the existing registration UTXO from the DUST Generator contract and burning the DUST NFT, creating no replacement output.

## Prerequisites

Before the deregistration process can begin:

- Cardano wallet must be connected
- Existing registration UTXO must exist
- DUST Generator contract
- Midnight wallet must be connected (to provide coin public key for validation)
- No other transaction currently executing

## Entry Point

User clicks "STOP GENERATION" button in the dashboard's Midnight Wallet Card.

**Location**: `src/components/dashboard/MidnightWalletCard.tsx:315`

The button is disabled if:

- Registration UTXO is still loading
- No registration UTXO found
- Another transaction is currently running

## Step 1: Modal Display

**Location**: `src/components/modals/StopGenerationModal.tsx`

The modal displays a warning to the user before proceeding with deregistration.

**Modal Features**:

- Shows the DUST address that will stop receiving tokens
- Provides copy-to-clipboard functionality for the address
- Warning message explaining the consequences
- Cancel and Stop Generation buttons
- Non-dismissable during transaction execution

**UI States**:
The modal has two distinct states:

1. **Confirmation State** (lines 96-155): Initial warning screen with action buttons
2. **Success State** (lines 74-93): Post-transaction confirmation screen

The modal switches to success state when `transaction.isCurrentTransaction('unregister')` and `transaction.transactionState === 'success'`.

## Step 2: User Confirmation

When the user clicks "STOP GENERATION", the modal invokes the parent handler:

**Location**: `src/components/modals/StopGenerationModal.tsx:49-59`

```typescript
const handleStop = async () => {
    try {
        await onStopGeneration();
    } catch (error) {
        showToast({
            message: error instanceof Error ? error.message : 'Failed to stop generation',
            type: 'error',
            duration: 5000,
        });
    }
};
```

The button shows loading state during execution and displays "UNREGISTERING..." text.

## Step 3: Validation and Preparation

**Location**: `src/components/dashboard/MidnightWalletCard.tsx:82-100`

The `handleUnregisterAddress` function performs validation:

1. **Cardano wallet connection**: Verifies `cardano.lucid` instance exists
2. **Midnight coin public key**: Validates `midnight.coinPublicKey` is available
3. **Registration UTXO**: Ensures existing registration UTXO is present

If any validation fails, the process terminates with an appropriate error message displayed via `transaction.setError()`.

## Step 4: Create Deregistration Executor

**Location**: `src/components/dashboard/MidnightWalletCard.tsx:106-110`

```typescript
const unregistrationExecutor = DustTransactionsUtils.createUnregistrationExecutor(cardano.lucid as LucidEvolution, dustPKHValue, registrationUtxo);
```

This factory method returns a function that will build, sign, and submit the transaction.

## Step 5: Execute Transaction

**Location**: `src/components/dashboard/MidnightWalletCard.tsx:112-117`

```typescript
const transactionState = await transaction.executeTransaction('unregister', unregistrationExecutor, {}, cardano.lucid as LucidEvolution);
```

The `TransactionContext` manages the transaction lifecycle:

- `preparing` - Building transaction
- `signing` - Awaiting user approval
- `submitting` - Broadcasting to network
- `confirming` - Polling for confirmation
- `success` or `error` - Final states

## Step 6: Build Deregistration Transaction

**Location**: `src/lib/dustTransactionsUtils.ts:156-234`

The transaction builder constructs a Cardano transaction with the following structure:

### Contract Instantiation

- DUST Generator contract: `new Contracts.CnightGeneratesDustCnightGeneratesDustElse()`
- Validator address derived from contract script

### Burn DUST NFT

- Burns the DUST NFT token (-1 amount)
- Uses policy ID from DUST Generator contract
- Redeemer: `DustAction.Burn` (serialized to CBOR)

### Consumed Input

- Existing registration UTXO from DUST Generator
- Redeemer: `Data.void()` (unit type for deregistration)

### Outputs

No registration output is created. The registration UTXO is fully consumed, and all ADA (minus fees) is returned to the user's wallet as change.

### Scripts Attached

```typescript
txBuilder.attach.MintingPolicy(blazeToLucidScript(dustGenerator.Script));
txBuilder.attach.SpendingValidator(blazeToLucidScript(dustGenerator.Script));
```

Both the minting policy (for burning) and spending validator scripts must be attached for script execution.

## Step 7: Sign Transaction

**Location**: `src/lib/dustTransactionsUtils.ts:248`

```typescript
const signedTx = await completedTx.sign.withWallet().complete();
```

The user's Cardano wallet displays a popup showing transaction details:

- Fee estimate
- Input: Existing registration UTXO (LOVELACE_FOR_REGISTRATION ADA + NFT)
- Burn: -1 DUST NFT token
- Change output back to user (registration ADA minus fees)

User must approve to proceed. Rejection throws an error caught by the try/catch block.

## Step 8: Submit to Blockchain

**Location**: `src/lib/dustTransactionsUtils.ts:252`

```typescript
const txHash = await signedTx.submit();
```

The signed transaction is broadcast to the Cardano network and returns immediately with a transaction hash.

## Step 9: Poll for Confirmation

**Location**: `src/contexts/TransactionContext.tsx:52-103`

The system polls Blockfrost every 15 seconds to verify transaction confirmation, with a maximum timeout of 15 minutes.

Progress updates from 60% to 100% during this phase.

## Step 10: Post-Deregistration Actions

**Location**: `src/components/dashboard/MidnightWalletCard.tsx:131-135`

Once the transaction succeeds:

```typescript
if (transactionState === 'success') {
    transaction.resetTransaction();
    handleDisconnect();
}
```

The `handleDisconnect` function performs cleanup:

**Location**: `src/components/dashboard/MidnightWalletCard.tsx:70-82`

```typescript
const handleDisconnect = async () => {
    setIsDisconnecting(true);

    // Add small delay for better UX
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Disconnect both wallets and clear localStorage
    disconnectCardanoWallet();
    disconnectMidnightWallet();

    // Redirect to home
    router.push('/');
};
```

This function:

1. Shows loading backdrop with "Disconnecting wallet..." message
2. Waits 1 second for smooth UX transition
3. Disconnects both Cardano and Midnight wallets
4. Clears localStorage entries for wallet connections
5. Redirects user to home page

## Step 11: Automatic Routing

**Location**: `src/contexts/WalletContext.tsx:360-393`

Once the user is redirected to the home page, the routing effect prevents re-entry to the dashboard:

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

Since the registration UTXO no longer exists on-chain, any attempt to access the dashboard will trigger a redirect to the home page.

## Timeline Summary

```
User clicks "STOP GENERATION"
    |
    v
Modal displays warning and DUST address
    |
    v
User clicks "STOP GENERATION" in modal
    |
    v
Validation (wallet, protocol, UTXO existence)
    |
    v
Build deregistration transaction
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
Reset transaction state
    |
    v
Show loading backdrop "Disconnecting wallet..."
    |
    v
Disconnect both wallets (clear localStorage)
    |
    v
Redirect to home page
    |
    v
User sees landing page
```

## Progress Indicators

During transaction execution, progress is tracked:

- 0-20%: Building transaction
- 20-40%: Signing transaction
- 40-60%: Submitting transaction
- 60-100%: Confirming transaction

After confirmation, the modal briefly shows success state before disconnect begins.

## Transaction Comparison

### Registration

```
Inputs:
  - User's wallet UTXOs (for fees)

Mints:
  - DUST Auth Token Minting Policy (1 token)
  - DUST Auth Token Policy (1 token)

Outputs:
  - New UTXO at mapping validator with auth token and datum
```

### Update

```
Inputs:
  - Existing registration UTXO (consumed)
  - User's wallet UTXOs (for fees)

Mints:
  - DUST Mapping Validator Spend Policy (1 token, Constructor 1)

Outputs:
  - New UTXO at mapping validator (same auth token, updated datum)
```

### Deregistration

```
Inputs:
  - Existing registration UTXO (consumed)
  - User's wallet UTXOs (for fees)

Mints:
  - DUST Auth Token Burning Policy (1 token)
  - DUST Mapping Validator Spend Policy (1 token, Constructor 0)

Burns:
  - DUST Auth Token Policy (-1 token, Constructor 1)

Outputs:
  - None (UTXO fully consumed, ADA returned as change)
```

The key difference is that deregistration **destroys** the registration completely with no replacement, burns the authentication token, and automatically disconnects the user.

## On-Chain Result

Before deregistration:

```
UTXO at DUST Mapping Validator:
  Assets: 1.586080 ADA + 1 Auth Token
  Datum:
    Field 0: {stakeKeyHash}
    Field 1: {midnightCoinPublicKey}
```

After deregistration:

```
No UTXO exists at DUST Mapping Validator for this user.
Auth token has been burned and no longer exists in circulation.
User is completely deregistered from DUST generation.
```

## Error Handling

Common failure scenarios:

- **Missing registration UTXO**: Cannot proceed if no existing registration found
- **Protocol not ready**: Contracts not properly deployed or initialized
- **Transaction rejection**: User cancels wallet signature
- **Confirmation timeout**: Transaction not confirmed within 15 minutes
- **Concurrent UTXO consumption**: Another transaction consumed the UTXO first

All errors are logged and displayed to the user via toast notifications.

## Security Considerations

1. **UTXO validation**: System verifies registration UTXO exists before proceeding
2. **Auth token burning**: Token must be burned to prevent reuse
3. **Cardano wallet signature**: Only the registered Cardano address owner can deregister
4. **On-chain validation**: Smart contracts enforce deregistration rules
5. **Complete cleanup**: Both wallets disconnected and localStorage cleared

The deregistration process is irreversible. To generate DUST again, the user must go through the complete registration process from scratch, which will mint a new authentication token and create a new registration UTXO.

## User Experience Considerations

### Loading States

The UI provides clear feedback during the deregistration process:

1. **Button loading**: "UNREGISTERING..." text during transaction execution
2. **Modal locked**: Cannot be dismissed while transaction is running
3. **Progress tracking**: Transaction progress bar from 0-100%
4. **Success state**: Brief confirmation screen showing deregistered address
5. **Disconnect backdrop**: "Disconnecting wallet..." message with redirect notice

### Post-Deregistration Behavior

After successful deregistration:

- User is automatically returned to the home page
- All wallet connections are cleared
- User must reconnect Cardano wallet to see registration status
- Dashboard is inaccessible until user registers again
- Registration check will show "not registered" status

This automatic disconnect prevents confusion about registration state and provides a clean starting point for potential re-registration.
