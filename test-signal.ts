#!/usr/bin/env bun

console.log("Starting signal test...")

// 注册信号处理器
process.on("SIGINT", () => {
    console.log("Received SIGINT signal!")
    console.log("Performing cleanup...")
    // 模拟一些清理工作
    setTimeout(() => {
        console.log("Cleanup completed!")
        process.exit(0)
    }, 1000)
})

process.on("SIGTERM", () => {
    console.log("Received SIGTERM signal!")
    console.log("Performing cleanup...")
    setTimeout(() => {
        console.log("Cleanup completed!")
        process.exit(0)
    }, 1000)
})

// 模拟长时间运行的服务
console.log("Server is running... Press Ctrl+C to test signal handling")

// 保持进程运行
setInterval(() => {
    // 保持事件循环活跃
}, 1000)
