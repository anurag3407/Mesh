import type { MetadataRoute } from "next"

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Mesh",
    short_name: "Mesh",
    description:
      "Shared rooms where human teams and AI agents take turns, edit canvases and call tools together.",
    start_url: "/",
    display: "standalone",
    background_color: "#070907",
    theme_color: "#070907",
    orientation: "any",
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
    ],
  }
}
