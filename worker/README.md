# Comics relay integration

In the existing `shelfie-api` Cloudflare Worker, add the `handleComics` function from `comics-route.mjs` (remove its `export` keyword if pasting into the existing file).

At the start of the existing `fetch(request, env, ctx)` handler, insert:

```js
const comics = await handleComics(request);
if (comics) return comics;
```

Leave the existing Discogs handler and DISCOGS_TOKEN secret intact. No comics API key or additional service is required. Deploy the Worker, then verify a browser search for `Amazing Spider-Man #300` on the staged app before releasing the frontend.
