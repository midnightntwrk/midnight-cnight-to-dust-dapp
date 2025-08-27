// types/midnight.d.ts
import { DAppConnectorAPI, DappConnectorWalletState } from '@midnight-ntwrk/dapp-connector-api';
export interface MidnightWallet {
    name: string;
    icon: string;
    apiVersion: string;
    enable(): Promise<MidnightAPI>;
    isEnabled(): Promise<boolean>;
}

export interface MidnightAPI {
    state(): DappConnectorWalletState;
}

declare global {
    interface Window {
        midnight?: {
            mnLace?: DAppConnectorAPI;
        };
    }
}