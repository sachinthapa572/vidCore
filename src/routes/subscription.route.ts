import { Hono } from "hono";

import authMiddleware from "@/middlewares/is-authmiddleware";
import { subscriptionService } from "@/services/subscription.service";
import { sendSuccessResponse } from "@/utils/response.utils";
import { zCustomValidator } from "@/utils/zod-validator.utils";
import {
  channelIdParamSchema,
  subscriberIdParamSchema,
} from "@/validation/subscription.validation";

const subscriptionRouter = new Hono();

// Toggle subscription (subscribe/unsubscribe to a channel)
subscriptionRouter.post(
  "/c/:channelId",
  authMiddleware,
  zCustomValidator("param", channelIdParamSchema),
  async c => {
    const { channelId } = c.req.valid("param");
    const { _id: subscriberId } = c.get("user");

    const result = await subscriptionService.toggleSubscription({
      channelId,
      subscriberId,
    });

    return sendSuccessResponse(c, result, result.message);
  }
);

// Get subscribers of a channel (for channel owners to see their subscribers)
subscriptionRouter.get(
  "/u/:subscriberId",
  authMiddleware,
  zCustomValidator("param", subscriberIdParamSchema),
  async c => {
    const { subscriberId } = c.req.valid("param");

    const subscribers = await subscriptionService.getUserChannelSubscribers({
      channelId: subscriberId, // subscriberId here is actually the channel owner's ID
    });

    return sendSuccessResponse(c, subscribers, "Subscribers fetched successfully");
  }
);

// Get channels that a user has subscribed to
subscriptionRouter.get(
  "/c/:channelId",
  authMiddleware,
  zCustomValidator("param", channelIdParamSchema),
  async c => {
    const { channelId } = c.req.valid("param");

    const subscribedChannels = await subscriptionService.getSubscribedChannels({
      subscriberId: channelId, // channelId here is actually the subscriber's ID
    });

    return sendSuccessResponse(c, subscribedChannels, "Subscribed channels fetched successfully");
  }
);

export default subscriptionRouter;
