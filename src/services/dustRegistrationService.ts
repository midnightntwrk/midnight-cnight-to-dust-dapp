import { LucidEvolution, getAddressDetails, mintingPolicyToId, toHex, TxSignBuilder } from '@lucid-evolution/lucid';
import { contractService, toJson } from './contractService';

export interface RegistrationTransactionResult {
    signedTx: unknown;
    txHash?: string;
}

export interface TransactionStatus {
    isConfirmed: boolean;
    confirmations: number;
    blockHeight?: number;
}

class DustRegistrationService {
    /**
     * Build the DUST address registration transaction (Step 03)
     */
    async buildRegistrationTransaction(lucid: LucidEvolution, dustPKH: string): Promise<TxSignBuilder> {
        const { Data, Constr } = await import('@lucid-evolution/lucid');

        console.log('🔧 Building DUST Address Registration Transaction...');

        // Ensure contracts are loaded
        await contractService.loadAllContracts();

        // Get contracts from centralized service
        console.log('🔍 Getting contracts from centralized service...');
        const versionOracleValidatorContract = contractService.getContract('version-oracle-validator.plutus');
        const dustAuthTokenMintingPolicyContract = contractService.getContract('dust-auth-token-minting-policy.plutus');
        const dustAuthTokenPolicyContract = contractService.getContract('dust-auth-token-policy.plutus');
        const dustMappingValidatorContract = contractService.getContract('dust-mapping-validator.plutus');

        if (!versionOracleValidatorContract || !dustAuthTokenMintingPolicyContract || !dustAuthTokenPolicyContract || !dustMappingValidatorContract) {
            console.error('❌ Required contracts not found in service registry');
            throw new Error('Required contracts not found in service registry');
        }

        // Find Version Oracle UTxO (reference input)
        console.log('🔍 Querying Version Oracle UTxOs for reference...');
        const versionOracleUtxos = await lucid.utxosAt(versionOracleValidatorContract.address!);

        console.log(
            '💰 Version Oracle UTxO Query Result:',
            toJson({
                utxosFound: versionOracleUtxos.length,
                utxos: versionOracleUtxos.map((utxo) => ({
                    txHash: utxo.txHash,
                    outputIndex: utxo.outputIndex,
                    assets: Object.keys(utxo.assets),
                    lovelace: utxo.assets.lovelace,
                    datum: utxo.datum,
                    datumHash: utxo.datumHash,
                    scriptRef: utxo.scriptRef?.script.slice(0, 10) + '...',
                })),
            })
        );

        if (versionOracleUtxos.length === 0) {
            console.error('❌ Version Oracle UTxOs not found');
            throw new Error('Version Oracle UTxOs from previous steps not found - run Steps 01 & 02 first');
        }

        // Find the UTxO with the DUST Auth Token Minting Policy reference script
        const dustAuthTokenMintingUtxo = versionOracleUtxos.find((utxo) => {
            if (!utxo.scriptRef) {
                return false;
            }
            return mintingPolicyToId(utxo.scriptRef) === dustAuthTokenMintingPolicyContract.policyId;
        });

        if (!dustAuthTokenMintingUtxo) {
            console.error('❌ DUST Auth Token Minting Policy UTxO not found');
            throw new Error('DUST Auth Token Minting Policy UTxO not found');
        }

        // Get environment variables for registration
        const cardanoAddress = await lucid.wallet().address();
        const cardanoPKH = getAddressDetails(cardanoAddress)?.paymentCredential?.hash;

        console.log('📋 Registration Configuration:', {
            dustPKH,
            cardanoAddress,
            hasCardanoAddress: !!cardanoAddress,
            hasDustPKH: !!dustPKH,
        });

        if (!dustPKH) {
            console.error('❌ DUST PKH not configured');
            throw new Error('DUST_PKH must be configured for registration');
        }

        // Build the transaction according to Step 03 specification
        console.log('🔨 Building registration transaction...');
        const txBuilder = lucid.newTx();

        // REFERENCE INPUT: Version Oracle UTxO with DUST Auth Token Minting Policy
        console.log('📥 Adding reference input (Version Oracle UTxO with minting policy)...');
        txBuilder.readFrom([dustAuthTokenMintingUtxo]);

        // MINT 1: DUST Auth Token Minting Policy - 1 token with EMPTY asset name
        const dustAuthTokenMintingRedeemer = Data.to(new Constr(0, [])); // Constructor 0, empty fields
        const dustAuthTokenMintingAssetName = dustAuthTokenMintingPolicyContract.policyId! + '';

        console.log(
            '🪙 Minting DUST Auth Token (Minting Policy):',
            toJson({
                policyId: dustAuthTokenMintingPolicyContract.policyId!,
                assetName: dustAuthTokenMintingAssetName,
                amount: 1n,
                redeemerCBORHEX: dustAuthTokenMintingRedeemer,
            })
        );

        txBuilder.mintAssets({ [dustAuthTokenMintingAssetName]: 1n }, dustAuthTokenMintingRedeemer);

        // MINT 2: DUST Auth Token Policy - 1 token with specific token name
        const dustAuthTokenRedeemer = Data.to(new Constr(0, [])); // Constructor 0, empty fields
        const dustTokenName = toHex(new TextEncoder().encode('DUST production auth token'));
        const dustAuthTokenAssetName = dustAuthTokenPolicyContract.policyId! + dustTokenName;

        console.log(
            '🪙 Minting DUST Auth Token (Main Policy):',
            toJson({
                policyId: dustAuthTokenPolicyContract.policyId!,
                tokenName: 'DUST production auth token',
                assetName: dustAuthTokenAssetName,
                amount: 1n,
            })
        );

        txBuilder.mintAssets({ [dustAuthTokenAssetName]: 1n }, dustAuthTokenRedeemer);

        // OUTPUT: DUST Mapping Validator with Registration Datum
        // The DUST PKH is encoded as the bytes of the hex string representation
        const registrationDatumData = new Constr(0, [
            cardanoPKH!, // Cardano PKH (28 bytes hex string)
            toHex(new TextEncoder().encode(dustPKH)), // DUST PKH encoded as bytes of the string representation
        ]);

        const serializedRegistrationDatum = Data.to(registrationDatumData);

        console.log(
            '📤 Creating output to DUST Mapping Validator:',
            toJson({
                address: dustMappingValidatorContract.address!,
                assets: {
                    lovelace: 1586080n, // ADA amount
                    [dustAuthTokenAssetName]: 1n, // Using minting policy token
                },
                datumData: registrationDatumData,
                datumCBORHEX: serializedRegistrationDatum,
            })
        );

        txBuilder.pay.ToContract(
            dustMappingValidatorContract.address!, // DUST Mapping Validator Address
            { kind: 'inline', value: serializedRegistrationDatum }, // Registration Datum (INLINE)
            {
                lovelace: 1586080n, // Minimum ADA for UTxO
                [dustAuthTokenAssetName]: 1n, // DUST Auth Token (from main policy)
            }
        );

        console.log('📎 Attaching DUST Auth Token Minting Policy script...');
        txBuilder.attach.MintingPolicy(dustAuthTokenMintingPolicyContract.scriptObject!);

        console.log('📎 Attaching DUST Auth Token Policy script...');
        txBuilder.attach.MintingPolicy(dustAuthTokenPolicyContract.scriptObject!);

        // Add signer
        txBuilder.addSigner(await lucid.wallet().address());

        console.log('🔧 Completing registration transaction...');
        const completedTx = await txBuilder.complete();

        console.log('✅ Registration transaction completed successfully');
        return completedTx;
    }

    /**
     * Create a transaction executor for DUST registration
     * This returns a function that can be used with TransactionContext.executeTransaction()
     */
    createRegistrationExecutor(lucid: LucidEvolution, dustPKH: string) {
        return async (params: Record<string, unknown>, onProgress?: (step: string, progress: number) => void): Promise<string> => {
            // Step 1: Build transaction
            onProgress?.('Preparing transaction...', 20);
            const completedTx = await this.buildRegistrationTransaction(lucid, dustPKH);

            // Step 2: Sign and submit transaction
            onProgress?.('Signing transaction...', 40);
            console.log('✍️ Signing transaction...');
            const signedTx = await completedTx.sign.withWallet().complete();

            onProgress?.('Submitting transaction...', 60);
            console.log('📤 Submitting transaction...');
            const txHash = await signedTx.submit();

            console.log('🎯 Transaction submitted successfully:', txHash);
            return txHash;
        };
    }
}

// Export singleton instance
export const dustRegistrationService = new DustRegistrationService();
export default dustRegistrationService;
