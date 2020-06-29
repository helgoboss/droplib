import process from 'process'
import path from 'path'
import fs from 'fs-extra'
import { IncomingMessage } from 'http'
import serveStatic from 'serve-static'
import finalhandler from 'finalhandler'
import url from 'url'
import mime from 'mime'
import { Descriptor, getDynamicRoutesAsArray, withDescriptorDefaults } from './Descriptor'
import { Context } from './Context'
import { findFileWithArbitraryExtension } from './util'
import connect, { Server, NextHandleFunction, ErrorHandleFunction } from 'connect'

const defaultFileExtensions = ['html', 'htm']
const indexFiles = defaultFileExtensions.map(ext => `index.${ext}`)


export function createPagesMiddleware(
    descriptor: Required<Pick<Descriptor, 'sourceDir' | 'processors' | 'contextData' | 'pagesSubDir'>>
): NextHandleFunction {
    const srcDirAbsolute = path.resolve(process.cwd(), descriptor.sourceDir)
    const context = Context.create({
        processors: descriptor.processors,
        initialDir: srcDirAbsolute,
        data: descriptor.contextData,
    })
    return async (request, response, next) => {
        if (!isReadOnly(request)) {
            next()
            return
        }
        const requestedFile = resolveRequestedFileFromUrl(request.url!)
        const pageFileRelativeToSrcDir = path.join(descriptor.pagesSubDir, requestedFile)
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

function isReadOnly(request: IncomingMessage) {
    return ['HEAD', 'GET'].includes(request.method!)
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



export function createDynamicRoutesMiddleware(
    descriptor: Required<Pick<Descriptor, 'dynamicRoutes'>>
): NextHandleFunction {
    return async (request, response, next) => {
        if (!isReadOnly(request)) {
            next()
            return
        }
        const requestedFile = resolveRequestedFileFromUrl(request.url!)
        const pageArray = getDynamicRoutesAsArray(descriptor.dynamicRoutes)
        const route = pageArray.find(route => route.path === requestedFile)
        if (!route) {
            next()
            return
        }
        try {
            const result = await route.render()
            
            response.writeHead(200, {
                'Content-Type': getContentType(requestedFile)
            })
            response.end(result)
        } catch(e) {
            response.writeHead(500, {
                'Content-Type': 'text/plain'
            })
            response.end(`Render error:\n\n${e}`)
            throw e
        }
    }
}

export function createStaticsMiddleware(
    descriptor: Required<Pick<Descriptor, 'sourceDir' | 'staticsSubDir'>>
): NextHandleFunction {
    return serveStatic(
        path.join(descriptor.sourceDir, descriptor.staticsSubDir),
        { extensions: defaultFileExtensions, index: indexFiles }
    ) as NextHandleFunction
}

export function createFinalMiddleware(): ErrorHandleFunction {
    return (error, request, response, _) => {
        return finalhandler(request, response)(error)
    }
}

export function createConnectApp(descriptors: Descriptor[]): Server {
    const app = connect()
    descriptors.forEach(descriptor => {
        const { mountPoint, pagesSubDir, dynamicRoutes, processors, contextData, staticsSubDir, sourceDir } = withDescriptorDefaults(descriptor)
        const route = mountPoint ? `/${mountPoint}` : '/'
        if (dynamicRoutes) {
            app.use(route, createDynamicRoutesMiddleware({ dynamicRoutes }))
        }
        if (sourceDir && staticsSubDir) {
            app.use(route, createStaticsMiddleware({ sourceDir, staticsSubDir, }))
        }
        if (sourceDir && pagesSubDir) {
            app.use(route, createPagesMiddleware({ sourceDir, contextData, processors, pagesSubDir }))
        }
        app.use(route, createFinalMiddleware())
    })
    return app
}