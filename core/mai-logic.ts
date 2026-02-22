
/**
 * Maimai DX 游戏逻辑工具函数
 * 移植自 xray_mai_bot_v2
 */

import { AssetsManager } from "./asset";

// #region 字典数据定义

interface RatingCoefficient {
    min: number;
    coef: number;
    fixedAchievement?: number;
}

// 达成率 -> 评级 映射表
export const ACHIEVEMENT_RANK_MAP = [
    { min: 100.5, rank: "SSS+" },
    { min: 100.0, rank: "SSS" },
    { min: 99.5,  rank: "SS+" },
    { min: 99.0,  rank: "SS" },
    { min: 98.0,  rank: "S+" },
    { min: 97.0,  rank: "S" },
    { min: 94.0,  rank: "AAA" },
    { min: 90.0,  rank: "AA" },
    { min: 80.0,  rank: "A" },
    { min: 75.0,  rank: "BBB" },
    { min: 70.0,  rank: "BB" },
    { min: 60.0,  rank: "B" },
    { min: 50.0,  rank: "C" },
    { min: 0,     rank: "D" },
] as const;

// 达成率 -> Rating系数 映射表
export const RATING_COEFFICIENT_MAP: readonly RatingCoefficient[] = [
    { min: 100.5, coef: 22.4, fixedAchievement: 100.5 }, // 特殊情况: >= 100.5% 时，Achievement 固定按 100.5 计算
    { min: 100.0, coef: 21.6 },
    { min: 99.5,  coef: 21.1 },
    { min: 99.0,  coef: 20.8 },
    { min: 98.0,  coef: 20.3 },
    { min: 97.0,  coef: 20.0 },
    { min: 94.0,  coef: 16.8 },
    { min: 90.0,  coef: 15.2 },
    { min: 80.0,  coef: 13.6 },
    { min: 75.0,  coef: 12.0 },
    { min: 70.0,  coef: 11.2 },
    { min: 60.0,  coef: 9.6 },
    { min: 50.0,  coef: 8.0 },
    { min: 0,     coef: 0.0 },
];

// DX分数百分比 -> 星级 映射表
// 注意: 除了 100% 外，其他都是 > (大于) 判断，而非 >=
export const DX_STAR_MAP = [
    { min: 100, star: 7, type: 'equal' },   // === 100
    { min: 99,  star: 6, type: 'greater' }, // > 99
    { min: 97,  star: 5, type: 'greater' }, // > 97 (5星 1级)
    { min: 95,  star: 4, type: 'greater' }, // > 95
    { min: 93,  star: 3, type: 'greater' }, // > 93
    { min: 90,  star: 2, type: 'greater' }, // > 90
    { min: 85,  star: 1, type: 'greater' }, // > 85
    { min: 0,   star: 0, type: 'greater' }, // 默认 0
] as const;

// rat 图阈值 -> 文件名 映射表（rating 升序匹配第一个满足 min 的项）
export const RAT_THRESHOLDS = [
    { min: 15000, name: "rat_150" },
    { min: 14500, name: "rat_145" },
    { min: 14000, name: "rat_140" },
    { min: 13000, name: "rat_130" },
    { min: 12000, name: "rat_120" },
    { min: 10000, name: "rat_100" },
    { min:  8000, name: "rat_080" },
    { min:  6000, name: "rat_060" },
    { min:  4000, name: "rat_040" },
    { min:  3000, name: "rat_030" },
    { min:  2000, name: "rat_020" },
    { min:     0, name: "rat_000" },
] as const;

// dan 字段值 -> 文件名前缀映射
// dan 0-23  对应 nameplate/dan/dan_XX.png
// dan 24-48 对应 nameplate/dan/fbr_XX.png（值 - 24，1-based，即 24->fbr_01）
// 传入 custom_config.dan，返回完整相对路径（不含扩展名）
export function getDanFileStem(dan: number): string {
    if (dan <= 23) {
        return `dan/dan_${String(dan).padStart(2, "0")}`;
    }
    // fbr 序号从 1 开始，dan=24 -> fbr_01
    const fbrIndex = dan - 23;
    return `dan/fbr_${String(fbrIndex).padStart(2, "0")}`;
}

// title 称号框阈值 -> 文件名 映射表
export const TITLE_THRESHOLDS = [
    { min: 15000, name: "15000" },
    { min: 14000, name: "14000" },
    { min: 13000, name: "13000" },
    { min: 12000, name: "12000" },
    { min:     0, name: "10000" },
] as const;

// player_best50 背景主题 → 文件名映射（含 plus 版本，key = theme_config.background）
export const BACKGROUND_THEME_MAP: Record<string, string> = {
    "buddies":   "buddies",
    "buddiesp":  "buddiesp",
    "circle":    "circle",
    "dx":        "dx",
    "festival":  "festival",
    "festivalp": "festivalp",
    "prism":     "prism",
    "prismp":    "prismp",
    "splash":    "splash",
    "splashp":   "splashp",
    "universe":  "universe",
};

// player_best50 rank 图标主题前缀映射（key = theme_config.rank；plus 版共用同一套 rank 图）
export const RANK_THEME_MAP: Record<string, string> = {
    "defaut":    "defaut",
    "buddies":   "buddies",
    "buddiesp":  "buddies",
    "circle":    "circle",
    "dx":        "dx",
    "festival":  "festival",
    "festivalp": "festival",
    "prism":     "prism",
    "prismp":    "prism",
    "splash":    "splash",
    "splashp":   "splash",
    "universe":  "universe",
};

