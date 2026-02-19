import Pusher from "pusher";

if (!process.env.PUSHER_APP_ID || !process.env.PUSHER_SECRET || !process.env.NEXT_PUBLIC_PUSHER_APP_KEY) {
  throw new Error("Missing required Pusher environment variables");
}

export const pusherServer = new Pusher({
  appId: process.env.PUSHER_APP_ID,
  key: process.env.NEXT_PUBLIC_PUSHER_APP_KEY,
  secret: process.env.PUSHER_SECRET,
  cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER || "us2",
  useTLS: true,
});
