import { Router } from "express";
import { z } from "zod";
import { pool } from "../db/pool.js";
import { optionalAuth, requireAuth } from "../middleware/auth.js";

export const guidesRouter = Router();
const schema = z.object({ gameId:z.string().uuid(), category:z.string().max(80).optional(), title:z.string().min(3).max(160), body:z.string().min(20), status:z.enum(["draft","published","unpublished"]).optional() });

guidesRouter.get("/", optionalAuth, async (req,res,next)=>{try{
  const values=[]; const clauses=[];
  if(req.query.gameId){values.push(req.query.gameId); clauses.push(`g.game_id=$${values.length}`)}
  if(req.user){values.push(req.user.id); clauses.push(`(g.status='published' OR g.author_id=$${values.length})`)} else clauses.push("g.status='published'");
  const r=await pool.query(`SELECT g.*,u.username AS author_username FROM guides g JOIN users u ON u.id=g.author_id ${clauses.length?'WHERE '+clauses.join(' AND '):''} ORDER BY g.is_featured DESC,g.updated_at DESC LIMIT 100`,values);
  res.json({guides:r.rows});
}catch(e){next(e)}});

guidesRouter.get("/:id", optionalAuth, async(req,res,next)=>{try{
 const r=await pool.query(`SELECT g.*,u.username AS author_username FROM guides g JOIN users u ON u.id=g.author_id WHERE g.id=$1`,[req.params.id]);
 if(!r.rowCount)return res.status(404).json({error:"Guide not found."}); const g=r.rows[0];
 if(g.status!=="published" && req.user?.id!==g.author_id && req.user?.role!=="admin") return res.status(403).json({error:"Guide is not public."});
 res.json({guide:g});
}catch(e){next(e)}});

guidesRouter.post("/", requireAuth, async(req,res,next)=>{try{
 const g=schema.parse(req.body); const status=g.status||"draft";
 const r=await pool.query(`INSERT INTO guides(author_id,game_id,category,title,body,status) VALUES($1,$2,$3,$4,$5,$6) RETURNING *`,[req.user.id,g.gameId,g.category||null,g.title,g.body,status]); res.status(201).json({guide:r.rows[0]});
}catch(e){next(e)}});

guidesRouter.patch("/:id", requireAuth, async(req,res,next)=>{try{
 const own=await pool.query(`SELECT author_id FROM guides WHERE id=$1`,[req.params.id]); if(!own.rowCount)return res.status(404).json({error:"Guide not found."});
 if(own.rows[0].author_id!==req.user.id && req.user.role!=="admin")return res.status(403).json({error:"You can only edit your own guides."});
 const g=schema.partial().parse(req.body); const map={gameId:'game_id',category:'category',title:'title',body:'body',status:'status'}; const fs=[],vs=[];
 for(const [k,c] of Object.entries(map)) if(g[k]!==undefined){vs.push(g[k]);fs.push(`${c}=$${vs.length}`)}
 if(!fs.length)return res.status(400).json({error:"No fields to update."}); vs.push(req.params.id);
 const r=await pool.query(`UPDATE guides SET ${fs.join(',')},updated_at=now() WHERE id=$${vs.length} RETURNING *`,vs); res.json({guide:r.rows[0]});
}catch(e){next(e)}});
