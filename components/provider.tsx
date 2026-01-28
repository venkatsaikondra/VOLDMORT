"use client"
import { Children, useState } from "react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { RealtimeProvider } from "@upstash/realtime/client"
export const Providers=({children}:{children:React,ReactNode})=>{
    const [queryClient]=useState(()=>new queryClient())

    return (
        <RealtimeProvider>
            <QueryClientProvider client={queryClient}>
        {Children}
    </QueryClientProvider>
        </RealtimeProvider>
    )

    
}