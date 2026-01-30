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
            const res = await client.room.ttl(roomId)
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
            const res = await client.messages.get(roomId)
            return res.data
        },
    })

    const { mutate: sendMessage, isPending } = useMutation({
        mutationFn: async (text: string) => {
            try {
                await client.messages.post(roomId, { sender: username, text })
            } catch (err: any) {
                console.error('sendMessage error', err)
                throw err
            }
        },
        onSuccess: () => {
            setInput("")
            refetch()
        },
        onError: (err: any) => {
            alert('Failed to send message')
        }
    })

// Inside your Room Page component
useRealtime({
    channels: [roomId],
    onData: (data) => {
        // Log this to see the structure in your console!
        console.log("Realtime raw data:", data);

        // With your specific schema, the event is likely 'chat.message'
        if (data.event === "chat.message") {
            refetch();
        }
        
        if (data.event === "chat.destroy") {
            router.push("/?destroyed=true");
        }
    },
})
    const { mutate: destroyRoom } = useMutation({
        mutationFn: async () => {
            try {
                await client.room.delete(roomId)
            } catch (err) {
                throw err
            }
        },
        onSuccess: () => {
            router.push('/?destroyed=true')
        },
        onError: () => alert('Failed to delete room')
    })

    const copyLink = () => {
        navigator.clipboard.writeText(window.location.href)
        setCopyStatus('COPIED!')
        setTimeout(() => setCopyStatus('COPY'), 2000)
    }

    return (
        <main className="flex flex-col h-screen max-h-screen bg-black text-white">
            {/* Header */}
            <header className="border-b border-zinc-800 p-3 sm:p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-zinc-900/30 shrink-0">
                <div className="flex items-center gap-2 sm:gap-4 flex-wrap">
                    <div className="flex flex-col">
                        <span className="text-xs text-zinc-500 uppercase tracking-wide">Room</span>
                        <div className="flex items-center gap-2">
                            <span className="font-bold text-violet-500 text-sm sm:text-base break-all">{roomId.slice(0, 12)}...</span>
                            <button 
                                onClick={copyLink} 
                                className="text-xs bg-zinc-800 hover:bg-zinc-700 px-2 py-1 rounded text-zinc-400 hover:text-zinc-200 transition-colors shrink-0"
                            >
                                {copyStatus}
                            </button>
                        </div>
                    </div>
                    <div className="hidden sm:flex h-8 w-px bg-zinc-800" />
                    <div className="flex flex-col">
                        <span className="text-xs text-zinc-500 uppercase tracking-wide">Expires In</span>
                        <span className={`text-sm sm:text-base font-bold ${timeRemaining !== null && timeRemaining < 60 ? 'text-red-500 animate-pulse' : 'text-amber-500'}`}>
                            {timeRemaining !== null ? formatTimeRemaining(timeRemaining) : '--:--'}
                        </span>
                    </div>
                </div>
                <button 
                    onClick={() => destroyRoom()} 
                    className="text-xs sm:text-sm bg-zinc-800 hover:bg-red-800 active:bg-red-900 px-3 py-1.5 rounded uppercase font-bold transition-all flex items-center gap-1 whitespace-nowrap shrink-0"
                >
                    <span>💣</span>
                    <span className="hidden sm:inline">Avada Kedavra</span>
                </button>
            </header>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-3 sm:space-y-4 scrollbar-thin scrollbar-thumb-zinc-700 scrollbar-track-zinc-900">
                {!messages || !messages.messages || messages.messages.length === 0 ? (
                    <div className="flex items-center justify-center h-full">
                        <p className="text-center text-zinc-500 text-sm sm:text-base">No messages yet... Start the conversation! 💬</p>
                    </div>
                ) : (
                    messages.messages.map((msg: any) => (
                        <div 
                            key={msg.id} 
                            className={`flex flex-col gap-1 p-2 sm:p-3 rounded-lg ${msg.sender === username ? 'bg-violet-900/20 border border-violet-800/30' : 'bg-blue-900/20 border border-blue-800/30'}`}
                        >
                            <div className="flex items-baseline gap-2">
                                <span className={`text-xs sm:text-sm font-bold ${msg.sender === username ? "text-violet-400" : "text-blue-400"}`}>
                                    {msg.sender === username ? "YOU" : msg.sender}
                                </span>
                                <span className="text-xs text-zinc-500">{format(new Date(msg.timestamp), "HH:mm")}</span>
                            </div>
                            <p className="text-sm sm:text-base text-zinc-200 whitespace-pre-wrap">{msg.text}</p>
                        </div>
                    ))
                )}
            </div>

            {/* Input */}
            <div className="p-3 sm:p-4 border-t border-zinc-800 bg-black shrink-0">
                <div className="flex gap-2">
                    <input
                        ref={inputRef}
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey && input.trim()) {
                                sendMessage(input)
                                setInput('')
                                e.preventDefault()
                            }
                        }}
                        className="flex-1 bg-zinc-950 border border-zinc-800 hover:border-zinc-700 focus:border-violet-500 focus:outline-none transition-colors text-zinc-100 placeholder:text-zinc-600 py-2 sm:py-3 px-3 sm:px-4 text-sm sm:text-base rounded"
                        placeholder="Type a message... (Enter to send)"
                        disabled={isPending}
                    />
                    <button 
                        onClick={() => {
                            if (input.trim()) {
                                sendMessage(input)
                                setInput('')
                            }
                        }} 
                        disabled={!input.trim() || isPending}
                        className="bg-violet-600 hover:bg-violet-500 active:bg-violet-700 disabled:bg-zinc-700 disabled:cursor-not-allowed px-4 sm:px-6 py-2 sm:py-3 text-sm sm:text-base font-bold text-white rounded transition-colors shrink-0"
                    >
                        {isPending ? '...' : 'Send'}
                    </button>
                </div>
            </div>
        </main>
    )
}

export default Page