import jsYaml from 'js-yaml'
import { Processor } from '..'

export function yaml(options?: { id: string }): Processor {
    return {
        id: options?.id || 'yaml',
        process: ({ content }) => {
            return jsYaml.safeLoad(content)
        }
    }
}
