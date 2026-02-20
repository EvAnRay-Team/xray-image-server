import z from "zod"
import { createRenderTemplate } from "../core/render-template"
import { AssetsManager } from "../core/asset"
import { absoluteStyle, formatMaiResourceName } from "../core/utils"
import { getRank, getDxStar, getDxRating, getChartMaxDxScore, RAT_THRESHOLDS, TITLE_THRESHOLDS, getDanFileStem } from "../core/mai-logic"

// 单曲记录
const ScoreRecordSchema = z.object({
    id: z.number(),
    difficulty: z.number(),
    achievements: z.number(),
    dx_score: z.number(),
    combo_status: z.string(),
    sync_status: z.string(),
    dx_rate: z.number()
})
//用户数据
const MaiPlayerBest50Schema = z.object({
    user_info: z.object({
        nickname: z.string(),
        plate: z.number().nullable(),
        rating: z.number()
    }),
    custom_config: z.object({
        plate: z.number().nullable(),
        icon: z.number().nullable(),
        frame: z.number().nullable(),
        class: z.number().nullable(),
        dan: z.number().nullable(),
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
        })
    }),
    best_35: z.array(ScoreRecordSchema),
    best_15: z.array(ScoreRecordSchema),
    is_abstract: z.boolean().default(false)
})

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
        // 预加载背景
        const background = await AssetsManager.getLocalImage("maimaidx/player_best50/background/splashp.png")
        // 难度名称映射
        const DIFFICULTY_NAME = ["basic", "advanced", "expert", "master", "remaster"]

        // ==================== 姓名框资源加载 ====================
        const ratName   = RAT_THRESHOLDS.find(t => user_info.rating >= t.min)?.name ?? "rat_000"
        const titleName = TITLE_THRESHOLDS.find(t => user_info.rating >= t.min)?.name ?? "10000"

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
            // name.png — 固定图层
            AssetsManager.getLocalImage("maimaidx/player_best50/nameplate/name.png"),
            // rat 图 — 根据 rating 选档
            AssetsManager.getLocalImage(`maimaidx/player_best50/nameplate/rat/${ratName}.png`),
            // title 称号框 — 根据 rating 选档
            AssetsManager.getLocalImage(`maimaidx/player_best50/nameplate/title/${titleName}.png`).catch(() => null),
            // dan 图 — 来自 custom_config.dan（nullable），使用 getDanFileStem 统一处理前缀
            custom_config.dan !== null
                ? AssetsManager.getLocalImage(`maimaidx/player_best50/nameplate/${getDanFileStem(custom_config.dan)}.png`).catch(() => null)
                : Promise.resolve(null),
            // class 图 — 来自 custom_config.class（nullable）
            custom_config.class !== null
                ? AssetsManager.getLocalImage(`maimaidx/player_best50/nameplate/class/class_${String(custom_config.class).padStart(2, "0")}.png`).catch(() => null)
                : Promise.resolve(null),
            // 姓名板底图 — 来自 custom_config.plate（nullable）
            custom_config.plate !== null
                ? AssetsManager.getLocalImage(`maimaidx/collection/plate/plate_${custom_config.plate}.png`).catch(() => null)
                : Promise.resolve(null),
            // 头像 — 来自 custom_config.icon（nullable）
            custom_config.icon !== null
                ? AssetsManager.getLocalImage(`maimaidx/collection/icon/icon_${custom_config.icon}.png`).catch(() => null)
                : Promise.resolve(null),
            // frame — 来自 custom_config.frame（nullable）
            custom_config.frame !== null
                ? AssetsManager.getLocalImage(`maimaidx/collection/frame/frame_${custom_config.frame}.png`).catch(() => null)
                : Promise.resolve(null),
        ]) as [string, string, string | null, string | null, string | null, string | null, string | null, string | null]
        // ==================== 姓名框资源加载结束 ====================

        // 预先收集所有曲目
        const allRecords = [...best_35, ...best_15]

        // 封面 id 解析：4位id前补1；5位id若封面不存在则回退到去掉首位后的id
        const resolveCoverId = async (id: number): Promise<{ coverId: number; coverSrc: string }> => {
            let coverId = id
            // 4位数 id → 补首位 1
            if (id >= 1000 && id <= 9999) {
                coverId = id + 10000
            }
            // 5位数 id → 先尝试原始 id，找不到则降为去掉首位的 id
            if (coverId >= 10000 && coverId <= 99999) {
                try {
                    const src = await AssetsManager.getLocalImage(`maimaidx/normal_cover/${coverId}.png`)
                    return { coverId, coverSrc: src }
                } catch {
                    // 封面不存在，去掉首位数字（例如 10333 → 333）
                    const fallbackId = coverId % 10000
                    const src = await AssetsManager.getLocalImage(`maimaidx/normal_cover/${fallbackId}.png`)
                    return { coverId: fallbackId, coverSrc: src }
                }
            }
            // 其他情况直接加载
            const src = await AssetsManager.getLocalImage(`maimaidx/normal_cover/${coverId}.png`)
            return { coverId, coverSrc: src }
        }

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

        // 预加载所有卡片资源（rank 图标版本固定 defaut）
        // 资源 key: `${id}_${difficulty}`
        const [typeMap, rankMap, comboMap, syncMap, starMap] = await Promise.all([
            // type 图标：id >= 10000 为 DX，否则 ST
            Promise.all(
                allRecords.map(async (r) => {
                    const typeKey = r.id >= 10000 ? "dx" : "st"
                    const src = await AssetsManager.getLocalImage(`maimaidx/player_best50/card/type/type_${typeKey}.png`)
                    return [`${r.id}_${r.difficulty}`, src] as const
                })
            ).then((e) => new Map(e)),

            // rank 图标：由 achievements 推算评级
            Promise.all(
                allRecords.map(async (r) => {
                    const rankStr = getRank(r.achievements).toLowerCase().replace("+", "p")
                    const src = await AssetsManager.getLocalImage(`maimaidx/player_best50/card/rank/rank_defaut_${rankStr}.png`)
                    return [`${r.id}_${r.difficulty}`, src] as const
                })
            ).then((e) => new Map(e)),

            // combo playbonus 图标（为空则 null）
            Promise.all(
                allRecords.map(async (r) => {
                    if (!r.combo_status) return [`${r.id}_${r.difficulty}`, null] as const
                    const src = await AssetsManager.getLocalImage(`maimaidx/player_best50/card/playbonus/pb_${r.combo_status}.png`)
                    return [`${r.id}_${r.difficulty}`, src] as const
                })
            ).then((e) => new Map(e)),

            // sync playbonus 图标（为空则 null）
            Promise.all(
                allRecords.map(async (r) => {
                    if (!r.sync_status) return [`${r.id}_${r.difficulty}`, null] as const
                    const src = await AssetsManager.getLocalImage(`maimaidx/player_best50/card/playbonus/pb_${r.sync_status}.png`)
                    return [`${r.id}_${r.difficulty}`, src] as const
                })
            ).then((e) => new Map(e)),

            // star 图标（0星不渲染，6/7星用 star_5）
            Promise.all(
                allRecords.map(async (r) => {
                    // 暂无 notes 数据，star 固定为 0（接入 abstracts 后替换）
                    const starLevel = 0
                    if (starLevel === 0) return [`${r.id}_${r.difficulty}`, null] as const
                    const clampedStar = Math.min(starLevel, 5)
                    const src = await AssetsManager.getLocalImage(`maimaidx/player_best50/card/star/star_${clampedStar}.png`)
                    return [`${r.id}_${r.difficulty}`, src] as const
                })
            ).then((e) => new Map(e)),
        ])

        // 单曲卡片渲染函数
        const renderCard = (r: typeof allRecords[0], index: number, originX: number, originY: number) => {
            const col = index % 5
            const row = Math.floor(index / 5)
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
                    {/* 封面（最底层） */}
                    <img src={cover} alt="cover"
                        style={{ position: "absolute", left: 17, top: 15, width: 106, height: 106 }} />

                    {/* 卡片背景 */}
                    <img src={cardBg} alt="card_bg"
                        style={{ position: "absolute", left: 0, top: 0, width: CARD_W, height: CARD_H }} />

                    {/* 曲目类型图标 */}
                    <img src={typeImg} alt="type"
                        style={{ position: "absolute", left: 0, top: 0 }} />

                    {/* 评级图标 */}
                    <img src={rankImg} alt="rank"
                        style={{ position: "absolute", left: 0, top: 0 }} />

                    {/* Combo playbonus 图标 */}
                    {comboImg && (
                        <img src={comboImg} alt="combo"
                            style={{ position: "absolute", left: 0, top: 0 }} />
                    )}

                    {/* Sync playbonus 图标 */}
                    {syncImg && (
                        <img src={syncImg} alt="sync"
                            style={{ position: "absolute", left: 0, top: 0 }} />
                    )}

                    {/* DX Star 图标 */}
                    {starImg && (
                        <img src={starImg} alt="star"
                            style={{ position: "absolute", left: 0, top: 0 }} />
                    )}

                    {/* 序号 + 歌曲 ID（MetaFont，黑色） */}
                    <span style={{
                        position: "absolute", left: 136, top: 109,
                        fontFamily: "MetaFont",
                        fontSize: 17.5,
                        color: "black",
                    }}>
                        #{index + 1}:{r.id}
                    </span>

                    {/* 达成率（MetaFont） */}
                    <span style={{
                        position: "absolute", left: 136, top: 77,
                        fontFamily: "MetaFont",
                        fontSize: 22.5,
                        color: "white",
                    }}>
                        {r.achievements.toFixed(4)}%
                    </span>

                    {/* 定数 / DX Rating（ConstantFont，接入 abstracts 后替换定数） */}
                    <span style={{
                        position: "absolute", left: 17, top: 15,
                        fontFamily: "ConstantFont",
                        fontSize: 14,
                        color: "black",
                    }}>
                        {/* 定数占位 */}
                        ds: -
                    </span>

                    <span style={{
                        position: "absolute", left: 17, top: 15,
                        fontFamily: "ConstantFont",
                        fontSize: 14,
                        color: "black",
                    }}>
                        {/* DX Rating 占位（需定数，接入 abstracts 后替换） */}
                        ra: -
                    </span>
                </div>
            )
        }

        // ==================== 姓名框画布函数 ====================
        // 原始画布 1104×200，等比缩放至宽 1107
        const NP_W_ORIG = 1104
        const NP_H_ORIG = 200
        const NP_W = 1107
        const NP_SCALE = NP_W / NP_W_ORIG          // ≈ 1.00272
        const NP_H = Math.round(NP_H_ORIG * NP_SCALE) // 201

        const s = (v: number) => Math.round(v * NP_SCALE) // 坐标/尺寸等比换算助手

        // best_35 rating 总和 / best_15 rating 总和（由各记录 dx_rate 累加）
        const b35Total = best_35.reduce((sum, r) => sum + r.dx_rate, 0)
        const b15Total = best_15.reduce((sum, r) => sum + r.dx_rate, 0)

        const renderNameplate = () => (
            <div style={{
                position: "absolute",
                left: 0,
                top: 1,
                width: NP_W,
                height: NP_H,
                display: "flex",
                overflow: "visible",
            }}>

                {/* 层 1: 姓名板底图（collection/plate），等比缩放，null 时跳过 */}
                {nameplatePlateImg && (
                    <img src={nameplatePlateImg} alt="plate"
                        style={{ position: "absolute", left: s(32), top: s(27), width: NP_W, height: s(178) }} />
                )}

                {/* 层 3: 头像（collection/icon），等比缩放，null 时跳过 */}
                {nameplateIconImg && (
                    <img src={nameplateIconImg} alt="icon"
                        style={{ position: "absolute", left: s(46), top: s(41), width: s(150), height: s(150) }} />
                )}

                {/* 层 4: name.png — 全画布尺寸，贴在 (0,0) */}
                <img src={nameplateNameImg} alt="nameplate-name"
                    style={{ position: "absolute", left: 3, top: 0, width: NP_W, height: NP_H }} />

                {/* 层 5: rat 图 — 全画布尺寸，贴在 (0,0) */}
                <img src={nameplateRatImg} alt="nameplate-rat"
                    style={{ position: "absolute", left: 0, top: 0, width: NP_W, height: NP_H }} />

                {/* 层 6: title 称号框 — 全画布尺寸，null 时跳过 */}
                {nameplateTitleImg && (
                    <img src={nameplateTitleImg} alt="nameplate-title"
                        style={{ position: "absolute", left: 3, top: 0, width: NP_W, height: NP_H }} />
                )}

                {/* 层 7: dan 图 — 全画布尺寸，null 时跳过 */}
                {nameplateDanImg && (
                    <img src={nameplateDanImg} alt="nameplate-dan"
                        style={{ position: "absolute", left: 0, top: 0, width: NP_W, height: NP_H }} />
                )}

                {/* 层 8: class 图 — 全画布尺寸，null 时跳过 */}
                {nameplateClassImg && (
                    <img src={nameplateClassImg} alt="nameplate-class"
                        style={{ position: "absolute", left: 0, top: 0, width: NP_W, height: NP_H }} />
                )}

                {/* 层 9: 玩家 Rating 数字 — 等比右对齐，金色 */}
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

                {/* 层 10: 玩家昵称 — 等比，黑色 */}
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

                {/* 层 11: 旧版本 + 新版本 Rating 总和 — 白色描边文字 */}
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
        // ==================== 姓名框画布函数结束 ====================

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
                {/* frame — 宽 1700　1高 711，贴在 (0,0)，居于 background 下层（对应 Python 第 7-11 行） */}
                {nameplateFrameImg && (
                    <img src={nameplateFrameImg} alt="frame"
                        style={{ position: "absolute", left: 0, top: 0, width: 1700, height: 711, pointerEvents: "none" }} />
                )}

                {/* 姓名框—贴在 (0, 1)，1107×201 */}
                {renderNameplate()}

                {/* 背景图置于最顶层（对应 Python 最后 alpha_composite） */}
                <img src={background} alt="background"
                    style={{ position: "absolute", left: 0, top: 0, width: "100%", height: "100%", pointerEvents: "none" }} />

                {/* best_35 卡片区域（5列×5行，左上角 14,748） */}
                {best_35.map((r, i) => renderCard(r, i, B35_X, B35_Y))}

                {/* best_15 卡片区域（5列×3行，左上角 14,1910） */}
                {best_15.map((r, i) => renderCard(r, i, B15_X, B15_Y))}

            </div>
        )
    })