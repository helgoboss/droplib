import process from 'process'
import path from 'path'
import fs from 'fs-extra'
import http, { IncomingMessage, ServerResponse } from 'http'
import serveStatic from 'serve-static'
import finalhandler from 'finalhandler'
import url from 'url'
import mime from 'mime'
import { Descriptor, getPagesAsArray } from './Descriptor'
import { Context } from './Context'
import { findFileWithArbitraryExtension } from './util'

const defaultFileExtensions = ['html', 'htm']
const indexFiles = defaultFileExtensions.map(ext => `index.${ext}`)

type Middleware = (request: IncomingMessage, response: ServerResponse, next: (err?: any) => void) => void


function createPagesMiddleware(descriptor: Descriptor): Middleware {
    const srcDirAbsolute = path.resolve(process.cwd(), descriptor.srcDir)
    const context = Context.create({
        processors: descriptor.processors,
        initialDir: srcDirAbsolute,
        data: descriptor.data,
    })
    return async (request, response, next) => {
        const requestedFile = resolveRequestedFileFromUrl(request.url!)
        const pageFileRelativeToSrcDir = path.join(descriptor.pagesDir, requestedFile)
        const realPageFileRelativeToSrcDir = await findRealPageFile({ srcDirAbsolute, pageFileRelativeToSrcDir })
        if (!realPageFileRelativeToSrcDir) {
            next()
            return
        }
        const result = await context.process(realPageFileRelativeToSrcDir)
        response.writeHead(200, {
            'Content-Type': getContentType(requestedFile)
        })
        response.end(result)
    }
}

function getContentType(file: string) {
    const assumedMimeType = mime.getType(file)
    return assumedMimeType || 'application/octet-stream'
}

// This does filesystem lookups. Returns undefined if it doesn't find any match at all.
async function findRealPageFile(args: {
    srcDirAbsolute: string,
    pageFileRelativeToSrcDir: string
}) {
    const pageFileAbsolute = path.join(args.srcDirAbsolute, args.pageFileRelativeToSrcDir)
    if (await fs.pathExists(pageFileAbsolute)) {
        return args.pageFileRelativeToSrcDir
    }
    const realPageFileAbsolute = await findFileWithArbitraryExtension(pageFileAbsolute)
    if (!realPageFileAbsolute) {
        return undefined
    }
    return path.relative(args.srcDirAbsolute, realPageFileAbsolute)
}


// This doesn't do any file system lookups
function resolveRequestedFileFromUrl(requestUrl: string) {
    const urlPath = url.parse(requestUrl).pathname!
    const expandedPath = expandUrlPath(urlPath)
    return expandedPath.substr(1)
}


// Resolve-to-real-path rules:
// - projects/                  =>  projects/index.html
// - projects/bla               =>  projects/bla.html
function expandUrlPath(urlPath: string) {
    if (urlPath.endsWith('/')) {
        return `${urlPath}index.html`
    }
    const urlComponents = urlPath.split('/')
    const fileName = urlComponents[urlComponents.length - 1]
    if (path.extname(fileName) === '') {
        return `${urlPath}.html`
    }
    return urlPath
}



function createDynamicsMiddleware(descriptor: Descriptor): Middleware {
    return async (request, response, next) => {
        const requestedFile = resolveRequestedFileFromUrl(request.url!)
        const pageArray = getPagesAsArray(descriptor.dynamics)
        const route = pageArray.find(route => route.file === requestedFile)
        if (!route) {
            next()
            return
        }
        const result = await route.render()
        response.writeHead(200, {
            'Content-Type': getContentType(requestedFile)
        })
        response.end(result)
    }
}

export function createRequestMiddleware(descriptor: Descriptor): Middleware {
    const staticsMiddleware = serveStatic(
        path.join(descriptor.srcDir, descriptor.staticsDir),
        { extensions: defaultFileExtensions, index: indexFiles }
    ) as Middleware
    const dynamicsMiddleware = createDynamicsMiddleware(descriptor)
    const pagesMiddleware = createPagesMiddleware(descriptor)
    return (request, response, next) => {
        if (!['HEAD', 'GET'].includes(request.method!)) {
            next()
        }
        staticsMiddleware(request, response, () => {
            dynamicsMiddleware(request, response, () => {
                pagesMiddleware(request, response, next)
            })
        })
    }
}

export function serve(args: { port: number, middleware: Middleware }) {
    const server = http.createServer((request, response) => {
        const done = finalhandler(request, response)
        args.middleware(request, response, done)
    })
    server.listen(args.port)
}