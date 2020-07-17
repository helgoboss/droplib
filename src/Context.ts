import path from 'path'
import fs from 'fs-extra'
import matter from 'gray-matter'
import { assert, findFileWithArbitraryExtension } from './util'

interface ProcessorInput {
    context: Context
    srcFile: string,
    frontMatter: string,
    frontMatterData: { [key: string]: any }
    args: { [key: string]: any }
    content: any
}

export interface Processor {
    id: string
    process: ProcessorFunction
}
export type ProcessorFunction = (input: ProcessorInput) => Promise<any>
export type ContextData = { [key: string]: any }

interface ProcessorUsage {
    id: string
    [key: string]: any
}

export class Context {
    public static create(args: {
        initialDir: string,
        processors: Processor[],
        data: ContextData
    }) {
        return new Context(args.processors, args.data, [args.initialDir])
    }

    private constructor(
        private processors: Processor[],
        readonly data: ContextData,
        private dirStack: string[]
    ) {
    }

    withDirOnTop(newDir: string) {
        return new Context(this.processors, this.data, [...this.dirStack, newDir])
    }

    resolve(file: string) {
        const baseDir = file.startsWith('.')
            ? this.dirStack[this.dirStack.length - 1]
            : this.dirStack[0]
        return path.join(baseDir, file)
    }

    findProcessor(id: string) {
        return this.processors.find(p => p.id === id)
    }

    async process(srcFile: string) {
        const resolvedSrcFile = this.resolve(srcFile)
        if (path.extname(srcFile) === '.js') {
            // Special case JavaScript page file
            const module = await import(resolvedSrcFile)
            const processor = module.default
            return processor(this)
        }
        const resolvedSrcFileWithExt = await lookupRealFileForProcessing(resolvedSrcFile)
        assert(resolvedSrcFileWithExt, `Couldn't find file ${resolvedSrcFile}`)
        const fileContent = await fs.readFile(resolvedSrcFileWithExt, 'utf-8')
        // We provide an options object in order to prevent caching (with caching, gray-matter
        // fails to deliver matterResult.matter)
        const matterResult = matter(fileContent, {
            language: 'yaml'
        })
        const processorsNode = matterResult.data.processors
        const processorDefs = getProcessorDefs(resolvedSrcFile, processorsNode)
        const newContext = this.withDirOnTop(path.dirname(resolvedSrcFileWithExt))
        const tasks = processorDefs.map(processorDef => {
            const processor = this.findProcessor(processorDef.id)
            assert(processor, `Couldn't find processor '${processorDef.id}' mentioned in '${resolvedSrcFileWithExt}'`)
            return (input: any) => processor.process({
                context: newContext,
                srcFile: resolvedSrcFileWithExt,
                frontMatter: matterResult.matter,
                frontMatterData: matterResult.data,
                args: processorDef,
                content: input
            })
        })
        return tasks.reduce(
            (previousResultPromise, currentTask) => {
                return previousResultPromise.then(currentTask)
            },
            Promise.resolve(matterResult.content)
        )
    }
}


async function lookupRealFileForProcessing(file: string) {
    if (path.extname(file)) {
        // Has extension
        return (await fs.pathExists(file)) ? file : undefined
    } else {
        return findFileWithArbitraryExtension(file)
    }
}

function getProcessorDefs(file: string, processorsNode: any): ProcessorUsage[] {
    if (processorsNode === undefined) {
        return []
    }
    assert(Array.isArray(processorsNode), `Processors must be given as array in '${file}`)
    return processorsNode.map(item => {
        if (typeof item === 'string') {
            return {
                id: item
            }
        }
        assert(typeof item === 'object', `Each processor must be given either as string or as object in '${file}`)
        assert(item.id && typeof item.id === 'string', `Processor in object form must have an id in '${file}`)
        return item
    })
}
