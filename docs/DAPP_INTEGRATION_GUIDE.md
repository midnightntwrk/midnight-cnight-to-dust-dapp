# MIDNIGHT DUST Smart Contract Integration Guide

## Overview

This guide walks you through integrating the MIDNIGHT DUST smart contract system. At its core, the system creates secure links between Cardano wallets and Midnight addresses, enabling DUST token generation based on cNIGHT holdings.

## Architecture Components

The system consists of 8 smart contracts:

### Validators (2)
1. Mapping Validator - Stores wallet→Midnight address mappings
2. Version Oracle Validator - Handles versioning system for upgradeable logic

### Minting Policies (6)
3. Auth Token Policy - Main authentication token policy (proxy)
4. Auth Token Minting Policy - Validates token minting during registration
5. Auth Token Burning Policy - Validates token burning during deregistration
6. Mapping Validator Spend Policy - Controls spending from mapping validator
7. Version Oracle Policy - Manages versioning system tokens
8. Governance MultiSig Policy - Handles governance and permission tokens

---

## Smart Contract Parameters

All smart contracts in the MIDNIGHT DUST system are parameterized to ensure deployment uniqueness and security. Understanding these parameters is crucial for proper integration.

### Genesis UTxO Parameter

All 8 smart contracts are parameterized by the Genesis UTxO:

```
Contract Parameters:
├── dust-mapping-validator.plutus           → Genesis UTxO
├── dust-auth-token-policy.plutus           → Genesis UTxO  
├── dust-auth-token-minting-policy.plutus   → Genesis UTxO
├── dust-auth-token-burning-policy.plutus   → Genesis UTxO
├── dust-mapping-validator-spend-policy.plutus → Genesis UTxO
├── version-oracle-validator.plutus         → Genesis UTxO
├── version-oracle-policy.plutus            → Genesis UTxO
└── governance-multisig-policy.plutus       → Genesis UTxO + Governance Config
```

### Parameter Details

Genesis UTxO (`TxOutRef`):
- Format: `{txId: "64-char-hex-string", index: number}`
- Critical: This UTxO will be consumed during system initialization
- Purpose: Makes your deployment globally unique across all Cardano
- Effect: Different Genesis UTxOs produce completely different script hashes, policy IDs, contract addresses, and token identifiers

Governance Configuration:
- Members Count: Number of governance participants (e.g., 3)
- Required Signatures: Threshold for governance actions (e.g., 2 of 3)
- Only affects: `governance-multisig-policy.plutus`

### Derived Parameters

Some contracts also use parameters derived from other contracts:
- Mapping Validator Address: Computed from mapping validator script hash
- Auth Token Currency Symbol: Computed from auth token policy script hash
- Version Oracle Config: Wrapper around Genesis UTxO for versioning system

### Security Implications

### Uniqueness Guarantee
Each Genesis UTxO creates a completely isolated DUST system deployment. This prevents:
- Cross-deployment token conflicts
- Accidental interaction between different deployments
- Script address collisions

### Parameter Validation
- Genesis UTxO must exist and be spendable during initialization
- Governance parameters must be consistent across all deployment transactions
- All derived parameters are cryptographically bound to the Genesis UTxO

---

## STEP 0: Generate Smart Contracts

### Action
```bash
cabal run export-contracts
```

### Output
Generates 8 `.plutus` files:
- `dust-mapping-validator.plutus`
- `dust-auth-token-policy.plutus`
- `dust-auth-token-minting-policy.plutus`
- `dust-auth-token-burning-policy.plutus`
- `dust-mapping-validator-spend-policy.plutus`
- `version-oracle-validator.plutus`
- `version-oracle-policy.plutus`
- `governance-multisig-policy.plutus`

### Required Parameters
- **Genesis UTxO**: A unique UTxO that parameterizes your deployment (format: `txid#index`)
- **Network**: Mainnet or Testnet (affects addresses only, not contract bytecode)

---

## STEP 1: Initialize Versioning System

### Transaction Structure
```
INPUT:
├── Genesis UTxO (consumed)

MINT:
├── Policy: Version Oracle Policy
├── Asset Name: "" (empty)
├── Amount: 1
├── Redeemer: InitializeVersionOracle VersionOracle ScriptHash TokenName

OUTPUT:
├── Address: Version Oracle Validator Address
├── Value: MinADA + Version Oracle Token (1x)
├── Datum: VersionOracleDatum (INLINE)
│   ├── versionOracle: VersionOracle { scriptId = 0 }
│   └── currencySymbol: CurrencySymbol (Version Oracle Policy ID)
└── Reference Script: **GOVERNANCE MULTISIG POLICY SCRIPT** (govMultiSigPolicy)

SCRIPT WITNESS:
└── Version Oracle Policy (for minting)
```

