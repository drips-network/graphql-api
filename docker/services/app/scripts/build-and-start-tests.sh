cd app

npm run build:graphql

PUBLIC_TEST_SUBGRAPH_HOST=graph-node E2E_FAKE_PINATA_HOST=fake-pinata PUBLIC_TESTNET_MOCK_PROVIDER_HOST=testnet VITE_TEST_MODE=true npm run build

PUBLIC_TEST_SUBGRAPH_HOST=graph-node E2E_FAKE_PINATA_HOST=fake-pinata PUBLIC_TESTNET_MOCK_PROVIDER_HOST=testnet npm run test:e2e
