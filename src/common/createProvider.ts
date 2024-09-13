import { FetchRequest, JsonRpcProvider, WebSocketProvider } from 'ethers';
import shouldNeverHappen from '../utils/shouldNeverHappen';

export default async function createProvider(
  rpcUrl: string,
  pollingInterval?: number,
  rpcAccessToken?: string,
): Promise<JsonRpcProvider | WebSocketProvider | null> {
  let provider: JsonRpcProvider | WebSocketProvider | null = null;

  try {
    if (rpcUrl.startsWith('http')) {
      provider = rpcAccessToken
        ? new JsonRpcProvider(
            createAuthFetchRequest(rpcUrl, rpcAccessToken),
            undefined,
            { pollingInterval },
          )
        : new JsonRpcProvider(rpcUrl, undefined, { pollingInterval });
    } else if (rpcUrl.startsWith('wss')) {
      provider = new WebSocketProvider(rpcUrl);
    } else {
      return shouldNeverHappen(`Unsupported RPC URL: ${rpcUrl}`);
    }

    console.info(`Provider initialized for '${rpcUrl}'.`);
  } catch (error) {
    console.error(`Failed to initialize provider for '${rpcUrl}': ${error}`);
    provider?.destroy();
    provider = null;
  }

  return provider;
}

function createAuthFetchRequest(rpcUrl: string, token: string): FetchRequest {
  const fetchRequest = new FetchRequest(rpcUrl);
  fetchRequest.method = 'POST';
  fetchRequest.setHeader('Content-Type', 'application/json');
  fetchRequest.setHeader('Authorization', `Bearer ${token}`);

  return fetchRequest;
}
