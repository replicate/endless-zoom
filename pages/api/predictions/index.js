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

  res.statusCode = 201;
  console.log(prediction[0])
  res.end(JSON.stringify({ output: prediction }));
}
