## p5.js + Latent Consistency Model

This allows p5.js to interact with a Latent Consistency Model, and to easily swap between the backend being a local copy as described in https://replicate.com/blog/run-latent-consistency-model-on-mac, or a model hosted on replicate

## Usage

edit public/script.js with your p5.js code and point it to the endpoint of your choice

### Local server setup
For local run, install the prototype branch of https://github.com/replicate/latent-consistency-model/tree/prototype

```console
git clone https://github.com/replicate/latent-consistency-model.git
cd latent-consistency-model
git checkout prototype
```

Make a python environment using e.g. venv, edm or conda and activate it

Install dependencies
```console
pip install -r requirements.txt
```

Run serve.py
```
python serve.py
```

### Replicate server setup

Add your [Replicate API token](https://replicate.com/account#token) to `.env.local`:

```
REPLICATE_API_TOKEN=<your-token-here>
```

### All


Install dependencies:

```console
npm install
```

Run the development server:

```console
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser.