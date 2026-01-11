import { Hono } from 'hono'; 

interface Env { 
    DATABASE_URL: string, 
    JWT_SECRET: string
}

const blogRouter = new Hono<{Bindings: Env}>();







export default blogRouter;