import { readFile, stat } from "node:fs/promises";
import { createServer } from "node:http";
import * as path from "node:path";

const root = path.resolve(import.meta.dirname, "../../.pages-site");
const contentTypes: Readonly<Record<string, string>> = {
    ".css": "text/css; charset=utf-8",
    ".html": "text/html; charset=utf-8",
    ".js": "text/javascript; charset=utf-8",
    ".json": "application/json",
    ".png": "image/png",
    ".svg": "image/svg+xml",
    ".webp": "image/webp",
};

await stat(path.join(root, "index.html"));

const server = createServer((request, response) => {
    async function serve() {
        const requestUrl = new URL(request.url ?? "/", "http://127.0.0.1:4173");
        const pathname = decodeURIComponent(requestUrl.pathname);
        let filename = path.resolve(root, `.${pathname}`);
        if (filename !== root && !filename.startsWith(`${root}${path.sep}`)) {
            response.writeHead(403).end();
            return;
        }
        const metadata = await stat(filename);
        if (metadata.isDirectory())
            filename = path.join(filename, "index.html");
        const body = await readFile(filename);
        response.writeHead(200, {
            "Cache-Control": "no-cache",
            "Content-Type":
                contentTypes[path.extname(filename)] ??
                "application/octet-stream",
        });
        response.end(body);
    }
    async function respond() {
        try {
            await serve();
        } catch {
            response.writeHead(404).end();
        }
    }
    void respond();
});

server.listen(4173, "127.0.0.1");
