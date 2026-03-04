import PusherJS from "pusher-js";

let pusherClientInstance: PusherJS | null = null;

try {
  if (process.env.NEXT_PUBLIC_PUSHER_APP_KEY && process.env.NEXT_PUBLIC_PUSHER_CLUSTER) {
    pusherClientInstance = new PusherJS(process.env.NEXT_PUBLIC_PUSHER_APP_KEY, {
      cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER,
      channelAuthorization: {
        transport: "ajax",
        endpoint: "/api/pusher/auth",
      },
    });
  } else {
    console.warn("Pusher environment variables not configured");
  }
} catch (error) {
  console.error("Failed to initialize Pusher client:", error);
}

// Export a safe wrapper that gracefully handles missing/failed Pusher initialization
const safeNoop = {
  subscribe: () => ({ bind: () => {}, unbind: () => {}, unsubscribe: () => {} }),
  unsubscribe: () => {},
  allChannels: () => [],
} as any;

export const pusherClient = pusherClientInstance || safeNoop;
