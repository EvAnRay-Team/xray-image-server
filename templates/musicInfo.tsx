import z from "zod"
import { createRenderTemplate } from "../core/render-template"
import { AssetsManager } from "../core/asset"
import { absoluteStyle } from "../core/utils"

// 使用顶层 await 预加载图片（Bun 支持顶层 await）
const musicCoverImg = await AssetsManager.getLocalImage("maimaidx/normal_cover/799.png")
const musicInfoBackgroundImg = await AssetsManager.getLocalImage("maimaidx/music_info/bg_circle.png")

export const musicInfoTemplate = createRenderTemplate("musicInfo")
    .addFont({ id: "smileysans", filename: "smileysans.ttf" })
    .setOption({
        width: 1700,
        height: 2000
    })
    .setInput(z.object({
        musicId: z.number(),
        title: z.string(),
    }))
    .setElement((input) => (
        <div
            style={{
                height: "100%",
                width: "100%",
                display: "flex",
            }}
        >
            <img src={musicCoverImg} style={absoluteStyle(494, 494, 192, 172)} alt="cover" />
            <img src={musicInfoBackgroundImg} style={absoluteStyle(0, 0)} alt="background" />
            <span style={{
                ...absoluteStyle(727, 300),
                fontFamily: "smileysans",
                color: "#fff",
                fontSize: 64
            }}>{input.title}</span>
        </div>
    ))