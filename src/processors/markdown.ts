// @ts-ignore
import remark from 'remark'
// @ts-ignore
import remarkHtml from 'remark-html'
import { Processor } from '..'

const customRemark = remark().use(remarkHtml)

export function markdown(options?: { id: string }): Processor {
    return {
        id: options?.id || 'markdown',
        process: async ({ content }) => {
            const file = await customRemark.process(content)
            return String(file)
        }
    }
}