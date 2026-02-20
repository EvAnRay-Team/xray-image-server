import z from "zod"
import { createRenderTemplate } from "../core/render-template"
import { AssetsManager } from "../core/asset"
import { getRank, RAT_THRESHOLDS, TITLE_THRESHOLDS, getDanFileStem, BACKGROUND_THEME_MAP, RANK_THEME_MAP, resolveCoverId } from "../core/mai-logic"

// ==================== 数据验证模型定义 ====================

// 单曲记录
export const ScoreRecordSchema = z.object({
    id: z.number(),
    difficulty: z.number(),
    achievements: z.number(),
    dx_score: z.number(),
    combo_status: z.string(),
    sync_status: z.string(),
    rate: z.number(),
    title: z.string(),
    constant: z.number()
})

// 用户数据
export const MaiPlayerBest50Schema = z.object({
    user_info: z.object({
        nickname: z.string(),
        plate: z.number().nullable(),
        rating: z.number()
    }),
    custom_config: z.object({ // 个性化选项
        theme_config: z.object({
            background: z.string(),
            rank: z.string()
        }),
        name_plate: z.object({
            icon: z.number().nullable(),
            plate: z.number().nullable(),
            class: z.number().nullable(),
            dan: z.number().nullable()
        }),
        recommend_module: z.object({
            is_enabled: z.boolean(),
            item: z.number().nullable()
        }),
        chara_module: z.object({
            is_enabled: z.boolean(),
            item: z.array(z.object({
                id: z.number(),
                level: z.number()
            }))
        }),
        frame: z.number().nullable()
    }),
    best_35: z.array(ScoreRecordSchema),
    best_15: z.array(ScoreRecordSchema),
    is_abstract: z.boolean().default(false)
})

export type ScoreRecord = z.infer<typeof ScoreRecordSchema>
export type MaiPlayerBest50Output = z.infer<typeof MaiPlayerBest50Schema>

// ==================== 静态常量定义区域 ====================

// 难度名称映射
const DIFFICULTY_NAME = ["basic", "advanced", "expert", "master", "remaster"]

// 卡片尺寸与布局常量
const CARD_W = 323
const CARD_H = 137
const COL_GAP = 11   // 横间距
const ROW_GAP = 13   // 纵间距
const COL_STEP = CARD_W + COL_GAP  // 334
const ROW_STEP = CARD_H + ROW_GAP  // 150

// best_35 起始坐标
const B35_X = 15
const B35_Y = 749

// best_15 起始坐标
const B15_X = 15
const B15_Y = 1911

// 画布尺寸常量
const NP_W_ORIG = 1104
const NP_H_ORIG = 200
const NP_W = 1107
const NP_SCALE = NP_W / NP_W_ORIG          // ≈ 1.00272
const NP_H = Math.round(NP_H_ORIG * NP_SCALE) // 201

const s = (v: number) => Math.round(v * NP_SCALE) // 坐标/尺寸等比换算助手

// ==================== 纯函数视图节点层 ====================

