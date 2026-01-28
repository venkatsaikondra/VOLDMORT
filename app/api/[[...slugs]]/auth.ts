import { error } from "console"
import Elysia from "elysia"
import { unauthorized } from "next/navigation"

class AuthError extends Error {
    constructor(message:string){
        super(message)
        this.name="AuthError"
    }
}
export const AuthMiddleWare=new Elysia({name:"auth"}).error({AuthError}).onError(({code,set})=>{
    if(code==="AuthError"){
        set.status=401
        return {error:"unauthorized"}
    }
}).derive({as:"scoped"},async({query,cookie})=>{
    const roomId=query.roomId;
    const token=cookie['x-auth-token'].value as string|undefined
    if(!roomId ||!token){
        throw new AuthError("Missing roomId or token.")
    }
    const connected=await redis.hget<string[]>(`meta.${roomId}`,"connected")
    if(!connected?.includes(token)){
        throw new AuthError("Invalid token")
    }
    return {auth:{roomId,token,connected}}
})