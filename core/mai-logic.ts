
/**
 * Maimai DX 游戏逻辑工具函数
 * 移植自 xray_mai_bot_v2
 */

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

// #endregion

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