// 渲染 Best35 / Best15 的单曲成绩槽位
function RenderCard({
    r,
    index,
    originX,
    originY,
    coverMap,
    cardBgMap,
    typeMap,
    rankMap,
    comboMap,
    syncMap,
    starMap,
    rankTop
}: {
    r: ScoreRecord
    index: number
    originX: number
    originY: number
    coverMap: Map<number, string>
    cardBgMap: Map<`${number}_${number}`, string>
    typeMap: Map<`${number}_${number}`, string>
    rankMap: Map<`${number}_${number}`, string>
    comboMap: Map<`${number}_${number}`, string | null>
    syncMap: Map<`${number}_${number}`, string | null>
    starMap: Map<`${number}_${number}`, string | null>
    rankTop: number
}) {
    const col = index % 5
    const row = Math.floor(index / 5)
    // 根据矩阵下角标推导坐标
    const x = originX + col * COL_STEP
    const y = originY + row * ROW_STEP
    const key = `${r.id}_${r.difficulty}`

    const cover    = coverMap.get(r.id)
    const cardBg   = cardBgMap.get(key as `${number}_${number}`)
    const typeImg  = typeMap.get(key as `${number}_${number}`)
    const rankImg  = rankMap.get(key as `${number}_${number}`)
    const comboImg = comboMap.get(key as `${number}_${number}`) ?? null
    const syncImg  = syncMap.get(key as `${number}_${number}`) ?? null
    const starImg  = starMap.get(key as `${number}_${number}`) ?? null

    return (
        <div
            key={key + index}
            style={{
                display: "flex",
                position: "absolute",
                left: x,
                top: y,
                width: CARD_W,
                height: CARD_H,
                overflow: "hidden",
            }}
        >
            {/* 封面 */}
            <img src={cover} alt="cover"
                style={{ position: "absolute", left: 17, top: 15, width: 106, height: 106 }} />
            {/* 难度卡片背景 */}
            <img src={cardBg} alt="card_bg"
                style={{ position: "absolute", left: 0, top: 0, width: CARD_W, height: CARD_H }} />
            {/* TYPE */}
            <img src={typeImg} alt="type"
                style={{ position: "absolute", left: 0, top: 0 }} />
            {/* RANK */}
            <img src={rankImg} alt="rank"
                style={{ position: "absolute", left: 0, top: rankTop }} />
            {/* COMBO */}
            {comboImg && (
                <img src={comboImg} alt="combo"
                    style={{ position: "absolute", left: 0, top: 0 }} />
            )}
            {/* SYNC */}
            {syncImg && (
                <img src={syncImg} alt="sync"
                    style={{ position: "absolute", left: 0, top: 0 }} />
            )}
            {/* DXSTAR */}
            {starImg && (
                <img src={starImg} alt="star"
                    style={{ position: "absolute", left: 0, top: 0 }} />
            )}
            {/* 排名/歌曲ID */}
            <span style={{
                position: "absolute", left: 136, top: 109,
                fontFamily: "MetaFont",
                fontSize: 17.5,
                color: "black",
            }}>
                #{index + 1}:{r.id}
            </span>
            {/* 歌曲标题 */}
            <span style={{
                position: "absolute", left: 138, top: 12,
                fontFamily: "TitleFont",
                fontSize: 17,
                color: "white",
                maxWidth: 180,
                overflow: "hidden",
                whiteSpace: "nowrap",
                textOverflow: "ellipsis",
            }}>
                {r.title}
            </span>
            {/* 完成率 */}
            <span style={{
                position: "absolute", left: 136, top: 77,
                fontFamily: "MetaFont",
                fontSize: 22.5,
                color: "white",
                display: "flex",
                alignItems: "baseline",
            }}>
                {r.achievements.toFixed(4)}
                <span style={{ fontSize: 14, marginLeft: 1, fontFamily: "ConstantFont", position: "relative", top: -1 }}>%</span>
            </span>
            {/* 定数与Rating */}
            <div style={{
                position: "absolute", left: 302, top: 88.5,
                display: "flex",
                flexDirection: "column",
                alignItems: "flex-end",
                fontFamily: "ConstantFont",
                fontSize: 10,
                color: "white",
                lineHeight: 1.1,
                transform: "translate(-50%, -50%)",
            }}>
                <span>{r.constant.toFixed(1)}</span>
                <span>{r.rate}</span>
            </div>
        </div>
    )
}

