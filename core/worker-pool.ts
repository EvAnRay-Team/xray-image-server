import type {
    RenderTask,
    WorkerInstance,
    WorkerPoolConfig,
    WorkerRequestMessage,
    WorkerResponseMessage,
    PoolStats
} from "./worker-types"
import { WorkerStatus } from "./worker-types"
import { getLogger } from "./logger"
import type { Logger } from "winston"
import { snowflake } from "./utils"

/**
 * 默认配置
 */
const DEFAULT_CONFIG: Required<WorkerPoolConfig> = {
    workerCount: 4,
    maxQueueSize: 100,
    maxWorkerErrors: 3,
    taskTimeout: 30000, // 30秒
    verbose: false
}

/**
 * Worker 线程池管理器
 */
export class WorkerPool {
    private config: Required<WorkerPoolConfig>
    private workers: Map<string, WorkerInstance> = new Map()
    private taskQueue: RenderTask[] = []
    private activeTasks: Map<string, RenderTask> = new Map()
    private taskTimeouts: Map<string, Timer> = new Map()

    private logger?: Logger

    // 统计信息
    private stats = {
        completedTasks: 0,
        failedTasks: 0,
        totalDuration: 0
    }

    constructor(config: WorkerPoolConfig = {}) {
        this.config = { ...DEFAULT_CONFIG, ...config }
    }

    /**
     * 初始化线程池
     */
    async initialize(): Promise<void> {
        this.logger = getLogger()

        this.logger.info(
            `initializing worker pool with ${this.config.workerCount} workers`
        )

        const initPromises = []

        for (let i = 0; i < this.config.workerCount; i++) {
            initPromises.push(this.createWorker())
        }

        await Promise.all(initPromises)
        this.logger.info(
            `worker pool initialized successfully with ${this.workers.size} workers ready`
        )
    }

    /**
     * 创建新的 Worker 实例
     */
    private async createWorker(): Promise<WorkerInstance> {
        const workerId = crypto.randomUUID()

        return new Promise((resolve, reject) => {
            try {
                const worker = new Worker(
                    new URL("./render-worker.ts", import.meta.url).href
                )

                const workerInstance: WorkerInstance = {
                    id: workerId,
                    worker,
                    status: WorkerStatus.IDLE,
                    currentTask: null,
                    tasksCompleted: 0,
                    errorsCount: 0,
                    createdAt: Date.now(),
                    lastActiveAt: Date.now()
                }

                // 设置消息处理器
                worker.onmessage = (
                    event: MessageEvent<WorkerResponseMessage>
                ) => {
                    this.handleWorkerMessage(workerInstance, event.data)
                }

                // 设置错误处理器
                worker.onerror = (error: ErrorEvent) => {
                    this.handleWorkerError(workerInstance, error)
                }

                // 等待 Worker 就绪信号
                const readyHandler = (
                    event: MessageEvent<WorkerResponseMessage>
                ) => {
                    if (event.data.type === "ready") {
                        worker.onmessage = (
                            e: MessageEvent<WorkerResponseMessage>
                        ) => {
                            this.handleWorkerMessage(workerInstance, e.data)
                        }
                        this.workers.set(workerId, workerInstance)
                        this.logger?.debug(`worker ${workerId} is ready`)
                        resolve(workerInstance)
                    }
                }

                worker.onmessage = readyHandler

                // 超时处理
                setTimeout(() => {
                    if (!this.workers.has(workerId)) {
                        worker.terminate()
                        reject(
                            new Error(
                                `Worker ${workerId} initialization timeout`
                            )
                        )
                    }
                }, 5000)
            } catch (error) {
                reject(error)
            }
        })
    }

