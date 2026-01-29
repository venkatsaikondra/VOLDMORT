import { NextRequest, NextResponse } from 'next/server'
import { redis } from './lib/redis'
import { nanoid } from 'nanoid'

export async function proxy(req: NextRequest) {
    const pathName = req.nextUrl.pathname
    const roomMatch = pathName.match(/^\/room\/([^/]+)$/)
    
    if (!roomMatch) return NextResponse.next()

    const roomId = roomMatch[1]
    
    // FIX: Cast the result instead of using a generic on the function call
    const meta = await redis.hgetall(`meta:${roomId}`) as { connected?: string | string[], createdAt?: number } | null

    // Check if meta is null or an empty object
    if (!meta || Object.keys(meta).length === 0) {
        return NextResponse.redirect(new URL('/?error=room-not-found', req.url))
    }

    const existingToken = req.cookies.get('x-auth-token')?.value

    let normalizedConnected: string[] = []
    
    // Robust parsing for Redis 'connected' field
    if (Array.isArray(meta.connected)) {
        normalizedConnected = meta.connected
    } else if (typeof meta.connected === 'string') {
        try { 
            normalizedConnected = JSON.parse(meta.connected) 
        } catch { 
            normalizedConnected = [] 
        }
    }

    if (existingToken && normalizedConnected.includes(existingToken)) {
        return NextResponse.next()
    }

    if (normalizedConnected.length >= 2) {
        return NextResponse.redirect(new URL('/?error=room-full', req.url))
    }

    const token = nanoid()
    const updatedConnected = [...normalizedConnected, token]
    
    await redis.hset(`meta:${roomId}`, {
        connected: JSON.stringify(updatedConnected),
        createdAt: meta.createdAt ?? Date.now(),
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