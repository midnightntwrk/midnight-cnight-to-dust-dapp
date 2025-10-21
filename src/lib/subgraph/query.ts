import { gql, GraphQLClient } from "graphql-request";

interface DustGenerationStatusResponse {
    dustGenerationStatus: {
        cardanoStakeKey: string;
        dustAddress: string | null;
        registered: boolean; 
        nightBalance: string;
        generationRate: string;
        currentCapacity: string;
    }[];
}

export class Subgraph {
    private client: GraphQLClient;

    constructor(uri: string) {
        this.client = new GraphQLClient(uri, { cache: "no-store" });
    }

    /**
     * Get DUST generation status for specific stake keys
     * To get cardanoStakeKey > from lucidWallet
     */
    public async getDustGenerationStatus(cardanoStakeKeys: string[]): Promise<DustGenerationStatusResponse['dustGenerationStatus']> {
        const query = gql`
                query GetDustGenerationStatus($cardanoStakeKeys: [HexEncoded!]!) {
                    dustGenerationStatus(cardanoStakeKeys: $cardanoStakeKeys) {
                        cardanoStakeKey
                        dustAddress
                        registered
                        nightBalance
                        generationRate
                        currentCapacity
                    }
                }
            `;

        const { dustGenerationStatus } = await this.client.request<DustGenerationStatusResponse>(query, {
            cardanoStakeKeys
        });
        return dustGenerationStatus;
    }
}