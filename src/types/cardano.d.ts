// types/cardano.d.ts
export interface CardanoWallet {
    name: string;
    icon: string;
    apiVersion: string;
    enable(): Promise<CardanoAPI>;
    isEnabled(): Promise<boolean>;
  }
  
  export interface CardanoAPI {
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
      cardano?: {
        nami?: CardanoWallet;
        eternl?: CardanoWallet;
        lace?: CardanoWallet;
        flint?: CardanoWallet;
        typhoncip30?: CardanoWallet;
        nufi?: CardanoWallet;
        gero?: CardanoWallet;
        ccvault?: CardanoWallet;
      };
    }
  }