import type { AccountId } from '../common/types';

export default class StreamsDataSource {
  getStreamsByAccountId(accountId: AccountId): Promise<any[]> {
    console.log(
      '💧💧💧💧💧💧 ~ file: StreamsDataSource.ts:5 ~ StreamsDataSource ~ getStreamsByAccountId ~ accountId:',
      accountId,
    );
    throw new Error('Method not implemented.');
  }
}
