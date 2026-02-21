import type { Metadata } from "next";
import { SessionProvider } from "next-auth/react";
import { ServiceWorkerRegistration } from "@/app/components/ServiceWorkerRegistration";
import "@/app/globals.css";

export const metadata: Metadata = {
  title: "Fantasy Homerun Tracker",
  description: "Track homeruns, manage your fantasy baseball league",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <meta name="theme-color" content="#ffffff" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Homerun Tracker" />
      </head>
      <body>
        <SessionProvider>
          <ServiceWorkerRegistration />
          {children}
        </SessionProvider>
      </body>
    </html>
  );
}
