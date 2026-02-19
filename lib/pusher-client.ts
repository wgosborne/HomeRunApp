import PusherJS from "pusher-js";

if (!process.env.NEXT_PUBLIC_PUSHER_APP_KEY || !process.env.NEXT_PUBLIC_PUSHER_CLUSTER) {
  throw new Error("Missing required Pusher client environment variables");
}

export const pusherClient = new PusherJS(process.env.NEXT_PUBLIC_PUSHER_APP_KEY, {
  cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER,
  channelAuthorization: {
    transport: "ajax",
    endpoint: "/api/pusher/auth",
  },
});
