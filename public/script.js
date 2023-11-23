let replicateEndpoint = 'api/predictions' // if using Replicate
let localEndpoint = 'http://localhost:5001/predictions' // if using local LCM from https://github.com/replicate/latent-consistency-model/tree/prototype
let endpoint = replicateEndpoint;



// It would be great to make this all less stateful, but for now there are a lot of global variables
let images = [];
let currentImage;
let playing = false;
var waiting = false;
let bufferForZooming;
let p5Canvas;
let p5CanvasEl;
let imageDimensions = { x: 512, y: 512 };
let size = { x: 256 };
size.y = Math.floor(size.x * imageDimensions.y / imageDimensions.x);
let soundEffects = [];

// Store links to generated gif and zip
let gif;
let zip;

// The following global variables are only used in a touchscreen environment
// If using two fingers to pinch to zoom, set this to true when the first finger releases and false when the second finger releases,
// so that we only generate the first time
let justZoomed = false;
let touchUserIsScrolling = false;
let center = { x: 0, y: 0 };

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));


async function download(url, filename, forceDownload) {
    forceDownload = forceDownload || false;
    const a = document.createElement("a");
    a.href = forceDownload ? await toDataURL(url) : url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.setAttribute('_target', 'blank')
    document.body.removeChild(a);
}



async function toDataURL(url) {
    const blob = await fetch(url).then(res => res.blob());
    return URL.createObjectURL(blob);
}

// Don't play audio if browser doesn't allow
const safePlay = (audio) => { try { audio.play(); } catch { } }
const safePause = (audio) => { try { audio.pause(); } catch { } }

