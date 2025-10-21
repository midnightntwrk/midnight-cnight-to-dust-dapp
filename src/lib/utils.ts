import { UTxO } from '@lucid-evolution/lucid';
import { bech32m } from 'bech32';

// Helper function to convert to JSON for logging
export const toJson = (obj: object): string => {
    return JSON.stringify(obj, (key, value) => (typeof value === 'bigint' ? value.toString() + 'n' : value), 2);
};

/**
 * Extract coin public key from a Midnight shielded address
 * Midnight shielded addresses are Bech32m-encoded and contain:
 * - First 32 bytes: coin public key
 * - Remaining bytes: encryption public key (up to 36 bytes)
 *
 * @param address - Midnight shielded address (e.g., mn_shield-addr_test1...)
 * @returns Coin public key as hex string (64 characters) or null if invalid
 */
export const extractCoinPublicKeyFromMidnightAddress = (address: string): string | null => {
    try {
        // Decode the Bech32m address
        const { prefix, words } = bech32m.decode(address, 200);

        // Convert from 5-bit words to 8-bit bytes
        const data = bech32m.fromWords(words);

        // Extract first 32 bytes as coin public key
        const coinPublicKeyBytes = data.slice(0, 32);

        // Convert to hex string
        const coinPublicKeyHex = Buffer.from(coinPublicKeyBytes).toString('hex');

        console.log('🔑 Extracted Coin Public Key:', {
            address: address,
            prefix: prefix,
            dataLength: data.length,
            coinPublicKeyHex: coinPublicKeyHex,
            coinPublicKeyLength: coinPublicKeyHex.length
        });

        return coinPublicKeyHex;
    } catch (error) {
        console.error('❌ Failed to extract coin public key from address:', error);
        return null;
    }
};

export function splitTokenLucidKey(key: string): [string, string] {
    // Assuming the key is formed by concatenating CS and TN_Hex for non-ADA tokens
    // You need to provide a way to split the key back into CS and TN_Hex
    // Placeholder implementation:
    const CS = key.slice(0, 56);
    const TN_Hex = key.slice(56);
    return [CS, TN_Hex];
}

export function isTokenADA(CS: string, TN_Hex: string) {
    return (CS === '' || CS === 'lovelace') && TN_Hex === '';
}

export function getTotalOfUnitInUTxOList(
    assetClass_Lucid: string,
    uTxOsAtWallet: UTxO[],
    isFullAssetClass: boolean = true // nuevo parámetro: usar AC completo (CS+TN) o solo CS
) {
    //console.log("[Utils]"," - getTotalOfUnitInUTxOList - unit: " + assetClass_Lucid)
    const [CS, TN_Hex] = splitTokenLucidKey(assetClass_Lucid);

    const isADA = isTokenADA(CS, TN_Hex);
    if (isADA) {
        assetClass_Lucid = 'lovelace';
    }

    //console.log("[Utils]"," - getTotalOfUnitInUTxOList - isADA: " + isADA + " - TN_Hex: " + TN_Hex)

    let total: bigint = 0n;

    uTxOsAtWallet.forEach((u) => {
        if (isADA) {
            // Calculate the total ADA considering or not the ADA locked with tokens
            total += u.assets[assetClass_Lucid] || 0n;
        } else if (!isFullAssetClass) {
            //console.log("[Utils]"," - getTotalOfUnitInUTxOList - SUMANDO TODO LO DE LA MISMA POLICY")
            for (const [key, value] of Object.entries(u.assets)) {
                const [CS_] = splitTokenLucidKey(key);
                if (CS_ === assetClass_Lucid) {
                    //console.log("[Utils]"," - getTotalOfUnitInUTxOList - key: " + key + " - value: " + value)
                    total += value;
                }
            }
        } else {
            //console.log("[Utils]"," - getTotalOfUnitInUTxOList - BUSCANDO AC EXACTO: " + assetClass_Lucid)
            if (u.assets[assetClass_Lucid]) {
                total += u.assets[assetClass_Lucid] as bigint;
            }
        }
    });

    //console.log("[Utils]"," - getTotalOfUnitInUTxOList - total: " + total)
    return BigInt(total.toString()) as bigint;
}

// Format number with K/M suffix
export const formatNumber = (value: number): string => {
    if (value >= 1000000) {
        return (value / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
    } else if (value >= 1000) {
        return (value / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
    }
    return value.toFixed(2);
};