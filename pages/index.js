import Head from "next/head";
import Link from "next/link";
import { Analytics } from "@vercel/analytics/react";
import Footer from "../components/footer";
import { rootUrl } from "../utils/constants"

export default function Home() {
  return (
    <div className="max-w-[768px] mx-auto p-10 bg-white rounded-lg">
      <Head>
        <title>Endless Zoom</title>
        <meta property="og:image" content={`${rootUrl}/og-image.png`} />
        <meta property="twitter:image" content={`${rootUrl}/og-image.png`} />
        <meta name="twitter:card" content="summary_large_image" />
      </Head>
      <div id="content"></div>
      <Link href="/zoom">
        <video autoPlay loop muted playsInline className="w-full cursor-pointer">
          <source src="/endlesszoom.mp4" />
        </video>
      </Link>
      <Link legacyBehavior href="/zoom" >
        <a className="py-3 block text-center bg-black text-white rounded-md mt-10">
          Let me in!
        </a>
      </Link>

      <Footer />
      <Analytics />
    </div>
  );
}