### Redeemer Structure
```haskell
InitializeVersionOracle
  (VersionOracle { scriptId = 0 })                           -- Fixed value: 0
  (toPlutusScriptHash (cardanoScriptHash govScript))         -- Hash of Governance MultiSig Script
  "Governance Policy"                                        -- Fixed value: "Governance Policy"
```

Redeemer Fields:
- VersionOracle: `scriptId = 0` (always 0 for governance)
- ScriptHash: Hash of compiled Governance MultiSig Policy Script
- TokenName: `"Governance Policy"` (fixed token name)

### Datum Structure
```haskell
VersionOracleDatum
  { versionOracle = VersionOracle { scriptId = 0 }           -- Same as in redeemer
  , currencySymbol = versionOraclePolicyId                   -- Currency symbol of Version Oracle Policy
  }
```

Datum Fields:
- versionOracle: Must match exactly with the redeemer
- currencySymbol: The policy ID of the Version Oracle Policy (calculated automatically)

---

## STEP 2: Initialize DUST Production System

### Transaction Structure
```
REFERENCE INPUT:
├── Version Oracle UTxO (from Step 2A)

MINT:
├── Policy: Governance Policy
│   ├── Asset Name: "Governance Policy"
│   ├── Amount: 1
│   └── Redeemer: PolicyRedeemer = Mint
├── Policy: Governance Policy  
│   ├── Asset Name: "Auth Minting Policy"
│   ├── Amount: 1
│   └── Redeemer: PolicyRedeemer = Mint
├── Policy: Governance Policy
│   ├── Asset Name: "Auth Burning Policy" 
│   ├── Amount: 1
│   └── Redeemer: PolicyRedeemer = Mint
├── Policy: Governance Policy
│   ├── Asset Name: "Mapping Spend Policy"
│   ├── Amount: 1
│   └── Redeemer: PolicyRedeemer = Mint

OUTPUTS:
├── [1] Address: Version Oracle Validator Address
│   ├── Value: MinADA + Governance Policy Token (1x)
│   ├── Datum: ScriptDatum for Governance Policy
│   └── Reference Script: Governance Policy Script
├── [2] Address: Version Oracle Validator Address  
│   ├── Value: MinADA + Auth Minting Policy Token (1x)
│   ├── Datum: ScriptDatum for Auth Minting Policy
│   └── Reference Script: Auth Token Minting Policy Script
├── [3] Address: Version Oracle Validator Address
│   ├── Value: MinADA + Auth Burning Policy Token (1x) 
│   ├── Datum: ScriptDatum for Auth Burning Policy
│   └── Reference Script: Auth Token Burning Policy Script
├── [4] Address: Version Oracle Validator Address
│   ├── Value: MinADA + Mapping Spend Policy Token (1x)
│   ├── Datum: ScriptDatum for Mapping Spend Policy
│   └── Reference Script: Mapping Validator Spend Policy Script

SCRIPT WITNESS:
└── Governance Policy (for minting permission tokens)
```

### Datum Structure: ScriptDatum
```haskell
data ScriptDatum = ScriptDatum
  { scriptId :: Integer        -- Script identifier (0,1,2,3 for the 4 policies)
  , scriptHash :: ScriptHash   -- Hash of the script being stored
  }
```

### Redeemers
- **Governance Policy**: `PolicyRedeemer = Mint`

---

## STEP 3: User Registration Transaction

### Transaction Structure
```
REFERENCE INPUT:
├── Auth Token Minting Policy UTxO (from versioning system)

MINT:
├── Policy: Governance Policy
│   ├── Asset Name: "" (empty asset name for permission)
│   ├── Amount: 1  
│   └── Redeemer: PolicyRedeemer = Mint
├── Policy: Auth Token Policy (proxy)
│   ├── Asset Name: "DUST production auth token"
│   ├── Amount: 1
│   └── Redeemer: PolicyRedeemer = Mint

OUTPUT:
├── Address: Mapping Validator Address
├── Value: MinADA + Auth Token (1x)  
├── Datum: DustMappingDatum (inline)
    ├── cWallet: PubKeyHash      -- Cardano wallet being registered
    └── dustAddress: LedgerBytes -- Midnight address for DUST production

REQUIRED SIGNATURES:
└── User's Cardano wallet (matching cWallet in datum)

SCRIPT WITNESSES:
├── Governance Policy (for permission token)
└── Auth Token Policy (for actual auth token)
```

