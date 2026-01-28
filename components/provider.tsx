"use client"
import { Children, useState } from "react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
export const Providers=({children}:{children:React,ReactNode})=>{
    const [queryClient]=useState(()=>new queryClient())

    return <QueryClientProvider client={queryClient}>
        {Children}
    </QueryClientProvider>
}