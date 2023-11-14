import GIFEncoder from "gif-encoder-2";
const { createCanvas, loadImage } = require("@napi-rs/canvas");

async function convertB64ToAnimatedGif(array_of_b64_images, width, height) {
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext("2d");
  const encoder = new GIFEncoder(width, height);
  encoder.setDelay(500);
  encoder.start();

  const loadImages = array_of_b64_images.map((data_uri) => loadImage(data_uri));
  const images = await Promise.all(loadImages);

  for (const image of images) {
    ctx.drawImage(image, 0, 0);
    encoder.addFrame(ctx);
  }

  encoder.finish();
  return JSON.stringify(
    "data:image/gif;base64," + encoder.out.getData().toString("base64")
  );
}

export default async function handler(req, res) {
  let gif = await convertB64ToAnimatedGif(
    req.body.images,
    req.body.width,
    req.body.height
  );

  res.statusCode = 201;
  res.end(gif);
}
