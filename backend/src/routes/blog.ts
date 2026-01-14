import { Hono } from 'hono'; 
import { verify } from 'hono/utils/jwt/jwt';
import { PrismaClient } from '../generated/prisma/client'
import { withAccelerate } from '@prisma/extension-accelerate';

interface Env { 
    DATABASE_URL: string, 
    JWT_SECRET: string
}
const blogRouter = new Hono<{Bindings: Env, 
    Variables: {
        userId? : string
    }
}>();

// Middleware Token Verificaiton 
blogRouter.use(`*`, async (c, next) => {
    const authHeader = c.req.header('Authorization'); 
    if(!authHeader || !authHeader.startsWith('Bearer ')){
        return c.json({ error: 'Unauthorized access'}, 401);
    }
    const token = authHeader.split(' ')[1]; 
    try{
        const decodedPayload = await verify(token,c.env.JWT_SECRET);
        //@ts-ignore
        c.set('userId', decodedPayload["token"]); 
        await next();
    }catch(err){
        return c.json({
            error: 'Invalid or Expired Token'
        }, 401); 
    }
})
















export default blogRouter;