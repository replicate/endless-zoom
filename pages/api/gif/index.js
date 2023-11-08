import GIFEncoder from 'gif-encoder-2';
const { createCanvas, Image } = require('canvas')

async function convertB64ToAnimatedGif(array_of_b64_images, width, height) {
    return new Promise(async resolve1 => {
        const canvas = createCanvas(width, height)
        const ctx = canvas.getContext('2d');
        const encoder = new GIFEncoder(width, height);
        encoder.setDelay(500);
        encoder.start(); // starts the encoder

        // Draw each JPEG frame on the canvas and add it to the animated GIF
        for (const data_uri of array_of_b64_images) {
            await new Promise(resolve3 => {
                const image = new Image();
                image.src = data_uri;
                image.onload = () => {
                    ctx.drawImage(image, 0, 0);
                    encoder.addFrame(ctx);
                    resolve3();
                }
            })
        }
        encoder.finish();

        // Return the animated GIF as a base64 string
        resolve1(JSON.stringify("data:image/gif;base64," + encoder.out.getData().toString("base64")));
    })
};

export default async function handler(req, res) {
    let gif = await convertB64ToAnimatedGif(req.body.images, req.body.width, req.body.height);

    res.statusCode = 201;
    res.end(gif);
}
