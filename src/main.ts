import { Descriptor } from "./Descriptor"
import { build, createBuildInstructions } from "./build"
import { createConnectApp } from "./serve"

export async function main(args: {
    debug: boolean,
    destDir: string,
    port: number,
    getDescriptors: () => Promise<Descriptor[]>
}) {
    const descriptors = await args.getDescriptors()
    const command = process.argv[2]
    switch (command) {
        case 'build': {
            return build({
                debug: args.debug,
                destDir: args.destDir,
                instructions: createBuildInstructions(descriptors)
            })
        }
        case 'serve': {
            return createConnectApp(descriptors).listen(args.port)
        }
        default: throw Error(`Unknown command '${command}'`)
    }

}