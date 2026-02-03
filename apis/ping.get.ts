import type Elysia from "elysia"

export async function registerPingGet(app: Elysia) {
    app.get("/v1/ping", () => "pong")
}
