import { Hono } from 'hono'; 
import { verify } from 'hono/utils/jwt/jwt';
import { PrismaClient } from '@prisma/client/edge'
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

interface CreatePostBody {
    title : string, 
    content : string, 
}

// Middleware Token Verificaiton 
blogRouter.use(`*`, async (c, next) => {
    const authHeader = c.req.header('Authorization'); 
    if(!authHeader || !authHeader.startsWith('Bearer ')){
        return c.json({ error: 'Unauthorized access'}, 401);
    }
    const token = authHeader.split(' ')[1]; 
    try{
        const decodedPayload = await verify(token, c.env.JWT_SECRET , 'ES256');
        //@ts-ignore
        c.set('userId', decodedPayload["userId"]); 
        await next();
    }catch(err){
        return c.json({
            error: 'Invalid or Expired Token'
        }, 401); 
    }
})



// Create a new blog post
blogRouter.post('/', async (c) => {
    const userId = c.get('userId');
    if(!userId){
        c.status(401); 
        return c.json({
            error: 'Unauthorized Access'
        })
    }
    const prisma = new PrismaClient({
        accelerateUrl : c.env.DATABASE_URL
    }).$extends(withAccelerate()); 
    const {title, content} = await c.req.json() as CreatePostBody;
    try {
        const post = await prisma.post.create({
            data : {
                title : title ,
                content : content , 
                authorId : userId
            }
        });
        return c.json({
            message: 'Post Created Successfully',
            postId: post.id
        })
    }catch(e){
        c.status(500); 
        return c.json({
            error: 'Error Creating Post'
        })
    }
})

/* Updating a blog post*/

interface UpdatePostBody extends CreatePostBody {
    id : string
}

blogRouter.put('/', async (c) => {
    const userId = c.get('userId'); 
    if(!userId){
        c.status(401); 
        return c.json({
            error: 'Unauthorized Access'
        })
    }
    const prisma = new PrismaClient({
        accelerateUrl : c.env.DATABASE_URL
    }).$extends(withAccelerate()); 

    const { id , title , content } = await c.req.json() as UpdatePostBody; 
    try {
        const npost = await prisma.post.update({
            where : {
                id : id , 
                authorId : userId
            },  
            data :{
                title :title, 
                content :content
            }
        });
        return c.json({
            message : 'Post Updated Successfully'
        })
    }catch(e){
        c.status(500); 
        return c.json({
            error: 'Error Updating Post'
        })
    }
})

/* Get a Specific Blog Post */

blogRouter.get('/:id', async (c) => {
    const postid = c.req.param('id'); 
    const prisma = new PrismaClient({
        accelerateUrl: c.env.DATABASE_URL
    }).$extends(withAccelerate()); 

    try{
        const post = await prisma.post.findFirst({
            where: {
                id : postid, 
            }
        })
    }catch(e){
        c.status(500); 
        return c.json({
            message : 'either it doesnt exist or some error occured <3' 
        })
    }
})


/* get all those blog posts of the logged in User */
blogRouter.get('/bulk', async (c) => { // pagination can be added here later on
    const prisma = new PrismaClient({
        accelerateUrl: c.env.DATABASE_URL
    }).$extends(withAccelerate()); 

    try {
        const posts = await prisma.post.findMany({}); 
        return c.json({
            posts: posts
        })
    }catch(e){
        c.status(500); 
        return c.json({
            error: 'Error Fetching Posts'
        })
    }
})

















export default blogRouter;