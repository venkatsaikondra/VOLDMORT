"use client"
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { client } from "@/lib/client";
import { useRouter, useSearchParams } from "next/navigation";
import { useUsername } from "@/hooks/use-username";
import Cookies from 'js-cookie'
import { nanoid } from "nanoid";

export default function Home() {
  const { username } = useUsername()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [mode, setMode] = useState<'create' | 'join'>('create')
  const [joinCode, setJoinCode] = useState('')
  
  const wasDestroyed = searchParams.get("destroyed") === "true"

  // CREATE ROOM MUTATION
  const { mutate: createRoom, isPending: isCreating } = useMutation({
    mutationFn: async () => {
      const res = await client.api.room.create.post()
      if (res.data && 'roomId' in res.data) {
        router.push(`/room/${res.data.roomId}`)
      }
    }
  })

  // JOIN ROOM MUTATION
  const { mutate: joinRoom, isPending: isJoining } = useMutation({
    mutationFn: async () => {
      const res = await client.api.room.join.post({ code: joinCode })
      if (res.data && 'roomId' in res.data) {
        router.push(`/room/${res.data.roomId}`)
      } else {
        alert("Invalid or Expired Code")
      }
    }
  })

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4 sm:p-6 bg-black text-white font-mono">
      {/* BRAND HEADER */}
      <div className="absolute top-6 sm:top-10 text-center">
        <h1 className="text-3xl sm:text-5xl font-black tracking-tighter text-white">
          VOLD<span className="text-violet-600">MORT</span>
        </h1>
        <p className="text-zinc-500 text-xs tracking-widest uppercase mt-1 sm:mt-2">He-Who-Must-Not-Be-Logged</p>
      </div>

      <div className="w-full max-w-md space-y-4 sm:space-y-6">
        {wasDestroyed && (
          <div className="bg-red-950/20 border border-red-900/50 p-3 sm:p-4 text-center animate-pulse">
            <p className="text-red-500 text-xs sm:text-sm font-bold uppercase">Room Obliviated</p>
            <p className="text-zinc-500 text-[10px] mt-1">THE EVIDENCE HAS BEEN PULVERIZED.</p>
          </div>
        )}

        <div className="border border-zinc-800 bg-zinc-900/20 p-6 sm:p-8 backdrop-blur-xl shadow-2xl relative overflow-hidden">
          {/* Decorative scanner line */}
          <div className="absolute top-0 left-0 w-full h-px bg-linear-to-r from-transparent via-violet-500 to-transparent opacity-50" />
          
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 sm:gap-0 border-b border-zinc-800 pb-4">
               <div>
                  <label className="text-[10px] text-zinc-500 uppercase tracking-widest">Active Identity</label>
                  <p className="text-violet-400 font-bold text-sm sm:text-base">{username || "ANONYMOUS"}</p>
               </div>
               <div className="flex gap-2 w-full sm:w-auto">
                  <button 
                    onClick={() => setMode('create')}
                    className={`flex-1 sm:flex-none text-[10px] px-3 py-1 border transition-all ${mode === 'create' ? 'bg-white text-black border-white' : 'border-zinc-700 text-zinc-500 hover:border-zinc-500'}`}
                  >CREATE</button>
                  <button 
                    onClick={() => setMode('join')}
                    className={`flex-1 sm:flex-none text-[10px] px-3 py-1 border transition-all ${mode === 'join' ? 'bg-white text-black border-white' : 'border-zinc-700 text-zinc-500 hover:border-zinc-500'}`}
                  >JOIN</button>
               </div>
            </div>

            {mode === 'create' ? (
              <div className="space-y-4">
                <p className="text-zinc-400 text-xs sm:text-sm leading-relaxed">
                  Generates a unique 6-digit Portkey. The room and all its contents will self-destruct after 10 minutes of inactivity.
                </p>
                <button 
                  onClick={() => createRoom()} 
                  disabled={isCreating}
                  className="w-full bg-violet-600 hover:bg-violet-500 active:bg-violet-700 text-white p-3 sm:p-4 text-xs font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed group"
                >
                  {isCreating ? "ENCRYPTING..." : "CREATE SECURE CHANNEL"}
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <input 
                  type="text"
                  maxLength={6}
                  placeholder="ENTER 6-DIGIT CODE"
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value.replace(/\D/g, ""))}
                  className="w-full bg-black border border-zinc-800 focus:border-violet-500 p-3 sm:p-4 text-xl sm:text-2xl tracking-[1em] text-violet-500 outline-none transition-all text-center"
                />
                <button 
                  onClick={() => joinRoom()} 
                  disabled={isJoining || joinCode.length !== 6}
                  className="w-full bg-white hover:bg-zinc-200 text-black p-3 sm:p-4 text-xs font-bold transition-all disabled:opacity-20 disabled:cursor-not-allowed"
                >
                  {isJoining ? "DECRYPTING..." : "ACCESS CHANNEL"}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}