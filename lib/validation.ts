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
  mlbId: z.number().optional(),
});

export type SubmitPickInput = z.infer<typeof submitPickSchema>;

export const startDraftSchema = z.object({
  // No required fields - just need league context
});

export type StartDraftInput = z.infer<typeof startDraftSchema>;

// Trade validation
export const proposeTradeSchema = z.object({
  receiverId: z.string().min(1, "Receiver ID is required"),
  ownerPlayerId: z.string().min(1, "Owner player ID is required"),
  ownerPlayerName: z.string().min(1, "Owner player name is required"),
  ownerPlayerMlbId: z.number().optional().nullable(),
  receiverPlayerId: z.string().min(1, "Receiver player ID is required"),
  receiverPlayerName: z.string().min(1, "Receiver player name is required"),
  receiverPlayerMlbId: z.number().optional().nullable(),
});

export type ProposeTradeInput = z.infer<typeof proposeTradeSchema>;

export const respondToTradeSchema = z.object({
  // No required fields - just need trade ID from path
});

export type RespondToTradeInput = z.infer<typeof respondToTradeSchema>;

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
