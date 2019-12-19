import path from 'path'
import process from 'process'
import fs from 'fs-extra'
import klaw from 'klaw'
import { ContextData, Context, Processor } from './Context'
import { Descriptor, DynamicRoute, DynamicRouteMapping, getDynamicRoutesAsArray, withDescriptorDefaults } from './Descriptor'

type BuildInstructions = (args: { destinationDir: string }) => Promise<void>

export async function build(args: {
    instructions: BuildInstructions,
    debug: boolean,
    destinationDir: string
}) {
    try {
        const destDirAbsolute = path.resolve(process.cwd(), args.destinationDir)
        console.log('Building static site...')
        await cleanDir(destDirAbsolute)
        await fs.ensureDir(destDirAbsolute)
        await args.instructions({
            destinationDir: destDirAbsolute
        })
    } catch (e) {
        if (args.debug) {
            throw e
        }
        console.error(`[ERROR] ${e}`)
    }
}


// Pages can either be an object "file => render function" or an array of
// objects {file, render}
export function buildDynamicRoutes(pages: DynamicRouteMapping | DynamicRoute[], destDir: string) {
    const destDirAbsolute = path.resolve(process.cwd(), destDir)
    // TODO Use async generator instead
    const pageArray = getDynamicRoutesAsArray(pages)
    const promises = pageArray.map(async mapping => {
        const destFileAbsolute = path.resolve(destDirAbsolute, mapping.path)
        console.log(`Building dynamic route ${fmt(destFileAbsolute)}...`)
        savePageInternal(destFileAbsolute, await mapping.render())
    })
    return Promise.all(promises)
}

async function savePageInternal(destFileAbsolute: string, content: any) {
    if (content === undefined) {
        return
    }
    return fs.outputFile(destFileAbsolute, content, { flag: 'w' })
}


async function cleanDir(dir: string) {
    await fs.remove(dir)
}

export async function copyDir(srcDir: string, destDir: string) {
    const srcDirAbsolute = path.resolve(process.cwd(), srcDir)
    const destDirAbsolute = path.resolve(process.cwd(), destDir)
    console.log(`Copying ${fmt(srcDirAbsolute)} to ${fmt(destDirAbsolute)}...`)
    await fs.ensureDir(destDirAbsolute)
    await fs.copy(srcDirAbsolute, destDirAbsolute, { errorOnExist: false, overwrite: true })
}

function fmt(file: string) {
    const relFile = path.relative(process.cwd(), file)
    return `[${relFile}]`
}

export async function buildPages(args: {
    sourceDir: string,
    pagesSubDir: string,
    destinationDir: string,
    processors: Processor[],
    contextData: ContextData
}) {
    const srcDirAbsolute = path.resolve(process.cwd(), args.sourceDir)
    const destDirAbsolute = path.resolve(process.cwd(), args.destinationDir)
    const pagesDirAbsolute = path.join(srcDirAbsolute, args.pagesSubDir)
    const context = Context.create({
        processors: args.processors,
        initialDir: srcDirAbsolute,
        data: args.contextData,
    })
    for await (const pageFileEntry of klaw(pagesDirAbsolute)) {
        if (pageFileEntry.stats.isDirectory()) {
            continue
        }
        await buildPage({
            pageFileAbsolute: pageFileEntry.path,
            srcDirAbsolute,
            pagesDirAbsolute,
            destDirAbsolute,
            context
        })
    }
}

async function buildPage(args: {
    pageFileAbsolute: string,
    srcDirAbsolute: string,
    pagesDirAbsolute: string,
    destDirAbsolute: string,
    context: Context
}) {
    const pageFileRelativeToPagesDir = path.relative(args.pagesDirAbsolute, args.pageFileAbsolute)
    const pageFileName = path.basename(pageFileRelativeToPagesDir)
    const destFileName = stripLastExtensionIfThereAreMultiple(pageFileName)
    const destFileAbsolute = path.join(args.destDirAbsolute, path.dirname(pageFileRelativeToPagesDir), destFileName)
    console.log(`Building page ${fmt(args.pageFileAbsolute)} to ${fmt(destFileAbsolute)}...`)
    const pageFileRelativeToSrcDir = path.relative(args.srcDirAbsolute, args.pageFileAbsolute)
    const result = await args.context.process(pageFileRelativeToSrcDir)
    await savePageInternal(destFileAbsolute, result)
}

// user-guide           => user-guide
// user-guide.pdf       => user-guide.pdf
// user-guide.pdf.html  => user-guide.pdf
function stripLastExtensionIfThereAreMultiple(fileName: string) {
    const components = fileName.split('.')
    if (components.length <= 2) {
        return fileName
    }
    return components.slice(0, components.length - 1).join('.')
}
export function createBuildInstructions(descriptors: Descriptor[]): BuildInstructions {
    return async (args: { destinationDir: string }) => {
        const promises = descriptors.map(async descriptor => {
            const desc = withDescriptorDefaults(descriptor)
            const realDestDir = desc.mountPoint
                ? path.join(args.destinationDir, desc.mountPoint)
                : args.destinationDir
            if (desc.sourceDir && desc.staticsSubDir) {
                await copyDir(path.join(desc.sourceDir, desc.staticsSubDir), realDestDir)
            }
            if (desc.sourceDir && desc.pagesSubDir) {
                await buildPages({
                    sourceDir: desc.sourceDir,
                    destinationDir: realDestDir,
                    pagesSubDir: desc.pagesSubDir,
                    processors: desc.processors,
                    contextData: desc.contextData
                })
            }
            await buildDynamicRoutes(desc.dynamicRoutes, realDestDir)
        })
        await Promise.all(promises)
    }
}
