/**
 * In-memory Redis mock for local development when Upstash is unavailable
 */

type RedisValue = string | number | object | Array<any> | null

interface HashStore {
  [key: string]: {
    [field: string]: RedisValue
  }
}

interface ListStore {
  [key: string]: RedisValue[]
}

interface KeyStore {
  [key: string]: RedisValue
}

interface TTLStore {
  [key: string]: number
}

class RedisMock {
  private hashes: HashStore = {}
  private lists: ListStore = {}
  private keys: KeyStore = {}
  private ttls: TTLStore = {}
  private cleanupIntervals: Map<string, NodeJS.Timeout> = new Map()

  async hset(key: string, fields: Record<string, any>): Promise<number> {
    if (!this.hashes[key]) this.hashes[key] = {}
    const updated = Object.keys(fields).length
    Object.assign(this.hashes[key], fields)
    return updated
  }

  async hget<T = any>(key: string, field: string): Promise<T | null> {
    const value = this.hashes[key]?.[field]
    return (value ?? null) as T | null
  }

  async hgetall<T = any>(key: string): Promise<T | null> {
    return (this.hashes[key] ?? null) as T | null
  }

  async rpush(key: string, ...values: RedisValue[]): Promise<number> {
    if (!this.lists[key]) this.lists[key] = []
    this.lists[key].push(...values)
    return this.lists[key].length
  }

  async lrange(key: string, start: number, stop: number): Promise<RedisValue[]> {
    const list = this.lists[key] ?? []
    const len = list.length
    const actualStart = start < 0 ? Math.max(0, len + start) : start
    const actualStop = stop < 0 ? Math.max(-1, len + stop) : stop
    return list.slice(actualStart, actualStop + 1)
  }

  async set(key: string, value: RedisValue): Promise<string> {
    this.keys[key] = value
    return 'OK'
  }

  async get<T = any>(key: string): Promise<T | null> {
    return (this.keys[key] ?? null) as T | null
  }

  async del(...keys: string[]): Promise<number> {
    let count = 0
    for (const key of keys) {
      if (this.hashes[key]) {
        delete this.hashes[key]
        count++
      } else if (this.lists[key]) {
        delete this.lists[key]
        count++
      } else if (this.keys[key]) {
        delete this.keys[key]
        count++
      }
    }
    return count
  }

  async exists(key: string): Promise<number> {
    if (this.hashes[key] || this.lists[key] || this.keys[key]) return 1
    return 0
  }

  async ttl(key: string): Promise<number> {
    return this.ttls[key] ?? -1
  }

  async expire(key: string, seconds: number): Promise<number> {
    const exists = await this.exists(key)
    if (!exists) return 0

    this.ttls[key] = seconds

    // Clear any existing timeout for this key
    if (this.cleanupIntervals.has(key)) {
      clearTimeout(this.cleanupIntervals.get(key)!)
    }

    // Set a timeout to delete the key and decrement TTL every second
    const interval = setInterval(() => {
      this.ttls[key]--
      if (this.ttls[key] <= 0) {
        this.del(key)
        delete this.ttls[key]
        if (this.cleanupIntervals.has(key)) {
          clearInterval(this.cleanupIntervals.get(key)!)
          this.cleanupIntervals.delete(key)
        }
      }
    }, 1000)

    this.cleanupIntervals.set(key, interval as any)
    return 1
  }

  clear(): void {
    this.hashes = {}
    this.lists = {}
    this.keys = {}
    this.ttls = {}
    for (const interval of this.cleanupIntervals.values()) {
      clearInterval(interval)
    }
    this.cleanupIntervals.clear()
  }
}

export const redisMock = new RedisMock()
