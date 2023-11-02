let replicateEndpoint = 'api/predictions' // if using Replicate
let localEndpoint = 'http://localhost:5001/predictions' // if using local LCM from https://github.com/replicate/latent-consistency-model/tree/prototype
let endpoint = localEndpoint;

let images = [];
let currentImage;
let size = 256;
let playing = false;
var waiting = false;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function setup() {
    let canvas = createCanvas(512, 512);
    pixelDensity(1); // Otherwise canvas boundary check breaks for retina displays
    noStroke();

    let container = document.createElement("div");
    container.innerHTML = "<h1 style=\"font-size: 300%;\">Endless Zoom</h1><h2 style=\"font-size: 120%;\">Scroll to change cursor size; click to zoom in</h2>"
    container.setAttribute("style", "width: 100%; text-align: center; padding: 10rem; margin: auto auto;");
    container.setAttribute("width", "512");
    container.setAttribute("id", "container");
    document.body.appendChild(container);

    canvas.parent("container");
    canvas.id("canvas");
    document.querySelector('#canvas').setAttribute("style", "margin: 0 auto; height: 400px; border: 2px solid black");


    let formContainer = document.createElement("div");
    formContainer.setAttribute("id", "formContainer");
    formContainer.setAttribute("style", "display: flex; flex-direction: column; gap: 1rem; padding: 1rem");
    container.appendChild(formContainer);
    // Text input box for a prompt
    let promptInput = document.createElement("input");
    promptInput.setAttribute("type", "text");
    promptInput.setAttribute("value", "New York streetscape");
    promptInput.setAttribute("id", "promptInput");
    promptInput.setAttribute("style", "margin: 0 auto;");
    formContainer.appendChild(promptInput);

    // Slider that scrubs through history
    let historyContainer = document.createElement("div");
    historyContainer.setAttribute("id", "historyContainer");
    historyContainer.setAttribute("style", "visibility: hidden");
    historyContainer.innerHTML = "<h2 style=\"font-size: 120%;\">History (scrub to go back)</h2>"
    formContainer.appendChild(historyContainer);

    let historySlider = document.createElement("input");
    historySlider.setAttribute("id", "historySlider");
    historySlider.setAttribute("type", "range");
    historySlider.setAttribute("min", "1");
    historySlider.setAttribute("max", "1");
    historySlider.setAttribute("value", "1");

    historySlider.setAttribute("style", "margin: 0 auto");

    historySlider.addEventListener("input", (e) => { imageToCanvas(images[parseInt(e.target.value) - 1]) });
    historyContainer.appendChild(historySlider);

    let playButton = document.createElement("button");
    playButton.setAttribute("id", "playButton");
    playButton.setAttribute("type", "button");
    playButton.innerHTML = "Play"
    playButton.addEventListener("click", (e) => {
        playing = !playing;
        e.target.innerHTML = playing ? "Pause" : "Play";

        function play() {
            if (playing) {
                historySlider.value = (parseInt(historySlider.value)) % images.length + 1;
                imageToCanvas(images[parseInt(historySlider.value) - 1]);
                setTimeout(play, 500);
            }
        }
        play();
    });
    historyContainer.appendChild(playButton);

    setTimeout(() => {
        data_uri = 'https://replicate.delivery/pbxt/4L6vyIjY6Q64OZlWQTJogKIwvDF1NVvHNKIdleNyG35nbD6IA/out-0.png'
        loadImage(data_uri,
            (img) => {
                image(img, 0, 0, canvas.width, canvas.height);
                images.push(data_uri);
                currentImage = img;
            });
        addToPreviousImageLog(data_uri);
    }, 10);
    drawCursor();


}

function draw() {

}

function imageToCanvas(im_url) {
    loadImage(
        im_url,
        (img) => {
            image(img, 0, 0, canvas.width, canvas.height);
            currentImage = img;
        }
    )
}

