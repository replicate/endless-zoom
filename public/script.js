let replicateEndpoint = 'api/predictions' // if using Replicate
let localEndpoint = 'http://localhost:5001/predictions' // if using local LCM from https://github.com/replicate/latent-consistency-model/tree/prototype
let endpoint = replicateEndpoint;



// It would be great to make this all less stateful, but for now there are a lot of global variables
let images = [];
let currentImage;
let playing = false;
var waiting = false;
let bufferForZooming;
let canvas;
let canvasEl;
let imageDimensions = { x: 768, y: 512 };
let size = { x: 256 };
size.y = Math.floor(size.x * imageDimensions.y / imageDimensions.x);

// The following global variables are only used in a touchscreen environment
// If using two fingers to pinch to zoom, set this to true when the first finger releases and false when the second finger releases,
// so that we only generate the first time
let justZoomed = false;
let touchUserIsScrolling = false;
let center = { x: 0, y: 0 };

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function setup() {
    canvas = createCanvas(imageDimensions.x, imageDimensions.y);
    bufferForZooming = createGraphics(imageDimensions.x, imageDimensions.y)
    pixelDensity(1); // Otherwise canvas boundary check breaks for retina displays
    noStroke();
    rectMode(CENTER);

    let container = document.createElement("div");
    container.innerHTML = "<h1 style=\"font-size: 300%;\">Endless Zoom</h1><h2 style=\"font-size: 120%;\">Scroll to change cursor size; click to zoom in</h2>"
    container.setAttribute("style", "width: 100%; text-align: center; padding: 1rem; margin: auto auto;");
    container.setAttribute("id", "container");
    document.body.appendChild(container);

    canvas.parent("container");
    canvas.id("canvas");
    canvasEl = document.querySelector('#canvas');
    canvasEl.setAttribute("style", "margin: 0 auto; height: 400px; border: 2px solid black");

    let formContainer = document.createElement("div");
    formContainer.setAttribute("id", "formContainer");
    formContainer.setAttribute("style", "display: flex; flex-direction: column; gap: 1rem; padding: 1rem; align-items: center; align-content: center; justify-content: center;");
    container.appendChild(formContainer);

    let fullscreenButton = document.createElement("img");
    fullscreenButton.setAttribute("src", "https://fonts.gstatic.com/s/i/short-term/release/materialsymbolsoutlined/fullscreen/default/24px.svg")
    fullscreenButton.setAttribute("id", "fullscreenButton");
    fullscreenButton.setAttribute("style", "cursor: pointer");
    fullscreenButton.addEventListener("click", (e) => { canvasEl.requestFullscreen() });
    formContainer.appendChild(fullscreenButton);

    let promptAndSteps = document.createElement("div");
    promptAndSteps.setAttribute("style", "width: 50%; display: flex; flex-direction: row; gap: 0.5rem; align-items: center; align-content: center; justify-content: center");
    formContainer.appendChild(promptAndSteps)
    // Text input box for a prompt
    let promptLabel = document.createElement("label");
    promptLabel.setAttribute("for", "promptInput");
    promptLabel.innerText = "Prompt:";
    promptAndSteps.appendChild(promptLabel);
    let promptInput = document.createElement("input");
    promptInput.setAttribute("type", "text");
    promptInput.setAttribute("value", "New York streetscape");
    promptInput.setAttribute("id", "promptInput");
    promptInput.setAttribute("style", "margin: 0 auto;");
    promptAndSteps.appendChild(promptInput);

    // Text input box for number of steps
    let stepsLabel = document.createElement("label");
    stepsLabel.setAttribute("for", "steps");
    stepsLabel.innerText = "Steps:";
    promptAndSteps.appendChild(stepsLabel);

    let steps = document.createElement("input");
    steps.setAttribute("type", "number");
    steps.setAttribute("value", 1);
    steps.setAttribute("min", 1);
    steps.setAttribute("max", 6);
    steps.setAttribute("id", "steps");
    steps.setAttribute("style", "margin: 0 auto;");
    promptAndSteps.appendChild(steps);

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



    let downloadButton = document.createElement("button");
    downloadButton.innerHTML = "Download Images"
    downloadButton.addEventListener("click", () => {

        async function toDataURL(url) {
            const blob = await fetch(url).then(res => res.blob());
            return URL.createObjectURL(blob);
        }

        async function download(url, filename) {
            const a = document.createElement("a");
            a.href = await toDataURL(url);
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
        }

        for (const [i, im_url] of images.entries()) {
            download(im_url, `image_${i.toString().padStart(3, '0')}.png`);
        }
    });
    historyInnerContainer.appendChild(downloadButton);


    let txt2imgButton = document.createElement("button");
    txt2imgButton.setAttribute("id", "txt2imgButton");
    txt2imgButton.setAttribute("type", "button");
    txt2imgButton.innerHTML = "Reset"
    txt2imgButton.addEventListener("click", (e) => {
        images = []
        historyContainer.style.display = "none";
        dream(promptInput.value, undefined, steps.value);
    });
    formContainer.appendChild(txt2imgButton);

    setTimeout(() => {
        data_uri = 'https://replicate.delivery/pbxt/4L6vyIjY6Q64OZlWQTJogKIwvDF1NVvHNKIdleNyG35nbD6IA/out-0.png'
        loadImage(data_uri,
            (img) => {
                image(img, 0, 0, canvas.width, canvas.height);
                images.push(data_uri);
                img["frameNumber"] = 1;
                currentImage = img;
            });
    }, 10);
    drawCursor();


}

