/**
 * 主线程发送给 Worker 的消息类型
 */
export type WorkerRequestMessage = {
    type: "render"
    taskId: string
    templateName: string
    input: Record<string, any>
}

/**
 * Worker 发送给主线程的消息类型
 */
export type WorkerResponseMessage =
    | {
          type: "ready"
      }
    | {
          type: "success"
          taskId: string
          buffer: ArrayBuffer
          duration: number
      }
    | {
          type: "error"
          taskId: string
          error: string
      }

/**
 * 渲染任务结构
 */
export interface RenderTask {
    taskId: string
    templateName: string
    input: Record<string, any>
    resolve: (buffer: Buffer) => void
    reject: (error: Error) => void
    createdAt: number
}

/**
 * Worker 状态
 */
export enum WorkerStatus {
    IDLE = "idle",
    BUSY = "busy",
    ERROR = "error",
    TERMINATED = "terminated"
}

/**
 * Worker 实例信息
 */
export interface WorkerInstance {
    id: string
    worker: Worker
    status: WorkerStatus
    currentTask: RenderTask | null
    tasksCompleted: number
    errorsCount: number
    createdAt: number
    lastActiveAt: number
}

/**
 * 线程池配置
 */
export interface WorkerPoolConfig {
    /** Worker 数量 */
    workerCount?: number
    /** 任务队列最大长度 */
    maxQueueSize?: number
    /** Worker 最大错误次数，超过后重启 */
    maxWorkerErrors?: number
    /** 任务超时时间（毫秒） */
    taskTimeout?: number
    /** 是否启用详细日志 */
    verbose?: boolean
}

/**
 * 线程池统计信息
 */
export interface PoolStats {
    totalWorkers: number
    idleWorkers: number
    busyWorkers: number
    queuedTasks: number
    completedTasks: number
    failedTasks: number
    averageTaskDuration: number
}
