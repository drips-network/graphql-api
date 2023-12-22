import type { WhereOptions } from 'sequelize';
import { Op } from 'sequelize';
import DataLoader from 'dataloader';
import type { GiveWhereInput } from '../generated/graphql';
import GivenEventModel from '../given-event/GivenEventModel';

type TransactionHash = string;
type LogIndex = number;
type CompositePrimaryKey = readonly [TransactionHash, LogIndex];

export default class GivenEventsDataSource {
  private readonly _batchGivenEventsByIds = new DataLoader(
    async (
      givenEventIds: readonly CompositePrimaryKey[],
    ): Promise<GivenEventModel[]> => {
      const givenEvents = await GivenEventModel.findAll({
        where: {
          [Op.or]: givenEventIds.map(([transactionHash, logIndex]) => ({
            transactionHash,
            logIndex,
          })),
        },
      });

      const idToEventMap = givenEvents.reduce<
        Record<`${string}-${string}`, GivenEventModel>
      >((mapping, givenEvent) => {
        const key: `${string}-${string}` = `${givenEvent.transactionHash}-${givenEvent.logIndex}`;

        mapping[key] = givenEvent; // eslint-disable-line no-param-reassign

        return mapping;
      }, {});

      return givenEventIds.map((id) => idToEventMap[`${id[0]}-${id[1]}`]);
    },
  );

  public async getGivenEventById(
    transactionHash: TransactionHash,
    logIndex: LogIndex,
  ): Promise<GivenEventModel> {
    return this._batchGivenEventsByIds.load([transactionHash, logIndex]);
  }

  public async getGivenEventsByFilter(
    where: GiveWhereInput,
  ): Promise<GivenEventModel[]> {
    const givenEvents =
      (await GivenEventModel.findAll({
        where: (where as WhereOptions) || {},
      })) || [];

    return givenEvents;
  }
}
