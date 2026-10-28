export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const asset = await env.ASSETS.fetch(request);
    if (asset.status !== 404) return asset;
    // SPA fallback so deep links (/ etc.) serve the app shell
    return env.ASSETS.fetch(new URL("/", url.origin).toString());
  },
};
