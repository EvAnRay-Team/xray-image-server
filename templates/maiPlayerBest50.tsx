import z from "zod"
import sharp from "sharp"
import { join } from "path"
import { createRenderTemplate } from "../core/render-template"
import { AssetsManager } from "../core/asset"
import { absoluteStyle, formatMaiResourceName } from "../core/utils"
import { getRank, getDxStar, getDxRating, getChartMaxDxScore } from "../core/mai-logic"

// 单曲记录
const ScoreRecordSchema = z.object({
    id: z.number(),
    difficulty: z.number(),
    achievements: z.number(),
    dx_score: z.number(),
    combo_status: z.string(),
    sync_status: z.string(),
    rate: z.string().nullable()
})
//B50数据
const MaiPlayerBest50Schema = z.object({
    user_info: z.object({
        nickname: z.string(),
        plate: z.string(),
        rating: z.number()
    }),
    custom_config: z.object({
        plate: z.string(),
        icon: z.string(),
        frame: z.string()
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
    .addFont({ id: "RatingFont",   filename: "江城圆体 700W.ttf" })       // 用户 Rating
    .addFont({ id: "UserNameFont", filename: "江城圆体 600W.ttf" })       // 用户名
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

        // 预先收集所有曲目，并加载封面 Buffer（供亮度计算复用）
        const allRecords = [...best_35, ...best_15]

        // 封面 fallback ID 推算：找不到封面时的备用 ID
        // 5位ID（如 11554）：去掉首位1和第二位0，取后3位 → 554
        // 4位ID（如  456）：前面加1 → 10456
        const getCoverFallbackId = (id: number): number => {
            const s = String(id)
            if (s.length === 5) return parseInt(s.slice(2))   // 去掉前两位
            if (s.length === 4) return parseInt("1" + s)       // 前加 1
            return id
        }

        // 加载封面 Buffer，找不到时尝试 fallback ID
        const coverBufferMap = new Map(
            await Promise.all(
                allRecords.map(async (r) => {
                    const tryLoad = async (id: number) => {
                        const path = join(process.cwd(), "assets", "static", "image", "maimaidx", "normal_cover", `${id}.png`)
                        const file = Bun.file(path)
                        if (await file.exists()) return Buffer.from(await file.arrayBuffer())
                        return null
                    }
                    const buf = (await tryLoad(r.id)) ?? (await tryLoad(getCoverFallbackId(r.id)))
                    if (!buf) throw new Error(`Cover not found for id: ${r.id}`)
                    return [r.id, buf] as const
                })
            )
        )

        // 感知亮度计算（8x8 缩小采样，0-255），直接接收已加载的 Buffer
        const calcBrightness = async (buf: Buffer): Promise<number> => {
            const { data, info } = await sharp(buf)
                .resize(8, 8, { fit: "fill" })
                .removeAlpha()
                .raw()
                .toBuffer({ resolveWithObject: true })
            let total = 0
            for (let i = 0; i < data.length; i += 3) {
                total += 0.299 * data[i]! + 0.587 * data[i + 1]! + 0.114 * data[i + 2]!
            }
            return total / (info.width * info.height)
        }

        // 亮度 < 40（封面偏暗）→ light 背景；反之 → dark 背景
        // 直接从 coverBufferMap 取 Buffer，无重复 IO
        const getCardBg = async (id: number, difficulty: number): Promise<string> => {
            const buf = coverBufferMap.get(id)!
            const brightness = await calcBrightness(buf)
            const theme = brightness < 40 ? "light" : "dark"
            const diffName = DIFFICULTY_NAME[difficulty] ?? "basic"
            return AssetsManager.getLocalImage(`maimaidx/player_best50/card/card_bg/card_${diffName}_${theme}.png`)
        }

        // 并行生成封面 base64 Map 和卡片背景 base64 Map
        const [coverMap, cardBgMap] = await Promise.all([
            // 封面 base64：直接从已加载的 Buffer 转换（Buffer 已含 fallback 处理）
            Promise.all(
                allRecords.map(async (r) => {
                    const buf = coverBufferMap.get(r.id)!
                    const base64 = buf.toString("base64")
                    return [r.id, `data:image/png;base64,${base64}`] as const
                })
            ).then((entries) => new Map(entries)),
            // 卡片背景 base64
            Promise.all(
                allRecords.map(async (r) => [
                    `${r.id}_${r.difficulty}`,
                    await getCardBg(r.id, r.difficulty)
                ] as const)
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
                {/* 背景 */}
                <img src={background} style={{ position: "absolute", left: 0, top: 0, width: "100%", height: "100%" }} />
                {/* best_35 卡片区域（5列×5行，左上角 14,748） */}
                {best_35.map((r, i) => renderCard(r, i, B35_X, B35_Y))}

                {/* best_15 卡片区域（5列×3行，左上角 14,1910） */}
                {best_15.map((r, i) => renderCard(r, i, B15_X, B15_Y))}
            </div>
        )
    })