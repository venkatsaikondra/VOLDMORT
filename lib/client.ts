import { treaty } from '@elysiajs/eden'
import type { App } from '@/app/api/[[...slugs]]/route' // Use 'import type'

// Assuming your Next.js server runs on localhost:3000
const url = typeof window !== 'undefined' 
    ? window.location.origin 
    : 'http://localhost:3000'

export const client = treaty<App>(url)