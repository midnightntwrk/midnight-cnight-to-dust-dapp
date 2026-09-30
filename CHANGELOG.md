# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Security

- The Midnight indexer's Blockfrost project token stays server-side. `useGenerationStatus` now calls `/api/dust/generation-status/[key]` instead of querying the indexer from the browser. The server adds the token as a `project_id` header from `MIDNIGHT_INDEXER_KEY_<NETWORK>`.
- `/api/runtime-config` no longer returns `INDEXER_ENDPOINT_*`, so an endpoint URL, and any token in it, is never served to visitors. Logged indexer URLs have their query string removed.
- CSP `connect-src` is now `'self'` only. The hard-coded `indexer.<network>.midnight.network` origin is removed.

### Changed

- The mainnet indexer endpoint defaults to Blockfrost (`https://midnight-mainnet.blockfrost.io/api/v0`), because the official mainnet indexer shut down on 2026-09-30. Mainnet deployments must set `MIDNIGHT_INDEXER_KEY_MAINNET`.
