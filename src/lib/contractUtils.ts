import { NETWORK_ID } from '@/config/network';
import { addressFromValidator, Script as BlazeScript, CredentialType, PolicyId, RewardAddress } from '@blaze-cardano/core';
import { serialize } from '@blaze-cardano/data';
import { Script as LucidScript } from '@lucid-evolution/lucid';

/**
 *
 * Convert Blaze Script to Lucid Script format
 */
export function blazeToLucidScript(blazeScript: BlazeScript): LucidScript {
    const core = blazeScript.toCore() as any; // eslint-disable-line @typescript-eslint/no-explicit-any

    enum BlazePlutusLanguageVersion {
        V1 = 0,
        V2 = 1,
        V3 = 2,
    }

    let LucidScriptType: 'PlutusV1' | 'PlutusV2' | 'PlutusV3';

    switch (core.version) {
        case BlazePlutusLanguageVersion.V1:
            LucidScriptType = 'PlutusV1';
            break;
        case BlazePlutusLanguageVersion.V2:
            LucidScriptType = 'PlutusV2';
            break;
        case BlazePlutusLanguageVersion.V3:
            LucidScriptType = 'PlutusV3';
            break;
        default:
            throw new Error(`Unsupported script language: ${core.version}`);
    }

    return {
        type: LucidScriptType,
        script: core.bytes,
    };
}

/**
 * Get validator address from script
 */
export function getValidatorAddress(script: BlazeScript): string {
    return addressFromValidator(NETWORK_ID, script).toBech32();
}

/**
 * Get stake address from script hash
 */
export function getStakeAddress(script: BlazeScript): string {
    const scriptHash = script.hash();
    return RewardAddress.fromCredentials(NETWORK_ID, {
        type: CredentialType.ScriptHash,
        hash: scriptHash,
    })
        .toAddress()
        .toBech32();
}

/**
 * Get policy ID from script
 */
export function getPolicyId(script: BlazeScript): string {
    return PolicyId(script.hash());
}

/**
 * Serialize data to CBOR format
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function serializeToCbor(type: any, data: any): string {
    return serialize(type, data).toCbor();
}
