import type {
  AddressDriverId,
  ImmutableSplitsDriverId,
  NftDriverId,
  RepoDeadlineDriverId,
  RepoDriverId,
} from '../common/types';

const SPLIT_RULES = Object.freeze([
  // Project Rules
  {
    senderAccountType: 'project',
    receiverAccountType: 'address',
    relationshipType: 'project_maintainer',
  },
  {
    senderAccountType: 'project',
    receiverAccountType: 'project',
    relationshipType: 'project_dependency',
  },
  {
    senderAccountType: 'project',
    receiverAccountType: 'address',
    relationshipType: 'project_dependency',
  },
  {
    senderAccountType: 'project',
    receiverAccountType: 'drip_list',
    relationshipType: 'project_dependency',
  },

  // Drip List Rules
  {
    senderAccountType: 'drip_list',
    receiverAccountType: 'address',
    relationshipType: 'drip_list_receiver',
  },
  {
    senderAccountType: 'drip_list',
    receiverAccountType: 'drip_list',
    relationshipType: 'drip_list_receiver',
  },
  {
    senderAccountType: 'drip_list',
    receiverAccountType: 'project',
    relationshipType: 'drip_list_receiver',
  },

  // Ecosystem Main Account Rules
  {
    senderAccountType: 'ecosystem_main_account',
    receiverAccountType: 'project',
    relationshipType: 'ecosystem_receiver',
  },
  {
    senderAccountType: 'ecosystem_main_account',
    receiverAccountType: 'sub_list',
    relationshipType: 'sub_list_link',
  },

  // Sub List Rules
  {
    senderAccountType: 'sub_list',
    receiverAccountType: 'address',
    relationshipType: 'sub_list_link',
  },
  {
    senderAccountType: 'sub_list',
    receiverAccountType: 'drip_list',
    relationshipType: 'sub_list_link',
  },
  {
    senderAccountType: 'sub_list',
    receiverAccountType: 'project',
    relationshipType: 'sub_list_link',
  },
  {
    senderAccountType: 'sub_list',
    receiverAccountType: 'sub_list',
    relationshipType: 'sub_list_link',
  },
] as const);

type EntityIdMap = {
  project: RepoDriverId;
  drip_list: NftDriverId;
  ecosystem_main_account: NftDriverId;
  sub_list: ImmutableSplitsDriverId;
  deadline: RepoDeadlineDriverId;
  address: AddressDriverId;
};

export type RelationshipType = (typeof SPLIT_RULES)[number]['relationshipType'];
export type AccountType =
  | (typeof SPLIT_RULES)[number]['senderAccountType']
  | (typeof SPLIT_RULES)[number]['receiverAccountType'];

type SplitRuleFromRaw<R> = R extends {
  senderAccountType: infer S extends keyof EntityIdMap;
  receiverAccountType: infer T extends keyof EntityIdMap;
  relationshipType: string;
}
  ? {
      senderAccountType: S;
      senderAccountId: EntityIdMap[S];
      receiverAccountType: T;
      receiverAccountId: EntityIdMap[T];
      relationshipType: R['relationshipType'];
    }
  : never;

export type SplitReceiverShape = SplitRuleFromRaw<
  (typeof SPLIT_RULES)[number]
> & {
  weight: number;
  blockTimestamp: Date;
};

export const ACCOUNT_TYPES = Array.from(
  new Set(
    SPLIT_RULES.flatMap((rule) => [
      rule.senderAccountType,
      rule.receiverAccountType,
    ]),
  ),
);

export const RELATIONSHIP_TYPES = Array.from(
  new Set(SPLIT_RULES.map((rule) => rule.relationshipType)),
) as (typeof SPLIT_RULES)[number]['relationshipType'][];

export const ACCOUNT_TYPE_TO_METADATA_RECEIVER_TYPE: Record<
  AccountType,
  string
> = {
  project: 'repoDriver',
  drip_list: 'dripList',
  ecosystem_main_account: 'ecosystem',
  sub_list: 'subList',
  address: 'address',
};

export const METADATA_RECEIVER_TYPE_TO_ACCOUNT_TYPE = Object.fromEntries(
  Object.entries(ACCOUNT_TYPE_TO_METADATA_RECEIVER_TYPE).map(([key, value]) => [
    value,
    key,
  ]),
) as Record<string, AccountType>;