function draw() {

}

function mouseInCanvas() {
    return mouseX >= 0 && mouseX <= canvasEl.width && mouseY >= 0 && mouseY <= canvasEl.height
}

function imageToCanvas(im_url, frameNumber) {
    loadImage(
        im_url,
        (img) => {
            image(img, 0, 0, canvas.width, canvas.height);
            img["frameNumber"] = frameNumber;
            currentImage = img;
        }
    )
}

function frameNumberToCanvas(frameNumber) {
    imageToCanvas(images[frameNumber - 1], frameNumber);
}

function mouseReleased() {
    if (!waiting) {
        // Check that mouse is in bounds of canvas
        if (mouseInCanvas()) {
            dreamFromCenterAndSize({ x: mouseX, y: mouseY }, size);
        }
    }
}

function zoomCanvas(position, size, frame, frames) {
    if (!waiting) { return }

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
    let destWidth = canvas.width;
    let destHeight = canvas.height;

    if (frame === 1) {
        loadImage(images[currentImage.frameNumber - 1], (loaded_img) => {
            // Ensure input image is the right size so we don't get weird artifacts while copying to buffer
            loaded_img.resize(imageDimensions.x, imageDimensions.y);
            bufferForZooming.clear();
            bufferForZooming.copy(loaded_img, 0, 0, imageDimensions.x, imageDimensions.y, 0, 0, imageDimensions.x, imageDimensions.y);
            image(bufferForZooming, destX, destY, destWidth, destHeight, srcX, srcY, srcWidth, srcHeight);
        });
    } else {
        image(bufferForZooming, destX, destY, destWidth, destHeight, srcX, srcY, srcWidth, srcHeight);
    }
    if (frame < frames) {
        // 50 fps (roughly)
        setTimeout(() => { window.requestAnimationFrame(() => zoomCanvas(position, size, frame + 1, frames)) }, 1000 / 50);
    }
}

function dreamFromCenterAndSize(position, size) {
    if (playing) {
        // Don't dream if playing
        alert('Pause playback before zooming');
        return;
    }
    let initImageBuffer = createGraphics(imageDimensions.x, imageDimensions.y);

    let srcX = Math.floor(position.x - size.x / 2);
    let srcY = Math.floor(position.y - size.y / 2);

    // Define the destination region on the canvas
    let destX = 0;
    let destY = 0;
    let destWidth = canvas.width;
    let destHeight = canvas.height;

    // Draw the original image onto the image buffer, zoomed
    loadImage(images[currentImage.frameNumber - 1], (loaded_img) => {
        initImageBuffer.copy(loaded_img, srcX, srcY, size.x, size.y, destX, destY, destWidth, destHeight);

        // Get the data URI from the resized offscreen canvas
        let img = initImageBuffer.canvas.toDataURL("image/jpeg");

        let prompt = document.querySelector('#promptInput').value;
        let steps = parseInt(document.querySelector('#steps').value);
        dream(prompt, img, steps);

        // Zoom the canvas in (while waiting for the dream)
        zoomCanvas(position, size, 1, 100);
    });
}

