import * as Contracts from '@/config/contract_blueprint';
import { getRuntimeConfig } from '@/config/runtime-config';
import { LOVELACE_FOR_REGISTRATION } from '@/config/transactionConstants';
import { logger } from '@/lib/logger';
import { toJson } from '@/lib/utils';
import { getAddressDetails, LucidEvolution, TxSignBuilder, UTxO } from '@lucid-evolution/lucid';
import { blazeToLucidScript, getPolicyId, getStakeAddress, getValidatorAddress, serializeToCbor } from './contractUtils';

/** Get NIGHT/cNIGHT policy ID and encoded name from runtime config (network-aware, works on client). */
function getCnightUnitFromConfig(): { policyId: string; encodedName: string; fullUnit: string } {
  const config = getRuntimeConfig();
  const policyId =
    config.CARDANO_NET === 'Mainnet'
      ? config.MAINNET_CNIGHT_CURRENCY_POLICY_ID
      : config.CARDANO_NET === 'Preprod'
        ? config.PREPROD_CNIGHT_CURRENCY_POLICY_ID
        : config.PREVIEW_CNIGHT_CURRENCY_POLICY_ID;
  const encodedName =
    config.CARDANO_NET === 'Mainnet'
      ? config.MAINNET_CNIGHT_CURRENCY_ENCODEDNAME
      : config.CARDANO_NET === 'Preprod'
        ? config.PREPROD_CNIGHT_CURRENCY_ENCODEDNAME
        : config.PREVIEW_CNIGHT_CURRENCY_ENCODEDNAME;
  return { policyId, encodedName, fullUnit: policyId + encodedName };
}

