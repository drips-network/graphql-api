import type { WhereOptions } from 'sequelize';
import { Op } from 'sequelize';
import DataLoader from 'dataloader';
import type { GiveWhereInput } from '../generated/graphql';
import GivenEventModel from '../given-event/GivenEventModel';

function unwrapGivenEventIds(ids: readonly [string, string][], value: 'transactionHash' | 'logIndex') {
  return ids.map((v) => v[value === "transactionHash" ? 0 : 1]);
}

export default class GivenEventsDataSource {
  private readonly _batchGivenEventsByIds = new DataLoader(
    async (givenEventIds: readonly [string, string][]): Promise<GivenEventModel[]> => {
      const givenEvents = await GivenEventModel.findAll({
        where: {
          transactionHash: {
            [Op.in]: unwrapGivenEventIds(givenEventIds, 'transactionHash'),
          },
          logIndex: {
            [Op.in]: unwrapGivenEventIds(givenEventIds, 'logIndex'),
          },
        },
      });

      const idToEventMap = givenEvents.reduce<
        Record<`${string}-${string}`, GivenEventModel>
      >((mapping, event) => {
        mapping[`${event.transactionHash}-${event.logIndex}`] = event; // eslint-disable-line no-param-reassign

        return mapping;
      }, {});

      return givenEventIds.map((id) => idToEventMap[`${id[0]}-${id[1]}`]);
    },
  );

  public async getGivenEventsByFilter(
    where: GiveWhereInput,
  ): Promise<GivenEventModel[]> {
    const givenEvents =
      (await GivenEventModel.findAll({
        where: (where as WhereOptions) || {},
      })) || [];

    return givenEvents
  }

  /**
   * @param ids - Array of [transactionHash, logIndex] tuples. 
   */
  public async getGivenEventsByIds(ids: [string, string][]): Promise<GivenEventModel[]> {
    return this._batchGivenEventsByIds.loadMany(ids)  as Promise<GivenEventModel[]>;
  }
}
