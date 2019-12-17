import path from 'path'
import process from 'process'
import fs from 'fs-extra'
import klaw from 'klaw'
import { ProcessorMapping, ContextData, Context } from './Context'
import { Descriptor, Page, PageMapping, getPagesAsArray } from './Descriptor'

export async function build(args: {
    instructions: (args: { destDir: string }) => Promise<void>,
    debug: boolean,
    destDir: string
}) {
    try {
        const destDirAbsolute = path.resolve(process.cwd(), args.destDir)
        console.log('Building static site...')
        await cleanDir(destDirAbsolute)
        await args.instructions({
            destDir: destDirAbsolute
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
export function renderAndSavePages(pages: PageMapping | Page[], destDir: string) {
    const destDirAbsolute = path.resolve(process.cwd(), destDir)
    // TODO Use async generator instead
    const pageArray = getPagesAsArray(pages)
    const promises = pageArray.map(async mapping => {
        const destFileAbsolute = path.resolve(destDirAbsolute, mapping.file)
        const destFileRelativeToCwd = path.resolve(process.cwd(), destFileAbsolute)
        console.log(`Rendering and saving page ${destFileRelativeToCwd}...`)
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

export async function copyDir(src: string, dest: string) {
    await fs.copy(src, dest, { errorOnExist: false, overwrite: true })
}

export async function processPages(args: {
    srcDir: string,
    pagesDirWithinSrcDir: string,
    destDir: string,
    processors: ProcessorMapping,
    data: ContextData
}) {
    const srcDirAbsolute = path.resolve(process.cwd(), args.srcDir)
    const destDirAbsolute = path.resolve(process.cwd(), args.destDir)
    const pagesDirAbsolute = path.join(srcDirAbsolute, args.pagesDirWithinSrcDir)
    const context = Context.create({
        processors: args.processors,
        initialDir: srcDirAbsolute,
        data: args.data,
    })
    for await (const pageFileEntry of klaw(pagesDirAbsolute)) {
        if (pageFileEntry.stats.isDirectory()) {
            continue
        }
        await processPage({
            pageFileAbsolute: pageFileEntry.path,
            srcDirAbsolute,
            pagesDirAbsolute,
            destDirAbsolute,
            context
        })
    }
}

async function processPage(args: {
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
    const destFileRelativeToCwd = path.relative(process.cwd(), destFileAbsolute)
    const pageFileRelativeToCwd = path.relative(process.cwd(), args.pageFileAbsolute)
    console.log(`Processing page ${pageFileRelativeToCwd} to ${destFileRelativeToCwd}...`)
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
export function createBuildInstructions(descriptors: Descriptor[]) {
    return async (args: { destDir: string }) => {
        const promises = descriptors.map(async descriptor => {
            const realDestDir = descriptor.prefix ? path.join(args.destDir, descriptor.prefix) : args.destDir
            await copyDir(path.join(descriptor.srcDir, descriptor.staticsDir), realDestDir)
            await processPages({
                srcDir: descriptor.srcDir,
                destDir: realDestDir,
                pagesDirWithinSrcDir: descriptor.pagesDir,
                processors: descriptor.processors,
                data: descriptor.data
            })
            await renderAndSavePages(descriptor.dynamics, realDestDir)
        })
        await Promise.all(promises)
    }
}
