// types/midnight.d.ts
import { InitialAPI, ConnectedAPI } from '@midnight-ntwrk/dapp-connector-api';

// Re-export types for convenience
export type { InitialAPI, ConnectedAPI };

declare global {
  interface Window {
    midnight?: {
      [key: string]: InitialAPI;
    };
  }
}
