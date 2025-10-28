import { LucidEvolution, getAddressDetails, mintingPolicyToId, toHex, TxSignBuilder, UTxO } from '@lucid-evolution/lucid';
// import { ContractUtils, ContractsRegistry } from './contractUtils';
import { toJson } from '@/lib/utils';
import { logger } from '@/lib/logger';
import * as Contracts from '@/config/contract_blueprint';
import { addressFromValidator, AssetId, CredentialType, PolicyId, RewardAddress } from '@blaze-cardano/core';
import { NETWORK_ID } from '@/config/network';
import { serialize } from '@blaze-cardano/data';
import { blazeToLucidScript } from './contractUtils';

export class DustTransactionsUtils {
    /**
     * Build the DUST address registration transaction (Step 03) - Pure function
     */
    static async buildRegistrationTransaction(lucid: LucidEvolution, dustPKH: string): Promise<TxSignBuilder> {
        logger.log('[DustTransactions]', '🔧 Building DUST Address Registration Transaction...');

        // Get contracts from registry
        // logger.log('[DustTransactions]', '🔍 Getting contracts from registry...');
        // const versionOracleValidatorContract = ContractUtils.getContract(contracts, 'version-oracle-validator.plutus');
        // const dustAuthTokenMintingPolicyContract = ContractUtils.getContract(contracts, 'dust-auth-token-minting-policy.plutus');
        // const dustAuthTokenPolicyContract = ContractUtils.getContract(contracts, 'dust-auth-token-policy.plutus');
        // const dustMappingValidatorContract = ContractUtils.getContract(contracts, 'dust-mapping-validator.plutus');

        // if (!versionOracleValidatorContract || !dustAuthTokenMintingPolicyContract || !dustAuthTokenPolicyContract || !dustMappingValidatorContract) {
        //     logger.error('[DustTransactions]', '❌ Required contracts not found in registry');
        //     throw new Error('Required contracts not found in registry');
        // }

        // Find Version Oracle UTxO (reference input)
        // logger.log('[DustTransactions]', '🔍 Querying Version Oracle UTxOs for reference...');
        // const versionOracleUtxos = await lucid.utxosAt(versionOracleValidatorContract.address!);

        // logger.log(
        //     '[DustTransactions]',
        //     '💰 Version Oracle UTxO Query Result:',
        //     toJson({
        //         utxosFound: versionOracleUtxos.length,
        //         utxos: versionOracleUtxos.map((utxo) => ({
        //             txHash: utxo.txHash,
        //             outputIndex: utxo.outputIndex,
        //             assets: Object.keys(utxo.assets),
        //             lovelace: utxo.assets.lovelace,
        //             datum: utxo.datum,
        //             datumHash: utxo.datumHash,
        //             scriptRef: utxo.scriptRef?.script.slice(0, 10) + '...',
        //         })),
        //     })
        // );

        // if (versionOracleUtxos.length === 0) {
        //     logger.error('[DustTransactions]', '❌ Version Oracle UTxOs not found');
        //     throw new Error('Version Oracle UTxOs from previous steps not found - run Steps 01 & 02 first');
        // }

        // // Find the UTxO with the DUST Auth Token Minting Policy reference script
        // const dustAuthTokenMintingUtxo = versionOracleUtxos.find((utxo) => {
        //     if (!utxo.scriptRef) {
        //         return false;
        //     }
        //     return mintingPolicyToId(utxo.scriptRef) === dustAuthTokenMintingPolicyContract.policyId;
        // });

        // if (!dustAuthTokenMintingUtxo) {
        //     logger.error('[DustTransactions]', '❌ DUST Auth Token Minting Policy UTxO not found');
        //     throw new Error('DUST Auth Token Minting Policy UTxO not found');
        // }

        // Get environment variables for registration
        const cardanoAddress = await lucid.wallet().address();
        const cardanoPKH = getAddressDetails(cardanoAddress)?.paymentCredential?.hash;

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

        const dustGenerator = new Contracts.CnightGeneratesDustCnightGeneratesDustElse();

        const dustGeneratorAddress = addressFromValidator(NETWORK_ID, dustGenerator.Script).toBech32();

        // Build the transaction according to Step 03 specification
        logger.log('[DustTransactions]', '🔨 Building registration transaction...');
        const txBuilder = lucid.newTx();

        // // REFERENCE INPUT: Version Oracle UTxO with DUST Auth Token Minting Policy
        // logger.log('[DustTransactions]', '📥 Adding reference input (Version Oracle UTxO with minting policy)...');
        // txBuilder.readFrom([dustAuthTokenMintingUtxo]);

        // MINT 1: DUST Auth Token Minting Policy - 1 token with EMPTY asset name
        // const dustAuthTokenMintingRedeemer = Data.to(new Constr(0, [])); // Constructor 0, empty fields

        // Construct the expected NFT asset name
        const dustNFTTokenName = '';
        const dustNFTAssetName = PolicyId(dustGenerator.Script.hash()) + dustNFTTokenName;

        const dustNFTMintingRedeemer = serialize(Contracts.DustAction, 'Create').toCbor();

        logger.log(
            '[DustTransactions]',
            '🪙 Minting DUST Auth Token (Minting Policy):',
            toJson({
                policyId: PolicyId(dustGenerator.Script.hash()),
                assetName: dustNFTAssetName,
                amount: 1n,
                redeemerCBORHEX: dustNFTMintingRedeemer,
            })
        );

        txBuilder.mintAssets({ [dustNFTAssetName]: 1n }, dustNFTMintingRedeemer);

        // // MINT 2: DUST Auth Token Policy - 1 token with specific token name
        // const dustAuthTokenRedeemer = Data.to(new Constr(0, [])); // Constructor 0, empty fields
        // const dustTokenName = toHex(new TextEncoder().encode('DUST production auth token'));
        // const dustAuthTokenAssetName = dustAuthTokenPolicyContract.policyId! + dustTokenName;

        // logger.log(
        //     '[DustTransactions]',
        //     '🪙 Minting DUST Auth Token (Main Policy):',
        //     toJson({
        //         policyId: dustAuthTokenPolicyContract.policyId!,
        //         tokenName: 'DUST production auth token',
        //         assetName: dustAuthTokenAssetName,
        //         amount: 1n,
        //     })
        // );

        // txBuilder.mintAssets({ [dustAuthTokenAssetName]: 1n }, dustAuthTokenRedeemer);

        // OUTPUT: DUST Mapping Validator with Registration Datum
        // The DUST PKH is encoded as the bytes of the hex string representation
        // const registrationDatumData = new Constr(0, [
        //     cardanoPKH!, // Cardano PKH (28 bytes hex string)
        //     toHex(new TextEncoder().encode(dustPKH)), // DUST PKH encoded as bytes of the string representation
        // ]);

        // const serializedRegistrationDatum = Data.to(registrationDatumData);

        // Create dust mapping datum with user's credential and dust address
        const dustMappingDatum: Contracts.DustMappingDatum = {
            c_wallet: {
                VerificationKey: [cardanoPKH!], // Cardano PKH (28 bytes hex string)
            },
            dust_address: dustPKH, // DUST PKH encoded as bytes of the string representation
            // dust_address: toHex(new TextEncoder().encode(dustPKH)), // DUST PKH encoded as bytes of the string representation
        };

        const serializedRegistrationDatum = serialize(Contracts.DustMappingDatum, dustMappingDatum).toCbor();

        logger.log(
            '[DustTransactions]',
            '📤 Creating output to DUST Mapping Validator:',
            toJson({
                address: dustGeneratorAddress,
                assets: {
                    lovelace: 1586080n, // ADA amount
                    [dustNFTAssetName]: 1n, // Using minting policy token
                },
                datumData: dustMappingDatum,
                datumCBORHEX: serializedRegistrationDatum,
            })
        );

        txBuilder.pay.ToContract(
            dustGeneratorAddress, // DUST Mapping Validator Address
            { kind: 'inline', value: serializedRegistrationDatum }, // Registration Datum (INLINE)
            {
                lovelace: 1586080n, // Minimum ADA for UTxO
                [dustNFTAssetName]: 1n, // DUST Auth Token (from main policy)
            }
        );

        logger.log('[DustTransactions]', '📎 Attaching DUST Auth Token Minting Policy script...');
        txBuilder.attach.MintingPolicy(blazeToLucidScript(dustGenerator.Script));

        // logger.log('[DustTransactions]', '📎 Attaching DUST Auth Token Policy script...');
        // txBuilder.attach.MintingPolicy(dustAuthTokenPolicyContract.scriptObject!);

        // Add signer
        txBuilder.addSigner(await lucid.wallet().address());

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
        const { Data, Constr } = await import('@lucid-evolution/lucid');

        logger.log('[DustTransactions]', '🔧 Building DUST Address Unregistration Transaction...');

        // Get contracts from registry
        // logger.log('[DustTransactions]', '🔍 Getting contracts from registry...');
        // const versionOracleValidatorContract = ContractUtils.getContract(contracts, 'version-oracle-validator.plutus');
        // const dustAuthTokenBurningPolicyContract = ContractUtils.getContract(contracts, 'dust-auth-token-burning-policy.plutus');
        // const dustMappingValidatorSpendPolicyContract = ContractUtils.getContract(contracts, 'dust-mapping-validator-spend-policy.plutus');
        // const dustMappingValidatorContract = ContractUtils.getContract(contracts, 'dust-mapping-validator.plutus');
        // const dustAuthTokenPolicyContract = ContractUtils.getContract(contracts, 'dust-auth-token-policy.plutus');

        // if (
        //     !versionOracleValidatorContract ||
        //     !dustAuthTokenBurningPolicyContract ||
        //     !dustMappingValidatorSpendPolicyContract ||
        //     !dustMappingValidatorContract ||
        //     !dustAuthTokenPolicyContract
        // ) {
        //     logger.error('[DustTransactions]', '❌ Required contracts not found in registry');
        //     throw new Error('Required contracts not found in registry for unregistration');
        // }

        // // Find Version Oracle UTxOs for reference inputs
        // logger.log('[DustTransactions]', '🔍 Querying Version Oracle UTxOs for reference inputs...');
        // const versionOracleUtxos = await lucid.utxosAt(versionOracleValidatorContract.address!);

        // if (versionOracleUtxos.length === 0) {
        //     logger.error('[DustTransactions]', '❌ Version Oracle UTxOs not found');
        //     throw new Error('Version Oracle UTxOs from previous steps not found - run Steps 01 & 02 first');
        // }

        // // Find the UTxO with the DUST Auth Token Burning Policy reference script
        // const dustAuthTokenBurningUtxo = versionOracleUtxos.find((utxo) => {
        //     if (!utxo.scriptRef) {
        //         return false;
        //     }
        //     return mintingPolicyToId(utxo.scriptRef) === dustAuthTokenBurningPolicyContract.policyId;
        // });

        // if (!dustAuthTokenBurningUtxo) {
        //     logger.error('[DustTransactions]', '❌ DUST Auth Token Burning Policy UTxO not found');
        //     throw new Error('DUST Auth Token Burning Policy UTxO not found');
        // }

        // // Find the UTxO with the DUST Mapping Validator Spend Policy reference script
        // const dustMappingValidatorSpendUtxo = versionOracleUtxos.find((utxo) => {
        //     if (!utxo.scriptRef) {
        //         return false;
        //     }
        //     return mintingPolicyToId(utxo.scriptRef) === dustMappingValidatorSpendPolicyContract.policyId;
        // });

        // if (!dustMappingValidatorSpendUtxo) {
        //     logger.error('[DustTransactions]', '❌ DUST Mapping Validator Spend Policy UTxO not found');
        //     throw new Error('DUST Mapping Validator Spend Policy UTxO not found');
        // }

        const dustGenerator = new Contracts.CnightGeneratesDustCnightGeneratesDustElse();

        const dustGeneratorAddress = addressFromValidator(NETWORK_ID, dustGenerator.Script).toBech32();

        // Build the unregistration transaction
        logger.log('[DustTransactions]', '🔨 Building unregistration transaction...');
        const txBuilder = lucid.newTx();

        // REFERENCE INPUTS: Version Oracle UTxOs with required policies
        // logger.log('[DustTransactions]', '📥 Adding reference inputs (Version Oracle UTxOs with policies)...');
        // txBuilder.readFrom([dustAuthTokenBurningUtxo, dustMappingValidatorSpendUtxo]);

        // CONSUME INPUT: Existing registration UTXO from DUST Mapping Validator
        // Redeemer for unregistration (empty constructor)
        // const unregistrationRedeemer = Data.to(new Constr(0, [])); // Empty constructor for unregister

        const unregistrationRedeemer = Data.to(new Constr(0, [])); // Empty constructor for unregister

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

        // MINT 1: DUST Auth Token Burning Policy - 1 token with EMPTY asset name
        // This permits burning the authentication token
        // const dustAuthTokenBurningRedeemer = Data.to(new Constr(0, [])); // Constructor 0, empty fields
        // Construct the expected NFT asset name
        const dustNFTTokenName = '';
        const dustNFTAssetName = PolicyId(dustGenerator.Script.hash()) + dustNFTTokenName;
        const dustNFTMintingRedeemer = serialize(Contracts.DustAction, 'Burn').toCbor();

        logger.log(
            '[DustTransactions]',
            '🪙 Minting DUST Auth Token (Burning Policy):',
            toJson({
                policyId: PolicyId(dustGenerator.Script.hash()),
                assetName: dustNFTAssetName,
                amount: -1n,
                redeemerCBORHEX: dustNFTMintingRedeemer,
            })
        );

        txBuilder.mintAssets({ [dustNFTAssetName]: -1n }, dustNFTMintingRedeemer);

        // // MINT 2: DUST Mapping Validator Spend Policy - 1 token for Deregister action
        // // This permits spending from the mapping validator
        // const dustMappingValidatorSpendRedeemer = Data.to(new Constr(0, [])); // Constructor 0 for Deregister
        // const dustMappingValidatorSpendAssetName = dustMappingValidatorSpendPolicyContract.policyId! + '';

        // logger.log(
        //     '[DustTransactions]',
        //     '🪙 Minting DUST Mapping Validator Spend Policy (Deregister):',
        //     toJson({
        //         policyId: dustMappingValidatorSpendPolicyContract.policyId!,
        //         assetName: dustMappingValidatorSpendAssetName,
        //         amount: 1n,
        //         redeemer: 'Constructor 0 (Deregister)',
        //         redeemerCBORHEX: dustMappingValidatorSpendRedeemer,
        //     })
        // );

        // txBuilder.mintAssets({ [dustMappingValidatorSpendAssetName]: 1n }, dustMappingValidatorSpendRedeemer);

        // // BURN: DUST Auth Token Policy - burn the actual authentication token (-1)
        // const dustTokenName = toHex(new TextEncoder().encode('DUST production auth token'));
        // const dustAuthTokenAssetName = dustAuthTokenPolicyContract.policyId! + dustTokenName;
        // const dustAuthTokenBurnRedeemer = Data.to(new Constr(1, [])); // Constructor 1 for Burn

        // logger.log(
        //     '[DustTransactions]',
        //     '🔥 Burning DUST Auth Token (Main Policy):',
        //     toJson({
        //         policyId: dustAuthTokenPolicyContract.policyId!,
        //         tokenName: 'DUST production auth token',
        //         assetName: dustAuthTokenAssetName,
        //         amount: -1n, // Burning (negative amount)
        //         redeemer: 'Constructor 1 (Burn)',
        //         redeemerCBORHEX: dustAuthTokenBurnRedeemer,
        //     })
        // );

        // txBuilder.mintAssets({ [dustAuthTokenAssetName]: -1n }, dustAuthTokenBurnRedeemer);

        // Attach the required scripts
        logger.log('[DustTransactions]', '📎 Attaching required scripts...');
        txBuilder.attach.SpendingValidator(blazeToLucidScript(dustGenerator.Script));
        // txBuilder.attach.MintingPolicy(dustAuthTokenBurningPolicyContract.scriptObject!);
        // txBuilder.attach.MintingPolicy(dustMappingValidatorSpendPolicyContract.scriptObject!);
        // txBuilder.attach.MintingPolicy(dustAuthTokenPolicyContract.scriptObject!);

        // Add signer
        txBuilder.addSigner(await lucid.wallet().address());

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
     * Build DUST update transaction - Pure function
     * Based on Haskell buildUpdateTx implementation
     * Consumes existing registration UTXO and creates a new one with updated datum
     */
    static async buildUpdateTransaction(lucid: LucidEvolution, newDustPKH: string, registrationUtxo: UTxO): Promise<TxSignBuilder> {
        const { Data, Constr } = await import('@lucid-evolution/lucid');

        logger.log('[DustTransactions]', '🔧 Building DUST Address Update Transaction...');

        // // Get contracts from registry
        // logger.log('[DustTransactions]', '🔍 Getting contracts from registry...');
        // const versionOracleValidatorContract = ContractUtils.getContract(contracts, 'version-oracle-validator.plutus');
        // const dustMappingValidatorSpendPolicyContract = ContractUtils.getContract(contracts, 'dust-mapping-validator-spend-policy.plutus');
        // const dustMappingValidatorContract = ContractUtils.getContract(contracts, 'dust-mapping-validator.plutus');
        // const dustAuthTokenPolicyContract = ContractUtils.getContract(contracts, 'dust-auth-token-policy.plutus');

        // if (!versionOracleValidatorContract || !dustMappingValidatorSpendPolicyContract || !dustMappingValidatorContract || !dustAuthTokenPolicyContract) {
        //     logger.error('[DustTransactions]', '❌ Required contracts not found in registry');
        //     throw new Error('Required contracts not found in registry for update');
        // }

        // Get current user's Cardano address and PKH
        const cardanoAddress = await lucid.wallet().address();
        const cardanoPKH = getAddressDetails(cardanoAddress)?.paymentCredential?.hash;

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

        // // Find Version Oracle UTxOs for reference inputs
        // logger.log('[DustTransactions]', '🔍 Querying Version Oracle UTxOs for reference inputs...');
        // const versionOracleUtxos = await lucid.utxosAt(versionOracleValidatorContract.address!);

        // if (versionOracleUtxos.length === 0) {
        //     logger.error('[DustTransactions]', '❌ Version Oracle UTxOs not found');
        //     throw new Error('Version Oracle UTxOs from previous steps not found - run Steps 01 & 02 first');
        // }

        // // Find the UTxO with the DUST Mapping Validator Spend Policy reference script
        // const dustMappingValidatorSpendUtxo = versionOracleUtxos.find((utxo) => {
        //     if (!utxo.scriptRef) {
        //         return false;
        //     }
        //     return mintingPolicyToId(utxo.scriptRef) === dustMappingValidatorSpendPolicyContract.policyId;
        // });

        // if (!dustMappingValidatorSpendUtxo) {
        //     logger.error('[DustTransactions]', '❌ DUST Mapping Validator Spend Policy UTxO not found');
        //     throw new Error('DUST Mapping Validator Spend Policy UTxO not found');
        // }

        const dustGenerator = new Contracts.CnightGeneratesDustCnightGeneratesDustElse();

        const dustGeneratorAddress = addressFromValidator(NETWORK_ID, dustGenerator.Script).toBech32();















        


        // Build the update transaction
        logger.log('[DustTransactions]', '🔨 Building update transaction...');
        const txBuilder = lucid.newTx();

        // // REFERENCE INPUT: Version Oracle UTxO with required policy
        // logger.log('[DustTransactions]', '📥 Adding reference input (Version Oracle UTxO with spend policy)...');
        // txBuilder.readFrom([dustMappingValidatorSpendUtxo]);

        // CONSUME INPUT: Existing registration UTXO from DUST Mapping Validator
        // Redeemer for update (empty constructor)
        const updateRedeemer = Data.to(new Constr(0, [])); // Empty constructor for update

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

        // // MINT: DUST Mapping Validator Spend Policy - 1 token for Update action
        // // This permits spending from the mapping validator
        // const dustMappingValidatorSpendRedeemer = Data.to(new Constr(1, [])); // Constructor 1 for Update
        // const dustMappingValidatorSpendAssetName = dustMappingValidatorSpendPolicyContract.policyId! + '';

        const dustNFTTokenName = '';
        const dustNFTAssetName = PolicyId(dustGenerator.Script.hash()) + dustNFTTokenName;

        logger.log(
            '[DustTransactions]',
            '🪙 Re Using DUST NFT:',
            toJson({
                policyId: PolicyId(dustGenerator.Script.hash()),
                assetName: dustNFTAssetName,
                amount: 1n,
            })
        );

        // txBuilder.mintAssets({ [dustMappingValidatorSpendAssetName]: 1n }, dustMappingValidatorSpendRedeemer);

        // CREATE OUTPUT: New registration UTXO with updated datum
        // The new DUST PKH is encoded as the bytes of the hex string representation
        // const updatedRegistrationDatumData = new Constr(0, [
        //     cardanoPKH!, // Cardano PKH (28 bytes hex string) - same as before
        //     toHex(new TextEncoder().encode(newDustPKH)), // New DUST PKH encoded as bytes of the string representation
        // ]);

        // Create dust mapping datum with user's credential and dust address
        const updatedRegistrationDatumData: Contracts.DustMappingDatum = {
            c_wallet: {
                VerificationKey: [cardanoPKH!], // Cardano PKH (28 bytes hex string)
            },
            dust_address: newDustPKH, // DUST PKH encoded as bytes of the string representation
            // dust_address: toHex(new TextEncoder().encode(dustPKH)), // DUST PKH encoded as bytes of the string representation
        };

        const serializedUpdatedRegistrationDatum = serialize(Contracts.DustMappingDatum, updatedRegistrationDatumData).toCbor();

        // // Get the DUST Auth Token from the existing UTXO to preserve it
        // const dustTokenName = toHex(new TextEncoder().encode('DUST production auth token'));
        // const dustAuthTokenAssetName = dustAuthTokenPolicyContract.policyId! + dustTokenName;

        logger.log(
            '[DustTransactions]',
            '📤 Creating updated output to DUST Mapping Validator:',
            toJson({
                address: dustGeneratorAddress,
                assets: {
                    lovelace: 1586080n, // Minimum ADA for UTxO
                    [dustNFTAssetName]: 1n, // DUST Auth Token (preserved)
                },
                datumData: updatedRegistrationDatumData,
                datumCBORHEX: serializedUpdatedRegistrationDatum,
            })
        );

        txBuilder.pay.ToContract(
            dustGeneratorAddress, // DUST Mapping Validator Address (same as before)
            { kind: 'inline', value: serializedUpdatedRegistrationDatum }, // Updated Registration Datum (INLINE)
            {
                lovelace: 1586080n, // Minimum ADA for UTxO
                [dustNFTAssetName]: 1n, // DUST NFT Token (preserved from original UTXO)
            }
        );

        // Attach the required scripts
        logger.log('[DustTransactions]', '📎 Attaching required scripts...');
        txBuilder.attach.SpendingValidator(blazeToLucidScript(dustGenerator.Script));
        // txBuilder.attach.MintingPolicy(dustMappingValidatorSpendPolicyContract.scriptObject!);

        // 3. CRÍTICO: Añade el withdrawal del script validator

        // 1. Obtén el script hash
        const scriptHash = dustGenerator.Script.hash();

        // 2. Crea la Reward Address (stake address) desde el script

        const stakeAddress = RewardAddress.fromCredentials(NETWORK_ID, {
            type: CredentialType.ScriptHash,
            hash: scriptHash,
        }).toAddress().toBech32();

        // 3. Usa esta dirección para el withdrawal
        // txBuilder.registerStake(stakeAddress);

        txBuilder.withdraw(
            stakeAddress, // ← Reward address, no payment address
            0n,
            Data.void()
        );

        txBuilder.attach.WithdrawalValidator(blazeToLucidScript(dustGenerator.Script));


        // Add signer
        txBuilder.addSigner(await lucid.wallet().address());

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
