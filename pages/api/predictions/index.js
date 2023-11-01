import Replicate from "replicate";

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN,
});

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export default async function handler(req, res) {
  if (!process.env.REPLICATE_API_TOKEN) {
    throw new Error(
      "The REPLICATE_API_TOKEN environment variable is not set. See README.md for instructions on how to set it."
    );
  }

  var prediction = await replicate.run(
    'fofr/latent-consistency-model:92b456763bbd035ef9dda7cc778c9cc8628cb4b48b8af813d541e78565342330',
    {
      input: req.body.input,
    });

  if (prediction?.error) {
    res.statusCode = 500;
    res.end(JSON.stringify({ detail: prediction.error }));
    return;
  }

  // while (
  //   prediction.status !== "succeeded" &&
  //   prediction.status !== "failed"
  // ) {
  //   await sleep(10);
  //   const response = await replicate.predictions.create({
  //     // Pinned to fofr/latent-consistency-model:92b45676
  //     version: "92b456763bbd035ef9dda7cc778c9cc8628cb4b48b8af813d541e78565342330",

  //     // This is the text prompt that will be submitted by a form on the frontend
  //     input: { prompt: req.body.prompt },
  //   });
  //   // fetch("/api/predictions/" + prediction.id);
  //   setPrediction(await response.json());
  //   if (response.status !== 200) {
  //     res.statusCode = response.status;
  //     res.end(JSON.stringify(prediction));
  //     return;
  //   }
  // }

  res.statusCode = 201;
  console.log(prediction[0])
  res.end(JSON.stringify({ output: prediction }));
}
