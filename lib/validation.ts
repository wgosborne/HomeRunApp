import { z } from "zod";

// League validation
export const createLeagueSchema = z.object({
  name: z.string().min(1).max(100),
  draftDate: z.string().datetime().optional(),
});

export const updateLeagueSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  draftDate: z.string().datetime().optional(),
  tradeDeadline: z.string().datetime().optional(),
});

export const joinLeagueSchema = z.object({
  leagueId: z.string().min(1),
});

export type CreateLeagueInput = z.infer<typeof createLeagueSchema>;
export type UpdateLeagueInput = z.infer<typeof updateLeagueSchema>;
export type JoinLeagueInput = z.infer<typeof joinLeagueSchema>;

// Draft validation
export const submitPickSchema = z.object({
  playerId: z.string().min(1),
  playerName: z.string().min(1),
  position: z.string().optional(),
});

export type SubmitPickInput = z.infer<typeof submitPickSchema>;

// Trade validation
export const proposeTradSchema = z.object({
  receiverId: z.string().min(1),
  ownerPlayerId: z.string().min(1),
  ownerPlayerName: z.string().min(1),
  receiverPlayerId: z.string().min(1),
  receiverPlayerName: z.string().min(1),
});

export type ProposeTradeInput = z.infer<typeof proposeTradSchema>;

// Push subscription validation
export const pushSubscriptionSchema = z.object({
  subscription: z.object({
    endpoint: z.string().url(),
    keys: z.object({
      p256dh: z.string(),
      auth: z.string(),
    }),
  }),
  userAgent: z.string().optional(),
});

export type PushSubscriptionInput = z.infer<typeof pushSubscriptionSchema>;