// music_info 背景文件名映射（key = 全局主题；对应 music_info/background/bg_*.png）
export const MUSIC_INFO_BG_THEME_MAP: Record<string, string> = {
    "buddies":   "bg_bud",
    "buddiesp":  "bg_budp",
    "circle":    "bg_circle",
    "dx":        "bg_dx",
    "festival":  "bg_fes",
    "festivalp": "bg_fesp",
    "prism":     "bg_prism",
    "prismp":    "bg_prismp",
    "splash":    "bg_splash",
    "splashp":   "bg_splashp",
    "universe":  "bg_uni",
};

// music_info information/creator 面板主题前缀（key = 全局主题；plus 版共用同一套面板图）
// 对应 music_info/information/im_{prefix}_{1|2}.png
//         music_info/creator/cr_{prefix}_{1|2}.png
export const MUSIC_INFO_PANEL_THEME_MAP: Record<string, string> = {
    "buddies":   "bud",
    "buddiesp":  "bud",
    "circle":    "circle",
    "dx":        "dx",
    "festival":  "fes",
    "festivalp": "fes",
    "prism":     "prism",
    "prismp":    "prism",
    "splash":    "splash",
    "splashp":   "splash",
    "universe":  "uni",
};

// 旅行伙伴等级 -> 素材编号映射 (0, 9, 49, 99, 299, 999, 9999)
export const CHARA_LEVEL_THRESHOLDS = [
    { min: 9999, theme: 7 },
    { min:  999, theme: 6 },
    { min:  299, theme: 5 },
    { min:   99, theme: 4 },
    { min:   49, theme: 3 },
    { min:    9, theme: 2 },
    { min:    0, theme: 1 },
] as const;

// #endregion

/**
 * 映射 play bonus (combo/sync) 状态字符串
 * 将 fsd/fsdp 全量映射为 fdx/fdxp
 */
export function mapPlayBonusStatus(status: string | null | undefined): string {
    if (!status) return "";
    return status.replace(/fsdp/g, "fdxp").replace(/fsd/g, "fdx");
}

/**
 * 达成率 (Achievement) 转 评级 (Rank)
 */
export function getRank(achievement: number): string {
    for (const item of ACHIEVEMENT_RANK_MAP) {
        if (achievement >= item.min) {
            return item.rank;
        }
    }
    return "D";
}

/**
 * DX Rating (RA) 计算
 * 
 * @param ds 谱面定数 (Internal Level)
 * @param achievement 达成率 (0-101.0)
 */
export function getDxRating(ds: number, achievement: number): number {
    for (const item of RATING_COEFFICIENT_MAP) {
        if (achievement >= item.min) {
            // 如果定义了 fixedAchievement，则使用固定值，否则使用实际 achievement
            const calcAchievement = item.fixedAchievement ?? achievement;
            return Math.floor(ds * item.coef * calcAchievement / 100);
        }
    }
    return 0;
}

/**
 * 计算谱面理论 DX 满分
 * 公式: (Tap + Hold + Slide + Touch + Break) * 3
 */
export function getChartMaxDxScore(notes: number[]): number {
    return notes.reduce((a, b) => a + b, 0) * 3;
}

/**
 * DX 分数星级换算 (0-7)
 */
export function getDxStar(dxScore: number, totalNotes: number): number {
    const maxDxScore = totalNotes * 3;
    if (maxDxScore === 0) return 0;
    
    // 计算百分比 (0-100)
    const percentage = (dxScore / maxDxScore) * 100;
    
    for (const item of DX_STAR_MAP) {
        if (item.type === 'equal') {
            if (percentage === item.min) return item.star;
        } else if (item.type === 'greater') {
            if (percentage > item.min) return item.star;
        }
    }
    
    return 0;
}

/**
 * 根据目标 Rating 计算推荐的定数
 */
export function getRecommendData(ra: number) {
    const getTargetDs = (targetRa: number, achievement: number) => {
        // 1.0 到 15.0，步长 0.1
        for (let d = 10; d <= 150; d++) {
            const ds = d / 10;
            const resRa = getDxRating(ds, achievement);
            if (resRa === targetRa || resRa === targetRa + 1 || resRa === targetRa + 2) {
                return ds;
            }
        }
        return -1;
    };

    return {
        sssp: getTargetDs(ra, 100.5),
        sss:  getTargetDs(ra, 100.0),
        ssp:  getTargetDs(ra, 99.5),
        ss:   getTargetDs(ra, 99.0),
    };
}

/**
 * 封面 id 解析：4位id前补1；5位id若封面不存在则回退到去掉首位后的id
 */
export async function resolveCoverId(id: number): Promise<{ coverId: number; coverSrc: string }> {
    let coverId = id;
    // 4位数 id → 补首位 1
    if (id >= 1000 && id <= 9999) {
        coverId = id + 10000;
    }
    // 5位数 id → 先尝试原始 id，找不到则降为去掉首位的 id
    if (coverId >= 10000 && coverId <= 99999) {
        try {
            const src = await AssetsManager.getLocalImage(`maimaidx/normal_cover/${coverId}.png`);
            return { coverId, coverSrc: src };
        } catch {
            // 封面不存在，去掉首位数字（例如 10333 → 333）
            const fallbackId = coverId % 10000;
            const src = await AssetsManager.getLocalImage(`maimaidx/normal_cover/${fallbackId}.png`);
            return { coverId: fallbackId, coverSrc: src };
        }
    }
    // 其他情况直接加载
    const src = await AssetsManager.getLocalImage(`maimaidx/normal_cover/${coverId}.png`);
    return { coverId, coverSrc: src };
}

/**
 * 根据伙伴等级获取对应的素材主题编号 (1-7)
 */
export function getCharaTheme(level: number): number {
    for (const item of CHARA_LEVEL_THRESHOLDS) {
        if (level >= item.min) return item.theme;
    }
    return 1;
}
