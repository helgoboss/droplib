import AsciidoctorProcessor  from 'asciidoctor'
import { Processor } from '..'

const asciidoctorProcessor = AsciidoctorProcessor()

export function asciidoc(options?: { id: string }): Processor {
    return {
        id: options?.id || 'asciidoc',
        process: async ({ content }) => {
            return asciidoctorProcessor.convert(content)
        }
    }
}