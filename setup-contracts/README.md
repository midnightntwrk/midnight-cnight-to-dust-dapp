# MIDNIGHT DUST Setup Tool

A Next.js application for initializing the MIDNIGHT DUST smart contract system on Cardano. This tool guides you through the complete setup process required before users can register their wallets for DUST token production.

## Overview

The MIDNIGHT DUST system requires a two-step initialization process:
- **Step 2A**: Initialize Versioning System (creates Version Oracle UTxO)
- **Step 2B**: Initialize DUST Production System (deploys governance and auth policies)

This setup tool automates these transactions and provides a user-friendly interface to complete the initialization.

## Features

- **Wallet Connection**: Supports Nami, Eternl, Flint, Yoroi, and other Cardano wallets
- **Setup Status Tracking**: Visual progress indicator showing current setup step
- **Automatic State Detection**: Checks blockchain to determine what setup steps are needed
- **Transaction Building**: Constructs proper transactions according to the DUST protocol
- **Blockfrost Integration**: Uses Blockfrost API for Cardano blockchain interaction

## Prerequisites

1. **Blockfrost API Key**: Get one from [blockfrost.io](https://blockfrost.io)
2. **Genesis UTxO**: A unique UTxO to parameterize your DUST deployment  
3. **Cardano Wallet**: Browser extension wallet (Nami, Eternl, etc.)
4. **Test ADA**: Sufficient ADA for transaction fees (Preprod network recommended)

## Installation

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Configure environment**:
   ```bash
   cp EXAMPLE.env .env.local
   ```

3. **Edit `.env.local`** with your actual values:
   ```bash
   # Blockfrost API Configuration
   NEXT_PUBLIC_BLOCKFROST_PROJECT_ID=your_actual_blockfrost_project_id
   NEXT_PUBLIC_BLOCKFROST_API_URL=https://cardano-preprod.blockfrost.io/api/v0

   # Network Configuration  
   NEXT_PUBLIC_NETWORK=Preprod

   # Genesis UTxO Configuration
   NEXT_PUBLIC_GENESIS_UTXO_TX_ID=your_chosen_genesis_utxo_transaction_id
   NEXT_PUBLIC_GENESIS_UTXO_INDEX=0

   # Governance Configuration
   NEXT_PUBLIC_GOVERNANCE_MEMBERS_COUNT=3
   NEXT_PUBLIC_GOVERNANCE_REQUIRED_SIGNATURES=2

   # Development mode
   NEXT_PUBLIC_DEBUG_MODE=true
   ```

## Usage

1. **Start the development server**:
   ```bash
   npm run dev
   ```

2. **Open [http://localhost:3000](http://localhost:3000)** in your browser

3. **Connect your Cardano wallet** when prompted

4. **Follow the setup wizard**:
   - The app will automatically detect your current setup status
   - Execute Step 2A if needed (Initialize Versioning System)
   - Execute Step 2B if needed (Initialize DUST Production System)
   - Celebrate when setup is complete! 

## Smart Contracts

The following Plutus smart contracts are included in `/public/contracts/`:
- `dust-mapping-validator.plutus` - Stores wallet→Midnight address mappings
- `dust-auth-token-policy.plutus` - Main authentication token policy
- `dust-auth-token-minting-policy.plutus` - Validates token minting
- `dust-auth-token-burning-policy.plutus` - Validates token burning
- `dust-mapping-validator-spend-policy.plutus` - Controls spending from mapping validator
- `version-oracle-validator.plutus` - Handles versioning system
- `version-oracle-policy.plutus` - Manages versioning tokens
- `governance-multisig-policy.plutus` - Handles governance permissions

## Transaction Flow

### Step 2A: Initialize Versioning System
- Consumes the Genesis UTxO
- Mints 1 Version Oracle token
- Creates Version Oracle UTxO with VersionOracleConfig datum

### Step 2B: Initialize DUST Production System  
- References the Version Oracle UTxO from Step 2A
- Mints 4 governance permission tokens
- Creates 4 reference script UTxOs for each policy
- Each UTxO contains script datum and reference script

## Troubleshooting

### Common Issues

**"Genesis UTxO not configured"**
- Make sure `NEXT_PUBLIC_GENESIS_UTXO_TX_ID` is set in `.env.local`
- Verify the UTxO exists and is spendable

**"Failed to connect wallet"**
- Ensure your wallet extension is installed and enabled
- Try refreshing the page and reconnecting

**"Transaction failed"**
- Check you have sufficient ADA for transaction fees
- Verify your Blockfrost API key is correct
- Ensure Genesis UTxO hasn't been spent already

**"Version Oracle UTxO not found"**
- Complete Step 2A before attempting Step 2B
- Wait for Step 2A transaction to confirm on-chain

### Debug Mode

Enable debug mode in `.env.local` for additional logging:
```bash
NEXT_PUBLIC_DEBUG_MODE=true
```

## Development

This project uses:
- **Next.js 15** with App Router
- **TypeScript** for type safety
- **Tailwind CSS** for styling
- **Lucid Evolution** for Cardano integration
- **Blockfrost** for blockchain API

## Production Deployment

1. **Update environment variables** for mainnet:
   ```bash
   NEXT_PUBLIC_NETWORK=Mainnet
   NEXT_PUBLIC_BLOCKFROST_API_URL=https://cardano-mainnet.blockfrost.io/api/v0
   ```

2. **Build the application**:
   ```bash
   npm run build
   ```

3. **Deploy** using your preferred hosting platform

## Security Notes

- Never commit `.env.local` to version control
- Use a dedicated Genesis UTxO for each deployment
- Test thoroughly on Preprod before mainnet deployment
- The Genesis UTxO will be consumed during Step 2A - choose carefully

## Support

For technical questions about the DUST protocol, refer to the `DAPP_INTEGRATION_GUIDE.md` in the parent directory.

---

 2024 MIDNIGHT DUST Protocol
