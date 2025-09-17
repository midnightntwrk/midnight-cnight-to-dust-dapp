import { gql, GraphQLClient } from "graphql-request";

interface DustGenerationStatusResponse {
    dustGenerationStatus: {
        cardanoStakeKey: string;
        dustAddress: string | null;
        isRegistered: boolean;
        generationRate: number;
    }[];
}

export class Subgraph {
    private client: GraphQLClient;

    constructor(uri: string) {
        this.client = new GraphQLClient(uri, { cache: "no-store" });
    }

    /**
     * Get DUST generation status for specific stake keys
     */
    public async getDustGenerationStatus(cardanoStakeKeys: string[]): Promise<DustGenerationStatusResponse['dustGenerationStatus']> {
        const query = gql`
                query GetDustGenerationStatus($cardanoStakeKeys: [String!]!) {
                    dustGenerationStatus(cardanoStakeKeys: $cardanoStakeKeys) {
                        cardanoStakeKey
                        dustAddress
                        isRegistered
                        generationRate
                    }
                }
            `;

        const { dustGenerationStatus } = await this.client.request<DustGenerationStatusResponse>(query, {
            cardanoStakeKeys
        });
        return dustGenerationStatus;
    }
}