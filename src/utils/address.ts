import getContractNameByAccountId from "./getContractNameByAccountId";

export const getAddressForId = (accountId: string): string => {
  const accountIdAsBigInt = BigInt(accountId);

  if (getContractNameByAccountId(accountId) === "addressDriver") {
    const mid64BitsMask = 2n ** 64n - 1n << 160n;

    if ((accountIdAsBigInt & mid64BitsMask) !== 0n) {
      throw new Error(
        `Could not get user address: ${accountId} is not a valid user ID. The first 64 (after first 32) bits must be 0.`
      );
    }
  }

  const mask = 2n ** 160n - 1n;
  const address = (accountIdAsBigInt & mask).toString(16);

  const paddedAddress = ethers.utils.hexZeroPad(address, 20);

  return ethers.utils.getAddress(paddedAddress);
};
}