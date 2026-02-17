import z from "zod"
import { createRenderTemplate } from "../core/render-template"
import { AssetsManager } from "../core/asset"
import { absoluteStyle } from "../core/utils"
// import { getRank, getDxStar, getDxRating, getChartMaxDxScore } from "../core/mai-logic"
import { MaiMusicRecordSchema } from "../core/mai-dto"
import { VERSION_LOGO_MAP, SPECIAL_MUSIC_BG_MAP } from "../core/mai-constants"

export const maiMusicInfoTemplate = createRenderTemplate("maiMusicInfo")
    .addFont({ id: "TitleFont", filename: "FOT-NewRodinProN-UB.otf" })
    .addFont({ id: "FallbackFont", filename: "SEGUISYM.TTF" }) // 全局回退字体
    .addFont({ id: "MetaFont", filename: "江城圆体 700W.ttf" })
    .addFont({ id: "AuthorFont", filename: "江城圆体 700W.ttf" })
    .addFont({ id: "ConstantFont", filename: "RoGSanSrfStd-Bd.otf" }) // 用于定数 (DS) 和 Note 数量
    .setOption({
        width: 1700,
        height: 2000 // 参考 Python 的 2000 高度
    })
    .setInput(MaiMusicRecordSchema)
    .setElement(async (input) => {
        const { basic_info, charts, is_abstract } = input

        // 1. 准备背景
        const musicId = Number(basic_info.id)
        
        // 判断是否为特殊背景
        // 参考 Python: self.special_backgrounds = {11663: ("系.png", (60, 60, 60)), ...}
        // 在 TypeScript 中，SPECIAL_MUSIC_BG_MAP 通常只映射 ID 到文件名。
        // 我们直接使用常量中的映射。
        const specialBgName = SPECIAL_MUSIC_BG_MAP[musicId]
        const isSpecialBg = !!specialBgName

        const bgPath = isSpecialBg
            ? `maimaidx/music_info/special_bg/${specialBgName}`
            : "maimaidx/music_info/background/bg_circle.png";

        // 2. 预加载基础资源
        const [bgImg, coverImg, typeIconImg] = await Promise.all([
            AssetsManager.getLocalImage(bgPath),
            AssetsManager.getMusicCover(musicId, is_abstract),
            AssetsManager.getLocalImage(`maimaidx/music_info/type/${basic_info.type}.png`),
        ])

        // 3. 准备版本图标
        let versionLogoImg: string | null = null
        if (VERSION_LOGO_MAP[basic_info.version.cn_ver]) {
            try {
                const verCode = VERSION_LOGO_MAP[basic_info.version.cn_ver]
                versionLogoImg = await AssetsManager.getLocalImage(`maimaidx/版本牌/UI_CMN_TabTitle_MaimaiTitle_Ver${verCode}.png`)
            } catch (e) {
                console.error("Failed to load version logo", e)
            }
        }

        // 4. 判断谱面类型 (是否有Remaster难度)
        // Python 逻辑: len(ds) > 4 意味着有Remaster (5个难度)，否则为标准 (4个难度)
        // 在 TS 中，charts 是一个数组
        const hasRemaster = charts.length > 4

        // 5. 预加载 信息栏/谱师栏 背景 (仅在非特殊背景时显示)
        let infoBgImg: string | null = null
        let creatorBgImg: string | null = null

        if (!isSpecialBg) {
             // Python 逻辑:
             // 如果有Remaster难度 (len > 4): 
             //    信息背景 = im_circle_2.png
             //    谱师背景 = cr_circle_2.png
             // 否则:
             //    信息背景 = im_circle_1.png
             //    谱师背景 = cr_circle_1.png
             
             const suffix = hasRemaster ? "2" : "1"
             const [iBg, cBg] = await Promise.all([
                 AssetsManager.getLocalImage(`maimaidx/music_info/information/im_circle_${suffix}.png`),
                 AssetsManager.getLocalImage(`maimaidx/music_info/creator/cr_circle_${suffix}.png`)
             ])
             infoBgImg = iBg
             creatorBgImg = cBg
        }

        // 格式化 Note 列表的辅助函数
        const getNoteList = (chart: typeof charts[0]) => {
            const { tap, hold, slide, touch, break_note: brk, total } = chart.notes
            const notes: (number | string)[] = []
            
            // 基于 Python 逻辑观察 & 标准/DX 结构的实现:
            // Python: notes = list(chart['notes']). 
            // 如果 len(notes) == 4, 在索引 3 插入 '-' -> [0, 1, 2, '-', 3] (即 [Tap, Hold, Slide, '-', Break])
            // 我们将模仿这个结构。
            notes.push(tap, hold, slide)
            
            if (touch !== undefined && touch !== null) {
                notes.push(touch) // DX 谱面包含 touch
            } else {
                // 如果没有 touch，标准模式，稍后会插入占位符
                // 实际上 Python 逻辑 'len(notes)==4' 隐含了没有 touch 的情况。
                // 它插入 '-' 是为了将 Break 对齐到底部。
            }

            notes.push(brk)
            
            if (notes.length === 4) {
                 notes.splice(3, 0, "-")
            }

            // 在开头插入总数 (Total)
            notes.unshift(total)
            
            return notes
        }

        // 谱师坐标映射 (x, y)
        // 三行时（有Remaster）：基于原位置向下移动30像素
        // 两行时（无Remaster）：保持原位置
        const charterCoords = hasRemaster 
            ? [null, null, {x: 428, y: 1486}, {x: 428, y: 1566}, {x: 428, y: 1646}]
            : [null, null, {x: 431, y: 1506}, {x: 431, y: 1626}]

        // 特殊背景的文字颜色
        // Python: self.special_backgrounds = {11663: ..., 834: ...}
        // ID 834 默认为白色, 11663 为 (60,60,60)。
        // 这里模拟这个简单的逻辑。
        const getTextColor = () => {
             if (!isSpecialBg) return "black"
             if (musicId === 834) return "white"
             if (musicId === 11663) return "rgb(60,60,60)"
             return "black" // 默认回退颜色
        }
        const textColor = getTextColor()


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
                {/* 1. 封面与背景 */}
                <img src={coverImg} style={absoluteStyle(494, 494, 192, 172)} alt="cover" />
                <img src={bgImg} style={absoluteStyle(1700, 2000, 0, 0)} alt="background" />

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
                    ...absoluteStyle(822, 630) 
                }}>{basic_info.id}</span>

                {/* 元数据：BPM */}
                <span style={{ 
                    fontFamily: "MetaFont", 
                    fontSize: 49, 
                    color: "white",
                    transform: "translate(-50%, -50%)",
                    ...absoluteStyle(980, 630),
                }}>{basic_info.bpm}</span>

                {/* 元数据：分类 */}
                <span style={{ 
                    fontFamily: "MetaFont", 
                    fontSize: 44, 
                    color: "white",
                    transform: "translate(-50%, -50%)",
                    ...absoluteStyle(1208.5, 630),
                }}>{basic_info.genre}</span>

                {/* 类型图标 */}
                <img src={typeIconImg} style={absoluteStyle(91, 42, 1396, 608)} alt="type" />
               
                {/* 版本图标 */}
                {versionLogoImg && (
                    <img src={versionLogoImg} style={{
                        ...absoluteStyle(332, 160, 250, 150),
                        transform: "translate(-50%, -50%)"
                    }} alt="ver" />
                )}

                {/* 7. 信息区域 (定数 & Notes) - 仅在非特殊背景时显示 */}
                {!isSpecialBg && infoBgImg && (
                    <>
                        <img src={infoBgImg} style={absoluteStyle(1700, 2000, 0, 0)} alt="info_bg" />
                        
                        {charts.map((chart, index) => {
                            // 布局常量
                            const xBase = hasRemaster ? 556 + 202 * index : 656 + 202 * index
                            
                            // 定数 (DS)
                            const dsStr = chart.constant.toFixed(1)
                            
                            // Note 列表
                            const noteList = getNoteList(chart)

                            return (
                                <div key={index} style={{ display: "contents" }}>
                                    {/* DS - Python: (xBase, 829), 大小 50 */}
                                    <span style={{
                                        fontFamily: "ConstantFont",
                                        fontSize: 50,
                                        color: "white",
                                        position: "absolute",
                                        left: xBase,
                                        top: 829,
                                        transform: "translate(-50%, -50%)"
                                    }}>{dsStr}</span>

                                    {/* Notes - Python: (xBase, 891 + 88 * i), 大小 48 */}
                                    {noteList.map((val, nIdx) => (
                                        <span key={nIdx} style={{
                                            fontFamily: "ConstantFont",
                                            fontSize: 48,
                                            color: "black",
                                            position: "absolute",
                                            left: xBase,
                                            top: 891 + 88 * nIdx,
                                            transform: "translate(-50%, 0)" // Python 文本锚点似乎与顶部中心相关？
                                            // Python: `TapDataDraw.text((x - w/2, y), ...)` 其中 y 是 891 + ...
                                            // 所以 X 是中心。 Y 是顶部。
                                        }}>
                                            {val}
                                        </span>
                                    ))}
                                </div>
                            )
                        })}
                    </>
                )}

                {/* 8. 谱师区域 - 仅在非特殊背景时显示 */}
                {!isSpecialBg && creatorBgImg && (
                     <>
                        <img src={creatorBgImg} style={absoluteStyle(1700, 2000, 0, 0)} alt="creator_bg" />
                        {charts.map((chart, index) => {
                            const coords = charterCoords[index]
                            if (!coords) return null

                            // 渲染谱师名称 - 单行显示，超出截断并添加省略号
                            return (
                                <span key={index} style={{
                                    position: "absolute",
                                    left: coords.x,
                                    top: coords.y,
                                    fontFamily: "AuthorFont",
                                    fontSize: 40,
                                    color: "black",
                                    width: "550px",
                                    whiteSpace: "nowrap",
                                    overflow: "hidden",
                                    textOverflow: "ellipsis",
                                    transform: "translateY(-50%)",
                                }}>
                                    {chart.designer}
                                </span>
                            )
                        })}
                     </>
                )}

                {/* 9. 版本 & 抽象画作者 */}
                {/* 版本 - Python: (1262, 1499) 居中 */}
                <span style={{
                    fontFamily: "AuthorFont",
                    fontSize: 40,
                    color: textColor,
                    position: "absolute",
                    left: 1320,
                    top: 1513,
                    transform: "translate(-50%, 0)", // 文本顶部对齐
                    width: "420px",
                    textAlign: "center",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis"
                }}>
                    {basic_info.version.text}
                </span>

                {/* 抽象画作者 - Python: (1262, 1618) 居中 */}
                 <span style={{
                    fontFamily: "AuthorFont",
                    fontSize: 40,
                    color: textColor,
                    position: "absolute",
                    left: 1325,
                    top: 1632,
                    transform: "translate(-50%, 0)",
                    width: "420px",
                    textAlign: "center",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis"
                }}>
                    {/* 抽象画作者的占位符 */}
                    {is_abstract ? "Abstract Artist" : ""}
                </span>
            </div>
        )
    })