import z from "zod"

export class RenderTemplate<Input extends object = {}> {
    inputSchema?: z.ZodObject<any> = z.object({})
    elementFn?: (input: Input) => Element

    constructor(public readonly templateName: string) {}

    setInput<T extends z.ZodRawShape>(
        schema: z.ZodObject<T>
    ): RenderTemplate<z.infer<z.ZodObject<T>>> {
        this.inputSchema = schema as any
        return this as any
    }

    setElement(element: (input: Input) => Element) {
        this.elementFn = element
        return this
    }

    render(input?: Input) {
        throw new Error("Not implemented")
    }
}

export function createRenderTemplate(name: string) {
    return new RenderTemplate(name)
}
