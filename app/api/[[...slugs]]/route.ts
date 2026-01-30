import { Elysia, t } from 'elysia'
import { nanoid } from 'nanoid';
import { redis } from '@/lib/redis';
import { authMiddleWare } from '@/app/api/[[...slugs]]/auth';
import { realtime } from '@/lib/realtime';

const ROOM_TTL_SECONDS = 60 * 10

function generate6Digit() {
    return Math.floor(100000 + Math.random() * 900000).toString()
}

const rooms = new Elysia({ prefix: "/room" })
    .post("/create", async () => {
        const roomId = nanoid();
        const code = generate6Digit()
        // store metadata and the mapping code -> roomId
        await redis.hset(`meta:${roomId}`, {
            connected: JSON.stringify([]),
            createdAt: Date.now(),
        })
        await redis.set(`code:${code}`, roomId)
        await redis.expire(`meta:${roomId}`, ROOM_TTL_SECONDS)
        await redis.expire(`code:${code}`, ROOM_TTL_SECONDS)
        return { roomId, code }
    })
    .post("/join", async ({ body }) => {
        const { code } = body as { code?: string }
        if (!code) return { error: 'missing_code' }
        const roomId = await redis.get(`code:${code}`)
        if (!roomId) return { error: 'invalid_or_expired_code' }
        return { roomId }
    })
    
    // TTL endpoint — inline auth and defensive checks so dev flow doesn't 500
    .get("/ttl", async ({ query, headers }) => {
        try {
            const roomId = (query?.roomId as string | undefined) || null
            // extract token from cookie/header/query
            const h: any = headers
            const cookieHeader = h && (typeof h.get === 'function' ? h.get('cookie') : h['cookie']) || ''
            const cookieMatch = cookieHeader ? String(cookieHeader).match(/x-auth-token=([^;]+)/) : null
            const headerTokenRaw = h && (typeof h.get === 'function' ? (h.get('x-auth-token') || h.get('authorization')) : (h['x-auth-token'] || h['authorization'])) || null
            const headerToken = headerTokenRaw ? String(headerTokenRaw).replace(/^Bearer\s+/i, '') : null
            const queryToken = (query && (query.token as string)) || null
            const token = headerToken || (cookieMatch ? cookieMatch[1] : null) || queryToken

            if (!roomId) return { ttl: 0 }

            // validate membership: fetch connected
            let connected: any = await redis.hget(`meta:${roomId}`, 'connected')
            if (!connected) return { ttl: 0 }
            if (typeof connected === 'string') {
                try { connected = JSON.parse(connected) } catch { connected = [] }
            }
            if (!Array.isArray(connected) || (token && !connected.includes(token))) return { ttl: 0 }

            const ttl = await redis.ttl(`meta:${roomId}`)
            return { ttl: ttl > 0 ? ttl : 0 }
        } catch (e) {
            return { ttl: 0 }
        }
    })
    // Delete room — inline auth so client receives stable responses
    .delete("/", async ({ query, headers }) => {
        try {
            const roomId = (query?.roomId as string | undefined) || null
            const h: any = headers
            const cookieHeader = h && (typeof h.get === 'function' ? h.get('cookie') : h['cookie']) || ''
            const cookieMatch = cookieHeader ? String(cookieHeader).match(/x-auth-token=([^;]+)/) : null
            const headerTokenRaw = h && (typeof h.get === 'function' ? (h.get('x-auth-token') || h.get('authorization')) : (h['x-auth-token'] || h['authorization'])) || null
            const headerToken = headerTokenRaw ? String(headerTokenRaw).replace(/^Bearer\s+/i, '') : null
            const queryToken = (query && (query.token as string)) || null
            const token = headerToken || (cookieMatch ? cookieMatch[1] : null) || queryToken

            if (!roomId) return { error: 'missing_roomId' }

            let connected: any = await redis.hget(`meta:${roomId}`, 'connected')
            if (!connected) return { error: 'room_not_found' }
            if (typeof connected === 'string') {
                try { connected = JSON.parse(connected) } catch { connected = [] }
            }
            if (!Array.isArray(connected) || (token && !connected.includes(token))) {
                return { error: 'unauthorized' }
            }

            await redis.del(`meta:${roomId}`)
            await redis.del(`messages:${roomId}`)
            await redis.del(`history:${roomId}`)
            await realtime.channel(roomId).emit("chat.destroy", { isDestroyed: true })
            return { success: true }
        } catch (e) {
            return { error: 'failed_to_delete_room' }
        }
    })

