#!/bin/sh
set -e

# Runtime environment variable injection for Next.js
# Replaces __PLACEHOLDER__ values with actual environment variables

echo "Injecting runtime environment variables..."

# Define the placeholder-to-env mappings
# Format: PLACEHOLDER_NAME:ENV_VAR_NAME
MAPPINGS="
__NEXT_PUBLIC_CARDANO_NET__:NEXT_PUBLIC_CARDANO_NET
__NEXT_PUBLIC_BLOCKFROST_URL_PREVIEW__:NEXT_PUBLIC_BLOCKFROST_URL_PREVIEW
__NEXT_PUBLIC_BLOCKFROST_URL_PREPROD__:NEXT_PUBLIC_BLOCKFROST_URL_PREPROD
__NEXT_PUBLIC_BLOCKFROST_URL_MAINNET__:NEXT_PUBLIC_BLOCKFROST_URL_MAINNET
__NEXT_PUBLIC_BLOCKCHAIN_EXPLORER_URL_PREVIEW__:NEXT_PUBLIC_BLOCKCHAIN_EXPLORER_URL_PREVIEW
__NEXT_PUBLIC_BLOCKCHAIN_EXPLORER_URL_PREPROD__:NEXT_PUBLIC_BLOCKCHAIN_EXPLORER_URL_PREPROD
__NEXT_PUBLIC_BLOCKCHAIN_EXPLORER_URL_MAINNET__:NEXT_PUBLIC_BLOCKCHAIN_EXPLORER_URL_MAINNET
__NEXT_PUBLIC_PREVIEW_CNIGHT_CURRENCY_POLICY_ID__:NEXT_PUBLIC_PREVIEW_CNIGHT_CURRENCY_POLICY_ID
__NEXT_PUBLIC_PREPROD_CNIGHT_CURRENCY_POLICY_ID__:NEXT_PUBLIC_PREPROD_CNIGHT_CURRENCY_POLICY_ID
__NEXT_PUBLIC_MAINNET_CNIGHT_CURRENCY_POLICY_ID__:NEXT_PUBLIC_MAINNET_CNIGHT_CURRENCY_POLICY_ID
__NEXT_PUBLIC_PREVIEW_CNIGHT_CURRENCY_ENCODEDNAME__:NEXT_PUBLIC_PREVIEW_CNIGHT_CURRENCY_ENCODEDNAME
__NEXT_PUBLIC_PREPROD_CNIGHT_CURRENCY_ENCODEDNAME__:NEXT_PUBLIC_PREPROD_CNIGHT_CURRENCY_ENCODEDNAME
__NEXT_PUBLIC_MAINNET_CNIGHT_CURRENCY_ENCODEDNAME__:NEXT_PUBLIC_MAINNET_CNIGHT_CURRENCY_ENCODEDNAME
__NEXT_PUBLIC_INDEXER_ENDPOINT__:NEXT_PUBLIC_INDEXER_ENDPOINT
__NEXT_PUBLIC_REACT_SERVER_API_URL__:NEXT_PUBLIC_REACT_SERVER_API_URL
"

# Process each mapping
for mapping in $MAPPINGS; do
  # Skip empty lines
  [ -z "$mapping" ] && continue

  placeholder=$(echo "$mapping" | cut -d: -f1)
  env_var=$(echo "$mapping" | cut -d: -f2)

  # Get the value of the environment variable
  eval "value=\$$env_var"

  # Skip if env var is not set
  if [ -z "$value" ]; then
    echo "  Skipping $env_var (not set)"
    continue
  fi

  echo "  Replacing $placeholder with value from $env_var"

  # Replace in all JS files in .next directory
  find /app/.next -type f -name '*.js' -exec sed -i "s|$placeholder|$value|g" {} + 2>/dev/null || true

  # Also replace in server.js if it exists
  if [ -f /app/server.js ]; then
    sed -i "s|$placeholder|$value|g" /app/server.js 2>/dev/null || true
  fi
done

echo "Environment variable injection complete."

# Execute the main command
exec "$@"
