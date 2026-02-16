import z from "zod"

/**
 * MaiMai Music Record Template Input Schema
 */
export const MaiMusicRecordSchema = z.object({
    basic_info: z.object({
        id: z.union([z.number(), z.string()]),
        title: z.string(),
        artist: z.string(),
        bpm: z.number(),
        genre: z.string(),
        version: z.object({
            text: z.string(),
            id: z.number(),
            cn_ver: z.string(),
            short_ver: z.string()
        }),
        type: z.string()
    }),
    charts: z.array(z.object({
        difficulty: z.number(),
        level: z.string(),
        level_lable: z.string(),
        constant: z.number(),
        designer: z.string(),
        notes: z.object({
            total: z.number(),
            tap: z.number(),
            hold: z.number(),
            slide: z.number(),
            touch: z.number(),
            break_note: z.number()
        })
    })),
    records: z.array(z.object({
        id: z.union([z.number(), z.string()]),
        difficulty: z.number(),
        achievements: z.number(),
        dx_score: z.number(),
        combo_status: z.string().nullable(),
        sync_status: z.string().nullable(),
        rate: z.string().nullable()
    })),
    is_abstract: z.boolean().default(true)
})

export type MaiMusicRecordInput = z.infer<typeof MaiMusicRecordSchema>
