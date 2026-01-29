"use client"
import { ReactNode, useState } from "react" // Fixed: ReactNode import
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { RealtimeProvider } from "@upstash/realtime/client"

export const Providers = ({ children }: { children: ReactNode }) => {
    // 1. Fixed the ReferenceError: Use the class 'QueryClient', not the variable 'queryClient'
    const [queryClient] = useState(() => new QueryClient())

    return (
        <RealtimeProvider>
            <QueryClientProvider client={queryClient}>
                {/* 2. Fixed: Use 'children' prop, not the 'Children' utility */}
                {children}
            </QueryClientProvider>
        </RealtimeProvider>
    )
}