import { runElysia } from "../apis"
import type { Config } from "./config"

export async function run(config: Config) {
    runElysia()
}
