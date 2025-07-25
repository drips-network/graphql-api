import { QueryTypes } from 'sequelize';
import type { DbSchema } from '../../common/types';
import { dbConnection } from '../../database/connectToDatabase';
import { DB_SCHEMAS } from '../../common/constants';

export type ChainStatsResult = {
  chain: DbSchema;
  dripListsCount: number;
  claimedProjectsCount: number;
  receiversCount: number;
};

async function getChainStats(chains: DbSchema[]): Promise<ChainStatsResult[]> {
  const invalidChains = chains.filter((chain) => !DB_SCHEMAS.includes(chain));
  if (invalidChains.length > 0) {
    throw new Error(`Invalid database schemas: ${invalidChains.join(', ')}`);
  }

  const results: ChainStatsResult[] = [];

  for (const chain of chains) {
    const dripListsCountQuery = `
      SELECT COUNT(*) as count
      FROM "${chain}"."DripLists"
      WHERE "isValid" = true
    `;

    const claimedProjectsCountQuery = `
      SELECT COUNT(*) as count
      FROM "${chain}"."GitProjects"
      WHERE "isValid" = true AND "verificationStatus" = 'Claimed'
    `;

    const receiversCountQuery = `
      SELECT 
        (
          SELECT COUNT(*) FROM "${chain}"."AddressDriverSplitReceivers"
        ) +
        (
          SELECT COUNT(*) FROM "${chain}"."DripListSplitReceivers"
        ) +
        (
          SELECT COUNT(*) FROM "${chain}"."RepoDriverSplitReceivers"
        ) as count
    `;

    const [dripListsResult, claimedProjectsResult, receiversResult] =
      await Promise.all([
        dbConnection.query(dripListsCountQuery, { type: QueryTypes.SELECT }),
        dbConnection.query(claimedProjectsCountQuery, {
          type: QueryTypes.SELECT,
        }),
        dbConnection.query(receiversCountQuery, { type: QueryTypes.SELECT }),
      ]);

    results.push({
      chain,
      dripListsCount: Number((dripListsResult[0] as any).count),
      claimedProjectsCount: Number((claimedProjectsResult[0] as any).count),
      receiversCount: Number((receiversResult[0] as any).count),
    });
  }

  return results;
}

export default {
  getChainStats,
};
