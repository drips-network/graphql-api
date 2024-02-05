import type { AddressDriverId } from '../common/types';
import getCycleInfo from '../utils/cycle';
import getUserAccount from '../utils/getUserAccount';
import { estimateAccount } from './estimate';

const estimatesResolvers = {
  Query: {
    accountEstimate: async (
      _: any,
      { accountId }: { accountId: AddressDriverId },
    ): Promise<any> => {
      const account = await getUserAccount(accountId);

      const cycleSecs = getCycleInfo().cycleDurationSecs;
      const currentCycleSecs =
        Math.floor(new Date().getTime() / 1000) % Number(cycleSecs);
      const currentCycleStart = new Date(
        new Date().getTime() - Number(currentCycleSecs) * 1000,
      );

      const accountEstimate = estimateAccount(account, {
        start: currentCycleStart,
        duration: Number(cycleSecs) * 1000,
      });

      return accountEstimate;
    },
  },
};

export default estimatesResolvers;
