import z from "zod"
import { createRenderTemplate } from "../core/render-template"
import { AssetsManager } from "../core/asset"
import { absoluteStyle } from "../core/utils"



export const maiMusicTemplate = createRenderTemplate("maiMusic")
    .addFont({ id: "smileysans", filename: "smileysans.ttf" })
    .addFont({ id: "叛逆明朝", filename: "叛逆明朝.ttf" })
    
    .setOption({
        width: 1700,
        height: 2000
    })
    .setInput(z.object({
        // music_list 接受任何类型的数组，忽略元素类型验证
        basic_info: z.object(),
        charts: z.object(),
        records: z.array(z.object()),
    }))
    .setElement(async (input) => {
        // 使用顶层 await 预加载图片（Bun 支持顶层 await）
        const musicCoverImg = await AssetsManager.getLocalImage(`maimaidx/normal_cover/${input.basic_info.id}.png`)
        const musicInfoBackgroundImg = await AssetsManager.getLocalImage("maimaidx/music_info/bg_circle.png")

        return (
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
                    ...absoluteStyle(727, 175),
                    fontFamily: "叛逆明朝",
                    color: "#fff",
                    fontSize: 64
                }}>{input.basic_info.title}</span>

                <span style={{
                    ...absoluteStyle(820, 621),
                    fontFamily: "叛逆明朝",
                    color: "#fff",
                    fontSize: 50,
                    transform: "translate(-50% ,-50%)"
                }}>{input.basic_info.id}</span>

                <img src={musicCoverImg} style={absoluteStyle(50, 50, 200, 300)} alt="cover" />
            </div>
        )
    }
    )