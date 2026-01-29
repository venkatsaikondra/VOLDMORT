// lib/redis.ts
import { Redis } from '@upstash/redis'
import { redisMock } from './redis-mock'

const hasUpstashConfig = process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN

export const redis = hasUpstashConfig
  ? new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL!,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    })
  : (redisMock as any)