    /**
     * 处理 Worker 消息
     */
    private handleWorkerMessage(
        workerInstance: WorkerInstance,
        message: WorkerResponseMessage
    ): void {
        switch (message.type) {
            case "success": {
                const task = this.activeTasks.get(message.taskId)
                if (!task) {
                    this.logger?.warn(
                        `received success for unknown task: ${message.taskId}`
                    )
                    return
                }

                // 清除超时定时器
                this.clearTaskTimeout(message.taskId)

                // 更新统计信息
                this.stats.completedTasks++
                this.stats.totalDuration += message.duration
                workerInstance.tasksCompleted++

                // 解析任务
                const buffer = Buffer.from(message.buffer)
                task.resolve(buffer)

                // 清理任务
                this.activeTasks.delete(message.taskId)
                this.finishWorkerTask(workerInstance)

                this.logger?.debug(
                    `task ${message.taskId} completed in ${message.duration}ms by worker ${workerInstance.id}`
                )
                break
            }

            case "error": {
                const task = this.activeTasks.get(message.taskId)
                if (!task) {
                    this.logger?.warn(
                        `received error for unknown task: ${message.taskId}`
                    )
                    return
                }

                // 清除超时定时器
                this.clearTaskTimeout(message.taskId)

                // 更新统计信息
                this.stats.failedTasks++
                workerInstance.errorsCount++

                // 拒绝任务
                task.reject(new Error(message.error))

                // 清理任务
                this.activeTasks.delete(message.taskId)
                this.finishWorkerTask(workerInstance)

                this.logger?.warn(
                    `task ${message.taskId} failed in worker ${workerInstance.id}: ${message.error}`
                )

                // 检查是否需要重启 Worker
                if (workerInstance.errorsCount >= this.config.maxWorkerErrors) {
                    this.logger?.warn(
                        `worker ${workerInstance.id} exceeded error limit, restarting...`
                    )
                    this.restartWorker(workerInstance)
                }
                break
            }

            case "ready":
                // 已在初始化时处理
                break
        }
    }

    /**
     * 处理 Worker 错误
     */
    private handleWorkerError(
        workerInstance: WorkerInstance,
        error: ErrorEvent
    ): void {
        this.logger?.warn(
            `worker ${workerInstance.id} encountered error: ${error.message}`
        )

        workerInstance.errorsCount++
        workerInstance.status = WorkerStatus.ERROR

        // 如果有正在执行的任务，将其设置为失败
        if (workerInstance.currentTask) {
            const task = workerInstance.currentTask
            this.clearTaskTimeout(task.taskId)
            task.reject(
                new Error(`Worker error: ${error.message || "Unknown error"}`)
            )
            this.activeTasks.delete(task.taskId)
            this.stats.failedTasks++
        }

        // 重启 Worker
        this.restartWorker(workerInstance)
    }

    /**
     * 完成 Worker 任务并尝试分配新任务
     */
    private finishWorkerTask(workerInstance: WorkerInstance): void {
        workerInstance.currentTask = null
        workerInstance.status = WorkerStatus.IDLE
        workerInstance.lastActiveAt = Date.now()

        // 尝试从队列中分配新任务
        this.scheduleNextTask()
    }

    /**
     * 重启 Worker
     */
    private async restartWorker(workerInstance: WorkerInstance): Promise<void> {
        this.logger?.debug(`restarting worker ${workerInstance.id}`)

        // 终止旧 Worker
        workerInstance.worker.terminate()
        workerInstance.status = WorkerStatus.TERMINATED
        this.workers.delete(workerInstance.id)

        try {
            // 创建新 Worker
            await this.createWorker()
            this.scheduleNextTask()
        } catch (error) {
            this.logger?.error(
                `failed to restart worker: ${error instanceof Error ? error.message : String(error)}`
            )
        }
    }

    /**
     * 调度下一个任务
     */
    private scheduleNextTask(): void {
        // 如果队列为空，不执行操作
        if (this.taskQueue.length === 0) {
            return
        }

        // 查找空闲的 Worker
        const idleWorker = this.findIdleWorker()
        if (!idleWorker) {
            return
        }

        // 从队列中取出任务
        const task = this.taskQueue.shift()
        if (!task) {
            return
        }

        // 分配任务给 Worker
        this.assignTaskToWorker(idleWorker, task)
    }

    /**
     * 查找空闲的 Worker
     */
    private findIdleWorker(): WorkerInstance | null {
        for (const worker of this.workers.values()) {
            if (worker.status === WorkerStatus.IDLE) {
                return worker
            }
        }
        return null
    }

    /**
     * 将任务分配给 Worker
     */
    private assignTaskToWorker(
        workerInstance: WorkerInstance,
        task: RenderTask
    ): void {
        workerInstance.status = WorkerStatus.BUSY
        workerInstance.currentTask = task
        this.activeTasks.set(task.taskId, task)

        // 设置超时定时器
        const timeout = setTimeout(() => {
            this.handleTaskTimeout(task.taskId)
        }, this.config.taskTimeout)

        this.taskTimeouts.set(task.taskId, timeout)

        // 发送任务消息给 Worker
        const message: WorkerRequestMessage = {
            type: "render",
            taskId: task.taskId,
            templateName: task.templateName,
            input: task.input
        }

        workerInstance.worker.postMessage(message)

        this.logger?.debug(
            `assigned task ${task.taskId} to worker ${workerInstance.id}`
        )
    }

