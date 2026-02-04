import { defineConfig } from "./core/config"

export default defineConfig({
    debug: true,
    port: 3000,
    db: {
        url:
            process.env.DATABASE_URL ||
            "postgres://username:password@localhost:5432/database"
    },
    logger: {
        enableFileTransport: true,
        logDir: "./logs",
        filename: "log-%DATE%.jsonl",
        datePattern: "YYYY-MM-DD",
        maxFiles: "7d",
        maxSize: "100m"
    }
})
