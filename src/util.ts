import path from 'path'
import fs from 'fs-extra'

export function assert(value: unknown, message?: string): asserts value {
    console.assert(value, message)
}

// The given file name can have an extension
export async function findFileWithArbitraryExtension(file: string) {
    const dirName = path.dirname(file)
    const entries = await fs.readdir(dirName)
    const fileName = path.basename(file)
    const matchingEntries = entries.filter(e => e.startsWith(`${fileName}.`))
    if (matchingEntries.length === 0) {
        return undefined
    }
    assert(matchingEntries.length === 1, `Multiple matching files for ${file}`)
    return path.join(dirName, matchingEntries[0])
}