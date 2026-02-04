export async function getLocalImage(filename: string) {
    return await Bun.file(`./assets/images/${filename}`).arrayBuffer()
}

export async function getLocalFont(filename: string) {
    return await Bun.file(`./assets/fonts/${filename}`).arrayBuffer()
}
