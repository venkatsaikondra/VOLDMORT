"use client"
import React, { useEffect, useRef, useState } from 'react'
import { useParams, useSearchParams, useRouter } from 'next/navigation'
import { useMutation, useQuery } from '@tanstack/react-query'
import { client } from '@/lib/client'
import { useUsername } from '@/hooks/use-username'
import { useRealtime } from '@upstash/realtime/client'
import { format } from 'date-fns'

const formatTimeRemaining = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
}

const Page = () => {
    const params = useParams()
    const roomId = params.roomId as string
    const [input, setInput] = useState('')
    const router = useRouter()
    const inputRef = useRef<HTMLInputElement>(null)
    const [copyStatus, setCopyStatus] = useState('COPY')
    const [timeRemaining, setTimeRemaining] = useState<number | null>(null)
    const { username } = useUsername()

    const { data: ttlData } = useQuery({
        queryKey: ["ttl", roomId],
        queryFn: async () => {
            const res = await client.api.room.ttl.get({
                $query: { roomId } // Elysia client syntax
            })
            return res.data
        },
        refetchInterval: 10000 // Refresh from server every 10s as backup
    })

    useEffect(() => {
        if (ttlData?.ttl !== undefined) setTimeRemaining(ttlData.ttl)
    }, [ttlData])

    useEffect(() => {
        if (timeRemaining === null) return
        if (timeRemaining <= 0) {
            router.push("/?destroyed=true")
            return
        }
        const interval = setInterval(() => {
            setTimeRemaining(prev => (prev && prev > 0 ? prev - 1 : 0))
        }, 1000)
        return () => clearInterval(interval)
    }, [timeRemaining, router])

    const { data: messages, refetch } = useQuery({
        queryKey: ["messages", roomId],
        queryFn: async () => {
            const res = await client.api.messages.get({
                $query: { roomId }
            })
            return res.data
        },
    })

    const { mutate: sendMessage, isPending } = useMutation({
        mutationFn: async (text: string) => {
            await client.api.messages.post({ sender: username, text }, { $query: { roomId } })
        },
        onSuccess: () => {
            setInput("")
            refetch()
        }
    })

    useRealtime({
        channels: [roomId],
        onData: ({ event }) => {
            if (event === "chat.message") refetch()
            if (event === "chat.destroy") router.push("/?destroyed=true")
        },
    })

    const { mutate: destroyRoom } = useMutation({
        mutationFn: async () => {
            await client.api.room.delete(null, { $query: { roomId } })
        }
    })

    const copyLink = () => {
        navigator.clipboard.writeText(window.location.href)
        setCopyStatus('COPIED!')
        setTimeout(() => setCopyStatus('COPY'), 2000)
    }

    return (
        <main className="flex flex-col h-screen max-h-screen bg-black text-white">
            <header className="border-b border-zinc-800 p-4 flex items-center justify-between bg-zinc-900/30">
                <div className="flex items-center gap-4">
                    <div className="flex flex-col">
                        <span className="text-xs text-zinc-500 uppercase">Room ID</span>
                        <div className="flex items-center gap-2">
                            <span className="font-bold text-violet-500">{roomId}</span>
                            <button onClick={copyLink} className="text-[10px] bg-zinc-800 px-2 py-0.5 rounded text-zinc-400">
                                {copyStatus}
                            </button>
                        </div>
                    </div>
                    <div className="flex flex-col">
                        <span className="text-xs text-zinc-500 uppercase">Self-Destruct</span>
                        <span className={timeRemaining !== null && timeRemaining < 60 ? 'text-red-500' : 'text-amber-500'}>
                            {timeRemaining !== null ? formatTimeRemaining(timeRemaining) : '--:--'}
                        </span>
                    </div>
                </div>
                <button onClick={() => destroyRoom()} className="text-xs bg-zinc-800 hover:bg-red-800 px-3 py-1.5 rounded uppercase font-bold transition-all">
                    Avada Kedavra 💣
                </button>
            </header>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages?.messages.length === 0 ? (
                    <p className="text-center text-zinc-600 mt-20">No messages yet...</p>
                ) : (
                    messages?.messages.map((msg: any) => (
                        <div key={msg.id} className="flex flex-col">
                            <div className="flex items-baseline gap-2">
                                <span className={`text-xs font-bold ${msg.sender === username ? "text-violet-500" : "text-blue-400"}`}>
                                    {msg.sender === username ? "YOU" : msg.sender}
                                </span>
                                <span className="text-[10px] text-zinc-600">{format(msg.timestamp, "HH:mm")}</span>
                            </div>
                            <p className="text-sm text-zinc-300">{msg.text}</p>
                        </div>
                    ))
                )}
            </div>

            <div className="p-4 border-t border-zinc-800">
                <div className="flex gap-2">
                    <input
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && sendMessage(input)}
                        className="flex-1 bg-zinc-950 border border-zinc-800 p-3 text-sm outline-none focus:border-violet-500"
                        placeholder="Type a message..."
                    />
                    <button 
                        onClick={() => sendMessage(input)} 
                        disabled={!input.trim() || isPending}
                        className="bg-violet-600 px-6 text-sm font-bold disabled:opacity-50"
                    >
                        SEND
                    </button>
                </div>
            </div>
        </main>
    )
}

export default Page