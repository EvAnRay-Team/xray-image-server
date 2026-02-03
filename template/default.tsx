import z from "zod"
import { createRenderTemplate } from "../core/render"

const defaultInput = z.object({ foo: z.string() })

export const defaultTemplate = createRenderTemplate("default")
    .setInput(defaultInput)
    .setElement((input) => (
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
            <div style={{ marginTop: 40, display: "flex" }}>
                Hello, {input.foo}
            </div>
        </div>
    ))