// 顶部姓名信息挂件封装聚合
function RenderNameplate({
    user_info,
    b35Total,
    b15Total,
    nameplatePlateImg,
    nameplateIconImg,
    nameplateNameImg,
    nameplateRatImg,
    nameplateTitleImg,
    nameplateDanImg,
    nameplateClassImg
}: {
    user_info: { nickname: string, rating: number }
    b35Total: number
    b15Total: number
    nameplatePlateImg: string | null
    nameplateIconImg: string | null
    nameplateNameImg: string
    nameplateRatImg: string
    nameplateTitleImg: string | null
    nameplateDanImg: string | null
    nameplateClassImg: string | null
}) {
    return (
        <div style={{
            position: "absolute",
            left: 0,
            top: 1,
            width: NP_W,
            height: NP_H,
            display: "flex",
            overflow: "visible",
        }}>
            {nameplatePlateImg && (
                <img src={nameplatePlateImg} alt="plate"
                    style={{ position: "absolute", left: s(32), top: s(27), width: NP_W, height: s(178) }} />
            )}
            {nameplateIconImg && (
                <img src={nameplateIconImg} alt="icon"
                    style={{ position: "absolute", left: s(46), top: s(41), width: s(150), height: s(150) }} />
            )}
            <img src={nameplateNameImg} alt="nameplate-name"
                style={{ position: "absolute", left: 3, top: 0, width: NP_W, height: NP_H }} />
            <img src={nameplateRatImg} alt="nameplate-rat"
                style={{ position: "absolute", left: 0, top: 0, width: NP_W, height: NP_H }} />
            {nameplateTitleImg && (
                <img src={nameplateTitleImg} alt="nameplate-title"
                    style={{ position: "absolute", left: 3, top: 0, width: NP_W, height: NP_H }} />
            )}
            {nameplateDanImg && (
                <img src={nameplateDanImg} alt="nameplate-dan"
                    style={{ position: "absolute", left: 0, top: 0, width: NP_W, height: NP_H }} />
            )}
            {nameplateClassImg && (
                <img src={nameplateClassImg} alt="nameplate-class"
                    style={{ position: "absolute", left: 0, top: 0, width: NP_W, height: NP_H }} />
            )}
            <span style={{
                position: "absolute",
                left: s(321),
                top: s(47),
                fontFamily: "RatingFont",
                fontSize: s(29),
                color: "rgb(255,218,72)",
                letterSpacing: `${(3.0 * NP_SCALE).toFixed(1)}px`,
                whiteSpace: "nowrap",
            }}>
                {user_info.rating}
            </span>
            <span style={{
                position: "absolute",
                left: s(212),
                top: s(102),
                fontFamily: "UserNameFont",
                fontSize: s(38),
                color: "black",
                whiteSpace: "nowrap",
            }}>
                {user_info.nickname}
            </span>
            <span style={{
                position: "absolute",
                left: s(260),
                top: s(162),
                fontFamily: "MetaFont",
                fontSize: s(20),
                color: "white",
                whiteSpace: "nowrap",
                textShadow: [
                    "-1px -1px 0 rgb(60,60,60)",
                    " 1px -1px 0 rgb(60,60,60)",
                    "-1px  1px 0 rgb(60,60,60)",
                    " 1px  1px 0 rgb(60,60,60)",
                ].join(","),
            }}>
                旧版本{b35Total}+新版本{b15Total}
            </span>
        </div>
    )
}

// ==================== 渲染工作流执行域 ====================

