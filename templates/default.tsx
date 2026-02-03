import z from "zod"
import { createRenderTemplate } from "../core/render-template"

export const defaultTemplate = createRenderTemplate("default")
    .addFont({ id: "font1", filename: "smileysans.ttf" })
    .setOption({
        width: 1920,
        height: 1080
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
            <svg
                width="75"
                viewBox="0 0 75 65"
                fill="#000"
                style={{ margin: "0 75px" }}
            >
                <path d="M37.59.25l36.95 64H.64l36.95-64z"></path>
            </svg>
        </div>
    ))
