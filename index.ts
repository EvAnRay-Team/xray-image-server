#!/usr/bin/env bun
import { run } from "./core"
import config from "./server.config"

await run(config)