export class DustTransactionsUtils {
  /**
   * Build the DUST address registration transaction (Step 03) - Pure function
   */
  static async buildRegistrationTransaction(lucid: LucidEvolution, dustPKH: string): Promise<TxSignBuilder> {
    logger.log('[DustTransactions]', '🔧 Building DUST Address Registration Transaction...');
    // Get current user's Cardano address and stake key hash
    const cardanoAddress = await lucid.wallet().address();
    const addressDetails = getAddressDetails(cardanoAddress);
    const stakeKeyHash = addressDetails?.stakeCredential?.hash;

    if (!stakeKeyHash) {
      logger.error('[DustTransactions]', '❌ Stake key hash not found');
      throw new Error('Stake key hash not found');
    }

    if (!dustPKH) {
      logger.error('[DustTransactions]', '❌ DUST PKH not configured');
      throw new Error('DUST_PKH must be configured for registration');
    }

    logger.log(
      '[DustTransactions]',
      '📋 Registration Configuration:',
      toJson({
        dustPKH,
        cardanoAddress,
      })
    );

    // Find all cNIGHT UTXOs to include as explicit inputs so all cNIGHT rotates
    const { policyId, encodedName, fullUnit: cnightUnit } = getCnightUnitFromConfig();
    logger.log('[DustTransactions]', '🪙 NIGHT/cNIGHT token lookup:', toJson({ policyId, encodedName, fullUnit: cnightUnit }));
    const utxos = await lucid.wallet().getUtxos();
    const cnightUtxos = utxos.filter((cNightUtxo) => cNightUtxo.assets[cnightUnit] !== undefined);

    if (cnightUtxos.length === 0) {
      logger.error('[DustTransactions]', '❌ No cNIGHT UTXO found in wallet');
      throw new Error('No cNIGHT tokens found in wallet. You need cNIGHT to register.');
    }

    logger.log('[DustTransactions]', `🪙 Found ${cnightUtxos.length} cNIGHT UTXO(s) for rotation:`, toJson(
      cnightUtxos.map((u) => ({
        txHash: u.txHash,
        outputIndex: u.outputIndex,
        cnightAmount: u.assets[cnightUnit],
      }))
    ));

    // Get DUST Generator contract
    const dustGenerator = new Contracts.CnightGeneratesDustCnightGeneratesDustElse();
    const dustGeneratorAddress = getValidatorAddress(dustGenerator.Script);

    logger.log(
      '[DustTransactions]',
      '📋 DUST Generator Address:',
      toJson({
        dustGeneratorAddress,
      })
    );

    // Build the transaction

    logger.log('[DustTransactions]', '🔨 Building registration transaction...');
    const txBuilder = lucid.newTx();

    // Add all cNIGHT UTXOs as explicit inputs to ensure full rotation
    txBuilder.collectFrom(cnightUtxos);

    // MINT NFT

    // Construct the NFT asset name
    const dustNFTTokenName = '';
    const dustNFTAssetName = getPolicyId(dustGenerator.Script) + dustNFTTokenName;

    // Redeemer
    const dustNFTMintingRedeemer = serializeToCbor(Contracts.DustAction, 'Create');

    logger.log(
      '[DustTransactions]',
      '🪙 Minting DUST NFT:',
      toJson({
        policyId: getPolicyId(dustGenerator.Script),
        assetName: dustNFTAssetName,
        amount: 1n,
        redeemerCBORHEX: dustNFTMintingRedeemer,
      })
    );

    txBuilder.mintAssets({ [dustNFTAssetName]: 1n }, dustNFTMintingRedeemer);

    // Attach the required script
    logger.log('[DustTransactions]', '📎 Attaching DUST NFT Policy Script...');
    txBuilder.attach.MintingPolicy(blazeToLucidScript(dustGenerator.Script));

    // OUTPUT: DUST Mapping Validator with Registration Datum

    // Create dust mapping datum with user's stake key hash and dust address
    const dustMappingDatum: Contracts.DustMappingDatum = {
      c_wallet: {
        VerificationKey: [stakeKeyHash!], // Stake key hash (28 bytes hex string)
      },
      dust_address: dustPKH, // DUST PKH (32 bytes hex string)
    };

    const serializedRegistrationDatum = serializeToCbor(Contracts.DustMappingDatum, dustMappingDatum);

    logger.log(
      '[DustTransactions]',
      '📤 Creating output to DUST Mapping Validator:',
      toJson({
        address: dustGeneratorAddress,
        assets: {
          lovelace: LOVELACE_FOR_REGISTRATION, // Minimum ADA for UTxO
          [dustNFTAssetName]: 1n, // DUST NFT Token
        },
        datumData: dustMappingDatum,
        datumCBORHEX: serializedRegistrationDatum,
      })
    );

    txBuilder.pay.ToContract(
      dustGeneratorAddress, // DUST Mapping Validator Address
      { kind: 'inline', value: serializedRegistrationDatum }, // Registration Datum (INLINE)
      {
        lovelace: LOVELACE_FOR_REGISTRATION, // Minimum ADA for UTxO
        [dustNFTAssetName]: 1n, // DUST NFT Token
      }
    );

    // Add signers: payment address + stake address
    txBuilder.addSigner(await lucid.wallet().address());

    // Add stake address as signer to validate stake key hash
    const stakeAddress = await lucid.wallet().rewardAddress();
    if (stakeAddress) {
      txBuilder.addSigner(stakeAddress);
      logger.log('[DustTransactions]', '✍️ Added stake address as signer:', stakeAddress);
    }

    // Complete transaction
    logger.log('[DustTransactions]', '🔧 Completing registration transaction...');
    const completedTx = await txBuilder.complete();

    logger.log('[DustTransactions]', '✅ Registration transaction completed successfully');
    return completedTx;
  }

  /**
   * Create a transaction executor for DUST registration - Pure function
   * This returns a function that can be used with TransactionContext.executeTransaction()
   */
  static createRegistrationExecutor(lucid: LucidEvolution, dustPKH: string) {
    return async (params: Record<string, unknown>, onProgress?: (step: string, progress: number) => void): Promise<string> => {
      // Step 1: Build transaction
      onProgress?.('Preparing registration transaction...', 20);
      const completedTx = await DustTransactionsUtils.buildRegistrationTransaction(lucid, dustPKH);

      // Step 2: Sign and submit transaction
      onProgress?.('Signing registration transaction...', 40);
      logger.log('[DustTransactions]', '✍️ Signing registration transaction...');
      const signedTx = await completedTx.sign.withWallet().complete();

      onProgress?.('Submitting registration transaction...', 60);
      logger.log('[DustTransactions]', '📤 Submitting registration transaction...');
      const txHash = await signedTx.submit();

      logger.log('[DustTransactions]', '🎯 Registration transaction submitted successfully:', txHash);
      return txHash;
    };
  }

