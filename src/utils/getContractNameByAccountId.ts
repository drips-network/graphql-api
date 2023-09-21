type DripsContract =
  | 'addressDriver'
  | 'nftDriver'
  | 'immutableSplitsDriver'
  | 'repoDriver';

export default function getContractNameByAccountId(
  accountId: string | number | bigint,
): DripsContract {
  const accountIdAsBigInt = BigInt(accountId);

  if (accountIdAsBigInt < 0n || accountIdAsBigInt > 2n ** 256n - 1n) {
    throw new Error(
      `Could not get bits: ${accountId} is not a valid positive number within the range of a uint256.`,
    );
  }

  const mask = 2n ** 32n - 1n; // 32 bits mask

  const bits = (accountIdAsBigInt >> 224n) & mask; // eslint-disable-line no-bitwise

  switch (bits) {
    case 0n:
      return 'addressDriver';
    case 1n:
      return 'nftDriver';
    case 2n:
      return 'immutableSplitsDriver';
    case 3n:
      return 'repoDriver';
    default:
      throw new Error(`Unknown driver for accountId: ${accountId}.`);
  }
}
