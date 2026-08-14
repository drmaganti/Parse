import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/account", "/app", "/api/", "/screens/share"],
    },
    sitemap: "https://getparse.app/sitemap.xml",
    host: "https://getparse.app",
  };
}
