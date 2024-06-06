import { QueryTypes } from 'sequelize';
import { dbConnection } from '../../database/connectToDatabase';
import type { SupportedChain } from '../../generated/graphql';
import type { AccountId, DripListId } from '../../common/types';
import type { AddressDriverSplitReceiverModelDataValues } from '../../models/AddressDriverSplitReceiverModel';
import AddressDriverSplitReceiverModel, {
  AddressDriverSplitReceiverType,
} from '../../models/AddressDriverSplitReceiverModel';

async function getAddressDriverSplitReceiversDripListDependenciesByFunders(
  chains: SupportedChain[],
  funderDripListIds: DripListId[],
) {
  const baseSQL = (schema: SupportedChain) => `
  SELECT "id", "fundeeAccountId", "fundeeAccountAddress", "funderProjectId", "funderDripListId","weight", "type"::TEXT, "createdAt", "updatedAt", '${schema}' AS chain
  FROM "${schema}"."AddressDriverSplitReceivers"
`;

  const conditions: string[] = [
    `"funderDripListId" IN (:funderDripListIds)`,
    `"type" IN ('${AddressDriverSplitReceiverType.DripListDependency}')`,
  ];
  const parameters: { [key: string]: any } = {
    funderDripListIds,
  };

  const whereClause = ` WHERE ${conditions.join(' AND ')}`;

  const chainQueries = chains.map((chain) => baseSQL(chain) + whereClause);

  const multiChainQuery = `${chainQueries.join(' UNION ')} LIMIT 1000`;

  return (
    await dbConnection.query(multiChainQuery, {
      type: QueryTypes.SELECT,
      replacements: parameters,
      mapToModel: true,
      model: AddressDriverSplitReceiverModel,
    })
  ).map((p) => p.dataValues as AddressDriverSplitReceiverModelDataValues);
}

async function getAddressDriverSplitReceiversProjectDependenciesByFunders(
  chains: SupportedChain[],
  funderProjectIds: AccountId[],
) {
  const baseSQL = (schema: SupportedChain) => `
    SELECT "id", "fundeeAccountId", "fundeeAccountAddress", "funderProjectId", "funderDripListId", "weight", "type"::TEXT, "createdAt", "updatedAt",'${schema}' AS chain
    FROM "${schema}"."AddressDriverSplitReceivers"
  `;

  const conditions: string[] = [
    `"funderDripListId" IN (:funderProjectIds)`,
    `type IN ('${AddressDriverSplitReceiverType.ProjectMaintainer}', '${AddressDriverSplitReceiverType.ProjectDependency}')`,
  ];
  const parameters: { [key: string]: any } = {
    funderProjectIds,
  };

  const whereClause = ` WHERE ${conditions.join(' AND ')}`;

  const chainQueries = chains.map((chain) => baseSQL(chain) + whereClause);

  const multiChainQuery = `${chainQueries.join(' UNION ')} LIMIT 1000`;

  return (
    await dbConnection.query(multiChainQuery, {
      type: QueryTypes.SELECT,
      replacements: parameters,
      mapToModel: true,
      model: AddressDriverSplitReceiverModel,
    })
  ).map((p) => p.dataValues as AddressDriverSplitReceiverModelDataValues);
}

async function getAddressDriverSplitReceiversByFundeeAccountIds(
  chains: SupportedChain[],
  fundeeAccountIds: AccountId[],
) {
  const baseSQL = (schema: SupportedChain) => `
    SELECT "id", "fundeeAccountId", "fundeeAccountAddress", "funderProjectId", "funderDripListId","weight", "type"::TEXT, "createdAt", "updatedAt", '${schema}' AS chain
    FROM "${schema}"."AddressDriverSplitReceivers"
  `;

  const parameters: { [key: string]: any } = {
    fundeeAccountIds,
  };

  const whereClause = ` WHERE "fundeeAccountId" IN (:fundeeAccountIds)`;

  const chainQueries = chains.map((chain) => baseSQL(chain) + whereClause);

  const multiChainQuery = `${chainQueries.join(' UNION ')} LIMIT 1000`;

  return (
    await dbConnection.query(multiChainQuery, {
      type: QueryTypes.SELECT,
      replacements: parameters,
      mapToModel: true,
      model: AddressDriverSplitReceiverModel,
    })
  ).map((p) => p.dataValues as AddressDriverSplitReceiverModelDataValues);
}

export default {
  getDripListDependenciesByFunders:
    getAddressDriverSplitReceiversDripListDependenciesByFunders,
  getProjectDependenciesByFunders:
    getAddressDriverSplitReceiversProjectDependenciesByFunders,
  getByFundeeAccountIds: getAddressDriverSplitReceiversByFundeeAccountIds,
};
