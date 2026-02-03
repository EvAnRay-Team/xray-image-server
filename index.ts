import { defineConfig, run } from "./core"

await run(
    defineConfig({
        host: "127.0.0.1",
        port: 3000
    })
)
