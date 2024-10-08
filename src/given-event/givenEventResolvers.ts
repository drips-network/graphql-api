import { isAddress } from 'ethers';
import type { Account, GiveWhereInput } from '../generated/graphql';
import { SupportedChain } from '../generated/graphql';
import type { Context } from '../server';
import assert, { isAccountId } from '../utils/assert';
import queryableChains from '../common/queryableChains';
import type { GivenEventModelDataValues } from './GivenEventModel';
import type { ResolverGive } from '../common/types';
import { chainToDbSchema } from '../utils/chainSchemaMappings';

const givenEventResolvers = {
  Query: {
    gives: async (
      _: any,
      { chains, where }: { chains: SupportedChain[]; where: GiveWhereInput },
      { dataSources }: Context,
    ): Promise<GivenEventModelDataValues[]> => {
      if (where?.receiverAccountId) {
        assert(isAccountId(where.receiverAccountId));
      }

      if (where?.senderAccountId) {
        assert(isAccountId(where.senderAccountId));
      }

      if (where?.tokenAddress) {
        assert(isAddress(where.tokenAddress));
      }

      if (chains) {
        chains.forEach((chain) => {
          assert(chain in SupportedChain);
        });
      }

      const dbSchemasToQuery = (chains?.length ? chains : queryableChains).map(
        (chain) => chainToDbSchema[chain],
      );

      return dataSources.givenEventsDataSource.getGivenEventsByFilter(
        dbSchemasToQuery,
        where,
      );
    },
  },
  Give: {
    sender: (give: ResolverGive): Account => give.sender,
    receiver: (give: ResolverGive): Account => give.receiver,
  },
  // TODO: add the remaining resolvers
};

export default givenEventResolvers;
