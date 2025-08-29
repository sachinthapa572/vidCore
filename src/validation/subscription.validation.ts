import { z } from "zod/v4";

import { objectId } from "./video.validation";

export const channelIdParamSchema = z.object({
  channelId: objectId,
});

export const subscriberIdParamSchema = z.object({
  subscriberId: objectId,
});

export type channelIdParamInput = z.infer<typeof channelIdParamSchema>;
export type subscriberIdParamInput = z.infer<typeof subscriberIdParamSchema>;