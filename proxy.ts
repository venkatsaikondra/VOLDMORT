import { NextRequest, NextResponse } from 'next/server'
import { redis } from './lib/redis'
import { nanoid } from 'nanoid'

export async function proxy(req: NextRequest) {
    const pathName = req.nextUrl.pathname
    const roomMatch = pathName.match(/^\/room\/([^/]+)$/)
    
    if (!roomMatch) return NextResponse.next()
    const roomId = roomMatch[1]

    // 1. Fetch metadata
    const meta = await redis.hgetall(`meta:${roomId}`) as { connected?: string, createdAt?: number } | null

    if (!meta || Object.keys(meta).length === 0) {
        return NextResponse.redirect(new URL('/?error=room-not-found', req.url))
    }

    // 2. Normalize connected list
    let connected: string[] = []
    try {
        connected = typeof meta.connected === 'string' ? JSON.parse(meta.connected) : []
    } catch {
        connected = []
    }

    // 3. Check for existing token
    let token = req.cookies.get('x-auth-token')?.value

    // 4. Identity Logic
    if (token && connected.includes(token)) {
        return NextResponse.next() // Known user, let them in
    }

    if (connected.length >= 2) {
        return NextResponse.redirect(new URL('/?error=room-full', req.url))
    }

    // 5. New User: Assign token and save to Redis
    token = token || nanoid()
    const updatedConnected = Array.from(new Set([...connected, token]))
    
    // Use hset for specific fields to avoid overwriting the whole hash
    await redis.hset(`meta:${roomId}`, {
        connected: JSON.stringify(updatedConnected)
    })

    const response = NextResponse.next()
    response.cookies.set('x-auth-token', token, {
        path: '/',
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
    })

    return response
}

export const config = {
    matcher: ['/room/:path*'],
}