import { Descriptor } from "./Descriptor"
import { build, createBuildInstructions } from "./build"
import { createConnectApp } from "./serve"

export async function drop(args: {
    debug: boolean,
    destinationDir: string,
    port: number,
    getDescriptors: () => Promise<Descriptor[]>
}) {
    const descriptors = await args.getDescriptors()
    const command = process.argv[2]
    switch (command) {
        case 'build': {
            return build({
                debug: args.debug,
                destinationDir: args.destinationDir,
                instructions: createBuildInstructions(descriptors)
            })
        }
        case 'serve': {
            return createConnectApp(descriptors).listen(args.port)
        }
        default: throw Error(`Unknown command '${command}'`)
    }

}