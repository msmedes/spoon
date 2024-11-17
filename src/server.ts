// a bun http server with one path, /mirror, that returns the request body

Bun.serve({
	fetch(req) {
		const url = new URL(req.url);
		if (url.pathname === "/mirror") {
			return new Response(req.body);
		}
		return new Response("Not found", { status: 404 });
	},
});
