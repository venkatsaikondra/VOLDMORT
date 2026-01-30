import { handle } from "@upstash/realtime"
import { realtime } from "@/lib/realtime"

export const GET = handle({ realtime })
export const POST = handle({ realtime }) // Add POST just in case