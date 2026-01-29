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
    .derive({ as: "scoped" }, async ({ query, cookie: { auth_token } }) => {
        // query is passed from the main route, ensure it contains roomId
        const roomId = query.roomId as string | undefined;
        const token = auth_token.value;

        if (!roomId || !token) {
            throw new AuthError("Missing roomId or token.")
        }

        // Fixed key format: `meta:${roomId}` to match your route.ts
        // Using hget to get the 'connected' field
        const connected = await redis.hget<string[]>(`meta:${roomId}`, "connected")

        // If the room doesn't exist or the user isn't in the 'connected' array
        if (!connected || !connected.includes(token)) {
            throw new AuthError("Unauthorized: You are not a member of this room.")
        }

        return {
            auth: {
                roomId,
                token,
                connected
            }
        }
    })