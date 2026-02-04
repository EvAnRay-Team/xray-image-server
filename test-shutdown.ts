#!/usr/bin/env bun

// 测试信号发送
const child_process = require("child_process")

console.log("Starting server test...")

// 启动服务器进程
const serverProcess = child_process.spawn("bun", ["run", "start"], {
    stdio: "inherit"
})

console.log(`Server started with PID: ${serverProcess.pid}`)

// 5秒后发送SIGINT信号
setTimeout(() => {
    console.log("Sending SIGINT signal...")
    process.kill(serverProcess.pid, "SIGINT")
}, 5000)

// 监听子进程退出
serverProcess.on("exit", (code: number | null, signal: string | null) => {
    console.log(`Server process exited with code ${code}, signal ${signal}`)
})
