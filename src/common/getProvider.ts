import type { Provider } from 'ethers';
import { FetchRequest, JsonRpcProvider, WebSocketProvider } from 'ethers';
import shouldNeverHappen from '../utils/shouldNeverHappen';
import appSettings from './appSettings';

let providerInstance: Provider | null = null;

export default function getProvider(): Provider {
  if (!providerInstance) {
    const { rpcUrl, rpcAccessToken } = appSettings;

    if (rpcUrl.startsWith('http')) {
      providerInstance = rpcAccessToken
        ? new JsonRpcProvider(createAuthFetchRequest(rpcUrl, rpcAccessToken))
        : new JsonRpcProvider(rpcUrl);
    } else if (rpcUrl.startsWith('wss')) {
      providerInstance = new WebSocketProvider(rpcUrl);
    } else {
      shouldNeverHappen(`Invalid RPC URL: ${rpcUrl}`);
    }
  }

  return providerInstance;
}

function createAuthFetchRequest(rpcUrl: string, token: string): FetchRequest {
  const fetchRequest = new FetchRequest(rpcUrl);
  fetchRequest.method = 'POST';
  fetchRequest.setHeader('Content-Type', 'application/json');
  fetchRequest.setHeader('Authorization', `Bearer ${token}`);
  return fetchRequest;
}
