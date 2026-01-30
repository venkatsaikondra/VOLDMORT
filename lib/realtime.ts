import { InferRealtimeEvents, Realtime } from '@upstash/realtime'
import z from 'zod'
import { redis } from '@/lib/redis'

const message = z.object({
    id: z.string(),
    sender: z.string(),
    text: z.string(),
    timestamp: z.number(),
    roomId: z.string(),
    token: z.string().optional(),
})

const schema = {
    chat: {
        message,
        destroy: z.object({
            isDestroyed: z.literal(true),
        }),
    },
}

export const realtime = new Realtime({
    schema,
    redis,
    // IMPORTANT: This tells the hook which API route to hit
    // If your route is app/api/realtime/route.ts, this should be:
    url: "/api/realtime", 
})

export type RealtimeEvents = InferRealtimeEvents<typeof realtime>
export type Message = z.infer<typeof message>