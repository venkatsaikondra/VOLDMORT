import { InferRealtimeEvents,Realtime } from "@upstash/realtime"
import { timeStamp } from "console"
import z, { string } from "zod"
// Change this:
// import { redis } from "@upstash/redis" 

// To this (import the Class, then use your existing redis instance):
import { Redis } from "@upstash/redis"
import { redis } from "@/lib/redis" // Import your actual configured instance instead
const message=z.object({
            id:z.string(),
            sender:z.string(),
            text:z.string(),
            timeStamp:z.number(),
            roomId:z.string(),
            token:z.string().optional(),
})
const schema={
    chat:{
        message,
        destroy:z.object({
            isDestroyed:z.literal(true),

        })
    }
}
export const realtime=new Realtime({
    schema,redis
})
export type RealtimeEvents=InferRealtimeEvents< typeof realtime>
export type Message=z.infer<typeof message>