// @ts-ignore
import remark from 'remark'
// @ts-ignore
import remarkHtml from 'remark-html'
import { Processor } from '../Processor'

const customRemark = remark().use(remarkHtml)

export function createMarkdownProcessor(): Processor {
    return async ({ content }) => {
        const file = await customRemark.process(content)
        return String(file)
    }
}