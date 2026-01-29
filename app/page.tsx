"use client"
import { useMutation } from "@tanstack/react-query";
import { client } from "@/lib/client";
import { useRouter, useSearchParams } from "next/navigation";
import { useUsername } from "@/hooks/use-username";

export default function Home() {
  const { username } = useUsername()
  const router = useRouter()
  const searchParams = useSearchParams()
  
  const wasDestroyed = searchParams.get("destroyed") === "true"
  const errorType = searchParams.get("error")
  
  const { mutate: createRoom, isPending } = useMutation({
    mutationFn: async () => {
      const res = await client.api.room.create.post()
      if (res.data?.roomId) {
        router.push(`/room/${res.data.roomId}`)
      }
    }
  })

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4 bg-black text-white">
      <div className="w-full max-w-md space-y-8">
        {wasDestroyed && (
          <div className="bg-red-950/20 border border-red-900 p-4 text-center">
            <p className="text-red-500 text-sm font-bold">ROOM DESTROYED</p>
            <p className="text-zinc-500 text-xs mt-1">All messages were permanently deleted.</p>
          </div>
        )}

        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold tracking-tight text-violet-500">{">"} private_chat</h1>
          <p className="text-zinc-500 text-sm">A private, self-destructing chat room.</p>
        </div>

        <div className="border border-zinc-800 bg-zinc-900/30 p-6 backdrop-blur-md">
          <div className="space-y-5">
            <div className="space-y-2">
              <label className="text-xs text-zinc-500 uppercase">Your Identity</label>
              <div className="bg-zinc-950 border border-zinc-800 p-3 text-sm text-zinc-400 font-mono">
                {username || "Generating..."}
              </div>
            </div>
            <button 
              onClick={() => createRoom()} 
              disabled={isPending}
              className="w-full bg-white text-black p-3 text-sm font-bold hover:bg-zinc-200 transition-colors disabled:opacity-50"
            >
              {isPending ? "SECURING..." : "CREATE SECURE ROOM"}
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}