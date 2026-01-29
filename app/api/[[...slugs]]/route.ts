import { Elysia, t } from 'elysia'
import { nanoid } from 'nanoid';
import { redis } from '@/lib/redis';
import { authMiddleWare } from '@/app/api/[[...slugs]]/auth';
import { realtime } from '@/lib/realtime';

const ROOM_TTL_SECONDS = 60 * 10

const rooms = new Elysia({ prefix: "/room" })
    .post("/create", async () => {
        const roomId = nanoid();
        await redis.hset(`meta:${roomId}`, {
            connected: [],
            createdAt: Date.now(),
        })
        await redis.expire(`meta:${roomId}`, ROOM_TTL_SECONDS)
        return { roomId }
    })
    .use(authMiddleWare)
    .get("/ttl", async ({ auth }) => {
        const ttl = await redis.ttl(`meta:${auth.roomId}`)
        return { ttl: ttl > 0 ? ttl : 0 }
    })
    .delete("/", async ({ auth }) => {
        // Added async/await and fixed logic
        await redis.del(auth.roomId)
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

        await redis.rpush(`messages:${roomId}`, { ...message, token: auth.token })
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
        const msgs = await redis.lrange(`messages:${auth.roomId}`, 0, -1) as any[]
        return {
            messages: msgs.map((m) => ({
                ...m,
                token: m.token === auth.token ? auth.token : undefined,
            }))
        }
    })

export const app = new Elysia({ prefix: '/api' })
    .use(rooms)
    .use(messages)

export type App = typeof app
export const GET = app.fetch 
export const POST = app.fetch 
export const DELETE = app.fetch