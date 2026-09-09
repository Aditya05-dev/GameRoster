import { Router } from "express";
import { z } from "zod";
import { pool } from "../db/pool.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
export const mapsRouter=Router();
mapsRouter.get("/",async(req,res,next)=>{try{const vals=[];const where=req.query.gameId?(vals.push(req.query.gameId),`WHERE game_id=$1`):"";const r=await pool.query(`SELECT * FROM maps ${where} ORDER BY name`,vals);res.json({maps:r.rows})}catch(e){next(e)}});
mapsRouter.get("/:id/markers",async(req,res,next)=>{try{const r=await pool.query(`SELECT * FROM map_markers WHERE map_id=$1 ORDER BY category,label`,[req.params.id]);res.json({markers:r.rows})}catch(e){next(e)}});
const marker=z.object({category:z.string().max(80).optional(),x:z.number().min(0).max(100),y:z.number().min(0).max(100),label:z.string().min(1).max(120),notes:z.string().max(500).optional()});
mapsRouter.post("/:id/markers",requireAuth,requireRole("admin","moderator"),async(req,res,next)=>{try{const m=marker.parse(req.body);const r=await pool.query(`INSERT INTO map_markers(map_id,category,x,y,label,notes,created_by) VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING *`,[req.params.id,m.category||null,m.x,m.y,m.label,m.notes||null,req.user.id]);res.status(201).json({marker:r.rows[0]})}catch(e){next(e)}});
