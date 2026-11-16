import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { createServer } from 'node:http';
import { dirname, extname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

// Serves the built app (dist/): files as they are, index.html for every other
// path so the app's own routes work on a reload. Hashed /assets/ are cached for
// good; index.html, the service worker and the manifest are always revalidated.
const root = resolve(dirname(fileURLToPath(import.meta.url)), 'dist');
const port = Number.parseInt(process.env.PORT ?? '3000', 10);

const contentTypes = {
    '.css': 'text/css; charset=utf-8',
    '.gif': 'image/gif',
    '.html': 'text/html; charset=utf-8',
    '.ico': 'image/x-icon',
    '.jpeg': 'image/jpeg',
    '.jpg': 'image/jpeg',
    '.js': 'text/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.webmanifest': 'application/manifest+json; charset=utf-8',
    '.png': 'image/png',
    '.svg': 'image/svg+xml',
    '.webp': 'image/webp',
    '.woff': 'font/woff',
    '.woff2': 'font/woff2',
};

function sendText(response, status, body) {
    response.writeHead(status, {
        'Content-Type': 'text/plain; charset=utf-8',
        'Content-Length': Buffer.byteLength(body),
    });
    response.end(body);
}

async function existingFile(path) {
    try {
        const fileStat = await stat(path);
        return fileStat.isFile() ? fileStat : null;
    } catch (error) {
        if (error.code === 'ENOENT' || error.code === 'ENOTDIR') {
            return null;
        }
        throw error;
    }
}

const server = createServer(async (request, response) => {
    if (request.method !== 'GET' && request.method !== 'HEAD') {
        response.setHeader('Allow', 'GET, HEAD');
        sendText(response, 405, 'Method Not Allowed\n');
        return;
    }

    let pathname;
    try {
        pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
    } catch {
        sendText(response, 400, 'Bad Request\n');
        return;
    }

    if (pathname === '/up') {
        sendText(response, 200, request.method === 'HEAD' ? '' : 'OK\n');
        return;
    }

    const requestedPath = resolve(root, pathname.replace(/^\/+/, ''));
    if (requestedPath !== root && !requestedPath.startsWith(`${root}${sep}`)) {
        sendText(response, 403, 'Forbidden\n');
        return;
    }

    try {
        const requestedStat = await existingFile(requestedPath);
        const useSpaFallback = !requestedStat && extname(pathname) === '';
        const filePath = requestedStat ? requestedPath : resolve(root, 'index.html');
        const fileStat = requestedStat ?? (useSpaFallback ? await existingFile(filePath) : null);

        if (!fileStat) {
            sendText(response, 404, 'Not Found\n');
            return;
        }

        const extension = extname(filePath).toLowerCase();
        response.writeHead(200, {
            'Content-Type': contentTypes[extension] ?? 'application/octet-stream',
            'Content-Length': fileStat.size,
            'Cache-Control': pathname.startsWith('/assets/') ? 'public, max-age=31536000, immutable' : 'no-cache',
        });

        if (request.method === 'HEAD') {
            response.end();
            return;
        }

        createReadStream(filePath).pipe(response);
    } catch (error) {
        console.error(error);
        sendText(response, 500, 'Internal Server Error\n');
    }
});

server.listen(port, () => {
    const address = server.address();
    console.log(`AS Travel app listening on ${address.address}:${address.port}`);
});

function shutDown() {
    server.close(() => process.exit(0));
}

process.on('SIGINT', shutDown);
process.on('SIGTERM', shutDown);
