import { Context } from "./Context";

interface ProcessorInput {
    context: Context
    srcFile: string,
    frontMatter: string,
    frontMatterData: { [key: string]: any }
    args: { [key: string]: any }
    content: any
}

export type Processor = (input: ProcessorInput) => Promise<any>