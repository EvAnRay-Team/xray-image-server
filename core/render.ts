import { Resvg, type ResvgRenderOptions } from "@resvg/resvg-js"
import type { ReactNode } from "react"
import satori, { type SatoriOptions } from "satori"
import z from "zod"

export const defaultSatoriOption: SatoriOptions = {
    width: 600,
    height: 400,
    fonts: [
        {
            name: "SmileySans",
            data: await Bun.file(
                "./static/fonts/SmileySans-Oblique.ttf"
            ).arrayBuffer()
        }
    ]
}

export const defaultResvgOption: ResvgRenderOptions = {}

export class RenderTemplate<Input extends object = {}> {
    inputSchema?: z.ZodObject<any>
    elementFn?: (input: Input) => ReactNode
    satoriOption: SatoriOptions = defaultSatoriOption
    resvgOption: ResvgRenderOptions = defaultResvgOption

    constructor(public readonly name: string) {}

    setInput<T extends z.ZodRawShape>(
        schema: z.ZodObject<T>
    ): RenderTemplate<z.infer<z.ZodObject<T>>> {
        this.inputSchema = schema as any
        return this as any
    }

    setElement(element: (input: Input) => ReactNode) {
        this.elementFn = element
        return this
    }

    setSatoriOption(opts: SatoriOptions) {
        this.satoriOption = opts
        return this
    }

    setResvgOption(opts: ResvgRenderOptions) {
        this.resvgOption = opts
        return this
    }

    async render(input: Input): Promise<Buffer> {
        // 检测是否传入了输入函数
        if (!this.elementFn) throw new Error("Element function not set")

        // 检测是否提供了输入数据模式，如果提供了则检测输入数据是否符合模式
        if (this.inputSchema) {
            if (!input) throw new Error("Input not provided")
            input = this.inputSchema.parse(input) as Input
        }

        // 生成 React Like 元素
        const ele = this.elementFn(input ?? ({} as any))
        console.log(ele)
        // 渲染 svg
        const svg = await satori(ele, this.satoriOption)
        console.log(svg)
        // 渲染图像
        const resvg = new Resvg(svg, this.resvgOption)
        return resvg.render().asPng()
    }
}

export function createRenderTemplate(name: string) {
    return new RenderTemplate(name)
}
