import { z } from 'zod';
import { nftDriverAccountMetadataSchemaV2 } from './v2';

// eslint-disable-next-line import/prefer-default-export
export const nftDriverAccountMetadataSchemaV3 =
  nftDriverAccountMetadataSchemaV2.extend({
    description: z.string().optional(),
  });
