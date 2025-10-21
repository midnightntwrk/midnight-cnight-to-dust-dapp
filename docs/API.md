# API Routes Documentation

## Overview

The application provides three API routes that serve as proxies and interfaces between the frontend and external services. These routes handle Blockfrost queries, DUST generation status checks, and indexer integration.

## Route 1: Blockfrost Proxy

### Endpoint
```
/api/blockfrost/*
```

### Purpose
Secure proxy that forwards requests to Blockfrost API while hiding the API key from client-side code. This catch-all route handles any Blockfrost endpoint by extracting the path after `/api/blockfrost/` and proxying it to the configured Blockfrost URL.

### Location
`src/app/api/blockfrost/[...all]/route.ts`

### Supported Methods
- GET
- POST
- PUT
- DELETE
- PATCH

### Implementation Details

The proxy performs the following operations:

1. **Configuration Loading**: Dynamically imports network configuration to get `BLOCKFROST_URL` and `BLOCKFROST_KEY`
2. **Path Extraction**: Removes `/api/blockfrost` prefix from the request path
3. **Header Preparation**: Sets the `project_id` header with the Blockfrost API key
4. **Header Forwarding**: Copies relevant headers from the original request (content-type, user-agent)
5. **Request Proxying**: Forwards the request to Blockfrost using native fetch API
6. **Response Streaming**: Returns the response body directly without buffering
7. **Header Preservation**: Maintains important response headers (content-type, cache-control, etag, content-length)

### Example Usage

Client request:
```typescript
fetch('/api/blockfrost/addresses/addr1.../utxos')
```

Proxied to:
```
https://cardano-preview.blockfrost.io/api/v0/addresses/addr1.../utxos
```

### Error Handling

Returns JSON error response with status 500 on failure:
```json
{
  "error": "Error message",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

Error logs include:
- Error message
- Request duration in milliseconds
- Request pathname
- HTTP method

### Configuration

Requires environment variables per network:
- `BLOCKFROST_KEY_MAINNET`
- `BLOCKFROST_KEY_PREVIEW`
- `BLOCKFROST_KEY_PREPROD`

The active key is selected based on `NEXT_PUBLIC_CARDANO_NET` environment variable.

### Security Considerations

- API key is never exposed to client-side code
- Runs server-side only (Next.js API route)
- No request body buffering for large payloads
- Response streaming for efficient memory usage

## Route 2: DUST Generation Status (Single Key)

### Endpoint
```
GET /api/dust/generation-status/[key]
```

### Purpose
Queries the Midnight Indexer for DUST generation status of a specific Cardano stake key. Returns registration status, DUST address, generation rate, and current capacity.

### Location
`src/app/api/dust/generation-status/[key]/route.ts`

### Parameters

**Path Parameter**:
- `key` (required): Cardano stake key in hex format

### Response Format

**Success (200)**:
```json
{
  "success": true,
  "data": [{
    "cardanoStakeKey": "ae78b8d48d620fdf...",
    "dustAddress": "5aafc844e5b89509...",
    "registered": true,
    "nightBalance": "1000000",
    "generationRate": "8267000000",
    "currentCapacity": "2500000000000000000"
  }]
}
```

**Not Found (404)**:
```json
{
  "error": "Stake key not found",
  "message": "No block exists at stake key {key}"
}
```

**Error (500)**:
```json
{
  "error": "Failed to fetch stake key",
  "message": "Error details",
  "details": "Stack trace (development only)"
}
```

### Implementation Details

The route supports two modes:

#### Simulation Mode

When `SIMULATION_MODE=true` environment variable is set, returns mock data for testing:

```json
{
  "success": true,
  "data": [{
    "cardanoStakeKey": "provided-key",
    "dustAddress": "mn1qg5ks9wrqhwjv3k2g2h8mcq9wrqhwjv3k2g2h8mcq9wrqhwjv3k2g2h8mc",
    "registered": true,
    "generationRate": "2.5"
  }]
}
```

This allows frontend development without indexer infrastructure.

#### Production Mode

Queries the Midnight Indexer GraphQL endpoint:

```graphql
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
```

### Configuration

Requires environment variable:
- `INDEXER_ENDPOINT`: GraphQL endpoint URL (e.g., `http://localhost:8088/api/v3/graphql`)
- `SIMULATION_MODE`: Optional boolean to enable mock responses

### CORS Support

Includes OPTIONS handler for CORS preflight requests:
```typescript
Access-Control-Allow-Origin: *
Access-Control-Allow-Methods: GET, OPTIONS
Access-Control-Allow-Headers: Content-Type
```

### Current Status

