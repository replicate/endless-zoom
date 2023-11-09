import Head from "next/head";
import Script from 'next/script'
import { Analytics } from "@vercel/analytics/react";

export default function Home() {
  return (
    <>
      <Head>
        <title>Endless Zoom</title>
      </Head>
      <Script src="https://cdn.jsdelivr.net/npm/p5@1.8.0/lib/p5.js" />
      <Script src="./script.js" />

      <Analytics />
    </>
  );
}
