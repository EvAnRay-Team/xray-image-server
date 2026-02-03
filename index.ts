import { run } from "./core"
import { defineConfig } from "./core/config"

const config = defineConfig({
    host: "127.0.0.1",
    port: 3000
})

await run(config)