const messages = new Elysia({ prefix: "/messages" })
    .post("/", async ({ body, query, headers }) => {
        try {
            // inline auth extraction
            const h: any = headers
            const cookieHeader = h && (typeof h.get === 'function' ? h.get('cookie') : h['cookie']) || ''
            const cookieMatch = cookieHeader ? String(cookieHeader).match(/x-auth-token=([^;]+)/) : null
            const headerTokenRaw = h && (typeof h.get === 'function' ? (h.get('x-auth-token') || h.get('authorization')) : (h['x-auth-token'] || h['authorization'])) || null
            const headerToken = headerTokenRaw ? String(headerTokenRaw).replace(/^Bearer\s+/i, '') : null
            const queryToken = (query && (query.token as string)) || null
            const token = headerToken || (cookieMatch ? cookieMatch[1] : null) || queryToken
            const roomId = (query?.roomId as string | undefined) || null

            if (!roomId) return { error: 'missing_roomId' }

            let connected: any = await redis.hget(`meta:${roomId}`, 'connected')
            if (!connected) return { error: 'room_not_found' }
            if (typeof connected === 'string') {
                try { connected = JSON.parse(connected) } catch { connected = [] }
            }
            if (!Array.isArray(connected) || (token && !connected.includes(token))) return { error: 'unauthorized' }

            const { sender, text } = body
            const roomExists = await redis.exists(`meta:${roomId}`)
            if (!roomExists) return { error: 'room_not_found' }

            const message = {
                id: nanoid(),
                sender,
                text,
                timestamp: Date.now(),
                roomId,
            }

            // store messages as JSON strings
            await redis.rpush(`messages:${roomId}`, JSON.stringify({ ...message, token }))
            await realtime.channel(roomId).emit("chat.message", {
    ...message,
    token: token || "" // Ensure this matches your message Zod object
})

            const remaining = await redis.ttl(`meta:${roomId}`)
            if (remaining > 0) {
                await redis.expire(`messages:${roomId}`, remaining)
            }
            return message
        } catch (e) {
            console.error('[messages.post] error', e)
            return { error: 'failed_to_post_message' }
        }
    }, {
        body: t.Object({
            sender: t.String({ maxLength: 100 }),
            text: t.String({ maxLength: 1000 }),
        })
    })
    .get("/", async ({ query, headers }) => {
        try {
            const h: any = headers
            const cookieHeader = h && (typeof h.get === 'function' ? h.get('cookie') : h['cookie']) || ''
            const cookieMatch = cookieHeader ? String(cookieHeader).match(/x-auth-token=([^;]+)/) : null
            const headerTokenRaw = h && (typeof h.get === 'function' ? (h.get('x-auth-token') || h.get('authorization')) : (h['x-auth-token'] || h['authorization'])) || null
            const headerToken = headerTokenRaw ? String(headerTokenRaw).replace(/^Bearer\s+/i, '') : null
            const queryToken = (query && (query.token as string)) || null
            const token = headerToken || (cookieMatch ? cookieMatch[1] : null) || queryToken
            const roomId = (query?.roomId as string | undefined) || null

            if (!roomId) return { messages: [] }

            let connected: any = await redis.hget(`meta:${roomId}`, 'connected')
            if (!connected) return { messages: [] }
            if (typeof connected === 'string') {
                try { connected = JSON.parse(connected) } catch { connected = [] }
            }
            if (!Array.isArray(connected) || (token && !connected.includes(token))) return { messages: [] }

            const raw = (await redis.lrange(`messages:${roomId}`, 0, -1)) as string[] | null
            if (!raw) return { messages: [] }
            const msgs = raw.map((r) => {
                try {
                    return JSON.parse(r)
                } catch {
                    return null
                }
            }).filter(Boolean)
            return {
                messages: msgs.map((m: any) => ({
                    ...m,
                    token: m.token === token ? token : undefined,
                }))
            }
        } catch (e) {
            console.error('[messages.get] error', e)
            return { messages: [] }
        }
    })

// ... keep all your logic above the same

export const app = new Elysia({ prefix: '/api' })
    .use(rooms)
    .use(messages)

// Ensure this is EXACTLY 'App' with an uppercase A
export type App = typeof app

export const GET = app.fetch 
export const POST = app.fetch 
export const PATCH = app.fetch
export const PUT = app.fetch
export const DELETE = app.fetch