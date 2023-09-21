import { ethers } from 'ethers';

export default function calcSaltFromAddress(
  address: string,
  listCount: number,
): bigint /* 64bit */ {
  const SEED_CONSTANT = 'Drips App';

  const hash = ethers.keccak256(
    ethers.AbiCoder.defaultAbiCoder().encode(
      ['string'],
      [SEED_CONSTANT + address],
    ),
  );

  const randomBigInt = BigInt(`0x${hash.slice(26)}`);

  let random64BitBigInt =
    // eslint-disable-next-line no-bitwise
    BigInt(randomBigInt.toString()) & BigInt('0xFFFFFFFFFFFFFFFF');

  const listCountBigInt = BigInt(listCount);
  // eslint-disable-next-line no-bitwise
  random64BitBigInt ^= listCountBigInt;

  return random64BitBigInt;
}
