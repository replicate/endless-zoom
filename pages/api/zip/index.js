import JSZip from "jszip";
var request = require("request").defaults({ encoding: null });

async function downloadImage(url) {
  return new Promise((resolve, reject) => {
    request.get(url, (error, response, body) => {
      if (!error && response.statusCode == 200) {
        const dataUri =
          "data:" +
          response.headers["content-type"] +
          ";base64," +
          Buffer.from(body).toString("base64");
        resolve(dataUri);
      } else {
        reject(
          error || new Error(`Response status code: ${response.statusCode}`)
        );
      }
    });
  });
}

async function convertB64ToZip(array_of_b64_images) {
  const zip = new JSZip();
  const downloadPromises = array_of_b64_images.map(async (dataUri, i) => {
    if (dataUri.indexOf("data:") !== 0) {
      dataUri = await downloadImage(dataUri);
    }
    zip.file(`image_${i}.jpeg`, dataUri.split(",")[1], { base64: true });
  });

  await Promise.all(downloadPromises);

  const zipData = await zip.generateAsync({ type: "base64" });
  return JSON.stringify("data:application/zip;base64," + zipData);
}

// This function can run for a maximum of 5 minutes
export const config = {
  maxDuration: 5 * 60,
};

export default async function handler(req, res) {
  try {
    let gif = await convertB64ToZip(req.body.images);
    res.statusCode = 201;
    res.end(gif);
  } catch (error) {
    res.statusCode = 500;
    res.end(`Error: ${error.message}`);
  }
}
