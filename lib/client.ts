// Lightweight fetch wrappers that include credentials so cookies (x-auth-token) are sent
const base = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000'

async function jsonFetch(path: string, opts: RequestInit = {}) {
    const res = await fetch(`${base}${path}`, {
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', ...(opts.headers || {}) },
        ...opts,
    })
    const text = await res.text()
    try {
    const data = text ? JSON.parse(text) : null
    if (!res.ok) throw { status: res.status, data }
    if (data && typeof data === 'object' && 'error' in data) throw { status: res.status, data }
    return { status: res.status, data }
    } catch {
    if (!res.ok) throw { status: res.status, data: text }
    return { status: res.status, data: text }
    }
}

export const client = {
    room: {
        create: async () => jsonFetch('/api/room/create', { method: 'POST' }),
        join: async (code: string) => {
            const res = await jsonFetch('/api/room/join', { method: 'POST', body: JSON.stringify({ code }) })
            try {
                if (typeof window !== 'undefined' && res.data && 'token' in res.data) {
                    // set cookie for x-auth-token scoped to the app
                    document.cookie = `x-auth-token=${res.data.token}; path=/; max-age=${60*60}; samesite=strict`
                }
            } catch (e) {
                // ignore cookie set failures
            }
            return res
        },
        ttl: async (roomId: string) => jsonFetch(`/api/room/ttl?roomId=${encodeURIComponent(roomId)}`),
        delete: async (roomId: string) => jsonFetch(`/api/room?roomId=${encodeURIComponent(roomId)}`, { method: 'DELETE' }),
    },
    messages: {
        get: async (roomId: string) => jsonFetch(`/api/messages?roomId=${encodeURIComponent(roomId)}`),
        post: async (roomId: string, body: any) => {
            const res = await jsonFetch(`/api/messages?roomId=${encodeURIComponent(roomId)}`, { method: 'POST', body: JSON.stringify(body) })
            try {
                if (typeof window !== 'undefined' && res.data && typeof res.data === 'object' && 'token' in res.data) {
                    document.cookie = `x-auth-token=${res.data.token}; path=/; max-age=${60*60}; samesite=strict`
                }
            } catch (e) {}
            return res
        },
    },
} 