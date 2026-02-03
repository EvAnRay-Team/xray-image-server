import type Elysia from "elysia"

export function handleIndexEndpoint(app: Elysia) {
    app.get("/", () => "Hello World!")
}
