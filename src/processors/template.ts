import ejs from 'ejs'
import { Processor } from '..'
import fs from 'fs-extra'

type Symbols = { [key: string]: any }
type SymbolsValue = Symbols | Promise<Symbols>
type SymbolsProvider = SymbolsValue | (() => SymbolsValue)

export function template(symbols: SymbolsProvider, options?: { id: string }): Processor {
    return {
        id: options?.id || 'template',
        process: async ({ context, srcFile, frontMatter, content }) => {
            const template = ejs.compile(
                replaceFrontMatterWithEmptyLines(frontMatter, content),
                { filename: srcFile, async: true }
            )
            return await template({
                ...await resolveSymbols(symbols),
                context
            })
        }
    }
}

function resolveSymbols(provider: SymbolsProvider): SymbolsValue {
    return typeof provider === 'function' ? provider() : provider
}

export function templateFunction(symbols: SymbolsProvider, options?: { id: string }): Processor {
    return {
        id: options?.id || 'template-function',
        process: async ({ context, srcFile, frontMatter, content }) => {
            const template = ejs.compile(
                replaceFrontMatterWithEmptyLines(frontMatter, content),
                { filename: srcFile, async: true }
            )
            return async (args: { [key: string]: any }) => {
                return await template({
                    ...await resolveSymbols(symbols),
                    args,
                    context
                })
            }
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
