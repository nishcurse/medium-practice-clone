import { Hono } from 'hono'; 
import { PrismaClient } from '@prisma/client/edge'
import { withAccelerate } from '@prisma/extension-accelerate'
import { sign, verify, decode } from 'hono/jwt'
import { hashPassword, verifyPassword } from '../utils/passUtils'



interface Env { 
    DATABASE_URL: string, 
    JWT_SECRET: string
}


const userRouter = new Hono<{Bindings: Env}>();

interface SignupBody {
    name : string, 
    email : string, 
    password : string
}

userRouter.post('/signup', async (c) => {
    const body = await c.req.json(); 
    const prisma = new PrismaClient(
        {
            accelerateUrl: c.env.DATABASE_URL
        }
    ).$extends(withAccelerate()); 
    const {name , email, password} = body as SignupBody; 
    const hashpassword = await hashPassword(password);
    console.log('Hashed Password:', hashpassword);
    try {
        console.log('creating user with email:', email);
        const user = await prisma.user.create({
            data: {
                name: name, 
                email: email, 
                password: hashpassword
            }
        })
        console.log('created user:', user);
        return c.json({
            message: 'User Created Successfully', 
            token : await sign({userId: user.id}, c.env.JWT_SECRET)
        })
    }catch(e){
        console.log(e, c.env.DATABASE_URL); 
        c.status(403);
        return c.json({
            error: 'Error Creating User'
        })
    }
})

type SigninBody = Pick<SignupBody, 'email' | 'password'>; 


// TODO: is it even safe to safe to tokenize database ids directly? 

userRouter.post('/signin', async (c) => {
    const body = await c.req.json();
    const prisma = new PrismaClient(
        {
            accelerateUrl: c.env.DATABASE_URL
        }
    ).$extends(withAccelerate()); 
    const {email, password} = body as SigninBody; 
    try {
        const user = await prisma.user.findUniqueOrThrow({
            where:{
                email: email
            }
        })
        console.log(user);
        const isValid = await verifyPassword(password, user.password);
        console.log(isValid);
        if(!isValid){
            throw new Error('Invalid Creds Sweety!'); 
        }else{
            console.log('Signin Successful');
            return c.json({
                message: 'Signin Successful', 
                token : await sign({userId: user.id}, c.env.JWT_SECRET) 
            })
        }

    }catch(e){
        c.status(403);      
        return c.json({
            error: 'Invalid Creds Sweety!'
        }); 
    }

})






export default userRouter;