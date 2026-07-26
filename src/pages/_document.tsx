import { Html, Head, Main, NextScript } from 'next/document';

export default function Document() {
  return (
    <Html lang="en">
      <Head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#16a34a" />
        <link rel="apple-touch-icon" href="/icons/192x192.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Money-Willo Budget" />
      </Head>
      <body>
        <Main />
        <NextScript />
        <script defer src="https://weblaunchacademy.com/beacon.js" data-site="f6d02c2f-dd2e-43c3-bfae-9682f745ae0a"></script>
      </body>
    </Html>
  );
}