export const maiPlayerBest50Template = createRenderTemplate("maiPlayerBest50")
    // 单曲卡片内字体
    .addFont({ id: "TitleFont",    filename: "FOT-NewRodinProN-UB.otf" }) // 歌曲标题
    .addFont({ id: "MetaFont",     filename: "RoGSanSrfStd-Bd.otf" })    // 完成率,排名,id
    .addFont({ id: "ConstantFont", filename: "RoGSanSrfStd-UB.otf" })    // 定数,DX Rating
    // 用户数据字体
    .addFont({ id: "RatingFont",   filename: "江城圆体 600W.ttf" })       // 用户 Rating
    .addFont({ id: "UserNameFont", filename: "江城圆体 500W.ttf" })       // 用户名
    .setOption({
        width: 1700,
        height: 2369
    })
    .setInput(MaiPlayerBest50Schema)
    .setElement(async (input) => {
        const { user_info, custom_config, best_35, best_15, is_abstract } = input
        // 预加载背景（从全局主题映射中解析文件名）
        const bgFileName = BACKGROUND_THEME_MAP[custom_config.theme_config.background] ?? "splash"
        const background = await AssetsManager.getLocalImage(`maimaidx/player_best50/background/${bgFileName}.png`)
        
        // ==================== 姓名框资源加载 ====================
        const ratName   = RAT_THRESHOLDS.find((t: {min: number}) => user_info.rating >= t.min)?.name ?? "rat_000"
        const titleName = TITLE_THRESHOLDS.find((t: {min: number}) => user_info.rating >= t.min)?.name ?? "10000"

        // 并行加载姓名框各图层
        const [
            nameplateNameImg,
            nameplateRatImg,
            nameplateTitleImg,
            nameplateDanImg,
            nameplateClassImg,
            nameplatePlateImg,
            nameplateIconImg,
            nameplateFrameImg,
        ] = await Promise.all([
            AssetsManager.getLocalImage("maimaidx/player_best50/nameplate/name.png"),
            AssetsManager.getLocalImage(`maimaidx/player_best50/nameplate/rat/${ratName}.png`),
            AssetsManager.getLocalImage(`maimaidx/player_best50/nameplate/title/${titleName}.png`).catch(() => null),
            custom_config.name_plate.dan !== null
                ? AssetsManager.getLocalImage(`maimaidx/player_best50/nameplate/${getDanFileStem(custom_config.name_plate.dan)}.png`).catch(() => null)
                : Promise.resolve(null),
            custom_config.name_plate.class !== null
                ? AssetsManager.getLocalImage(`maimaidx/player_best50/nameplate/class/class_${String(custom_config.name_plate.class).padStart(2, "0")}.png`).catch(() => null)
                : Promise.resolve(null),
            custom_config.name_plate.plate !== null
                ? AssetsManager.getLocalImage(`maimaidx/collection/plate/plate_${custom_config.name_plate.plate}.png`).catch(() => null)
                : Promise.resolve(null),
            custom_config.name_plate.icon !== null
                ? AssetsManager.getLocalImage(`maimaidx/collection/icon/icon_${custom_config.name_plate.icon}.png`).catch(() => null)
                : Promise.resolve(null),
            custom_config.frame !== null
                ? AssetsManager.getLocalImage(`maimaidx/collection/frame/frame_${custom_config.frame}.png`).catch(() => null)
                : Promise.resolve(null),
        ]) as [string, string, string | null, string | null, string | null, string | null, string | null, string | null]

        // 预先收集所有曲目
        const allRecords = [...best_35, ...best_15]

        // 并行加载封面和卡片背景（固定使用 dark 主题）
        const [coverMap, cardBgMap] = await Promise.all([
            Promise.all(
                allRecords.map(async (r) => {
                    const { coverSrc } = await resolveCoverId(r.id)
                    return [r.id, coverSrc] as const
                })
            ).then((entries) => new Map(entries)),
            Promise.all(
                allRecords.map(async (r) => {
                    const diffName = DIFFICULTY_NAME[r.difficulty] ?? "basic"
                    return [
                        `${r.id}_${r.difficulty}`,
                        await AssetsManager.getLocalImage(`maimaidx/player_best50/card/card_bg/card_${diffName}_dark.png`)
                    ] as const
                })
            ).then((entries) => new Map(entries))
        ])

        // 预加载所有卡片资源
        const rankTheme = RANK_THEME_MAP[custom_config.theme_config.rank] ?? "defaut"
        let rankTop = 1
        if (["defaut", "credits", "festival"].includes(rankTheme)) {
            rankTop = 0
        } else if (["buddies", "prism"].includes(rankTheme)) {
            rankTop = 2
        }
        const [typeMap, rankMap, comboMap, syncMap, starMap] = await Promise.all([
            Promise.all(
                allRecords.map(async (r) => {
                    const typeKey = r.id >= 10000 ? "dx" : "st"
                    const src = await AssetsManager.getLocalImage(`maimaidx/player_best50/card/type/type_${typeKey}.png`)
                    return [`${r.id}_${r.difficulty}`, src] as const
                })
            ).then((e) => new Map(e)),
            Promise.all(
                allRecords.map(async (r) => {
                    const rankStr = getRank(r.achievements).toLowerCase().replace("+", "p")
                    const src = await AssetsManager.getLocalImage(`maimaidx/player_best50/card/rank/rank_${rankTheme}_${rankStr}.png`)
                    return [`${r.id}_${r.difficulty}`, src] as const
                })
            ).then((e) => new Map(e)),
            Promise.all(
                allRecords.map(async (r) => {
                    if (!r.combo_status) return [`${r.id}_${r.difficulty}`, null] as const
                    const src = await AssetsManager.getLocalImage(`maimaidx/player_best50/card/playbonus/pb_${r.combo_status}.png`)
                    return [`${r.id}_${r.difficulty}`, src] as const
                })
            ).then((e) => new Map(e)),
            Promise.all(
                allRecords.map(async (r) => {
                    if (!r.sync_status) return [`${r.id}_${r.difficulty}`, null] as const
                    const src = await AssetsManager.getLocalImage(`maimaidx/player_best50/card/playbonus/pb_${r.sync_status}.png`)
                    return [`${r.id}_${r.difficulty}`, src] as const
                })
            ).then((e) => new Map(e)),
            Promise.all(
                allRecords.map(async (r) => {
                    const starLevel = 0
                    if (starLevel === 0) return [`${r.id}_${r.difficulty}`, null] as const
                    const clampedStar = Math.min(starLevel, 5)
                    const src = await AssetsManager.getLocalImage(`maimaidx/player_best50/card/star/star_${clampedStar}.png`)
                    return [`${r.id}_${r.difficulty}`, src] as const
                })
            ).then((e) => new Map(e)),
        ])

        const b35Total = best_35.reduce((sum, r) => sum + r.rate, 0)
        const b15Total = best_15.reduce((sum, r) => sum + r.rate, 0)

        return (
            <div
                style={{
                    height: "100%",
                    width: "100%",
                    display: "flex",
                    backgroundColor: "transparent",
                    position: "relative"
                }}
            >
                {nameplateFrameImg && (
                    <img src={nameplateFrameImg} alt="frame"
                        style={{ position: "absolute", left: 0, top: 0, width: 1700, height: 711, pointerEvents: "none" }} />
                )}

                <img src={background} alt="background"
                    style={{ position: "absolute", left: 0, top: 0, width: "100%", height: "100%", pointerEvents: "none" }} />

                <RenderNameplate
                    user_info={user_info}
                    b35Total={b35Total}
                    b15Total={b15Total}
                    nameplatePlateImg={nameplatePlateImg}
                    nameplateIconImg={nameplateIconImg}
                    nameplateNameImg={nameplateNameImg}
                    nameplateRatImg={nameplateRatImg}
                    nameplateTitleImg={nameplateTitleImg}
                    nameplateDanImg={nameplateDanImg}
                    nameplateClassImg={nameplateClassImg}
                />

                {best_35.map((r, i) => (
                    <RenderCard
                        key={`b35_${r.id}_${r.difficulty}_${i}`}
                        r={r as ScoreRecord}
                        index={i}
                        originX={B35_X}
                        originY={B35_Y}
                        coverMap={coverMap}
                        cardBgMap={cardBgMap}
                        typeMap={typeMap}
                        rankMap={rankMap}
                        comboMap={comboMap}
                        syncMap={syncMap}
                        starMap={starMap}
                        rankTop={rankTop}
                    />
                ))}

                {best_15.map((r, i) => (
                    <RenderCard
                        key={`b15_${r.id}_${r.difficulty}_${i}`}
                        r={r as ScoreRecord}
                        index={i}
                        originX={B15_X}
                        originY={B15_Y}
                        coverMap={coverMap}
                        cardBgMap={cardBgMap}
                        typeMap={typeMap}
                        rankMap={rankMap}
                        comboMap={comboMap}
                        syncMap={syncMap}
                        starMap={starMap}
                        rankTop={rankTop}
                    />
                ))}

            </div>
        )
    })