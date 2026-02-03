import { runElysia } from "../api"
import { defaultTemplate } from "../template/default"
import { defineConfig, type Config } from "./config"

export async function run(config: Config) {
    // runElysia()

    const startAt = Date.now()
    const buffer = await defaultTemplate.render({ foo: "bar" })
    await Bun.write("output.png", buffer)
    console.log(`Rendered in ${Date.now() - startAt}ms`)
}

export { defineConfig } from "./config"