function s(p) {
    p.setup = function () {
        p5Canvas = p.createCanvas(imageDimensions.x, imageDimensions.y);
        bufferForZooming = p.createGraphics(imageDimensions.x, imageDimensions.y)
        p.pixelDensity(1); // Otherwise canvas boundary check breaks for retina displays
        p.noStroke();
        p.rectMode(p.CENTER);

        let container = document.createElement("div");
        container.innerHTML = "<h1 style=\"font-size: 300%;\">Endless Zoom</h1><h2 style=\"font-size: 120%;\">Scroll to change cursor size; click to zoom in</h2>"
        container.setAttribute("style", "width: 100%; text-align: center; margin: 3rem auto;");
        container.setAttribute("id", "container");

        document.querySelector("#content").appendChild(container);

        p5Canvas.parent("container");
        p5Canvas.id("p5Canvas");
        p5CanvasEl = document.querySelector('#p5Canvas');
        p5CanvasEl.setAttribute("style", "margin: 0 auto; border: 2px solid black");

        let formContainer = document.createElement("div");
        formContainer.setAttribute("id", "formContainer");
        formContainer.setAttribute("style", "display: flex; flex-direction: column; gap: 1rem; padding: 1rem; align-items: center; align-content: center; justify-content: center;");
        container.appendChild(formContainer);

        let fullscreenButton = document.createElement("img");
        fullscreenButton.setAttribute("src", "https://fonts.gstatic.com/s/i/short-term/release/materialsymbolsoutlined/fullscreen/default/24px.svg")
        fullscreenButton.setAttribute("id", "fullscreenButton");
        fullscreenButton.setAttribute("style", "cursor: pointer");
        fullscreenButton.addEventListener("click", (e) => { p5CanvasEl.requestFullscreen() });
        formContainer.appendChild(fullscreenButton);

        let promptAndSteps = document.createElement("div");
        promptAndSteps.setAttribute("style", "width: 50%; display: flex; flex-direction: row; flex-wrap: wrap; justify-content: center");
        formContainer.appendChild(promptAndSteps)
        // Text input box for a prompt
        let promptLabel = document.createElement("label");
        promptLabel.setAttribute("for", "promptInput");
        promptLabel.innerText = "Prompt:";
        promptAndSteps.appendChild(promptLabel);
        let promptInput = document.createElement("input");
        promptInput.setAttribute("type", "text");
        promptInput.setAttribute("id", "promptInput");
        promptInput.setAttribute("style", "margin: 0 auto; flex-basis: 70%");
        promptAndSteps.appendChild(promptInput);

        // Input box for number of steps
        // Currently hidden, but power users could reveal it if they want
        let stepsLabel = document.createElement("label");
        stepsLabel.setAttribute("for", "steps");
        stepsLabel.innerText = "Steps:";
        stepsLabel.setAttribute("style", "display: none");
        promptAndSteps.appendChild(stepsLabel);

        let steps = document.createElement("input");
        steps.setAttribute("type", "number");
        steps.setAttribute("value", 4);
        steps.setAttribute("min", 1);
        steps.setAttribute("max", 6);
        steps.setAttribute("id", "steps");
        steps.setAttribute("style", "margin: 0 auto; display: none");
        promptAndSteps.appendChild(steps);

        // Input box for prompt strength
        let strengthLabel = document.createElement("label");
        strengthLabel.setAttribute("for", "strength");
        strengthLabel.innerText = "Prompt Strength:";
        strengthLabel.setAttribute("style", "display: none");
        promptAndSteps.appendChild(strengthLabel);

        let strength = document.createElement("input");
        strength.setAttribute("type", "number");
        strength.setAttribute("value", 0.6);
        strength.setAttribute("min", 0.05);
        strength.setAttribute("step", 0.05);
        strength.setAttribute("max", 1.00);
        strength.setAttribute("id", "strength");
        strength.setAttribute("style", "margin: 0 auto; display: none");
        promptAndSteps.appendChild(strength);

        let widthAndHeight = document.createElement("div");
        widthAndHeight.setAttribute("style", "width: 50%; display: none; flex-direction: row; gap: 0.5rem; align-items: center; align-content: center; justify-content: center");
        formContainer.appendChild(widthAndHeight)

        let rollPrompt = document.createElement("button");
        rollPrompt.innerHTML = '<img src="https://fonts.gstatic.com/s/i/short-term/release/materialsymbolsoutlined/casino/default/24px.svg"></img>'
        rollPrompt.setAttribute("id", "rollPrompt");
        rollPrompt.setAttribute("style", "min-width: 50px");
        rollPrompt.addEventListener("click", getRandomPrompt);
        promptAndSteps.appendChild(rollPrompt);


        // Input box for width
        // Currently hidden, but power users could reveal it if they want
        let widthLabel = document.createElement("label");
        widthLabel.setAttribute("for", "width");
        widthLabel.innerText = "Width:";
        widthAndHeight.appendChild(widthLabel);

        let width = document.createElement("input");
        width.setAttribute("type", "number");
        width.setAttribute("value", imageDimensions.x);
        width.setAttribute("min", 256);
        width.setAttribute("max", 1024);
        width.setAttribute("step", 64);
        width.setAttribute("id", "width");
        width.setAttribute("style", "margin: 0 auto;");
        width.addEventListener('input', (e) => {
            imageDimensions.x = parseInt(e.target.value);
            p.resizeCanvas(imageDimensions.x, p5Canvas.height);
            p5CanvasEl.style.width = imageDimensions.x;
            p5CanvasEl.style.height = '';
            p5CanvasEl.style["max-width"] = "90%";
            p5CanvasEl.style["aspect-ratio"] = imageDimensions.x / imageDimensions.y;
            bufferForZooming.resizeCanvas(imageDimensions.x, p5Canvas.height);
            size.x = Math.floor(imageDimensions.x / 2);
            size.y = Math.floor(size.x * imageDimensions.y / imageDimensions.x);
            images = [];
            currentImage = undefined;
            historyContainer.style.display = "none";
            downloadContainer.style.display = "none";
        });
        // Ensure divisible by 8
        width.addEventListener('change', (e) => { e.target.value = e.target.value - e.target.value % 8 });
        widthAndHeight.appendChild(width);

        // Input box for height
        // Currently hidden, but power users could reveal it if they want
        let heightLabel = document.createElement("label");
        heightLabel.setAttribute("for", "height");
        heightLabel.innerText = "Height:";
        widthAndHeight.appendChild(heightLabel);

        let height = document.createElement("input");
        height.setAttribute("type", "number");
        height.setAttribute("value", imageDimensions.y);
        height.setAttribute("min", 256);
        height.setAttribute("max", 1024);
        height.setAttribute("step", 8);
        height.setAttribute("id", "height");
        height.setAttribute("style", "margin: 0 auto;");
        height.addEventListener('input', (e) => {
            imageDimensions.y = parseInt(e.target.value);
            p.resizeCanvas(p5Canvas.width, imageDimensions.y);
            p5CanvasEl.style.width = imageDimensions.x;
            p5CanvasEl.style.height = '';
            p5CanvasEl.style["max-width"] = "90%";
            p5CanvasEl.style["aspect-ratio"] = imageDimensions.x / imageDimensions.y;
            bufferForZooming.resizeCanvas(p5Canvas.width, imageDimensions.y);
            size.x = Math.floor(imageDimensions.x / 2);
            size.y = Math.floor(size.x * imageDimensions.y / imageDimensions.x);
            images = [];
            currentImage = undefined;
            historyContainer.style.display = "none";
            downloadContainer.style.display = "none";
        });
        // Ensure divisible by 8
        width.addEventListener('change', (e) => { e.target.value = e.target.value - e.target.value % 8 });
        widthAndHeight.appendChild(height);

        // Slider that scrubs through history
        let historyContainer = document.createElement("div");
        historyContainer.setAttribute("id", "historyContainer");
        historyContainer.setAttribute("style", "display: none; background-color: #EEEEEE; flex-direction: column; gap: 1rem; padding: 1rem; align-items: center; align-content: center; justify-content: center");
        historyContainer.innerHTML = "<div style=\"flex-basis: 100%\"><h2 style=\"font-size: 120%\">History (scrub to go back)</h2></div>"
        formContainer.appendChild(historyContainer);

        let historyInnerContainer = document.createElement("div");
        historyInnerContainer.setAttribute("id", "historyInnerContainer");
        historyInnerContainer.setAttribute("style", "width: 50%; display: flex; flex-direction: row; gap: 0.5rem; align-items: center; align-content: center; justify-content: center");
        historyContainer.appendChild(historyInnerContainer)

        let historySlider = document.createElement("input");
        historySlider.setAttribute("id", "historySlider");
        historySlider.setAttribute("style", "flex-basis: 70%;");
        historySlider.setAttribute("type", "range");
        historySlider.setAttribute("min", "1");
        historySlider.setAttribute("max", "1");
        historySlider.setAttribute("value", "1");

        historySlider.addEventListener("input", (e) => { frameNumberToCanvas(parseInt(e.target.value)) });
        historyInnerContainer.appendChild(historySlider);

        let playButton = document.createElement("button");
        playButton.setAttribute("id", "playButton");
        playButton.setAttribute("style", "flex-basis: 20%;");
        playButton.setAttribute("type", "button");
        playButton.innerHTML = "Play"
        playButton.addEventListener("click", (e) => {
            playing = !playing;

            function play() {
                playButton.innerHTML = playing ? "Pause" : "Play";
                txt2imgButton.disabled = playing
                if (playing) {
                    historySlider.value = (parseInt(historySlider.value)) % images.length + 1;
                    frameNumberToCanvas(parseInt(historySlider.value));
                    setTimeout(play, 500);
                }
            }
            play();
        });
        historyInnerContainer.appendChild(playButton);

        let downloadContainer = document.createElement("div");
        downloadContainer.setAttribute("id", "downloadContainer");
        downloadContainer.setAttribute("style", "width: 50%; display: none; flex-direction: row; gap: 0.5rem; align-items: center; align-content: center; justify-content: center");
        formContainer.appendChild(downloadContainer);

        // Download individual images button hidden
        let downloadButton = document.createElement("button");
        downloadButton.setAttribute("style", "display: none")
        downloadButton.innerHTML = "Download Images"
        downloadButton.addEventListener("click", () => {
            for (const [i, im_url] of images.entries()) {
                download(im_url, `image_${i.toString().padStart(3, '0')}.png`, true);
            }
        });
        downloadContainer.appendChild(downloadButton);

        let generateDownloadButton = document.createElement("button");
        generateDownloadButton.innerHTML = "Generate .gif and .zip"
        generateDownloadButton.addEventListener("click", () => {
            generateDownloadButton.innerHTML = "Generating..."
            fetch("/api/gif", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({ images })
            }).then((r) => r.json())
                .then((data) => {
                    let prediction;
                    async function getPrediction(id) {
                        prediction = await fetch(`/api/gif/${id}`, {
                            method: "POST",
                            headers: {
                                "Content-Type": "application/json"
                            },
                        })
                        let prediction_json = await prediction.json();
                        if (prediction_json.status != "succeeded" && prediction_json.status != "failed") {
                            setTimeout(() => { getPrediction(id) }, 1000);
                        } else {

                            gif = prediction_json.output.video
                            zip = prediction_json.output.zip
                            gifButton.setAttribute("style", "display: flex; background: #fab1fc");
                            zipButton.setAttribute("style", "display: flex; background: #fab1fc");
                            generateDownloadButton.innerHTML = "Generate .gif and .zip"
                        }
                    }
                    getPrediction(data.output.id);
                    // gif = data.output.video
                    // zip = data.output.zip
                    // gifButton.setAttribute("style", "display: flex; background: #fab1fc");
                    // zipButton.setAttribute("style", "display: flex; background: #fab1fc");
                    // generateDownloadButton.innerHTML = "Generate .gif and .zip"
                });
        });
        downloadContainer.appendChild(generateDownloadButton);


        let gifButton = document.createElement("button");
        gifButton.setAttribute("style", "display: none");
        gifButton.setAttribute("id", "gifButton");
        gifButton.innerHTML = "Download .gif"
        gifButton.addEventListener("click", () => {
            if (typeof (gif) != "undefined") {
                download(gif, "endless_zoom.gif", true);
            } else {
                alert("I don't know how you got in this situation, but you're trying to download a gif that doesn't exist yet!")
            }
        });
        downloadContainer.appendChild(gifButton);


        let zipButton = document.createElement("button");
        zipButton.setAttribute("style", "display: none");
        zipButton.setAttribute("id", "zipButton");
        zipButton.innerHTML = "Download .zip"
        zipButton.addEventListener("click", () => {
            if (typeof (zip) != "undefined") {
                download(zip, "endless_zoom.zip", true);
            } else {
                alert("I don't know how you got in this situation, but you're trying to download a zip that doesn't exist yet!")
            }
        });
        downloadContainer.appendChild(zipButton);

        let txt2imgButton = document.createElement("button");
        txt2imgButton.setAttribute("id", "txt2imgButton");
        txt2imgButton.setAttribute("type", "button");
        txt2imgButton.innerHTML = "Reset"
        txt2imgButton.addEventListener("click", (e) => {
            images = []
            historyContainer.style.display = "none";
            downloadContainer.style.display = "none";
            dream(promptInput.value, undefined, parseInt(steps.value), strength);
            drawCursor();
            drawClock('#333333');
        });
        formContainer.appendChild(txt2imgButton);

        // Wait until prompt is randomly initialised, then get first image
        getRandomPrompt();
        const getFirstImage = () => { if (promptInput.value != "") { txt2imgButton.click() } else setTimeout(getFirstImage, 1) };
        getFirstImage();

        // Set canvas initial dimensions to device aspect ratio (always landscape)
        // Initial loaded (non-generated) image will be slightly wonky, but not enough to matter
        let deviceAspectRatio = window.screen.width > window.screen.height ? window.screen.width / window.screen.height : window.screen.height / window.screen.width;
        let width_value_tmp = height.value * deviceAspectRatio;
        width_value_tmp -= width_value_tmp % 8;
        if (width_value_tmp <= 1024) {

            width.value = (width_value_tmp).toFixed(0).toString();
            imageDimensions.x = parseInt(width.value);

        } else {
            let height_value_tmp = (width.value / deviceAspectRatio).toFixed(0);
            height_value_tmp -= height_value_tmp % 8;
            height.value = (height_value_tmp).toFixed(0).toString();
            imageDimensions.y = parseInt(height.value);
        }
        p.resizeCanvas(imageDimensions.x, imageDimensions.y);
        p5CanvasEl.style.width = imageDimensions.x;
        p5CanvasEl.style.height = '';
        p5CanvasEl.style["max-width"] = "90%";
        p5CanvasEl.style["aspect-ratio"] = imageDimensions.x / imageDimensions.y;

        size.x = Math.floor(imageDimensions.x / 2);
        size.y = Math.floor(size.x * imageDimensions.y / imageDimensions.x);

        bufferForZooming.resizeCanvas(imageDimensions.x, imageDimensions.y);

        drawCursor();
    }

    function getRandomPrompt() {
        fetch("/api/prompt", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ images: images, width: imageDimensions.x, height: imageDimensions.y })
        }).then((r) => r.json())
            .then((data) => {
                promptInput.value = data;
            });
    }

    function drawBox(centerX, centerY, sideX, sideY) {
        p.rectMode(p.CENTER);
        p.noFill();
        p.strokeWeight(4);
        p.stroke('white');
        p.rect(centerX, centerY, sideX, sideY);
        p.noStroke();
    }

    function drawCursor(position) {
        // Clear the canvas
        p.clear();
        if (images.length > 0) {
            // Redraw the image on the canvas
            let img = currentImage;
            p.image(img, 0, 0, p5CanvasEl.width, p5CanvasEl.height)
        }
        // Draw cursor
        if (position === undefined) {
            position = { x: p.mouseX, y: p.mouseY }
        }
        drawBox(position.x, position.y, size.x, size.y);
    }

    function imageToCanvas(im_url, frameNumber) {
        p.loadImage(
            im_url,
            (img) => {
                p.image(img, 0, 0, p5Canvas.width, p5Canvas.height);
                img["frameNumber"] = frameNumber;
                currentImage = img;
            }
        )
    }

    function frameNumberToCanvas(frameNumber) {
        imageToCanvas(images[frameNumber - 1], frameNumber);
    }


    function zoomCanvas(position, size, frame, frames) {
        if (!waiting) {
            soundEffects.forEach((audio) => {
                safePause(audio);
                delete audio;
            })
            let audio = new Audio('./pop.mp3');
            audio.preservesPitch = false;
            audio.playbackRate = 0.8 + Math.random() * 0.4;
            safePlay(audio)
            audio.playbackRate = 0.8 + Math.random() * 0.4;
            setTimeout(() => { safePlay(audio) }, Math.random() * 50)
            return
        }

        if (frame < frames) {
            let [originalTopLeft, originalTopRight, originalBottomLeft, originalBottomRight] = [{ x: 0, y: 0 }, { x: imageDimensions.x, y: 0 }, { x: 0, y: imageDimensions.y }, { x: imageDimensions.x, y: imageDimensions.y }]

            let [destinationTopLeft, destinationTopRight, destinationBottomLeft, destinationBottomRight] = [
                { x: position.x - size.x / 2, y: position.y - size.y / 2 },
                { x: position.x + size.x / 2, y: position.y - size.y / 2 },
                { x: position.x - size.x / 2, y: position.y + size.y / 2 },
                { x: position.x + size.x / 2, y: position.y + size.y / 2 }
            ]

            let [topLeft, topRight, bottomLeft, bottomRight] = [
                { x: originalTopLeft.x * (1 - (frame / frames)) + destinationTopLeft.x * (frame / frames), y: originalTopLeft.y * (1 - (frame / frames)) + destinationTopLeft.y * (frame / frames) },
                { x: originalTopRight.x * (1 - (frame / frames)) + destinationTopRight.x * (frame / frames), y: originalTopRight.y * (1 - (frame / frames)) + destinationTopRight.y * (frame / frames) },
                { x: originalBottomLeft.x * (1 - (frame / frames)) + destinationBottomLeft.x * (frame / frames), y: originalBottomLeft.y * (1 - (frame / frames)) + destinationBottomLeft.y * (frame / frames) },
                { x: originalBottomRight.x * (1 - (frame / frames)) + destinationBottomRight.x * (frame / frames), y: originalBottomRight.y * (1 - (frame / frames)) + destinationBottomRight.y * (frame / frames) }
            ]


            let srcX = topLeft.x;
            let srcY = topLeft.y;
            let srcWidth = (topRight.x - topLeft.x);
            let srcHeight = (bottomLeft.y - topLeft.y);

            // Define the destination region on the canvas
            let destX = 0;
            let destY = 0;
            let destWidth = p5Canvas.width;
            let destHeight = p5Canvas.height;

            if (frame === 1) {
                p.loadImage(images[currentImage.frameNumber - 1], (loaded_img) => {
                    // Ensure input image is the right size so we don't get weird artifacts while copying to buffer
                    loaded_img.resize(imageDimensions.x, imageDimensions.y);
                    bufferForZooming.clear();
                    bufferForZooming.copy(loaded_img, 0, 0, imageDimensions.x, imageDimensions.y, 0, 0, imageDimensions.x, imageDimensions.y);
                    p.image(bufferForZooming, destX, destY, destWidth, destHeight, srcX, srcY, srcWidth, srcHeight);
                });
            } else {
                p.image(bufferForZooming, destX, destY, destWidth, destHeight, srcX, srcY, srcWidth, srcHeight);

                drawClock('#BBBBBB');
            }
        }

        if ((frame - 1) % 75 == 0) {
            var audio = new Audio('./whoosh.mp3');
            audio.preservesPitch = false;
            audio.playbackRate = 0.5 + Math.random();
            soundEffects.push(audio);
            safePlay(audio);
        }


        // 50 fps (roughly)
        setTimeout(() => { window.requestAnimationFrame(() => zoomCanvas(position, size, frame + 1, frames)) }, 1000 / 50);

    }

    function drawClock(color) {
        // draw clock to indicate waiting
        p.stroke(color);
        p.strokeWeight(3);
        let center = { x: p5Canvas.width - 40, y: p5Canvas.height - 40 };
        let diameter = 20;
        let bigHandLength = diameter * 0.3;
        let smallHandLength = bigHandLength * 0.7;
        let angle = 0.2 * Math.PI
        p.circle(center.x, center.y, diameter);
        p.line(center.x, center.y, center.x, center.y - bigHandLength);
        p.line(center.x, center.y, center.x + Math.cos(angle) * smallHandLength, center.y + Math.sin(angle) * smallHandLength);
        p.noStroke();
    }

    function dreamFromCenterAndSize(position, size) {
        if (playing) {
            // Don't dream if playing
            alert('Pause playback before zooming');
            return;
        }
        document.querySelector("#zipButton").setAttribute("style", "display: none");
        document.querySelector("#gifButton").setAttribute("style", "display: none");
        if (images.length > 0) {
            let initImageBuffer = p.createGraphics(imageDimensions.x, imageDimensions.y);

            let srcX = Math.floor(position.x - size.x / 2);
            let srcY = Math.floor(position.y - size.y / 2);

            // Define the destination region on the canvas
            let destX = 0;
            let destY = 0;
            let destWidth = p5Canvas.width;
            let destHeight = p5Canvas.height;

            // Draw the original image onto the image buffer, zoomed
            p.loadImage(images[currentImage.frameNumber - 1], (loaded_img) => {
                // Ensure input image is the right size so we don't get weird artifacts while copying to buffer
                loaded_img.resize(imageDimensions.x, imageDimensions.y);

                // Prime initImageBuffer with a non-zoomed version so we never get black edges
                // (hacky, but papers over the edges until outpainting implemented)
                initImageBuffer.copy(loaded_img, destX, destY, destWidth, destHeight, destX, destY, destWidth, destHeight);

                initImageBuffer.copy(loaded_img, srcX, srcY, size.x, size.y, destX, destY, destWidth, destHeight);

                // Get the data URI from the resized offscreen canvas
                let img = initImageBuffer.canvas.toDataURL("image/jpeg");

                let prompt = document.querySelector('#promptInput').value;
                let steps = parseInt(document.querySelector('#steps').value);
                let strength = parseFloat(document.querySelector('#strength').value);
                dream(prompt, img, steps, strength);

                // Zoom the canvas in (while waiting for the dream)
                zoomCanvas(position, size, 1, 100);
            });
        } else {
            let prompt = document.querySelector('#promptInput').value;
            let steps = parseInt(document.querySelector('#steps').value);
            dream(prompt, undefined, steps);
        }
    }


    function dream(prompt, img, steps, strength, width, height) {
        waiting = true
        let txt2imgButton = document.querySelector('#txt2imgButton');
        txt2imgButton.disabled = true;
        let input = {
            prompt: prompt,
            steps: steps || 1,
            width: width || imageDimensions.x,
            height: height || imageDimensions.y
        }
        if (img) {
            input['image'] = img;
            input['control_image'] = img;
            input['prompt_strength'] = strength;
        }


        let historySlider = document.querySelector('#historySlider');

        if (currentImage) {
            historySlider.max = currentImage.frameNumber;
            historySlider.value = currentImage.frameNumber;
        } else {
            historySlider.max = 1;
            historySlider.value = 1;
        }

        let startTime = Date.now();
        function fetchImage() {
            fetch(endpoint, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({ input })
            }).then((r) => r.ok ? r.json() : r.json().then(err => Promise.reject(err)))
                .then((data) => {
                    console.log(`Generated in: ${Date.now() - startTime} ms`);
                    let data_uri;
                    if (Array.isArray(data.output)) {
                        data_uri = data.output[0];
                    } else {
                        data_uri = data.output
                    }
                    p.loadImage(data_uri, (img) => {
                        p.image(img, 0, 0, p5CanvasEl.width, p5CanvasEl.height);

                        if (images.length > 0) {
                            // Remove history after the (previous) image
                            images = images.slice(0, currentImage.frameNumber);
                        };

                        // Add current image to history
                        images.push(data_uri);
                        img.frameNumber = images.length;
                        currentImage = img;

                        historySlider.max = images.length;
                        historySlider.value = images.length;
                        if (images.length > 1) {
                            let historyContainer = document.querySelector('#historyContainer');
                            historyContainer.style.display = "flex";
                            downloadContainer.style.display = "flex";
                        }

                        waiting = false;
                        // Now that the deployment has been turned off, turn off the warning message after you get the first response.
                        document.querySelector('#warmupModal').style.display = 'none';
                        txt2imgButton.disabled = false;
                    });
                })
                .catch((err) => { console.log(err); setTimeout(fetchImage(), 2000) }); // If error, send again - probably cold boot of model
        }
        fetchImage();

    }

    p.mouseInCanvas = function () {
        return p.mouseX >= 0 && p.mouseX <= p5CanvasEl.width && p.mouseY >= 0 && p.mouseY <= p5CanvasEl.height
    }

    p.mouseReleased = function () {

        // Check that promptInput DOM element has loaded to avoid error just after leaving splashscreen
        if (!waiting && Boolean(document.querySelector('#promptInput'))) {
            // Check that mouse is in bounds of canvas
            if (p.mouseInCanvas()) {
                dreamFromCenterAndSize({ x: p.mouseX, y: p.mouseY }, size);
            }
        }
    }

    p.mouseMoved = function () {
        // Check that mouse is in bounds of canvas
        if (p.mouseInCanvas()) {
            // Check not in playback or waiting for generation
            if (!playing & !waiting) {
                drawCursor();
            }
        };
    }

    p.touchMoved = function () {
        if ((p.mouseInCanvas()) & !touchUserIsScrolling & !waiting) {
            if (!justZoomed) {
                if (p.touches.length === 2) {
                    let distance = Math.sqrt(Math.pow(p.touches[0].x - p.touches[1].x, 2) + Math.pow(p.touches[0].y - p.touches[1].y, 2));
                    size.x = Math.floor(distance);
                    size.y = Math.floor(size.x * imageDimensions.y / imageDimensions.x);
                    center = { x: p.touches[0].x + (p.touches[1].x - p.touches[0].x) / 2, y: p.touches[0].y + (p.touches[1].y - p.touches[0].y) / 2 }

                    drawCursor(center);
                    return false;
                }
                if (p.touches.length === 1) {
                    center = { x: p.touches[0].x, y: p.touches[0].y };
                }
                p.mouseMoved();
                return true;
            }
        }
        return true;
    }

    p.touchEnded = function () {
        if (justZoomed) {
            justZoomed = false;
            return false;
        }
        if (p.touches.length === 0 & touchUserIsScrolling) {
            touchUserIsScrolling = false;
            return true;
        }
        if (p.touches.length === 1) {
            justZoomed = true;
        }
        // Check that promptInput DOM element has loaded to avoid error just after leaving splashscreen
        if (!waiting & !playing & Boolean(document.querySelector('#promptInput'))) {
            dreamFromCenterAndSize(center, size);
            return false;
        }
    }

    p.touchStarted = function () {
        if (!(p.mouseInCanvas())) {
            touchUserIsScrolling = true;
            return true;
        }

        if (!justZoomed & !waiting) {
            return p.touchMoved();
        }

        return false;
    }

    p.mouseWheel = function (e) {
        // Check that mouse is in bounds of canvas
        if (p.mouseInCanvas() & !waiting) {
            if ((size.x + e.delta) > imageDimensions.x) {
                size.x = imageDimensions.x;
                size.y = imageDimensions.y;
            } else if ((size.x + e.delta) < 50) {
                size.x = 50;
                size.y = Math.floor(50 * imageDimensions.y / imageDimensions.x);
            } else {
                size.x = Math.floor(size.x + e.delta);
                size.y = Math.floor(size.x * imageDimensions.y / imageDimensions.x);
            }
            drawCursor();
            return false;
        }
    }

}

// Try to avoid race condition by waiting until target DOM Element
// has loaded before instantiating p5
let myp5;

function waitForContentDiv() {
    if ((typeof (document.querySelector("#content")) == "undefined") || (typeof (p5) == "undefined")) {
        setTimeout(waitForContentDiv, 5);
        return
    }
    myp5 = new p5(s);
}
waitForContentDiv();