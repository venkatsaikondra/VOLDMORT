import { NextRequest, NextResponse } from 'next/server'
import { redis } from './lib/redis'
import { nanoid } from 'nanoid'

export async function proxy(req: NextRequest) {
    const pathName = req.nextUrl.pathname
    const roomMatch = pathName.match(/^\/room\/([^/]+)$/)
    if (!roomMatch) return NextResponse.redirect(new URL('/', req.url))

    const roomId = roomMatch[1]
        // The upstash redis.hget signature is (key, field). Use that to fetch required fields.
        const connected = await redis.hget<string[]>(`meta:${roomId}`, 'connected')
        const createdAt = await redis.hget<number>(`meta:${roomId}`, 'createdAt')

        if (!connected) {
            return NextResponse.redirect(new URL('/?error=room-not-found', req.url))
        }

    const existingToken = req.cookies.get('x-auth-token')?.value
    if (existingToken && connected.includes(existingToken)) {
        return NextResponse.next()
    }
    if (connected.length >= 2) {
        return NextResponse.redirect(new URL('/?error=room-full', req.url))
    }

    const response = NextResponse.next()
    const token = nanoid()
    response.cookies.set('x-auth-token', token, {
        path: '/',
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
    })
        await redis.hset(`meta:${roomId}`, {
            connected: [...connected, token],
            createdAt: createdAt ?? Date.now(),
        })
    return response
}

export const config = {
    matcher: ['/room/:path*'],
}