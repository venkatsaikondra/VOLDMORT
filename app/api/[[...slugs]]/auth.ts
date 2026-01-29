import { Elysia } from "elysia"
import { redis } from "@/lib/redis"

class AuthError extends Error {
    constructor(message: string) {
        super(message)
        this.name = "AuthError"
    }
}

export const authMiddleWare = new Elysia({ name: "auth" })
    .error({ AuthError })
    .onError(({ code, error, set }) => {
        if (code === "AuthError") {
            set.status = 401
            return { error: error.message }
        }
    })
    .derive({ as: 'scoped' }, async (ctx: any) => {
        try {
            // Defensive extraction: ctx shape can vary; log keys for debugging
            console.log('[auth] ctx keys', Object.keys(ctx || {}))
            const query = ctx.query ?? (ctx.request && ctx.request.query) ?? null
            const headers = ctx.headers ?? (ctx.request && ctx.request.headers) ?? {}
            
            // Extract token from multiple sources: header, cookie, query (makes local testing easier)
            const cookieHeader = headers && (typeof headers.get === 'function' ? headers.get('cookie') : headers['cookie']) || ''
            const cookieMatch = cookieHeader ? String(cookieHeader).match(/x-auth-token=([^;]+)/) : null
            const headerTokenRaw = headers && (typeof headers.get === 'function' ? (headers.get('x-auth-token') || headers.get('authorization')) : (headers['x-auth-token'] || headers['authorization'])) || null
            const headerToken = headerTokenRaw ? String(headerTokenRaw).replace(/^Bearer\s+/i, '') : null
            const cookieToken = cookieMatch ? cookieMatch[1] : null
            const queryToken = (query && (query.token as string)) || null

            const token = headerToken || cookieToken || queryToken

            let roomId = (query?.roomId as string | undefined) || null
            // If roomId not found, try parsing from request url
            if (!roomId && ctx.request && ctx.request.url) {
                try {
                    const u = new URL(ctx.request.url)
                    roomId = u.searchParams.get('roomId')
                } catch {}
            }

            // debug logging to help trace auth failures
            console.log('[auth] debug', { roomId, token, cookieHeader })

            if (!roomId || !token) {
                throw new AuthError('Missing roomId or token.')
            }

            // Using hget to get the 'connected' field
            let connected: any = await redis.hget(`meta:${roomId}`, 'connected')
            
            // Handle if redis returns null
            if (!connected) {
                console.log('[auth] no connected field for', roomId)
                throw new AuthError('Room not found or expired.')
            }
            
            // Ensure connected is an array
            if (typeof connected === 'string') {
                try {
                    connected = JSON.parse(connected)
                } catch {
                    throw new AuthError('Invalid room data.')
                }
            }

            // Check if user is in connected list
            if (!Array.isArray(connected) || !connected.includes(token)) {
                console.log('[auth] token not in connected list', { roomId, token, connected })
                throw new AuthError('Unauthorized: You are not a member of this room.')
            }

            return {
                auth: {
                    roomId,
                    token,
                    connected,
                },
            }
        } catch (e: any) {
            console.error('[auth] error', e)
            if (e instanceof AuthError) throw e
            throw new AuthError('Authentication failed: ' + (e?.message || String(e)))
        }
    })