    /**
     * 处理任务超时
     */
    private handleTaskTimeout(taskId: string): void {
        const task = this.activeTasks.get(taskId)
        if (!task) {
            return
        }

        this.logger?.warn(`task ${taskId} timed out`)

        task.reject(
            new Error(`Task timeout after ${this.config.taskTimeout}ms`)
        )
        this.activeTasks.delete(taskId)
        this.stats.failedTasks++

        // 查找执行此任务的 Worker 并重启它
        for (const worker of this.workers.values()) {
            if (worker.currentTask?.taskId === taskId) {
                this.restartWorker(worker)
                break
            }
        }
    }

    /**
     * 清除任务超时定时器
     */
    private clearTaskTimeout(taskId: string): void {
        const timeout = this.taskTimeouts.get(taskId)
        if (timeout) {
            clearTimeout(timeout)
            this.taskTimeouts.delete(taskId)
        }
    }

    /**
     * 提交渲染任务
     */
    async render(
        templateName: string,
        input: Record<string, any>
    ): Promise<Buffer> {
        return new Promise((resolve, reject) => {
            // 检查队列是否已满
            if (this.taskQueue.length >= this.config.maxQueueSize) {
                reject(new Error("Task queue is full, reject task"))
                return
            }

            // 创建任务
            const task: RenderTask = {
                taskId: snowflake.nextBase36Id(),
                templateName,
                input,
                resolve,
                reject,
                createdAt: Date.now()
            }

            // 查找空闲的 Worker
            const idleWorker = this.findIdleWorker()

            if (idleWorker) {
                // 立即分配任务
                this.assignTaskToWorker(idleWorker, task)
            } else {
                // 加入队列等待
                this.taskQueue.push(task)
                this.logger?.info(
                    `task ${task.taskId} queued (queue size: ${this.taskQueue.length})`
                )
            }
        })
    }

    /**
     * 获取线程池统计信息
     */
    getStats(): PoolStats {
        let idleWorkers = 0
        let busyWorkers = 0

        for (const worker of this.workers.values()) {
            if (worker.status === WorkerStatus.IDLE) {
                idleWorkers++
            } else if (worker.status === WorkerStatus.BUSY) {
                busyWorkers++
            }
        }

        return {
            totalWorkers: this.workers.size,
            idleWorkers,
            busyWorkers,
            queuedTasks: this.taskQueue.length,
            completedTasks: this.stats.completedTasks,
            failedTasks: this.stats.failedTasks,
            averageTaskDuration:
                this.stats.completedTasks > 0
                    ? this.stats.totalDuration / this.stats.completedTasks
                    : 0
        }
    }

    /**
     * 关闭线程池
     */
    async shutdown(): Promise<void> {
        this.logger?.info("shutting down worker pool...")

        // 拒绝所有排队的任务
        for (const task of this.taskQueue) {
            task.reject(new Error("Worker pool is shutting down"))
        }
        this.taskQueue = []

        // 拒绝所有活跃的任务
        for (const task of this.activeTasks.values()) {
            task.reject(new Error("Worker pool is shutting down"))
        }
        this.activeTasks.clear()

        // 清除所有超时定时器
        for (const timeout of this.taskTimeouts.values()) {
            clearTimeout(timeout)
        }
        this.taskTimeouts.clear()

        // 终止所有 Worker
        for (const worker of this.workers.values()) {
            worker.worker.terminate()
            worker.status = WorkerStatus.TERMINATED
        }
        this.workers.clear()

        this.logger?.info("worker pool shut down complete")
    }
}

/**
 * 全局单例线程池实例
 */
let globalPool: WorkerPool | null = null

/**
 * 获取全局线程池实例
 */
export function getGlobalWorkerPool(config?: WorkerPoolConfig): WorkerPool {
    if (!globalPool) {
        globalPool = new WorkerPool(config)
    }
    return globalPool
}

/**
 * 初始化全局线程池
 */
export async function initializeGlobalWorkerPool(
    config?: WorkerPoolConfig
): Promise<WorkerPool> {
    const pool = getGlobalWorkerPool(config)
    await pool.initialize()
    return pool
}

/**
 * 关闭全局线程池
 */
export async function shutdownGlobalWorkerPool(): Promise<void> {
    if (globalPool) {
        await globalPool.shutdown()
        globalPool = null
    }
}
