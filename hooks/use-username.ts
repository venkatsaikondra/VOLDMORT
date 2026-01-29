import { useEffect, useState } from 'react'
import { nanoid } from 'nanoid'

const STORAGE_KEY = 'chat_username'

const NAMES = [
   'aurora',
   'luna',
   'ember',
   'atlas',
   'echo',
   'riven',
]

const generateUsername = () => {
   const word = NAMES[Math.floor(Math.random() * NAMES.length)]
   return `anonymous-${word}-${nanoid(5)}`
}

export function useUsername() {
   const [username, setUsername] = useState<string>('')

   useEffect(() => {
      try {
         const stored = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null
         if (stored) {
            setUsername(stored)
            return
         }
         const generated = generateUsername()
         if (typeof window !== 'undefined') {
            localStorage.setItem(STORAGE_KEY, generated)
         }
         setUsername(generated)
      } catch (e) {
         // fallback in environments without localStorage
         setUsername(generateUsername())
      }
   }, [])

   return { username }
}