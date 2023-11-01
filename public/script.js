// Example code from https://editor.p5js.org/anotherjesse@gmail.com/sketches/DxlN4XGd_

let replicateEndpoint = 'api/predictions' // if using Replicate
let localEndpoint = 'http://localhost:5001/predictions' // if using local LCM from https://github.com/replicate/latent-consistency-model/tree/prototype
let endpoint = replicateEndpoint;
let prompt = 'man in flower field';

function setup() {
    createCanvas(512, 512);
    setTimeout(dream, 10);
    noStroke()
    let inp = document.createElement("input");
    inp.setAttribute("id", "size")
    inp.setAttribute("type", "range");
    inp.setAttribute("min", "1");
    inp.setAttribute("max", "100");
    document.body.appendChild(inp);
}

function draw() {

}

function mouseDragged() {
    fill(random(255), random(255), random(255));
    ellipse(mouseX, mouseY, document.getElementById('size').value);
}

function mouseReleased() {
    let offscreenCanvas = document.createElement('canvas');
    offscreenCanvas.width = 512;
    offscreenCanvas.height = 512;
    let ctx = offscreenCanvas.getContext('2d');

    // Draw the original canvas onto the offscreen canvas
    ctx.drawImage(canvas, 0, 0, 512, 512);

    // Get the data URI from the resized offscreen canvas
    let img = offscreenCanvas.toDataURL("image/jpeg");
    dream(img);
}

function dream(img) {
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
            let data_uri = data.output;
            console.log(data_uri)
            loadImage(data_uri, function (img) {
                image(img, 0, 0)
            });
        });
}