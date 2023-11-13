import Head from "next/head";
import Script from 'next/script'
import { Analytics } from "@vercel/analytics/react";
import Footer from "../components/footer";

export default function Home() {
  return (
    <>
      <Head>
        <title>Endless Zoom</title>
      </Head>
      <div className="bg-slate-100 border-b-2 text-center p-3">
        Powered by Replicate.{" "}
        <a
          href="https://replicate.com/fofr/latent-consistency-model"
          target="_blank"
          rel="noreferrer"
          className="underline"
        >
          Run this model in the cloud
        </a>
      </div>
      <div id="content"></div>
      <Script src="https://cdn.jsdelivr.net/npm/p5@1.8.0/lib/p5.js" />
      <Script src="./script.js" />

      <Footer />
      <Analytics />
    </>
  );
}