  /**
   * Build DUST unregistration transaction - Pure function
   * Based on Haskell buildDeregisterTx implementation
   * Consumes existing registration UTXO without creating a new one
   */
  static async buildUnregistrationTransaction(lucid: LucidEvolution, dustPKH: string, registrationUtxo: UTxO): Promise<TxSignBuilder> {
    logger.log('[DustTransactions]', '🔧 Building DUST Address Unregistration Transaction...');

    // Get DUST Generator contract
    const dustGenerator = new Contracts.CnightGeneratesDustCnightGeneratesDustElse();
    const dustGeneratorAddress = getValidatorAddress(dustGenerator.Script);

    logger.log(
      '[DustTransactions]',
      '📋 DUST Generator Address:',
      toJson({
        dustGeneratorAddress,
      })
    );

    // Find all cNIGHT UTXOs to include as explicit inputs so all cNIGHT rotates creating this a double transaction = voiding the dust production transaction
    const { fullUnit: cnightUnit } = getCnightUnitFromConfig();
    const utxos = await lucid.wallet().getUtxos();
    const cnightUtxos = utxos.filter((cNightUtxo) => cNightUtxo.assets[cnightUnit] !== undefined);

    if (cnightUtxos.length === 0) {
      logger.error('[DustTransactions]', '❌ No cNIGHT UTXO found in wallet');
      throw new Error('No cNIGHT tokens found in wallet. You need cNIGHT to unregister.');
    }

    logger.log('[DustTransactions]', `🪙 Found ${cnightUtxos.length} cNIGHT UTXO(s) for rotation:`, toJson(
      cnightUtxos.map((u) => ({
        txHash: u.txHash,
        outputIndex: u.outputIndex,
        cnightAmount: u.assets[cnightUnit],
      }))
    ));

    const txBuilder = lucid.newTx();

    // Add all cNIGHT UTXOs as explicit inputs to ensure full rotation
    txBuilder.collectFrom(cnightUtxos);

    // Construct the NFT asset name
    const dustNFTTokenName = '';
    const dustNFTAssetName = getPolicyId(dustGenerator.Script) + dustNFTTokenName;

    // Redeemer
    const dustNFTBurningRedeemer = serializeToCbor(Contracts.DustAction, 'Burn');
    txBuilder.mintAssets({ [dustNFTAssetName]: -1n }, dustNFTBurningRedeemer);
    txBuilder.attach.MintingPolicy(blazeToLucidScript(dustGenerator.Script));


    // Redeemer for unregistration (empty constructor)
    const { Data } = await import('@lucid-evolution/lucid');
    const unregistrationRedeemer = Data.void(); // Empty constructor for unregister

    logger.log(
      '[DustTransactions]',
      '🔥 Consuming registration UTXO:',
      toJson({
        txHash: registrationUtxo.txHash,
        outputIndex: registrationUtxo.outputIndex,
        address: registrationUtxo.address,
        redeemerCBORHEX: unregistrationRedeemer,
      })
    );

    txBuilder.collectFrom([registrationUtxo], unregistrationRedeemer);

    // Attach the required script
    logger.log('[DustTransactions]', '📎 Attaching DUST Mapping Validator Script...');
    txBuilder.attach.SpendingValidator(blazeToLucidScript(dustGenerator.Script));

    // Add signers: payment address + stake address
    txBuilder.addSigner(await lucid.wallet().address());

    // Add stake address as signer to validate stake key hash
    const stakeAddress = await lucid.wallet().rewardAddress();
    if (stakeAddress) {
      txBuilder.addSigner(stakeAddress);
      logger.log('[DustTransactions]', '✍️ Added stake address as signer:', stakeAddress);
    }

    // Complete transaction
    logger.log('[DustTransactions]', '🔧 Completing unregistration transaction...');
    const completedTx = await txBuilder.complete();

    logger.log('[DustTransactions]', '✅ Unregistration transaction completed successfully');
    return completedTx;
  }

