import yaml from 'js-yaml'
import fs from 'fs-extra'
import { Processor } from '..'

export async function readYaml(file: string) {
    const dataYaml = await fs.readFile(file, 'utf-8')
    return yaml.safeLoad(dataYaml)
}

export function createYamlProcessor(): Processor {
    return ({ content }) => {
        return yaml.safeLoad(content)
    }
}
