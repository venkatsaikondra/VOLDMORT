import { NextRequest, NextResponse } from 'next/server'
import { redis } from './lib/redis'
import { nanoid } from 'nanoid'

export async function proxy(req: NextRequest) {
    const pathName = req.nextUrl.pathname
    const roomMatch = pathName.match(/^\/room\/([^/]+)$/)
    
    if (!roomMatch) return NextResponse.next()
    const roomId = roomMatch[1]

    // Fetch the room metadata
    const meta = await redis.hgetall(`meta:${roomId}`) as { connected?: string, createdAt?: number } | null

    if (!meta || Object.keys(meta).length === 0) {
        return NextResponse.redirect(new URL('/?error=room-not-found', req.url))
    }

    // 1. Check if user already has a token
    const existingToken = req.cookies.get('x-auth-token')?.value
    
    // Parse the connected list (Always stored as JSON string in Hash)
    let connected: string[] = []
    try {
        connected = typeof meta.connected === 'string' ? JSON.parse(meta.connected) : []
    } catch {
        connected = []
    }

    // 2. If they have a token AND it's already in the list, just proceed
    if (existingToken && connected.includes(existingToken)) {
        return NextResponse.next()
    }

    // 3. If they have a token but it's NOT in the list, or they have no token:
    if (connected.length >= 2) {
        return NextResponse.redirect(new URL('/?error=room-full', req.url))
    }

    // 4. Create new token and update list
    const token = existingToken || nanoid()
    const updatedConnected = Array.from(new Set([...connected, token])) // Prevent duplicates
    
    await redis.hset(`meta:${roomId}`, {
        connected: JSON.stringify(updatedConnected),
        createdAt: meta.createdAt || Date.now(),
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