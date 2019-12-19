import { Processor } from ".."

export function createDecoratedProcessor(): Processor {
    return async ({ context, content, args }) => {
        const decorator = await context.process(args.decorator)
        return await decorator({
            ...(args.args ?? {}),
            body: content
        })
    }
}