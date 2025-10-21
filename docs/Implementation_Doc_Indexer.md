Summary
Implement dustGenerationStatus GraphQL query to provide DUST generation tracking for Cardano stake keys, enabling external clients (particularly Protofire dApp) to monitor DUST capacity and generation rates without dependency on Blockfrost.

Status
IMPLEMENTED - Merged in PR #419 (commit a7e10a0)
Released - Docker image: ghcr.io/midnightntwrk/midnight-indexer:3.0.0-alpha.5

Business Context
Requester: Matias Caparros (Protofire dApp team)

The Protofire dApp previously relied on Blockfrost to check if Cardano stake keys had valid registration UTXOs. This external dependency needed to be replaced with a native indexer query that provides comprehensive DUST generation information.

Implementation Details
GraphQL Query
query DustGenerationStatus($cardanoStakeKeys: [HexEncoded!]!) {
  dustGenerationStatus(cardanoStakeKeys: $cardanoStakeKeys) {
    cardanoStakeKey      # The queried stake key
    dustAddress          # Associated DUST address (if registered)
    registered           # Registration status
    nightBalance         # NIGHT balance in Stars
    generationRate       # Specks per second
    currentCapacity      # Current DUST capacity in Specks
  }
}
Key Features
Accepts array of Cardano stake keys (max 10 for DOS protection)
Returns registration status from cnight_registrations table
Calculates generation rate: 8,267 Specks/Star/second
Computes current capacity with max cap: 5 DUST per NIGHT
Tracks NIGHT balance backing DUST generation
Database Schema
New tables added:

cnight_registrations - Tracks Cardano stake key to DUST address registrations
dust_generation_info - Stores NIGHT UTXO generation metadata
Economic Model
Parameter	Value	Description
Generation Rate	8,267 Specks/Star/sec	Base DUST generation speed
Max Capacity	5,000,000,000 Specks/Star	5 DUST per NIGHT
Time to Max	~7 days	Time to reach maximum capacity
Technical Architecture
Event Processing Flow
Midnight Node → NativeTokenObservation Pallet Events
                ↓
         Chain Indexer → Registration/Deregistration Events
                ↓
         PostgreSQL Tables (cnight_registrations, dust_generation_info)
                ↓
         GraphQL API (dustGenerationStatus query)
                ↓
         External Clients (Protofire dApp)
Ledger Events Processed
DustInitialUtxo - Initial DUST generation record creation
DustGenerationDtimeUpdate - Updates when NIGHT is spent
API Documentation
Endpoint
http://<host>:<port>/api/v3/graphql
wss://<host>:<port>/api/v3/graphql/ws (WebSocket)
Example Request
curl -X POST http://localhost:8088/api/v3/graphql \
  -H "Content-Type: application/json" \
  -d '{
    "query": "query { dustGenerationStatus(cardanoStakeKeys: [\"0xae78b8d48d620fdf78e30ddb79c442066bd93f1f4f1919efc4373e6fed6cc665\"]) { cardanoStakeKey registered dustAddress nightBalance generationRate currentCapacity } }"
  }'
Example Response
{
  "data": {
    "dustGenerationStatus": [{
      "cardanoStakeKey": "ae78b8d48d620fdf78e30ddb79c442066bd93f1f4f1919efc4373e6fed6cc665",
      "registered": true,
      "dustAddress": "5aafc844e5b89509d451efefa01cafda53448f278a652f3919cad3efa71b2e75",
      "nightBalance": "1000000",
      "generationRate": "8267000000",
      "currentCapacity": "2500000000000000000"
    }]
  }
}
Testing
Test Coverage
✅ E2E tests for GraphQL query
✅ DOS protection (max 10 keys)
✅ Registered vs unregistered stake keys
✅ Generation rate calculations
✅ Capacity calculations with time elapsed
Current Database State (Production)
As of latest deployment:

13 registered Cardano stake keys in cnight_registrations
All registrations currently valid
No DUST generation records yet (awaiting NIGHT registration for DUST generation)
Performance Considerations
Query limit: Max 10 stake keys per request
Database indexes on cardano_address and dust_address
Batch queries optimized for multiple stake keys
Migration Notes
API version changed from v1 to v3
New tables created automatically on deployment
No data migration required (greenfield tables)
Documentation
API Documentation
QA Testing Guide
Related Work
Original JIRA: PM-19861
Feature Branch: feat/cnight-generates-dust
PR: feat(api): add dustGenerationStatus query for cNIGHT tracking #419
Commit: a7e10a0
Docker Image: ghcr.io/midnightntwrk/midnight-indexer:3.0.0-alpha.5
Success Metrics

Protofire successfully replaced Blockfrost integration

Query responds in acceptable time for 10 stake keys

Zero errors in production logs

Test coverage implemented
Labels
enhancement graphql dust external-api completed

Assignees
@cosmir17

Milestone
v3.0.0-alpha.5

Note: This feature has been successfully implemented and deployed. This issue serves as documentation and tracking for the completed feature.