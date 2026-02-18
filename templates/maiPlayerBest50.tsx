import z from "zod"
import { createRenderTemplate } from "../core/render-template"
import { AssetsManager } from "../core/asset"
import { absoluteStyle, formatMaiResourceName } from "../core/utils"
import { getRank, getDxStar, getDxRating, getChartMaxDxScore } from "../core/mai-logic"

export const maiPlayerBest50Template = createRenderTemplate("maiPlayerBest50")
    //单曲卡片内字体
    .addFont({ id : "TtielFont" , filename: "FOT-NewRodinProN-UB.otf"})//歌曲标题
    .addFont({ id : "MetaFont" , filename: "RoGSanSrfStd-Bd.otf"})//完成率,排名,id
    .addFont({ id : "ConstantFont" , filename: "RoGSanSrfStd-Ud.otf"})//定数,DXRanting
    //用户数据字体
    .addFont({ id : "RatingFont" , filename: "江城圆体 700W.ttf"})//用户Rating
    .addFont({ id : "UserNameFont" , filename: "江城圆体 600W.ttf"})//用户名
    .setOption({
        width: 1700,
        height: 2369
    })