import type { BigIntString } from '../common/types';

export default function toBigIntString(value: string | bigint): BigIntString {
  const bigInt = BigInt(value);

  return bigInt.toString() as BigIntString;
}
