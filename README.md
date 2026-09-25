<p align="center">
  <img src="public/og.png" alt="DisrBin" width="600">
</p>

<p align="center"><b>Paste code. Share a link. Gone in a day.</b></p>

DisrBin is a fast, private paste bin. Paste code into a full-screen editor, save it, and share the short link. The language is recognised on its own and the code is coloured as you type; every paste deletes itself 24 hours later.

It runs entirely on Netlify: pages and the API are Netlify Functions, pastes live in Netlify Blobs. There is no server to run and no database to manage.

## Features

- **Automatic highlighting.** The language is detected as you paste or type, and the saved page uses the same guess. More than 30 languages are supported, from Go, Python and JavaScript to SQL, YAML and Dockerfile.
- **Self-destructing pastes.** Each paste expires after 24 hours and is deleted, both when it is next opened and by an hourly cleanup.
- **Private links.** IDs are eight random characters from an alphabet without look-alikes. Pastes are never listed, and they are kept out of search engines.
- **Built for reading.** Line numbers, a light and a dark theme that follow the system, line wrapping, one-click copy and a raw text view.
- **Works on phones.** The layout fits small screens without scrolling sideways.
- **A bot API.** A Telegram bot, or anything else holding the shared secret, can create pastes over HTTP.

## How it works

| Route | Function | What it does |
| --- | --- | --- |
| `GET /` | `home.mjs` | The editor |
| `GET /:id` | `view.mjs` | A paste, read-only and highlighted |
| `GET /:id/raw` | `raw.mjs` | The paste as plain text |
| `GET /about` | `about.mjs` | About the site |
| `POST /api/new` | `new.mjs` | Saves a paste from the editor, 6 a minute per visitor |
| `POST /api/detect` | `detect.mjs` | Names the language of the editor's text; stores nothing |
| `POST /api/paste` | `create.mjs` | Saves a paste for the bot, with a Bearer secret |
| hourly | `cleanup.mjs` | Deletes expired pastes |

The editor is [CodeMirror 5](https://codemirror.net/5/), loaded from cdnjs. Language detection uses [highlight.js](https://highlightjs.org/) on the server, tuned so plain prose is left uncoloured.

## Limits

| | |
| --- | --- |
| Size | 256 KB per paste |
| Lifetime | 24 hours |
| Editor saves | 6 a minute per visitor |

## Deploy

```sh
netlify deploy --prod
```

Set `PASTE_SECRET` in the site's environment variables. It is the Bearer token that `POST /api/paste` expects:

```sh
curl -X POST https://your-site/api/paste \
  -H "Authorization: Bearer $PASTE_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"content": "print(\"hello\")", "language": "python"}'
# {"id":"Ab3dEf7h","expires":1790000000000}   ->   https://your-site/Ab3dEf7h
```

`language` is optional; without it the language is detected when the paste is viewed.

---

Made by [Dhurgham](https://idisr.com), built with AI.
