import { JsonRpcProvider } from "ethers";
import { AddressDriver__factory } from "../generated/contracts";
import { GiveWhereInput } from "../generated/graphql";
import { ContextValue } from "../server";
import getContractNameByAccountId from "../utils/getContractNameByAccountId";
import GivenEventModel from "./GivenEventModel";

const ADDRESS_DRIVER_ADDRESS = '0x1455d9bD6B98f95dd8FEB2b3D60ed825fcef0610';

const givenEventResolvers = {
  Query: {
    gives: async (
      _: any,
      { where }: { where: GiveWhereInput },
      { dataSources }: ContextValue,
    ): Promise<(GivenEventModel)[]> =>
      dataSources.givenEventsDb.getGivenEventsByFilter(where),
  },
  Give: {
    sender: (givenEvent: GivenEventModel) => {

      const provider = new JsonRpcProvider(
        `mainnet.infura.io/ws/v3/${process.env.INFURA_API_KEY}`,
      );

    const addressDriver = AddressDriver__factory.connect(ADDRESS_DRIVER_ADDRESS, provider);
   
    return 
      driver: getContractNameByAccountId(givenEvent.accountId),
      address: // calc address from account id, probably needs code from SDK?
  },
  }
}
