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
            const { query, headers } = ctx
            
            // Extract token from cookie header
            const cookieHeader = headers.get('cookie') || ''
            const tokenMatch = cookieHeader.match(/x-auth-token=([^;]+)/)
            const token = tokenMatch ? tokenMatch[1] : null

            const roomId = (query?.roomId as string | undefined) || null

            if (!roomId || !token) {
                throw new AuthError('Missing roomId or token.')
            }

            // Using hget to get the 'connected' field
            let connected: any = await redis.hget(`meta:${roomId}`, 'connected')
            
            // Handle if redis returns null
            if (!connected) {
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
                throw new AuthError('Unauthorized: You are not a member of this room.')
            }

            return {
                auth: {
                    roomId,
                    token,
                    connected,
                },
            }
        } catch (e) {
            if (e instanceof AuthError) throw e
            throw new AuthError('Authentication failed.')
        }
    })