import z from "zod"
import { createRenderTemplate } from "../core/render-template"
import { AssetsManager } from "../core/asset"
import { absoluteStyle, formatMaiResourceName } from "../core/utils"
import { getRank, getDxStar, getDxRating, getChartMaxDxScore } from "../core/mai-logic"
import { MaiMusicRecordSchema } from "../core/mai-dto"
// import { logger } from "../core/logger"

import { VERSION_LOGO_MAP, SPECIAL_MUSIC_BG_MAP, MUSIC_TYPE_ICON_MAP } from "../core/mai-constants"

export const maiMusicRecordTemplate = createRenderTemplate("maiMusicRecord")
    .addFont({ id: "TitleFont", filename: "FOT-NewRodinProN-UB.otf" })
    .addFont({ id: "FallbackFont", filename: "SEGUISYM.TTF" }) // Global fallback
    .addFont({ id: "MetaFont", filename: "江城圆体 700W.ttf" })
    .addFont({ id: "ScoretFont", filename: "FOT-NewRodinProN-UB.otf" })
    .setOption({
        width: 1700,
        height: 1800
    })
    .setInput(MaiMusicRecordSchema)
    .setElement(async (input) => {
        const { basic_info, charts, records, is_abstract} = input

        // 1. 准备背景
        const musicId = Number(basic_info.id)
        
        // 判断是否为特殊背景
        const bgPath = SPECIAL_MUSIC_BG_MAP[musicId]
            ? `maimaidx/music_record/background_special/${SPECIAL_MUSIC_BG_MAP[musicId]}`
            : "maimaidx/music_record/background/bg_circle.png";

        // 2. 预加载基础资源
        const [bgImg, coverImg, typeIconImg, mask1Img, mask2Img] = await Promise.all([
            AssetsManager.getLocalImage(bgPath),
            AssetsManager.getMusicCover(musicId, is_abstract),
            AssetsManager.getLocalImage(`maimaidx/music_record/类型/${basic_info.type}.png`),
            AssetsManager.getLocalImage(`maimaidx/music_record/mask/mask_1.png`),
            AssetsManager.getLocalImage(`maimaidx/music_record/mask/mask_2.png`)
        ])

        // 3. 准备版本图标
        let versionLogoImg: string | null = null
        if (VERSION_LOGO_MAP[basic_info.version.cn_ver]) {
            try {
                const verCode = VERSION_LOGO_MAP[basic_info.version.cn_ver]
                versionLogoImg = await AssetsManager.getLocalImage(`maimaidx/music_record/版本牌/UI_CMN_TabTitle_MaimaiTitle_Ver${verCode}.png`)
            } catch (e) {
                console.error("Failed to load version logo", e)
            }
        }

        // 4. 准备难度数据和对应图片资源
        const difficulties = [0, 1, 2, 3, 4]
        const scoreDataList = await Promise.all(difficulties.map(async (diffIndex) => {
            const chart = charts.find(c => c.difficulty === diffIndex)
            const record = records.find(r => r.difficulty === diffIndex)

            if (!chart) return { type: "mask2" as const, diffIndex }
            if (!record) return { type: "mask1" as const, diffIndex }

            // 计算 Rank
            const rankStr = record.rate ? record.rate.toUpperCase() : getRank(record.achievements)
            const rankImgName = formatMaiResourceName(rankStr)
            
            // 计算 DX Star
            const dxStar = getDxStar(record.dx_score, chart.notes.total)

            // 计算 DX Rating
            const ra = getDxRating(chart.constant, record.achievements)

            // 理论满分 DX Score
            const maxDxScore = getChartMaxDxScore([chart.notes.total])

            // 加载图标
            // Rank: 必需
            const rankImgPromise = AssetsManager.getLocalImage(`maimaidx/music_record/rank/${rankImgName}.png`)
            
            // FC: 可选
            let fcImgPromise = Promise.resolve(null) as Promise<string | null>
            if (record.combo_status) {
                const fcName = formatMaiResourceName(record.combo_status)
                fcImgPromise = AssetsManager.getLocalImage(`maimaidx/music_record/playbonus/${fcName}.png`)
            }

            // FS: 可选 (排除 SYNC 文字)
            let fsImgPromise = Promise.resolve(null) as Promise<string | null>
            if (record.sync_status) {
                 const syncUpper = record.sync_status.toUpperCase()
                 if (syncUpper !== 'SYNC') {
                     const fsName = formatMaiResourceName(record.sync_status)
                     fsImgPromise = AssetsManager.getLocalImage(`maimaidx/music_record/playbonus/${fsName}.png`)
                 }
            }

            // Star: 可选
            const starImgPromise = dxStar > 0 
                ? AssetsManager.getLocalImage(`maimaidx/music_record/star/Star_${dxStar}.png`)
                : Promise.resolve(null)

            const [rankImg, fcImg, fsImg, starImg] = await Promise.all([
                rankImgPromise,
                fcImgPromise,
                fsImgPromise,
                starImgPromise
            ])

            return {
                type: "record" as const,
                diffIndex,
                chart,
                record,
                calculated: {
                    rankStr,
                    dxStar,
                    ra,
                    maxDxScore
                },
                images: {
                    rankImg,
                    fcImg,
                    fsImg,
                    starImg
                }
            }
        }))

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

                {/* 曲师 */}
                <span style={{
                    fontFamily: "TitleFont, FallbackFont",
                    fontSize: 43,
                    color: "white",
                    width: "770px",
                    overflow: "hidden",
                    whiteSpace: "nowrap",
                    textOverflow: "ellipsis",
                    display: "block",
                    ...absoluteStyle(730, 182),
                }}>{basic_info.artist}</span>

                {/* 标题 */}
                <span style={{
                    fontFamily: "TitleFont, FallbackFont",
                    fontSize: 55.1,
                    color: "white",
                    lineHeight: 1.3,
                    whiteSpace: "normal",
                    wordWrap: "break-word",
                    overflowWrap: "break-word",
                    width: "800px",
                    textAlign: "left",
                    ...absoluteStyle(733, 253), // Python left aligned at 727
                    transform: "translateY(12px)" // Fine tuning for baseline
                }}>
                    {basic_info.title}
                </span>

                {/* 元数据：ID */}
                <span style={{ 
                    fontFamily: "MetaFont", 
                    fontSize: 49, 
                    color: "white", 
                    transform: "translate(-50%, -50%)", 
                    ...absoluteStyle(822, 622) 
                }}>{basic_info.id}</span>

                {/* 元数据：BPM */}
                <span style={{ 
                    fontFamily: "MetaFont", 
                    fontSize: 49, 
                    color: "white",
                    transform: "translate(-50%, -50%)",
                    ...absoluteStyle(980, 622),
                }}>{basic_info.bpm}</span>

                {/* 元数据：流派 */}
                <span style={{ 
                    fontFamily: "MetaFont", 
                    fontSize: 47, 
                    color: "white",
                    transform: "translate(-50%, -50%)",
                    ...absoluteStyle(1208.5, 622),
                }}>{basic_info.genre}</span>

                {/* 类型图标 */}
                <img src={typeIconImg} style={absoluteStyle(91, 42, 1396, 600)} alt="type" />
               
                {/* 版本图标 */}
                {versionLogoImg && (
                    <img src={versionLogoImg} style={{
                        ...absoluteStyle(332, 160, 250, 150),
                        transform: "translate(-50%, -50%)"
                    }} alt="ver" />
                )}

                {/* 成绩列表绘制 */}
                {scoreDataList.map((item) => {
                    const yPos = 751 + 158 * item.diffIndex
                    const xBase = 191

                    // Case A: 图谱不存在
                    if (item.type === "mask2") {
                        return <img key={item.diffIndex} src={mask2Img} style={absoluteStyle(1321, 126, xBase, yPos)} alt="mask2" />
                    }

                    // Case B: 无成绩
                    if (item.type === "mask1") {
                        return <img key={item.diffIndex} src={mask1Img} style={absoluteStyle(1321, 126, xBase, yPos)} alt="mask1" />
                    }

                    // Case C: 有成绩
                    if (item.type === "record") {
                        const { chart, record, calculated, images } = item
                        const { achievements } = record
                        const { ra, maxDxScore } = calculated
                        const { rankImg, fcImg, fsImg, starImg } = images

                        // 格式化 Achievement
                        const achStr = achievements.toFixed(4)
                        let intPart = "", decPart = "0000"
                        if (achievements === 101) {
                            intPart = "101%"
                        } else if (achStr.includes('.')) {
                            const params = achStr.split('.')
                            intPart = params[0] + "."
                            decPart = params[1] ?? "0000"
                        } else {
                            intPart = achStr
                        }

                        // 特殊处理 101%
                        const is101 = achievements === 101
                        
                        return (
                            <div key={item.diffIndex} style={{
                                ...absoluteStyle(1321, 126, xBase, yPos),
                                overflow: "visible",
                                display: "flex"
                            }}>
                                {/* Play Bonus Icons Layer */}
                                {fcImg && <img src={fcImg} style={absoluteStyle(0, 0)} alt="fc" />}
                                {fsImg && <img src={fsImg} style={absoluteStyle(0, 0)} alt="fs" />}

                                {/* Rank Icon Layer */}
                                <img src={rankImg} style={absoluteStyle(0, 0)} alt="rank" />

                                {/* DX Star Icon Layer - Python logic: paste on top */}
                                {starImg && <img src={starImg} style={absoluteStyle(0, 0)} alt="star" />}

                                {/* 达成率文本 */}
                                {is101 ? (
                                    <span style={{
                                        fontFamily: "ScoretFont",
                                        fontSize: 65,
                                        color: "orange",
                                        ...absoluteStyle(589, 66),
                                        transform: "translate(-50%, -50%)", 
                                        textAlign: "center"
                                    }}>101%</span>
                                ) : (
                                    // 模拟 Python: int_font 62, dec_font 50, bottom_y = height - 36
                                    // center_x = 592
                                    <div style={{
                                        position: "absolute",
                                        left: 592,
                                        bottom: 30, // 36 from bottom in Python (126 height - 36 = 90 from top) -> bottom 36 px
                                        transform: "translateX(-50%)",
                                        display: "flex",
                                        alignItems: "baseline"
                                    }}>
                                        <span style={{
                                            fontFamily: "ScoretFont",
                                            fontSize: 62,
                                            color: "black",
                                            lineHeight: 1
                                        }}>{intPart}</span>
                                        <span style={{
                                            fontFamily: "ScoretFont", 
                                            fontSize: 50,
                                            color: "black",
                                            lineHeight: 1
                                        }}>{decPart}</span>
                                    </div>
                                )}

                                {/* 单曲 Rating: DS -> RA */}
                                <span style={{
                                    fontFamily: "ScoretFont",
                                    fontSize: 25,
                                    color: "black",
                                    ...absoluteStyle(1209, 37.5),
                                    transform: "translate(-50%, -50%)"
                                }}>
                                    {chart.constant.toFixed(1)}→{ra}
                                </span>

                                {/* DX Score: Score / Max */}
                                <span style={{
                                    fontFamily: "ScoretFont",
                                    fontSize: 25,
                                    color: "black",
                                    ...absoluteStyle(1209, 90),
                                    transform: "translate(-50%, -50%)"
                                }}>
                                    {record.dx_score}/{maxDxScore}
                                </span>
                            </div>
                        )
                    }
                    return null
                })}
            </div>
        )
    })
