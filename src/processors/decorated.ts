import { Processor } from ".."

export function decorated(options?: { id: string }): Processor {
    return {
        id: options?.id || 'decorated',
        process: async ({ context, content, args }) => {
            const decorator = await context.process(args.decorator)
            return await decorator({
                ...(args.args ?? {}),
                body: content
            })
        }
    }
}