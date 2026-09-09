import { Router } from "express";
import { z } from "zod";
export const profileLookupRouter=Router();
const schema=z.object({gameSlug:z.string().min(1),uid:z.string().min(4).max(32),server:z.string().max(40).optional()});
// Public-profile APIs differ by game and can change. This endpoint is an adapter boundary:
// configure a lawful provider base URL per game instead of scraping or embedding credentials in the client.
profileLookupRouter.post("/",async(req,res,next)=>{try{
 const {gameSlug,uid,server}=schema.parse(req.body); const envKey=`PROFILE_PROVIDER_${gameSlug.toUpperCase().replace(/-/g,'_')}`; const base=process.env[envKey];
 if(!base)return res.status(501).json({error:"Profile lookup provider is not configured for this game.",code:"PROVIDER_NOT_CONFIGURED"});
 const u=new URL(base);u.searchParams.set("uid",uid);if(server)u.searchParams.set("server",server);
 const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),8000);
 const r=await fetch(u,{headers:{accept:"application/json"},signal:controller.signal});clearTimeout(timer);
 if(!r.ok)return res.status(502).json({error:"Profile provider returned an error.",providerStatus:r.status});
 const data=await r.json();res.json({gameSlug,uid,server:server||null,profile:data});
}catch(e){next(e)}});
