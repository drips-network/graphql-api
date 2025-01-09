import type { DbSchema } from '../../common/types';
import { dbConnection } from '../../database/connectToDatabase';

export default async function getTokens(dbSchema: DbSchema): Promise<string[]> {
  const distinctGivenTokens = (
    await dbConnection.query(
      `
      SELECT DISTINCT ON ("erc20") "erc20"
      FROM "${dbSchema}"."GivenEvents"
    `,
    )
  )[0] as { erc20: string }[];

  const distinctSplitTokens = (
    await dbConnection.query(
      `
      SELECT DISTINCT ON ("erc20") "erc20"
      FROM "${dbSchema}"."SplitEvents"
    `,
    )
  )[0] as { erc20: string }[];

  const distinctStreamSetTokens = (
    await dbConnection.query(
      `
      SELECT DISTINCT ON ("erc20") "erc20"
      FROM "${dbSchema}"."StreamsSetEvents"
    `,
    )
  )[0] as { erc20: string }[];

  const distinctSqueezedStreamsTokens = (
    await dbConnection.query(
      `
      SELECT DISTINCT ON ("erc20") "erc20"
      FROM "${dbSchema}"."SqueezedStreamsEvents"
    `,
    )
  )[0] as { erc20: string }[];

  return [
    ...new Set([
      ...distinctGivenTokens.map((row: any) => row.erc20),
      ...distinctSplitTokens.map((row: any) => row.erc20),
      ...distinctStreamSetTokens.map((row: any) => row.erc20),
      ...distinctSqueezedStreamsTokens.map((row: any) => row.erc20),
    ]),
  ];
}