**Not Active**: This route is implemented but currently returns data from simulation mode or will query the indexer when available. The frontend uses `useGenerationStatus` hook with a hardcoded stake key pending indexer deployment.

## Route 3: DUST Generation Status (Multiple Keys)

### Endpoint
```
GET /api/dust/generation-status
```

### Purpose
Queries the Midnight Indexer for multiple Cardano stake keys. This route is a batch version of the single-key endpoint.

### Location
`src/app/api/dust/generation-status/route.ts`

### Implementation Details

Currently queries the indexer with a placeholder stake key:

```typescript
const graph = new Subgraph(process.env.INDEXER_ENDPOINT!);
const generationStatus = await graph.getDustGenerationStatus(["0x00"]);
```

### Response Format

```json
{
  "data": {
    "generationStatus": [
      {
        "cardanoStakeKey": "...",
        "dustAddress": "...",
        "registered": true,
        "nightBalance": "...",
        "generationRate": "...",
        "currentCapacity": "..."
      }
    ]
  }
}
```

### Current Status

**Not Active**: This route exists but is not currently used by the frontend. It's prepared for future batch query needs when the indexer is fully deployed.

### Supported Methods

- GET: Query generation status
- POST: Returns 405 Method Not Allowed

## GraphQL Client

### Location
`src/lib/subgraph/query.ts`

### Class: Subgraph

Provides a typed GraphQL client for querying the Midnight Indexer.

```typescript
const subgraph = new Subgraph(indexerEndpoint);
const status = await subgraph.getDustGenerationStatus(stakeKeys);
```

### Method: getDustGenerationStatus

**Parameters**:
- `cardanoStakeKeys: string[]` - Array of Cardano stake keys (max 10 for DOS protection)

**Returns**:
```typescript
Promise<{
  cardanoStakeKey: string;
  dustAddress: string | null;
  registered: boolean;
  nightBalance: string;
  generationRate: string;
  currentCapacity: string;
}[]>
```

**Query Structure**:
```graphql
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
```

### Configuration

The client is initialized with:
- `uri`: Indexer GraphQL endpoint
- `cache: "no-store"`: Disables caching for real-time data

## Migration Strategy

### Current State

The application uses a dual-source approach:

1. **Blockfrost Proxy** (Active)
   - Transaction confirmation polling
   - Registration UTXO searches
   - Direct blockchain queries

2. **Indexer Integration** (Prepared, Not Active)
   - GraphQL schema aligned with indexer
   - API routes implemented
   - Frontend hooks ready (with hardcoded keys)

### Activation Steps

To switch from Blockfrost to Indexer for registration status:

1. Set `INDEXER_ENDPOINT` environment variable
2. Update `useGenerationStatus` hook to extract actual stake key from wallet address
3. Optionally implement feature flag for gradual rollout

### Benefits of Indexer Migration

- Faster registration confirmation (3-15s vs 3-60s)
- Pre-processed data (no datum deserialization)
- Additional metadata (generation rate, capacity, balance)
- Native Midnight infrastructure
- Optimized batch queries

## Error Handling Patterns

All API routes follow consistent error handling:

1. **Try-Catch Blocks**: Wrap main logic
2. **Detailed Logging**: Include context (duration, path, method)
3. **Typed Error Responses**: JSON format with error message
4. **HTTP Status Codes**: Appropriate codes (400, 404, 500)
5. **Development Details**: Stack traces in development mode only

## Performance Considerations

### Blockfrost Proxy
- Streams response bodies (no buffering)
- Preserves cache headers from Blockfrost
- Minimal overhead (single proxy hop)

### Indexer Routes
- GraphQL client configured with no-store cache
- Batch query support (max 10 keys)
- Database indexes on cardano_address and dust_address

## Security Notes

1. **API Key Protection**: Blockfrost key never exposed to client
2. **Server-Side Only**: All routes run server-side (Next.js API routes)
3. **CORS Configuration**: Explicit CORS headers where needed
4. **Environment Validation**: Checks for required configuration before processing
5. **Error Message Sanitization**: Stack traces only in development

## Testing

### Simulation Mode

Enable simulation mode for testing without external dependencies:

```bash
# .env.local
SIMULATION_MODE=true
```

This allows:
- Frontend development without indexer
- UI/UX testing with mock data
- Integration testing without blockchain queries

### Production Testing

Required configuration:
```bash
NEXT_PUBLIC_CARDANO_NET=Preview
BLOCKFROST_KEY_PREVIEW=your_key
INDEXER_ENDPOINT=http://localhost:8088/api/v3/graphql
```

Test endpoints:
- `GET /api/blockfrost/blocks/latest`
- `GET /api/dust/generation-status/ae78b8d48d620fdf...`
