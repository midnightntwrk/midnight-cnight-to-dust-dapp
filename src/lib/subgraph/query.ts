import { gql, GraphQLClient } from 'graphql-request';
import { logger } from '@/lib/logger';

interface DustGenerationStatusResponse {
  dustGenerationStatus: {
    cardanoRewardAddress: string;
    dustAddress: string | null;
    registered: boolean;
    nightBalance: string;
    generationRate: string;
    currentCapacity: string;
  }[];
}

export class Subgraph {
  private client: GraphQLClient;
  private uri: string;

  constructor(uri: string) {
    this.uri = uri;
    this.client = new GraphQLClient(uri, { cache: 'no-store' });
    logger.log('[Subgraph]', '🔧 Initialized GraphQL client', { uri });
  }

  /**
   * Get DUST generation status for specific reward addresses
   * @param cardanoRewardAddresses - Array of Cardano reward addresses (bech32 format: stake_test1... or stake1...)
   */
  public async getDustGenerationStatus(cardanoRewardAddresses: string[]): Promise<DustGenerationStatusResponse['dustGenerationStatus']> {
    const query = gql`
      query GetDustGenerationStatus($cardanoRewardAddresses: [String!]!) {
        dustGenerationStatus(cardanoRewardAddresses: $cardanoRewardAddresses) {
          cardanoRewardAddress
          dustAddress
          registered
          nightBalance
          generationRate
          currentCapacity
        }
      }
    `;

    logger.log('[Subgraph]', '📤 Sending GraphQL query', {
      endpoint: this.uri,
      query: 'GetDustGenerationStatus',
      variables: { cardanoRewardAddresses },
    });

    try {
      const startTime = Date.now();
      const { dustGenerationStatus } = await this.client.request<DustGenerationStatusResponse>(query, {
        cardanoRewardAddresses,
      });
      const duration = Date.now() - startTime;

      logger.log('[Subgraph]', '📥 GraphQL response received', {
        duration: `${duration}ms`,
        resultsCount: dustGenerationStatus?.length ?? 0,
        results: dustGenerationStatus,
      });

      return dustGenerationStatus;
    } catch (error) {
      logger.error('[Subgraph]', '❌ GraphQL query failed', {
        endpoint: this.uri,
        variables: { cardanoRewardAddresses },
        error: error instanceof Error ? error.message : error,
      });
      throw error;
    }
  }
}