  /**
   * Create a transaction executor for DUST unregistration - Pure function
   */
  static createUnregistrationExecutor(lucid: LucidEvolution, dustPKH: string, registrationUtxo: UTxO) {
    return async (params: Record<string, unknown>, onProgress?: (step: string, progress: number) => void): Promise<string> => {
      // Step 1: Build transaction
      onProgress?.('Preparing unregistration transaction...', 20);
      const completedTx = await DustTransactionsUtils.buildUnregistrationTransaction(lucid, dustPKH, registrationUtxo);

      // Step 2: Sign and submit transaction
      onProgress?.('Signing unregistration transaction...', 40);
      logger.log('[DustTransactions]', '✍️ Signing unregistration transaction...');
      const signedTx = await completedTx.sign.withWallet().complete();

      onProgress?.('Submitting unregistration transaction...', 60);
      logger.log('[DustTransactions]', '📤 Submitting unregistration transaction...');
      const txHash = await signedTx.submit();

      logger.log('[DustTransactions]', '🎯 Unregistration transaction submitted successfully:', txHash);
      return txHash;
    };
  }

  /**
   * Check if stake address is registered using Blockfrost API (backend proxy)
   */
  private static async checkStakeAddressRegistration(stakeAddress: string): Promise<boolean> {
    try {
      // Use backend Blockfrost proxy - same pattern as useRegistrationUtxo
      const response = await fetch(`/api/blockfrost/accounts/${stakeAddress}`);

      if (response.status === 200) {
        const accountData = await response.json();
        // Stake address is registered if it has EVER been active (has active_epoch)
        // OR currently has a pool delegation
        const isRegistered = accountData.active_epoch !== null || accountData.pool_id !== null;
        logger.log('[DustTransactions]', `📊 Stake address registration status: ${isRegistered}`, {
          active: accountData.active,
          active_epoch: accountData.active_epoch,
          pool_id: accountData.pool_id,
        });
        return isRegistered;
      } else if (response.status === 404) {
        logger.log('[DustTransactions]', '❌ Stake address not found (not registered)');
        return false;
      } else {
        logger.error('[DustTransactions]', `⚠️ Unexpected response from Blockfrost: ${response.status}`);
        return false;
      }
    } catch (error) {
      logger.error('[DustTransactions]', '❌ Error checking stake address registration:', error);
      return false;
    }
  }

  /**
   * Build DUST update transaction - Pure function
   * Based on Haskell buildUpdateTx implementation
   * Consumes existing registration UTXO and creates a new one with updated datum
   * First checks if stake address is registered, registers if needed, then updates
   */
  static async buildUpdateTransaction(lucid: LucidEvolution, newDustPKH: string, registrationUtxo: UTxO): Promise<TxSignBuilder> {
    logger.log('[DustTransactions]', '🔧 Building DUST Address Update Transaction...');

    // Get DUST Generator contract
    const dustGenerator = new Contracts.CnightGeneratesDustCnightGeneratesDustElse();
    const dustGeneratorAddress = getValidatorAddress(dustGenerator.Script);
    const dustGeneratorStakeAddress = getStakeAddress(dustGenerator.Script);

    logger.log(
      '[DustTransactions]',
      '📋 DUST Generator Address:',
      toJson({
        dustGeneratorAddress,
      })
    );
    logger.log(
      '[DustTransactions]',
      '📋 DUST Generator Stake Address:',
      toJson({
        dustGeneratorStakeAddress,
      })
    );

    // Check if stake address is registered
    logger.log('[DustTransactions]', '🔍 Checking stake address registration...');
    const isStakeRegistered = await this.checkStakeAddressRegistration(dustGeneratorStakeAddress);

    if (!isStakeRegistered) {
      logger.log('[DustTransactions]', '❌ Stake address not registered - doing registration transaction...');
      return this.buildStakeRegistrationOnlyTransaction(lucid);
    } else {
      logger.log('[DustTransactions]', '✅ Stake address already registered - doing update transaction...');
      return this.buildUpdateOnlyTransaction(lucid, newDustPKH, registrationUtxo);
    }
  }

