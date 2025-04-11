import type { DbSchema, ResolverEcosystem } from '../common/types';
import { Driver } from '../generated/graphql';
import { dbSchemaToChain } from '../utils/chainSchemaMappings';
import { singleOrDefault } from '../utils/linq';
import type { EcosystemDataValues } from './EcosystemMainAccountModel';

export async function toResolverEcosystem(
  chain: DbSchema,
  ecosystem: EcosystemDataValues,
): Promise<ResolverEcosystem> {
  return (await toResolverEcosystems([chain], [ecosystem]))[0];
}

export async function toResolverEcosystems(
  chains: DbSchema[],
  ecosystems: EcosystemDataValues[],
): Promise<ResolverEcosystem[]> {
  return (
    await Promise.all(
      ecosystems.map(async (ecosystem) => {
        const ecosystemChain = singleOrDefault(
          chains.filter((chain) => ecosystem.chain === chain),
        );

        if (!ecosystemChain) {
          return null;
        }

        return {
          account: {
            accountId: ecosystem.id,
            driver: Driver.NFT,
          },
          chain: dbSchemaToChain[ecosystemChain],
          parentEcosystemInfo: {
            ecosystemId: ecosystem.id,
            ecosystemChain,
            queriedChains: chains,
          },
          name: ecosystem.name,
          creator: ecosystem.creator,
          description: ecosystem.description,
          owner: {
            driver: Driver.ADDRESS,
            accountId: ecosystem.ownerAccountId,
            address: ecosystem.ownerAddress as string,
          },
          previousOwnerAddress: ecosystem.previousOwnerAddress,
          support: [], // Will be populated by the resolver.
          splits: [], // Will be populated by the resolver.
          totalEarned: [], // Will be populated by the resolver.
          isVisible: ecosystem.isVisible,
          lastProcessedIpfsHash: ecosystem.lastProcessedIpfsHash,
        };
      }),
    )
  ).filter(Boolean) as ResolverEcosystem[];
}
