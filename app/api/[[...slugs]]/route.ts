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
            connected: [],
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
        const roomId = await redis.get<string>(`code:${code}`)
        if (!roomId) return { error: 'invalid_or_expired_code' }
        return { roomId }
    })
    .use(authMiddleWare)
    .get("/ttl", async ({ auth }) => {
        const ttl = await redis.ttl(`meta:${auth.roomId}`)
        return { ttl: ttl > 0 ? ttl : 0 }
    })
    .delete("/", async ({ auth }) => {
        await redis.del(`meta:${auth.roomId}`)
        await redis.del(`messages:${auth.roomId}`)
        await redis.del(`history:${auth.roomId}`)
        await realtime.channel(auth.roomId).emit("chat.destroy", { isDestroyed: true })
        return { success: true }
    })

const messages = new Elysia({ prefix: "/messages" })
    .use(authMiddleWare)
    .post("/", async ({ body, auth }) => {
        const { sender, text } = body
        const { roomId } = auth
        const roomExists = await redis.exists(`meta:${roomId}`)
        
        if (!roomExists) throw new Error("room does not exist")

        const message = {
            id: nanoid(),
            sender,
            text,
            timestamp: Date.now(),
            roomId,
        }

    // store messages as JSON strings
    await redis.rpush(`messages:${roomId}`, JSON.stringify({ ...message, token: auth.token }))
    await realtime.channel(roomId).emit("chat.message", message)
        
        const remaining = await redis.ttl(`meta:${roomId}`)
        if (remaining > 0) {
            await redis.expire(`messages:${roomId}`, remaining)
        }
        return message
    }, {
        body: t.Object({
            sender: t.String({ maxLength: 100 }),
            text: t.String({ maxLength: 1000 }),
        })
    })
    .get("/", async ({ auth }) => {
        const raw = await redis.lrange(`messages:${auth.roomId}`, 0, -1) as string[]
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
                token: m.token === auth.token ? auth.token : undefined,
            }))
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