import { Resvg, type ResvgRenderOptions } from "@resvg/resvg-js"
import type { ReactNode } from "react"
import satori, { type SatoriOptions } from "satori"
import z from "zod"
import { AssetsManager } from "./asset"

export type RenderOptions = {
    width: number
    height: number
    bg: string
}

const defaultOption: RenderOptions = {
    width: 600,
    height: 400,
    bg: "rgba(255, 255, 255, 0)"
}

export type FontInfo = {
    id: string
    filename: string
    weight?: 600 | 400 | 100 | 200 | 300 | 500 | 700 | 800 | 900
    style?: "normal" | "italic"
    lang?: string
}

export class RenderTemplate<Input extends object = {}> {
    inputSchema?: z.ZodObject<any>
    elementFn?: (input: Input) => ReactNode
    option: RenderOptions = defaultOption
    fonts: FontInfo[] = []

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

    setOption(opts: Partial<RenderOptions>) {
        this.option = { ...this.option, ...opts }
        return this
    }

    addFont(...files: { id: string; filename: string }[]) {
        this.fonts = [...this.fonts, ...files]
        return this
    }

    async render(input: Input, unsafe = false): Promise<Buffer> {
        // 检测是否传入了输入函数
        if (!this.elementFn) throw new Error("Element function not set")
        // 检测是否传入了字体设置
        if (!this.fonts.length) throw new Error("No font set")

        // 检测是否提供了输入数据的模式，如果提供了则检测输入数据是否符合模式
        if (!unsafe && this.inputSchema) {
            if (!input) throw new Error("Input not provided")
            input = this.inputSchema.parse(input) as Input
        }

        // 通过option动态生成satori和resvg使用的配置项
        const fontOptions = []

        for (const font of this.fonts) {
            fontOptions.push({
                name: font.id,
                data: await AssetsManager.getLocalFont(font.filename),
                weight: font.weight ?? 400,
                style: font.style ?? "normal",
                lang: font.lang
            })
        }

        const satoriOption: SatoriOptions = {
            width: this.option.width,
            height: this.option.height,
            fonts: fontOptions
        }

        const resvgOption: ResvgRenderOptions = {
            background: this.option.bg
        }

        // 生成 React Like 元素
        const ele = this.elementFn(input ?? ({} as any))
        // 渲染 svg
        const svg = await satori(ele, satoriOption)
        // 渲染图像
        const resvg = new Resvg(svg)
        return resvg.render().asPng()
    }
}

export function createRenderTemplate(name: string) {
    return new RenderTemplate(name)
}
