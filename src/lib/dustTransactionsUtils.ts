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
      let txHash: string;
      try {
        txHash = await signedTx.submit();
      } catch (err) {
        const e = err as { cause?: unknown; response?: unknown; message?: string; _tag?: string };
        logger.error('[DustTransactions]', 'Submit failed', {
          tag: e._tag,
          message: e.message,
          cause: e.cause,
          response: e.response,
        });
        throw err;
      }

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
   * Build the update transaction: spend old registration UTXO, create new one
   * with the same auth token but updated datum. No mint, no burn.
   * Rotates all cNIGHT UTXOs and uses a zero-value withdrawal for script authorization.
   */
  private static async buildUpdateTransaction(lucid: LucidEvolution, newDustPKH: string, registrationUtxo: UTxO): Promise<TxSignBuilder> {
    logger.log('[DustTransactions]', '🔧 Building DUST Address Update Transaction...');

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

    // Find all cNIGHT UTXOs to include as explicit inputs so all cNIGHT rotates = voiding the dust production transaction
    const { fullUnit: cnightUnit } = getCnightUnitFromConfig();
    const utxos = await lucid.wallet().getUtxos();
    const cnightUtxos = utxos.filter((cNightUtxo) => cNightUtxo.assets[cnightUnit] !== undefined);

    if (cnightUtxos.length === 0) {
      logger.error('[DustTransactions]', '❌ No cNIGHT UTXO found in wallet');
      throw new Error('No cNIGHT tokens found in wallet. You need cNIGHT to update.');
    }

    logger.log('[DustTransactions]', `🪙 Found ${cnightUtxos.length} cNIGHT UTXO(s) for rotation:`, toJson(
      cnightUtxos.map((u) => ({
        txHash: u.txHash,
        outputIndex: u.outputIndex,
        cnightAmount: u.assets[cnightUnit],
      }))
    ));

    const { Data } = await import('@lucid-evolution/lucid');
    const txBuilder = lucid.newTx();

    // Add all cNIGHT UTXOs as explicit inputs to ensure full rotation
    txBuilder.collectFrom(cnightUtxos);

    // Consume existing registration UTXO (spend redeemer)
    const dustNFTTokenName = '';
    const dustNFTAssetName = getPolicyId(dustGenerator.Script) + dustNFTTokenName;

    const spendRedeemer = Data.void();
    logger.log(
      '[DustTransactions]',
      '📦 Consuming existing registration UTXO:',
      toJson({
        txHash: registrationUtxo.txHash,
        outputIndex: registrationUtxo.outputIndex,
      })
    );
    txBuilder.collectFrom([registrationUtxo], spendRedeemer);
    txBuilder.attach.SpendingValidator(blazeToLucidScript(dustGenerator.Script));

    // Create new registration UTXO with same auth token + updated datum
    const dustMappingDatum: Contracts.DustMappingDatum = {
      c_wallet: {
        VerificationKey: [stakeKeyHash!],
      },
      dust_address: newDustPKH,
    };

    const serializedDatum = serializeToCbor(Contracts.DustMappingDatum, dustMappingDatum);

    logger.log(
      '[DustTransactions]',
      '📤 Creating new registration UTXO with updated datum:',
      toJson({
        address: dustGeneratorAddress,
        assets: {
          lovelace: LOVELACE_FOR_REGISTRATION,
          [dustNFTAssetName]: 1n,
        },
        datumData: dustMappingDatum,
      })
    );

    txBuilder.pay.ToContract(
      dustGeneratorAddress,
      { kind: 'inline', value: serializedDatum },
      {
        lovelace: LOVELACE_FOR_REGISTRATION,
        [dustNFTAssetName]: 1n,
      }
    );

    // Query actual rewards for the script stake address, then withdraw the exact amount
    // Protocol requires withdrawals to consume rewards in full (cannot be partial or zero if rewards exist)
    const rewardsResponse = await fetch(`/api/blockfrost/accounts/${dustGeneratorStakeAddress}`);
    let withdrawalAmount = 0n;
    if (rewardsResponse.ok) {
      const accountInfo = await rewardsResponse.json();
      withdrawalAmount = BigInt(accountInfo.withdrawable_amount || '0');
    }
    logger.log('[DustTransactions]', '🔑 Adding withdrawal for script authorization:', dustGeneratorStakeAddress, 'amount:', withdrawalAmount.toString());
    txBuilder.withdraw(dustGeneratorStakeAddress, withdrawalAmount, Data.void());
    txBuilder.attach.WithdrawalValidator(blazeToLucidScript(dustGenerator.Script));

    // Add signers: payment address + stake address
    txBuilder.addSigner(cardanoAddress);

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
   * Create a transaction executor for DUST update — single transaction.
   * Builds the update tx, signs, and submits. The script stake address
   * must already be registered globally (done once at deployment).
   */
  static createUpdateExecutor(lucid: LucidEvolution, newDustPKH: string, registrationUtxo: UTxO) {
    return async (params: Record<string, unknown>, onProgress?: (step: string, progress: number) => void): Promise<string> => {
      onProgress?.('Preparing update transaction...', 20);
      const completedTx = await DustTransactionsUtils.buildUpdateTransaction(lucid, newDustPKH, registrationUtxo);

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
