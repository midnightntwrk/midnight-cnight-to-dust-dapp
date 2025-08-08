// types/midnight.d.ts
export interface MidnightWallet {
    name: string;
    icon: string;
    apiVersion: string;
    enable(): Promise<MidnightAPI>;
    isEnabled(): Promise<boolean>;
}

export interface MidnightAPI {
    getNetworkId(): Promise<number>;
    getUtxos(): Promise<string[]>;
    getBalance(): Promise<string>;
    getUsedAddresses(): Promise<string[]>;
    getUnusedAddresses(): Promise<string[]>;
    getChangeAddress(): Promise<string>;
    getRewardAddresses(): Promise<string[]>;
    signTx(tx: string, partialSign?: boolean): Promise<string>;
    signData(address: string, payload: string): Promise<object>;
    submitTx(tx: string): Promise<string>;
}

declare global {
    interface Window {
        midnight?: {
            lace?: MidnightWallet;
        };
    }
}