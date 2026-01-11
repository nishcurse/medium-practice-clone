import { Hono } from 'hono'; 

interface Env { 
    DATABASE_URL: string, 
    JWT_SECRET: string
}

const userRouter = new Hono<{Bindings: Env}>();





export default userRouter;