function mouseReleased() {
    if (!waiting) {
        // Check that mouse is in bounds of canvas
        let canvas = document.querySelector('#canvas');
        if (mouseX >= 0 && mouseX <= canvas.width && mouseY >= 0 && mouseY <= canvas.height) {
            let offscreenCanvas = document.createElement('canvas');
            offscreenCanvas.width = 512;
            offscreenCanvas.height = 512;
            let ctx = offscreenCanvas.getContext('2d');

            // Define the source clipping region (the zoomed-in box)
            let srcX = mouseX - size / 2;
            let srcY = mouseY - size / 2;
            let srcWidth = size;
            let srcHeight = size;

            // Define the destination region on the canvas
            let destX = 0;
            let destY = 0;
            let destWidth = canvas.width;
            let destHeight = canvas.height;

            // Clear the canvas
            clear();
            if (images.length > 0) {
                // Redraw the image on the canvas
                let img = currentImage;
                image(img, 0, 0, canvas.width, canvas.height)
            }

            // Draw the original image onto the offscreen canvas, zoomed
            ctx.drawImage(canvas, srcX, srcY, srcWidth, srcHeight, destX, destY, destWidth, destHeight);
            drawCursor();

            // Get the data URI from the resized offscreen canvas
            let img = offscreenCanvas.toDataURL("image/jpeg");

            let prompt = document.querySelector('#promptInput').value;
            dream(prompt, img);
        }
    }
}

function drawSquareBox(centerX, centerY, side) {
    rectMode(CENTER);
    noFill();
    strokeWeight(4);
    stroke('black');
    rect(centerX, centerY, side, side);
    noStroke();
}

function drawCursor() {
    let canvas = document.querySelector('#canvas')
    // Clear the canvas
    clear();
    if (images.length > 0) {
        // Redraw the image on the canvas
        let img = currentImage;
        image(img, 0, 0, canvas.width, canvas.height)
    }
    // Draw cursor
    drawSquareBox(mouseX, mouseY, size);
}

function mouseMoved() {
    drawCursor()
}

function mouseWheel(e) {
    // Check that mouse is in bounds of canvas
    let canvas = document.querySelector('#canvas');
    if (mouseX >= 0 && mouseX <= canvas.width && mouseY >= 0 && mouseY <= canvas.height) {
        if ((size + e.delta) > 512) {
            size = 512;
        } else if ((size + e.delta) < 50) {
            size = 50;
        } else {
            size = size + e.delta;
        }
        drawCursor();
        return false;
    }
}

function addToPreviousImageLog(data_uri) {
    // Add last item from images to previous image log on page
    let oldImage = document.createElement("img");
    oldImage.setAttribute("width", "256");
    oldImage.setAttribute("style", "margin: 0 auto;");
    oldImage.setAttribute("src", data_uri);
    oldImage.setAttribute("id", `image${images.length}`)
    // Load a previous image into the canvas when clicked
    oldImage.onclick = (e) => { imageToCanvas(e.target.src); };
}

function dream(prompt, img) {
    let startTime = Date.now();
    waiting = true
    let canvas = document.querySelector('#canvas');
    let input = {
        prompt: prompt,
        steps: 1
    }
    if (img) {
        input['image'] = img
    }
    fetch(endpoint, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({ input })
    }).then((r) => r.json())
        .then((data) => {
            let data_uri = data.output;
            loadImage(data_uri, (img) => {
                image(img, 0, 0, canvas.width, canvas.height);
                images.push(data_uri);
                currentImage = img;
                let historySlider = document.querySelector('#historySlider');
                historySlider.setAttribute('max', images.length);
                historySlider.setAttribute('value', images.length);

                let historyContainer = document.querySelector('#historyContainer');
                historyContainer.setAttribute("style", "visibility: visible");
            });
            addToPreviousImageLog(data_uri);
        }).then(() => {
            waiting = false;
            console.log(`Generated in: ${Date.now() - startTime} ms`);
        });

}