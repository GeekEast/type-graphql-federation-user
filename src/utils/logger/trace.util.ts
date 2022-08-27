/* eslint-disable @typescript-eslint/no-explicit-any */
import { highlight } from "cli-highlight"
import safeStringify from "fast-safe-stringify"
import { performance } from "perf_hooks"

import { Logger } from "./logger.util"

interface Options {
  disable?: string[]
  perf?: boolean
  memWatch?: boolean
  logInput?: {
    enabled?: boolean
    beautify?: boolean
  }
}

export function Trace({
  disable = [],
  perf = false,
  memWatch = false,
  logInput = { enabled: true, beautify: false }
}: Options): ClassDecorator {
  return (target: Function) => {
    for (const propertyName of Object.getOwnPropertyNames(target.prototype)) {
      // ignore constructor and disabled class method
      if (propertyName === "constructor") continue
      if (!!disable && disable.includes(propertyName)) continue

      const descriptor = Object.getOwnPropertyDescriptor(target.prototype, propertyName)
      descriptor.configurable = true
      descriptor.writable = true
      const isMethod = descriptor.value instanceof Function
      // ignore attributes
      if (!isMethod) continue

      // modify the method
      const modifiedDescriptor = FuncTrace(target.name, propertyName, descriptor, logInput, perf, memWatch)

      // apply the change
      Object.defineProperty(target.prototype, propertyName, modifiedDescriptor)
    }
  }
}

const FuncTrace = (
  className: string,
  propertyKey: string,
  descriptor: PropertyDescriptor,
  inputLog: {
    enabled?: boolean
    beautify?: boolean
  },
  perf = false,
  memWatch = false
) => {
  const lowerClassName = className.toLowerCase()
  let layer = ""
  if (lowerClassName.includes("service")) layer = "Service"
  if (lowerClassName.includes("repo")) layer = "Repository"
  if (lowerClassName.includes("resolver")) layer = "Resolver"
  if (lowerClassName.includes("controller")) layer = "Controller"

  const path = `${className}.${propertyKey}`
  const originalMethod = descriptor.value
  descriptor.value = function (...args: any[]) {
    logInput(layer, path, args, inputLog.enabled, inputLog.beautify)

    // pre: mem monitor
    let startMemory: number
    if (memWatch) startMemory = process.memoryUsage().rss

    // pre: execution monitor
    let startTime: number
    if (perf) startTime = performance.now()

    // execute function
    const result = originalMethod.apply(this, args)

    // post: execution monitor
    if (perf) {
      const finishTime = performance.now()
      const time = Math.floor((finishTime - startTime) * 100) / 100
      if (time < 10) {
        Logger.info(`${layer}:Performance:Info: ${path} Execution time: ${time} milliseconds`)
      } else if (time < 20) {
        Logger.warn(`${layer}:Performance:Warning: ${path} Execution time: ${time} milliseconds`)
      } else {
        Logger.error(`${layer}:Performance:Error: ${path} Execution time: ${time} milliseconds`)
      }
    }

    // post: mem monitor
    if (memWatch) {
      const finishMemory = process.memoryUsage().rss
      const memoryMargin = bytesToMB(finishMemory - startMemory)
      if (memoryMargin < 5) {
        Logger.info(`${layer}:Performance:Info: ${path} Consumed memory: ${memoryMargin} MB`)
      } else if (memoryMargin < 10) {
        Logger.warn(`${layer}:Performance:Warning: ${path} Consumed memory: ${memoryMargin} MB`)
      } else {
        Logger.error(`${layer}:Performance:Error: ${path} Consumed memory: ${memoryMargin} MB`)
      }
    }
    return result
  }
  return descriptor
}

const plainLog = (input: any) => safeStringify(input)

const beautifyLog = (input: any) => highlight(safeStringify(input, null, 2))

const logInput = (layer: string, path: string, args: any[], enabled = true, beautify = false) => {
  if (!enabled) return
  const markedArgs = { layer, path, args }
  beautify ? Logger.info(beautifyLog(markedArgs)) : Logger.info(plainLog(markedArgs))
}

const bytesToMB = (bytes: number) => Math.round(bytes / 1024 / 1024)
