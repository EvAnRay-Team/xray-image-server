import z from "zod"
import { createRenderTemplate } from "../core/render-template"
import { AssetsManager } from "../core/asset"
import { absoluteStyle } from "../core/utils"

// Constants
const VERSION_LOGO_MAP: Record<string, string> = {
    "maimai": "100",
    "maimai PLUS": "110",
    "maimai GreeN": "120",
    "maimai GreeN PLUS": "130",
    "maimai ORANGE": "140",
    "maimai ORANGE PLUS": "150",
    "maimai PiNK": "160",
    "maimai PiNK PLUS": "170",
    "maimai MURASAKi": "180",
    "maimai MURASAKi PLUS": "185",
    "maimai MiLK": "190",
    "MiLK PLUS": "195",
    "maimai FiNALE": "199",
    "舞萌DX": "200",
    "舞萌DX 2021": "214",
    "舞萌DX 2022": "220",
    "舞萌DX 2023": "230",
    "舞萌DX 2024": "240",
    "舞萌DX 2025": "250"
}

// Helper to determine DX Score Star Type
function getDxScoreType(percent: number): string {
    if (percent === 100) return "7"
    if (percent > 99) return "6"
    if (percent > 97) return "5"
    if (percent > 95) return "4"
    if (percent > 93) return "3"
    if (percent > 90) return "2"
    if (percent > 85) return "1"
    return "0"
}

// Input Schema
const MusicInfoSchema = z.object({
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
    }))
})

// Font constants
const FONT_RODIN_EB = "RodinEB"
const FONT_RODIN_UB = "RodinUB"
const FONT_GLOW_SANS = "GlowSans"
const FONT_SOURCE_HAN = "SourceHanSans"

export const maiMusicInfoTemplate = createRenderTemplate("maiMusicInfo")
    .addFont({ id: FONT_RODIN_EB, filename: "FOT-NewRodinProN-EB.otf" })
    .addFont({ id: FONT_RODIN_UB, filename: "FOT-NewRodinProN-UB.otf" })
    .addFont({ id: FONT_GLOW_SANS, filename: "GlowSansSC-Normal-Heavy.otf" })
    .addFont({ id: FONT_SOURCE_HAN, filename: "SourceHanSans_17.ttf" })
    .setOption({
        width: 1700,
        height: 1800
    })
    .setInput(MusicInfoSchema)
    .setElement(async (input) => {
        const { basic_info, records, charts } = input

        // 1. Prepare Background
        let bgFilename = "bg_circle.png"
        const musicId = Number(basic_info.id)
        if (musicId === 11663) bgFilename = "系.png"
        if (musicId === 834) bgFilename = "潘.png"

        const [bgImg, coverImg, mask1, mask2, typeIconImg] = await Promise.all([
            AssetsManager.getLocalImage(`maimaidx/music_score/${bgFilename}`),
            AssetsManager.getLocalImage(`maimaidx/normal_cover/${basic_info.id}.png`),
            AssetsManager.getLocalImage("maimaidx/music_score/MASK/mask_1.png"),
            AssetsManager.getLocalImage("maimaidx/music_score/MASK/mask_2.png"),
            AssetsManager.getLocalImage(`maimaidx/music_score/类型/${basic_info.type}.png`)
        ])

        // 2. Prepare Version Logo
        let versionLogoImg: string | null = null
        if (VERSION_LOGO_MAP[basic_info.version.cn_ver]) {
            try {
                const verCode = VERSION_LOGO_MAP[basic_info.version.cn_ver]
                versionLogoImg = await AssetsManager.getLocalImage(`maimaidx/music_score/版本牌/UI_CMN_TabTitle_MaimaiTitle_Ver${verCode}.png`)
            } catch (e) {
                console.error("Failed to load version logo", e)
            }
        }

        return (
            <div
                style={{
                    height: "100%",
                    width: "100%",
                    display: "flex",
                    backgroundColor: "transparent"
                }}
            >
                <img src={coverImg} style={absoluteStyle(494, 494, 192, 172)} alt="cover" />
                <img src={bgImg} style={absoluteStyle(0, 0)} alt="background" />

                {/* Artist */}
                <span style={{
                    fontFamily: FONT_RODIN_UB, // Py uses font_path (UB)
                    fontSize: 43,
                    color: "white",
                    ...absoluteStyle(729, 182),
                }}>{basic_info.artist}</span>

                {/* Title */}
                <span style={{
                    fontFamily: FONT_SOURCE_HAN, // Title with fallback
                    fontSize: 50,
                    color: "white",
                    lineHeight: 1.4, // approx 74px/55px
                    whiteSpace: "normal", // 允许自动换行
                    wordWrap: "break-word", // 允许单词内换行
                    overflowWrap: "break-word", // 现代浏览器的换行属性
                    width: "830px", // 设置宽度限制，超出后自动换行
                    ...absoluteStyle(727, 272),
                }}>
                    {basic_info.title}
                </span>


                {/* Meta: ID */}
                <span style={{ 
                    fontFamily: FONT_GLOW_SANS, 
                    fontSize: 45, 
                    color: "white", 
                    transform: "translate(-50%, -50%)", 
                    ...absoluteStyle(820, 613) 
                }}>{basic_info.id}</span>

                {/* Meta: BPM */}
                <span style={{ 
                    fontFamily: FONT_GLOW_SANS, 
                    fontSize: 45, 
                    color: "white",
                    transform: "translate(-50%, -50%)",
                    ...absoluteStyle(979, 613),
                }}>{basic_info.bpm}</span>


                {/* Meta: Genre */}
                <span style={{ 
                    fontFamily: FONT_RODIN_UB, 
                    fontSize: 45, 
                    color: "white",
                    transform: "translate(-50%, -50%)",
                    ...absoluteStyle(1210, 618),
                }}>{basic_info.genre}</span>

                {/* Type Icon */}
                <img src={typeIconImg} style={absoluteStyle(91, 42, 1396, 600)} alt="type" />
               
                {/* Version Logo */}
                {versionLogoImg && (
                    <img src={versionLogoImg} style={{
                        ...absoluteStyle(332, 160, 250, 150),
                        transform: "translate(-50%, -50%)"
                    }} alt="ver" />
                )}
                
                {/* Score Rows */}
            </div>
        )
    })
