import type { Metadata, Viewport } from "next"
import "@fontsource-variable/ibm-plex-sans"
import "@fontsource/ibm-plex-mono/400.css"
import "@fontsource/ibm-plex-mono/500.css"
import "./globals.css"

export const metadata: Metadata = {
  title: {
    default: "Mesh",
    template: "%s · Mesh",
  },
  description:
    "Shared rooms where human teams and AI agents take turns, edit canvases and call tools together.",
  applicationName: "Mesh",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: "/icon.svg",
  },
  appleWebApp: {
    capable: true,
    title: "Mesh",
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
      <body className="min-h-dvh bg-void text-text antialiased">{children}</body>
    </html>
  )
}
