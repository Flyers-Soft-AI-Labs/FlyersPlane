/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import Script from "next/script";

// styles
import "@/styles/globals.css";

import { SITE_DESCRIPTION, SITE_NAME } from "@plane/constants";

// helpers
import { cn } from "@plane/utils";

// local
import { AppProvider } from "./provider";

export const meta = () => [
  { title: "Flyers Soft | Simple, extensible, open-source project management tool." },
  { name: "description", content: SITE_DESCRIPTION },
  {
    name: "keywords",
    content:
      "ticket tracking, project management, reports, kanban, collaboration, agile, support tickets, workflows",
  },
  {
    name: "viewport",
    content:
      "width=device-width, initial-scale=1, minimum-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover",
  },
  { property: "og:title", content: "Flyers Soft | Simple, extensible, open-source project management tool." },
  {
    property: "og:description",
    content: "Flyers Soft helps teams manage tickets, projects, reports, and delivery workflows.",
  },
  { property: "og:url", content: "https://flyerssoft.com/" },
  { property: "og:image", content: "/flyers-logo.png" },
  { property: "og:image:width", content: "1200" },
  { property: "og:image:height", content: "630" },
  { property: "og:image:alt", content: "Flyers Soft - Modern project management" },
  { name: "twitter:site", content: "Flyers Soft" },
  { name: "twitter:card", content: "summary_large_image" },
  { name: "twitter:image", content: "/flyers-logo.png" },
  { name: "twitter:image:width", content: "1200" },
  { name: "twitter:image:height", content: "630" },
  { name: "twitter:image:alt", content: "Flyers Soft - Modern project management" },
];

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const isSessionRecorderEnabled = parseInt(process.env.VITE_ENABLE_SESSION_RECORDER || "0");

  return (
    <html lang="en">
      <head>
        <meta name="theme-color" content="#fff" />
        <link rel="icon" type="image/png" href="/flyers-logo.png" />
        <link rel="manifest" href="/site.webmanifest.json" />
        <link rel="shortcut icon" href="/flyers-logo.png" />
        {/* Meta info for PWA */}
        <meta name="application-name" content="Flyers Soft" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content={SITE_NAME} />
        <meta name="format-detection" content="telephone=no" />
        <meta name="mobile-web-app-capable" content="yes" />
        <link rel="apple-touch-icon" href="/flyers-logo.png" />
        <link rel="apple-touch-icon" sizes="180x180" href="/flyers-logo.png" />
        <link rel="apple-touch-icon" sizes="512x512" href="/flyers-logo.png" />
        <link rel="manifest" href="/manifest.json" />
      </head>
      <body>
        <div id="context-menu-portal" />
        <div id="editor-portal" />
        <AppProvider>
          <div className={cn("relative flex h-screen w-full flex-col overflow-hidden", "app-container")}>
            <main className="relative h-full w-full overflow-hidden">{children}</main>
          </div>
        </AppProvider>
      </body>
      {!!isSessionRecorderEnabled && process.env.VITE_SESSION_RECORDER_KEY && (
        <Script id="clarity-tracking">
          {`(function(c,l,a,r,i,t,y){
              c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
              t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
              y=l.getElementsByTagName(r)[0];if(y){y.parentNode.insertBefore(t,y);}
          })(window, document, "clarity", "script", "${process.env.VITE_SESSION_RECORDER_KEY}");`}
        </Script>
      )}
    </html>
  );
}
