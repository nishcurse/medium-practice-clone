import { Hono } from 'hono'
import userRouter from './routes/user'
import blogRouter from './routes/blog'
 
const version = 'v1' 

interface Env { 
    DATABASE_URL: string, 
    JWT_SECRET: string
}

const app = new Hono<{Bindings: Env}>()


app.get('/test', (c) => {
  return c.json({
      message : "server is active & Working hard!! fighto"
  })
}); 

app.route(`/api/${version}/user`, userRouter)

app.route(`/api/${version}/blog`, blogRouter)

export default app
