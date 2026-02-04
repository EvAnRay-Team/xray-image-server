# Xray Image Server

Xray bot V3 的图像渲染服务端，使用 satori, resvg 和 elysia 构建。

部分功能依赖 PostgreSQL 和 腾讯云 OSS 服务，如有使用需求请自行搭建。

## 特性

- TypeScript！
- 类型安全、简单易用
- 多线程图像渲染

## 安装 & 运行

**请务必使用 Bun 作为运行时！**

**请务必使用 Bun 作为运行时！**

**请务必使用 Bun 作为运行时！**

`xray-image-server` 的很多功能直接使用了 bun 提供的原生 API，这意味着 nodeJS 和 deno 不能运行这个项目！

你可以在 [这里](https://bun.sh/) 下载并安装 Bun。

```bash
git clone git@github.com:EvAnRay-Team/xray-image-server.git

cd xray-image-server

bun install
```

运行以上命令将克隆该项目并安装所需的依赖。

`xray-image-server` 的配置使用 server.config.ts 来进行，配置项参考如下：

```typescript
import { defineConfig } from "./core/config"

export default defineConfig({
    debug: true,
    port: 3000,
    db: {
        url:
            process.env.DATABASE_URL ||
            "postgres://username:password@localhost:5432/database"
    },
    logger: {
        enableFileTransport: true,
        logDir: "./logs",
        filename: "log-%DATE%.jsonl",
        datePattern: "YYYY-MM-DD",
        maxFiles: "7d",
        maxSize: "100m"
    }
})

在目录下使用 `bun run start` 即可启动服务。
```

## 静态资源

`xray-image-server` 的大部分图片模板的资源都直接存储在仓库的`assets/fonts` 和 `assets/images` 目录下，和玩家上传的静态资源相关的功能则需要使用数据库和 OSS 服务在线下载到本地，这部分资源会被放在 `assets/downloads` 中。

由于这些资源均为二进制文件且数量较多，会导致仓库的 release 包体体积偏大，~~为了用着方便请忍耐一下~~（

随仓库提供的静态资源仅供学习和测试使用，请在下载后 24 小时内自行删除，请勿将其用于任何商业用途或以任何形式使用其进行盈利。

## API 文档

`xray-image-server` 使用 bun 和 elysia 提供 HTTP API 服务。

> 当前服务端没有实现任何安全验证能力，请避免将服务暴露在局域网之外！

我还在摸鱼，没写喵。

## 图片渲染模板

`xray-image-server` 的图像渲染使用 `satori` 和 `resvg` 实现。

其实现原理为渲染服务将输入数据动态替换到组件模板中，通过 `satori` 将 React Node 转换成 SVG 矢量图数据，再通过 `resvg` 将 SVG 矢量图渲染成 PNG 图像。

你可以通过如下的形式创建一个图像模板：

```typescript
// 还没写喵
```

由于模板的读取是通过特定的模式进行的，模板的文件名称必须和模板名称相同，同时模板常量必须被命名为 `${模板名称}Template`，否则会导致 Worker 线程无法正确读取模板。

## 数据库 & OSS

数据库和 OSS 相关的功能需要通过 `enableOnlineAssets` 配置项启用，启用后可以使用在线数据拉取功能。

为了使用这一功能，你需要配置符合需求的数据库并接入在线的 OSS 服务。

### 数据库

`xray-image-server` 默认使用 PostgreSQL 作为数据存储，不过考虑到实际上是使用 Prisma ORM 来访问数据库的，其实也可以替换成其他的 SQL 数据库。

### OSS

默认来讲，`xray-image-server` 使用 腾讯云 提供的 OSS 服务，如果你使用其他的 OSS 服务商则可能需要自行修改一部分代码以实现替换。

## 开发进度

- ~~下一步是完善日志记录，现在这个样子只能说是勉强能跑。~~

- 日志部分基本完善到可用了，后续使用过程中继续观察哪些地方还有打日志出来的必要性。

- 可以的话可以尝试优化一下主线程和worker现场通信过程的延迟，目前来看这个延迟有些太大了，有很大的提升空间。

- 然后要写一下远程资源的部分。
