import type { Metadata, Viewport } from "next"
import "@fontsource-variable/ibm-plex-sans"
import "@fontsource/ibm-plex-mono/400.css"
import "@fontsource/ibm-plex-mono/500.css"
import "./globals.css"
import { Toaster } from "@/components/ui/toast"

export const metadata: Metadata = {
  title: {
    default: "Sayabot",
    template: "%s · Sayabot",
  },
  description:
    "Shared rooms where human teams and AI agents take turns, edit canvases and call tools together.",
  applicationName: "Sayabot",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: "/icon.svg",
  },
  appleWebApp: {
    capable: true,
    title: "Sayabot",
    statusBarStyle: "black-translucent",
  },
}

export const viewport: Viewport = {
  themeColor: "#070907",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-dvh bg-void text-text antialiased">
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[110] focus:rounded-sm focus:bg-accent focus:px-3 focus:py-2 focus:text-[13px] focus:text-void"
        >
          Skip to content
        </a>
        {children}
        <Toaster />
      </body>
    </html>
  )
}
