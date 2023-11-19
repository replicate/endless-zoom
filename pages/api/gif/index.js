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

    // Use deployment on endless-zoom.vercel.app, otherwise use public model
    let prediction;
    // console.log(req.body.images);
    prediction = await replicate.predictions.create(
        {
            version:
                'f3afb57de840ebb8dfc623726608d5b00e6c4ef17564283fb3945631446ede76',
            input: { image_urls: req.body.images.toString(), output_zip: true },
        });


    if (prediction?.error) {
        res.statusCode = 500;
        res.end(JSON.stringify({ detail: prediction.error }));
        return;
    }

    res.statusCode = 201;
    res.end(JSON.stringify({ output: prediction }));
}
