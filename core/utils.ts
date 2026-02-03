interface PackageJson {
    name: string
    version?: string
    [key: string]: any
}

export async function getVersion() {
    // 从 package.json 中获取版本号
    try {
        const packageJson = await import("../package.json", {
            assert: { type: "json" }
        })
        const pkg = packageJson.default as PackageJson
        // 如果没有 version 字段，返回默认值
        return pkg.version || "0.1.0"
    } catch (error) {
        // 如果读取失败，返回默认版本
        return "0.1.0"
    }
}
