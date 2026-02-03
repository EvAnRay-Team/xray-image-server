export type Config = { host?: string; port?: number }

export const defaultConfig: Config = { host: "127.0.0.1", port: 3000 }

export function defineConfig(conf: Config): Config {
    return { ...defaultConfig, ...conf }
}
