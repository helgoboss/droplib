import { ProcessorMapping, ContextData } from "./Context";

export type RenderFunction = () => Promise<any>

export interface Page {
    file: string
    render: RenderFunction
}

export type PageMapping = { [file: string]: RenderFunction }

export interface Descriptor {
    srcDir: string
    staticsDir: string
    pagesDir: string
    processors: ProcessorMapping
    data: ContextData
    dynamics: PageMapping | Page[]
}

export function getPagesAsArray(pages: PageMapping | Page[]) {
    return Array.isArray(pages) ? pages : convertPageMappingToArray(pages)
}

function convertPageMappingToArray(pageMapping: PageMapping): Page[] {
    return Object.keys(pageMapping).map(file => ({
        file,
        render: pageMapping[file]
    }))
}