function drawBox(centerX, centerY, sideX, sideY) {
    rectMode(CENTER);
    noFill();
    strokeWeight(4);
    stroke('black');
    rect(centerX, centerY, sideX, sideY);
    noStroke();
}

function drawCursor(position) {
    // Clear the canvas
    clear();
    if (images.length > 0) {
        // Redraw the image on the canvas
        let img = currentImage;
        image(img, 0, 0, canvasEl.width, canvasEl.height)
    }
    // Draw cursor
    if (position === undefined) {
        position = { x: mouseX, y: mouseY }
    }
    drawBox(position.x, position.y, size.x, size.y);
}

function mouseMoved() {
    // Check that mouse is in bounds of canvas
    if (mouseInCanvas()) {
        // Check not in playback or waiting for generation
        if (!playing & !waiting) {
            drawCursor();
        }
    };
}

function touchMoved() {
    if ((mouseInCanvas()) & !touchUserIsScrolling) {
        if (!justZoomed) {
            if (touches.length === 2) {
                let distance = Math.sqrt(Math.pow(touches[0].x - touches[1].x, 2) + Math.pow(touches[0].y - touches[1].y, 2));
                size.x = Math.floor(distance);
                size.y = Math.floor(size.x * imageDimensions.y / imageDimensions.x);
                center = { x: touches[0].x + (touches[1].x - touches[0].x) / 2, y: touches[0].y + (touches[1].y - touches[0].y) / 2 }

                drawCursor(center);
                return false;
            }
            if (touches.length === 1) {
                center = { x: touches[0].x, y: touches[0].y };
            }
            mouseMoved();
            return true;
        }
    }
    return true;
}

function touchEnded() {
    if (justZoomed) {
        justZoomed = false;
        return false;
    }
    if (touches.length === 0 & touchUserIsScrolling) {
        touchUserIsScrolling = false;
        return true;
    }
    if (touches.length === 1) {
        justZoomed = true;
    }
    if (!waiting & !playing) {
        dreamFromCenterAndSize(center, size);
        return false;
    }
}

function touchStarted() {
    if (!(mouseInCanvas())) {
        touchUserIsScrolling = true;
    }

    if (!justZoomed) {
        return touchMoved();
    }

    return false;
}

function mouseWheel(e) {
    // Check that mouse is in bounds of canvas
    if (mouseInCanvas()) {
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

function dream(prompt, img, steps) {
    waiting = true
    let txt2imgButton = document.querySelector('#txt2imgButton');
    txt2imgButton.disabled = true;
    let input = {
        prompt: prompt,
        steps: steps || 1,
        width: imageDimensions.x,
        height: imageDimensions.y
    }
    if (img) {
        input['image'] = img
    }


    let historySlider = document.querySelector('#historySlider');

    historySlider.max = currentImage.frameNumber;
    historySlider.value = currentImage.frameNumber;

    let startTime = Date.now();
    fetch(endpoint, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({ input })
    }).then((r) => r.json())
        .then((data) => {
            console.log(`Generated in: ${Date.now() - startTime} ms`);
            let data_uri = data.output;
            loadImage(data_uri, (img) => {
                image(img, 0, 0, canvasEl.width, canvasEl.height);

                // Remove history after the (previous) image
                images = images.slice(0, currentImage.frameNumber);

                // Add current image to history
                images.push(data_uri);
                img.frameNumber = images.length;
                currentImage = img;

                historySlider.max = images.length;
                historySlider.value = images.length;
                if (images.length > 1) {
                    let historyContainer = document.querySelector('#historyContainer');
                    historyContainer.style.display = "flex";
                }

                waiting = false;
                txt2imgButton.disabled = false;
            });
        });

}