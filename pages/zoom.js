import Head from "next/head";
import Script from 'next/script'
import { Analytics } from "@vercel/analytics/react";
import Footer from "../components/footer";
import { rootUrl } from "../utils/constants"

export default function Home() {
  return (
    <>
      <Head>
        <title>Endless Zoom</title>
        <meta property="og:image" content={`${rootUrl}/og-image.png`} />
        <meta property="twitter:image" content={`${rootUrl}/og-image.png`} />
        <meta name="twitter:card" content="summary_large_image" />
      </Head>
      {/* Now that the deployment has been turned off, warn the user that the first generation might take a moment. script.js turns this visibility off when it receives an image response. */}
      <div id="warmupModal" >
        <div class="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"></div>

        <div class="fixed inset-0 z-10 w-screen overflow-y-auto">
          <div class="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">

            <div class="relative transform overflow-hidden rounded-lg bg-white text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg">
              <div class="bg-white px-4 pb-4 pt-5 sm:p-6 sm:pb-4">
                <div class="sm:flex sm:items-start">
                  <div class="mx-auto flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-red-100 sm:mx-0 sm:h-10 sm:w-10">
                    <svg class="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" aria-hidden="true">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                    </svg>
                  </div>
                  <div class="mt-3 text-center sm:ml-4 sm:mt-0 sm:text-left">
                    <h3 class="text-base font-semibold leading-6 text-gray-900" id="modal-title">Hold on a bit!</h3>
                    <div class="mt-2">
                      <p class="text-sm text-gray-500">The first generation might take a few moments while the model warms up.</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div >
      <div id="content"></div>
      <Script src="https://cdn.jsdelivr.net/npm/p5@1.8.0/lib/p5.js" />
      <Script src="./script.js" />

      <Footer />
      <Analytics />
    </>
  );
}
