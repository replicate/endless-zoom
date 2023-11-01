// import { useState } from "react";
import Head from "next/head";
import Script from 'next/script'
// import Image from "next/image";

// const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export default function Home() {
  // const [prediction, setPrediction] = useState(null);
  // const [error, setError] = useState(null);

  // const handleSubmit = async (e) => {
  //   e.preventDefault();
  //   const response = await fetch("/api/predictions", {
  //     method: "POST",
  //     headers: {
  //       "Content-Type": "application/json",
  //     },
  //     body: JSON.stringify({
  //       prompt: e.target.prompt.value,
  //     }),
  //   });
  //   let prediction = await response.json();
  //   if (response.status !== 201) {
  //     setError(prediction.detail);
  //     return;
  //   }
  //   setPrediction(prediction);

  //   while (
  //     prediction.status !== "succeeded" &&
  //     prediction.status !== "failed"
  //   ) {
  //     await sleep(1000);
  //     const response = await fetch("/api/predictions/" + prediction.id);
  //     prediction = await response.json();
  //     if (response.status !== 200) {
  //       setError(prediction.detail);
  //       return;
  //     }
  //     console.log({ prediction });
  //     setPrediction(prediction);
  //   }
  // };

  return (
    <>
      <Head>
        <title>p5.js</title>
      </Head>
      <Script src="https://cdn.jsdelivr.net/npm/p5@1.8.0/lib/p5.js" />
      <Script src="./script.js" />
    </>
  );
}
