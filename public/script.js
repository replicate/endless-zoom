let replicateEndpoint = 'api/predictions' // if using Replicate
let localEndpoint = 'http://localhost:5001/predictions' // if using local LCM from https://github.com/replicate/latent-consistency-model/tree/prototype
let endpoint = replicateEndpoint;

let images = [];
let currentImage;

// Global state to prevent clicking while waiting, there's probably a better way to this
var waiting = false

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

    // Slider that adjusts size of box
    let sizeSlider = document.createElement("input");
    sizeSlider.setAttribute("id", "size")
    sizeSlider.setAttribute("type", "range");
    sizeSlider.setAttribute("min", "10");
    sizeSlider.setAttribute("max", "512");
    sizeSlider.setAttribute("value", "256");
    sizeSlider.setAttribute("step", "2"); // So we can neatly half it to get crop

    sizeSlider.setAttribute("style", "margin: 0 auto;");
    formContainer.appendChild(sizeSlider);

    let previousImagesContainer = document.createElement("div");
    previousImagesContainer.innerHTML = "<h2 style=\"font-size: 120%;\">Previous generations (click to load back in to canvas)</h2>"
    container.appendChild(previousImagesContainer);

    let previousImages = document.createElement("div");
    previousImages.setAttribute("id", "previousImages");
    previousImages.setAttribute("style", "margin: 0 auto; display: flex; flex-direction: column; gap: 1rem; padding: 1rem");
    previousImagesContainer.appendChild(previousImages);

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

            let size = document.querySelector("#size").value;

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
    drawSquareBox(mouseX, mouseY, document.getElementById('size').value);
}

function mouseMoved() {
    drawCursor()
}

function mouseWheel(e) {
    // Check that mouse is in bounds of canvas
    let canvas = document.querySelector('#canvas');
    if (mouseX >= 0 && mouseX <= canvas.width && mouseY >= 0 && mouseY <= canvas.height) {
        document.querySelector('#size').value = (parseInt(document.querySelector('#size').value) + e.delta).toString();
        drawCursor();
        return false;
    }
}

function addToPreviousImageLog(data_uri) {
    // Add last item from images to previous image log on page
    let previousImages = document.querySelector("#previousImages");
    let oldImage = document.createElement("img");
    oldImage.setAttribute("width", "256");
    oldImage.setAttribute("style", "margin: 0 auto;");
    oldImage.setAttribute("src", data_uri);
    oldImage.setAttribute("id", `image${images.length}`)
    // Load a previous image into the canvas when clicked
    oldImage.onclick = (e) => { imageToCanvas(e.target.src); };
    previousImages.insertBefore(oldImage, previousImages.firstChild);
}

function dream(prompt, img) {
    waiting = true
    let canvas = document.querySelector('#canvas');
    let input = {
        prompt
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
            let data_uri = data.output[0];
            loadImage(data_uri, (img) => {
                image(img, 0, 0, canvas.width, canvas.height);
                images.push(data_uri);
                currentImage = img;
            });
            addToPreviousImageLog(data_uri);
        }).then(() => {
            waiting = false;
        });

}