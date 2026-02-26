import type { LoaderFunction } from "@remix-run/cloudflare";

export const loader: LoaderFunction = async ({ context }) => {
  const baseUrl = "https://striae.org";
  
  // Dynamic routes
  const dynamicRoutes = [
    { path: "/", changefreq: "weekly", priority: 1.0 },    
    { path: "/privacy", changefreq: "yearly", priority: 0.5 },
    { path: "/terms", changefreq: "yearly", priority: 0.5 },
    { path: "/security", changefreq: "weekly", priority: 1.0 },
    { path: "/support", changefreq: "monthly", priority: 0.6 },
    { path: "/bugs", changefreq: "monthly", priority: 0.6 },
  ];  

  const allRoutes = [...dynamicRoutes];

  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${allRoutes
  .map(
    (route) => `
  <url>
    <loc>${baseUrl}${route.path}</loc>
    <changefreq>${route.changefreq}</changefreq>
    <priority>${route.priority}</priority>
  </url>`
  )
  .join("")}
</urlset>`;

  return new Response(sitemap, {
    headers: {
      "Content-Type": "application/xml",
      "Cache-Control": "public, max-age=3600",
    },
  });
};
