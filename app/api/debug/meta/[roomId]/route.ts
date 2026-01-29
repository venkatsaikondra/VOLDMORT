import { NextResponse } from 'next/server'
import { redis } from '@/lib/redis'

export async function GET(req: Request, { params }: any) {
  const roomId = params.roomId
  const meta = await redis.hgetall(`meta:${roomId}`)
  const messages = await redis.lrange(`messages:${roomId}`, 0, -1)
  return NextResponse.json({ meta, messages })
}
