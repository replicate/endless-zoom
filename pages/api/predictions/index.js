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

  let input = req.body.input;
  // Ensure divisible by 8
  input.width -= input.width % 8;
  input.height -= input.height % 8;
  let prediction = await replicate.deployments.predictions.create(
    "replicate",
    "endless-zoom",
    {
      input: input,
    });

  prediction = await replicate.wait(prediction);

  if (prediction?.error) {
    res.statusCode = 500;
    res.end(JSON.stringify({ detail: prediction.error }));
    return;
  }

  res.statusCode = 201;
  res.end(JSON.stringify({ output: prediction.output }));
}
