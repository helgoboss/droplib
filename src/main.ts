import { Descriptor } from "./Descriptor"
import { build, createBuildInstructions } from "./build"
import { serve, createRequestMiddleware } from "./serve"

export async function main(args: {
    debug: boolean,
    destDir: string,
    port: number,
    getDescriptor: () => Promise<Descriptor>
}) {
    const descriptor = await args.getDescriptor()
    const command = process.argv[2]
    switch (command) {
        case 'build': {
            build({
                debug: args.debug,
                destDir: args.destDir,
                instructions: createBuildInstructions(descriptor)
            })
            return
        }
        case 'serve': {
            serve({
                port: args.port,
                middleware: createRequestMiddleware(descriptor)
            })
            return
        }
        default: throw Error(`Unknown command '${command}'`)
    }

}