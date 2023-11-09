import JSZip from 'jszip';
var request = require('request').defaults({ encoding: null });

async function convertB64ToZip(array_of_b64_images) {
    return new Promise(async resolve1 => {
        const zip = new JSZip();
        // Draw each JPEG frame on the canvas and add it to the animated GIF
        for (let [i, data_uri] of array_of_b64_images.entries()) {
            console.log(data_uri);
            if (data_uri.indexOf('data:') !== 0) {
                data_uri = await new Promise(async resolve2 => {
                    request.get(data_uri, (error, response, body) => {
                        if (!error && response.statusCode == 200) {
                            data_uri = "data:" + response.headers["content-type"] + ";base64," + Buffer.from(body).toString('base64');
                            resolve2(data_uri);
                        }
                    })
                });
            }
            await new Promise(resolve3 => {
                resolve3(zip.file(`image_${i}.jpeg`, data_uri.split(',')[1], { base64: true }));
            });

        }
        await zip.generateAsync({ type: 'base64' }).then((data) => { resolve1(JSON.stringify("data:application/zip;base64," + data)) })
    })
}

export default async function handler(req, res) {
    let gif = await convertB64ToZip(req.body.images);

    res.statusCode = 201;
    res.end(gif);
}
