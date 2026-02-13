import z from "zod"
import { createRenderTemplate } from "../core/render-template"
import { AssetsManager } from "../core/asset"

// 使用顶层 await 预加载图片（Bun 支持顶层 await）
const helpImageSrc = await AssetsManager.getLocalImage("help.png")

export const helpTemplate = createRenderTemplate("help")
    .addFont({ id: "font1", filename: "smileysans.ttf" })
    .setOption({
        width: 1954,
        height: 2540
    })
    .setElement(() => (
        <div
            style={{
                height: "100%",
                width: "100%",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: "#fff",
                fontSize: 32,
                fontWeight: 600
            }}
        >
            <img 
                src={helpImageSrc} 
                alt="help" 
                width={1954}
                height={2540}
            />
        </div>
    ))