### Datum Structure: DustMappingDatum
```haskell
data DustMappingDatum = DustMappingDatum
  { cWallet :: PubKeyHash      -- 28-byte hash of Cardano wallet public key
  , dustAddress :: LedgerBytes -- Midnight address as bytes
  }
```

### Redeemers
- **Governance Policy**: `PolicyRedeemer = Mint`
- **Auth Token Policy**: `PolicyRedeemer = Mint`

### Validation Rules
1. Transaction must be signed by the wallet specified in `cWallet`
2. Auth token must be sent to the Mapping Validator address
3. Datum must contain valid PubKeyHash and LedgerBytes
4. Only one auth token can be minted per transaction

---

## STEP 4: User Deregistration Transaction (Optional)

### Transaction Structure
```
INPUT:
├── Registration UTxO (from mapping validator)

MINT:
├── Policy: Governance Policy
│   ├── Asset Name: "" (empty asset name)
│   ├── Amount: 1
│   └── Redeemer: PolicyRedeemer = Mint
├── Policy: Auth Token Policy (proxy)
│   ├── Asset Name: "DUST production auth token"  
│   ├── Amount: -1 (burn)
│   └── Redeemer: PolicyRedeemer = Burn

REQUIRED SIGNATURES:
└── Registration owner's wallet (from datum)

SCRIPT WITNESSES:
├── Governance Policy (for spend permission)
├── Auth Token Policy (for burning)
└── Mapping Validator Spend Policy (for spending from validator)
```

### Redeemers
- **Governance Policy**: `PolicyRedeemer = Mint`
- **Auth Token Policy**: `PolicyRedeemer = Burn`
- **Mapping Validator Spend Policy**: `DustMappingSpendPolicyRedeemer = Deregister`

### Validation Rules
1. Transaction must be signed by the registration owner
2. No auth tokens can leak to outputs (all must be burned)
3. Output values must contain only ADA (no auth tokens)

---

## STEP 5: Update Registration Transaction (Optional)

### Transaction Structure
```
INPUT:
├── Existing Registration UTxO (from mapping validator)

REFERENCE INPUT:
├── Auth Token Minting Policy UTxO (from versioning system)

MINT:
├── Policy: Governance Policy
│   ├── Asset Name: "" (empty asset name)
│   ├── Amount: 1
│   └── Redeemer: PolicyRedeemer = Mint

OUTPUT:
├── Address: Mapping Validator Address
├── Value: MinADA + Auth Token (1x, forwarded from input)
├── Datum: DustMappingDatum (inline, updated)
    ├── cWallet: PubKeyHash      -- Same as before (cannot change)
    └── dustAddress: LedgerBytes -- New Midnight address

REQUIRED SIGNATURES:
└── Registration owner's wallet

SCRIPT WITNESSES:
├── Governance Policy (for spend permission)
└── Mapping Validator Spend Policy (for spending/updating)
```

### Redeemers
- **Governance Policy**: `PolicyRedeemer = Mint`
- **Mapping Validator Spend Policy**: `DustMappingSpendPolicyRedeemer = Update`

### Validation Rules
1. Transaction must be signed by the registration owner
2. `cWallet` field cannot change (same wallet owner)
3. Auth token must be forwarded to the new output
4. Only `dustAddress` can be updated

---

## Data Types Reference

### PolicyRedeemer
```haskell
data PolicyRedeemer = Mint | Burn
```

### DustMappingSpendPolicyRedeemer
```haskell
data DustMappingSpendPolicyRedeemer 
  = Deregister      -- Remove registration and burn tokens
  | Update          -- Update Midnight address
  | GarbageCollect  -- Clean up unused tokens
```

### Key Identifiers
- **Auth Token Name**: `"DUST production auth token"`
- **Governance Policy Permissions**: `"Governance Policy"`, `"Auth Minting Policy"`, `"Auth Burning Policy"`, `"Mapping Spend Policy"`

---

## Security Considerations

### Critical Invariants
1. Auth Token Isolation: Auth tokens must never leave the Mapping Validator address
2. Single Registration: One registration per Cardano wallet (enforced by token uniqueness)
3. Owner Control: Only the wallet owner can register, update, or deregister
4. Token Conservation: Auth tokens can only be minted during registration and burned during deregistration

