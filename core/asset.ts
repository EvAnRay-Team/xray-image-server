export async function getImage(filename: string) {
    return await Bun.file(`./assets/images/${filename}`).arrayBuffer()
}

export async function getFont(filename: string) {
    return await Bun.file(`./assets/fonts/${filename}`).arrayBuffer()
}
