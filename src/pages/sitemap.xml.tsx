import { GetServerSideProps } from 'next';

function generateSiteMap() {
  const baseUrl = 'https://ramseycoach.com';

  // List of all public pages — add new pages here as the site grows
  const pages = [
    { path: '',                      changefreq: 'weekly',  priority: '1.0' },
    { path: '/contact',              changefreq: 'monthly', priority: '0.8' },
    { path: '/tools',                changefreq: 'monthly', priority: '0.8' },
    { path: '/partner-budget',       changefreq: 'monthly', priority: '0.7' },
    { path: '/budget-response',      changefreq: 'monthly', priority: '0.7' },
    { path: '/shared-access/accept', changefreq: 'monthly', priority: '0.6' },
    { path: '/privacy-policy',       changefreq: 'yearly',  priority: '0.4' },
    { path: '/terms-of-service',     changefreq: 'yearly',  priority: '0.4' },
  ];

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  ${pages
    .map(({ path, changefreq, priority }) => `
  <url>
    <loc>${baseUrl}${path}</loc>
    <lastmod>${new Date().toISOString()}</lastmod>
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
  </url>`)
    .join('')}
</urlset>`;
}

function SiteMap() {
  // getServerSideProps handles the response
}

export const getServerSideProps: GetServerSideProps = async ({ res }) => {
  const sitemap = generateSiteMap();

  res.setHeader('Content-Type', 'text/xml');
  res.write(sitemap);
  res.end();

  return {
    props: {},
  };
};

export default SiteMap;
