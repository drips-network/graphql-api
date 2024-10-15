#!/bin/bash

echo 🤓 Checking env vars...
echo

if [ -f .env ]; then
  export $(grep -v '^#' .env | xargs)
fi

required_vars=("RPC_CONFIG" "POSTGRES_CONNECTION_STRING" "DRIPS_API_KEY" "PUBLIC_API_KEYS")

for var in "${required_vars[@]}"; do
  if [ -z "${!var}" ]; then
    echo "❌ Error: $var is not set."
    exit 1
  fi
done

echo "✅ All required environment variables are set."