### Validation Hierarchy
```
User Registration
├── Auth Token Policy (proxy) validates overall flow
├── Auth Token Minting Policy validates specific minting conditions
└── Mapping Validator ensures proper storage and datum validation

User Deregistration  
├── Auth Token Policy (proxy) validates overall flow
├── Auth Token Burning Policy validates burning conditions
├── Mapping Validator Spend Policy validates spend conditions
└── Mapping Validator ensures no token leakage
```

---

## Error Codes Reference

Smart contracts use specific error codes for debugging:

### Auth Token Minting Policy
- `ERROR-AUTH-TOKEN-MINTING-POLICY-01`: More than one token minted
- `ERROR-AUTH-TOKEN-MINTING-POLICY-02`: Token not sent to correct validator
- `ERROR-AUTH-TOKEN-MINTING-POLICY-03`: Tokens not properly burned
- `ERROR-AUTH-TOKEN-MINTING-POLICY-04`: Multiple valid outputs found

### Mapping Validator Spend Policy  
- `ERROR-MAPVAL-SPEND-POLICY-01`: Transaction not signed by owner
- `ERROR-MAPVAL-SPEND-POLICY-02`: Auth tokens leaked to outputs
- `ERROR-MAPVAL-SPEND-POLICY-03`: Transaction not signed by owner (update)
- `ERROR-MAPVAL-SPEND-POLICY-04`: Owner changed during update
- `ERROR-MAPVAL-SPEND-POLICY-06`: Tokens not properly burned
- `ERROR-MAPVAL-SPEND-POLICY-07`: Multiple or no valid input datums
- `ERROR-MAPVAL-SPEND-POLICY-08`: Multiple or no valid output datums
- `ERROR-MAPVAL-SPEND-POLICY-09`: Auth token not forwarded properly

### Version Oracle Policy
- `ERROR-VERSION-POLICY-01`: Transaction should burn the genesis UTxO
- `ERROR-VERSION-POLICY-02`: Transaction should attach datum and reference script to output
- `ERROR-VERSION-POLICY-03`: Transaction should mint exactly one versioning token
- `ERROR-VERSION-POLICY-04`: Transaction should attach datum and reference script to output
- `ERROR-VERSION-POLICY-05`: Transaction should be signed by the governance
- `ERROR-VERSION-POLICY-06`: Transaction should mint exactly one versioning token
- `ERROR-VERSION-POLICY-07`: Transaction should contain input with a versioning token and datum
- `ERROR-VERSION-POLICY-08`: Transaction should not contain versioning tokens in outputs
- `ERROR-VERSION-POLICY-09`: Transaction should be signed by the governance
- `ERROR-VERSION-POLICY-10`: Script purpose is not Minting
- `ERROR-ORACLE-POLICY-10`: Failed to decode currency symbol from minting purpose
- `ERROR-ORACLE-POLICY-11`: Transaction not approved by governance authority

### Version Oracle Validator
- `ERROR-VERSION-ORACLE-01`: Transaction not signed by governance authority
- `ERROR-VERSION-ORACLE-02`: Version oracles don't match
- `ERROR-VERSION-ORACLE-03`: Version output present when should be absent
- `ERROR-VERSION-ORACLE-04`: Script purpose is not Spending
- `ERROR-VERSION-ORACLE-05`: Cannot find own input
- `ERROR-VERSION-ORACLE-06`: Transaction not approved by governance authority

### Proxy Token Policy (Auth Token Policy)
- `ERROR-PROXY-TOKEN-POLICY-01`: Positive amount not minted during Mint
- `ERROR-PROXY-TOKEN-POLICY-02`: Minting not approved by versioning system
- `ERROR-PROXY-TOKEN-POLICY-03`: Negative amount not burned during Burn
- `ERROR-PROXY-TOKEN-POLICY-04`: Burning not approved by versioning system
- `ERROR-PROXY-TOKEN-POLICY-05`: Failed to get minting currency symbol from versioning system
- `ERROR-PROXY-TOKEN-POLICY-06`: Failed to get burning currency symbol from versioning system

### Proxy Validator
- `ERROR-PROXY-VALIDATOR-01`: Spend not approved by versioning system
- `ERROR-PROXY-VALIDATOR-02`: Failed to get spend policy from versioning system

This guide covers the complete integration process for the MIDNIGHT DUST system. Use it as a reference when implementing wallet-to-address mapping functionality in your application.
