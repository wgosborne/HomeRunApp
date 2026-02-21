import type { Metadata } from "next";
import { SessionProvider } from "next-auth/react";
import { ServiceWorkerRegistration } from "@/app/components/ServiceWorkerRegistration";
import { InstallPrompt } from "@/app/components/InstallPrompt";
import { OfflineIndicator } from "@/app/components/OfflineIndicator";
import "@/app/globals.css";

export const metadata: Metadata = {
  title: "Fantasy Homerun Tracker",
  description: "Track homeruns, manage your fantasy baseball league",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Homerun Tracker",
  },
  formatDetection: {
    telephone: false,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <meta name="theme-color" content="#4f46e5" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Homerun Tracker" />
        <link rel="manifest" href="/manifest.json" />
        <link rel="icon" type="image/png" sizes="192x192" href="/icon-192x192.png" />
        <link rel="icon" type="image/png" sizes="512x512" href="/icon-512x512.png" />
        <link rel="apple-touch-icon" href="/icon-192x192.png" />
      </head>
      <body>
        <SessionProvider>
          <ServiceWorkerRegistration />
          <InstallPrompt />
          <OfflineIndicator />
          {children}
        </SessionProvider>
      </body>
    </html>
  );
}
