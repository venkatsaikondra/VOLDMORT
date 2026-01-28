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
}).derive((as:"scoped")=>{})