  /**
   * Build stake registration ONLY transaction
   */
  private static async buildStakeRegistrationOnlyTransaction(lucid: LucidEvolution): Promise<TxSignBuilder> {
    logger.log('[DustTransactions]', '🔧 Building Stake Registration ONLY Transaction...');

    // Get DUST Generator contract
    const dustGenerator = new Contracts.CnightGeneratesDustCnightGeneratesDustElse();
    const dustGeneratorStakeAddress = getStakeAddress(dustGenerator.Script);

    // Build the transaction
    logger.log('[DustTransactions]', '🔨 Building stake registration transaction...');
    const txBuilder = lucid.newTx();

    // Register stake address ONLY
    logger.log('[DustTransactions]', '📝 Registering stake address...');
    txBuilder.registerStake(dustGeneratorStakeAddress);

    // Add signer
    txBuilder.addSigner(await lucid.wallet().address());

    // Complete transaction
    logger.log('[DustTransactions]', '🔧 Completing stake registration transaction...');
    const completedTx = await txBuilder.complete();

    logger.log('[DustTransactions]', '✅ Stake registration transaction completed successfully');
    return completedTx;
  }

  /**
   * Build update ONLY transaction (when stake is already registered)
   */
  private static async buildUpdateOnlyTransaction(lucid: LucidEvolution, newDustPKH: string, registrationUtxo: UTxO): Promise<TxSignBuilder> {
    logger.log('[DustTransactions]', '🔧 Building Update ONLY Transaction...');

    // Get current user's Cardano address and stake key hash
    const cardanoAddress = await lucid.wallet().address();
    const addressDetails = getAddressDetails(cardanoAddress);
    const stakeKeyHash = addressDetails?.stakeCredential?.hash;

    if (!stakeKeyHash) {
      logger.error('[DustTransactions]', '❌ Stake key hash not found');
      throw new Error('Stake key hash not found');
    }

    if (!newDustPKH) {
      logger.error('[DustTransactions]', '❌ New DUST PKH not provided');
      throw new Error('New DUST PKH must be provided for update');
    }

    logger.log(
      '[DustTransactions]',
      '📋 Update Configuration:',
      toJson({
        newDustPKH,
        cardanoAddress,
      })
    );

    // Get DUST Generator contract
    const dustGenerator = new Contracts.CnightGeneratesDustCnightGeneratesDustElse();
    const dustGeneratorAddress = getValidatorAddress(dustGenerator.Script);
    const dustGeneratorStakeAddress = getStakeAddress(dustGenerator.Script);

    // Build the transaction
    logger.log('[DustTransactions]', '🔨 Building update transaction...');
    const txBuilder = lucid.newTx();

    // CONSUME INPUT: Existing registration UTXO from DUST Mapping Validator

    // Redeemer for update (empty constructor)
    const { Data } = await import('@lucid-evolution/lucid');
    const updateRedeemer = Data.void(); // Empty constructor for update

    logger.log(
      '[DustTransactions]',
      '🔄 Consuming existing registration UTXO:',
      toJson({
        txHash: registrationUtxo.txHash,
        outputIndex: registrationUtxo.outputIndex,
        redeemerCBORHEX: updateRedeemer,
      })
    );

    txBuilder.collectFrom([registrationUtxo], updateRedeemer);

    // Attach the required script
    logger.log('[DustTransactions]', '📎 Attaching DUST Mapping Validator Script...');
    txBuilder.attach.SpendingValidator(blazeToLucidScript(dustGenerator.Script));

    // OUTPUT: New registration UTXO with updated datum

    // Get the DUST Auth Token from the existing UTXO to preserve it
    // Construct the NFT asset name
    const dustNFTTokenName = '';
    const dustNFTAssetName = getPolicyId(dustGenerator.Script) + dustNFTTokenName;

    logger.log(
      '[DustTransactions]',
      '🪙 Re Using DUST NFT:',
      toJson({
        policyId: getPolicyId(dustGenerator.Script),
        assetName: dustNFTAssetName,
        amount: 1n,
      })
    );

    // Create dust mapping datum with user's stake key hash and dust address
    const updatedRegistrationDatumData: Contracts.DustMappingDatum = {
      c_wallet: {
        VerificationKey: [stakeKeyHash!], // Stake key hash (28 bytes hex string)
      },
      dust_address: newDustPKH, // DUST PKH (32 bytes hex string)
    };

    const serializedUpdatedRegistrationDatum = serializeToCbor(Contracts.DustMappingDatum, updatedRegistrationDatumData);

    logger.log(
      '[DustTransactions]',
      '📤 Creating updated output to DUST Mapping Validator:',
      toJson({
        address: dustGeneratorAddress,
        assets: {
          lovelace: LOVELACE_FOR_REGISTRATION, // Minimum ADA for UTxO
          [dustNFTAssetName]: 1n, // DUST NFT Token (preserved)
        },
        datumData: updatedRegistrationDatumData,
        datumCBORHEX: serializedUpdatedRegistrationDatum,
      })
    );

    txBuilder.pay.ToContract(
      dustGeneratorAddress, // DUST Mapping Validator Address (same as before)
      { kind: 'inline', value: serializedUpdatedRegistrationDatum }, // Updated Registration Datum (INLINE)
      {
        lovelace: LOVELACE_FOR_REGISTRATION, // Minimum ADA for UTxO
        [dustNFTAssetName]: 1n, // DUST NFT Token (preserved)
      }
    );

    // WITHDRAWAL from script validator

    txBuilder.withdraw(
      dustGeneratorStakeAddress, // ← Reward address, no payment address
      0n,
      Data.void()
    );

    // Attach the required script
    logger.log('[DustTransactions]', '📎 Attaching DUST Withdrawal Script...');
    txBuilder.attach.WithdrawalValidator(blazeToLucidScript(dustGenerator.Script));

    // Add signers: payment address + stake address
    txBuilder.addSigner(await lucid.wallet().address());

    // Add stake address as signer to validate stake key hash
    const stakeAddress = await lucid.wallet().rewardAddress();
    if (stakeAddress) {
      txBuilder.addSigner(stakeAddress);
      logger.log('[DustTransactions]', '✍️ Added stake address as signer:', stakeAddress);
    }

    // Complete transaction
    logger.log('[DustTransactions]', '🔧 Completing update transaction...');
    const completedTx = await txBuilder.complete();

    logger.log('[DustTransactions]', '✅ Update transaction completed successfully');
    return completedTx;
  }

  /**
   * Create a transaction executor for DUST update - Pure function
   */
  static createUpdateExecutor(lucid: LucidEvolution, newDustPKH: string, registrationUtxo: UTxO) {
    return async (params: Record<string, unknown>, onProgress?: (step: string, progress: number) => void): Promise<string> => {
      // Step 1: Build transaction
      onProgress?.('Preparing update transaction...', 20);
      const completedTx = await DustTransactionsUtils.buildUpdateTransaction(lucid, newDustPKH, registrationUtxo);

      // Step 2: Sign and submit transaction
      onProgress?.('Signing update transaction...', 40);
      logger.log('[DustTransactions]', '✍️ Signing update transaction...');
      const signedTx = await completedTx.sign.withWallet().complete();

      onProgress?.('Submitting update transaction...', 60);
      logger.log('[DustTransactions]', '📤 Submitting update transaction...');
      const txHash = await signedTx.submit();

      logger.log('[DustTransactions]', '🎯 Update transaction submitted successfully:', txHash);
      return txHash;
    };
  }
}

export default DustTransactionsUtils;
