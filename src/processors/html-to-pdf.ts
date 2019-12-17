import puppeteer from 'puppeteer'
import tmp from 'tmp-promise'
import { Processor } from '../Processor'
import path from 'path'
import fs from 'fs-extra'

export function createHtmlToPdfProcessor(): Processor {
    return async ({ context, content, args }) => {
        return tmp.withDir(
            async tmpDirResult => {
                const tmpDir = tmpDirResult.path
                const indexFile = path.join(tmpDir, 'index.html')
                await fs.writeFile(indexFile, content)
                if (args.assets) {
                    if (!Array.isArray(args.assets)) {
                        throw Error('Assets must be an array')
                    }
                    args.assets.map(async asset => {
                        const fromPathAbsolute = context.resolve(asset.from)
                        const toPathAbsolute = path.join(tmpDir, asset.to)
                        await fs.copy(fromPathAbsolute, toPathAbsolute)
                    })
                }
                const browser = await puppeteer.launch({ headless: true })
                const page = await browser.newPage()
                await page.goto(indexFile, { waitUntil: 'networkidle0' })
                const margin = 40
                const pdf = await page.pdf({
                    scale: 1.0,
                    format: 'A4',
                    margin: {
                        top: margin,
                        right: margin,
                        bottom: margin,
                        left: margin
                    }
                })
                await browser.close()
                return pdf
            },
            {
                unsafeCleanup: true
            }
        )
    }
}