import { JsonRpcProvider } from 'ethers';
import appSettings from './appSettings';

export default new JsonRpcProvider(appSettings.rpcUrl);
