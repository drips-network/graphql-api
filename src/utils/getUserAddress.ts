/* eslint-disable no-bitwise */
import { ethers } from 'ethers';
import getContractNameByAccountId from './getContractNameByAccountId';

export default function getUserAddress(accountId: string): string {
  const accountIdAsBn = BigInt(accountId);

  const maxUint256 = BigInt(2) ** BigInt(256) - BigInt(1);

  if (accountIdAsBn < 0 || accountIdAsBn > maxUint256) {
    throw new Error(
      `Could not get user address: ${accountId} is not a valid positive number within the range of a uint256.`,
    );
  }

  if (getContractNameByAccountId(accountId) === 'addressDriver') {
    const mid64BitsMask = (BigInt(2) ** BigInt(64) - BigInt(1)) << BigInt(160);

    if ((accountIdAsBn & mid64BitsMask) !== BigInt(0)) {
      throw new Error(
        `Could not get user address: ${accountId} is not a valid user ID. The first 64 (after first 32) bits must be 0.`,
      );
    }
  }

  const mask = BigInt(2) ** BigInt(160) - BigInt(1);
  let address = (accountIdAsBn & mask).toString(16);

  address = address.padStart(40, '0');

  return ethers.getAddress(address);
}
