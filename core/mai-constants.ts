
/**
 * Maimai DX 静态数据字典 / 资源映射
 */

// 版本名 -> 版本 Logo ID 映射
export const VERSION_LOGO_MAP: Record<string, string> = {
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

// 特殊歌曲 ID -> 背景文件名映射
export const SPECIAL_MUSIC_BG_MAP: Record<number, string> = {
    11663: "系.png",
    834: "潘.png"
}

// 歌曲类型 -> 图标文件名映射
export const MUSIC_TYPE_ICON_MAP: Record<string, string> = {
    "DX": "DX",
    "SD": "SD",  // Standard
}
