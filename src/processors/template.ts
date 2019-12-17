import ejs from 'ejs'
import { Processor } from '..'
import fs from 'fs-extra'

type Symbols = { [key: string]: any }

export function createTemplateProcessor(symbols: Symbols): Processor {
    return async ({ context, srcFile, frontMatter, content }) => {
        const template = ejs.compile(
            replaceFrontMatterWithEmptyLines(frontMatter, content),
            { filename: srcFile, async: true }
        )
        return await template({
            ...symbols,
            context
        })
    }
}

export function createTemplateFunctionProcessor(symbols: Symbols): Processor {
    return async ({ context, srcFile, frontMatter, content }) => {
        const template = ejs.compile(
            replaceFrontMatterWithEmptyLines(frontMatter, content),
            { filename: srcFile, async: true }
        )
        return async (args: { [key: string]: any }) => {
            return await template({
                ...symbols,
                args,
                context
            })
        }
    }
}


function replaceFrontMatterWithEmptyLines(frontMatter: string, content: string) {
    const frontMatterLineCount = frontMatter.split(/\r\n|\r|\n/).length
    return '\n'.repeat(frontMatterLineCount) + content
}


export async function readTemplate(file: string) {
    const templateContent = await fs.readFile(file, 'utf-8')
    return ejs.compile(templateContent, { filename: file, async: true })
}
