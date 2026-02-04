import { PrismaPg } from "@prisma/adapter-pg"
import { PrismaClient } from "../generated/prisma/client"

export const prisma = (connectionString: string) =>
    new PrismaClient({ adapter: new PrismaPg({ connectionString }) })

export const getAbstractArtsRecordById = async (
    prisma: PrismaClient,
    id: number
) => {
    return await prisma.abstracts.findFirst({ where: { id } })
}

export const getAbstractArtsRecordByMusicId = async (
    prisma: PrismaClient,
    musicId: number
) => {
    return await prisma.abstracts.findFirst({ where: { music_id: musicId } })
}

export const getAbstractArtsRecordByUserId = async (
    prisma: PrismaClient,
    userId: string
) => {
    return await prisma.abstracts.findFirst({ where: { user_id: userId } })
}
