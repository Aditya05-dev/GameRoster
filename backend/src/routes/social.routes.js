import { Router } from "express";
import { z } from "zod";
import { pool } from "../db/pool.js";
import { requireAuth } from "../middleware/auth.js";
export const socialRouter=Router();
const entity=z.object({entityType:z.enum(["build","guide","character","team"]),entityId:z.string().uuid()});
function toggle(table){return async(req,res,next)=>{try{const x=entity.parse(req.body);const d=await pool.query(`DELETE FROM ${table} WHERE user_id=$1 AND entity_type=$2 AND entity_id=$3 RETURNING id`,[req.user.id,x.entityType,x.entityId]);if(d.rowCount)return res.json({active:false});await pool.query(`INSERT INTO ${table}(user_id,entity_type,entity_id) VALUES($1,$2,$3) ON CONFLICT DO NOTHING`,[req.user.id,x.entityType,x.entityId]);res.json({active:true});}catch(e){next(e)}}}
socialRouter.post("/bookmarks/toggle",requireAuth,toggle("bookmarks"));
socialRouter.post("/likes/toggle",requireAuth,toggle("likes"));
socialRouter.get("/bookmarks",requireAuth,async(req,res,next)=>{try{const r=await pool.query(`SELECT * FROM bookmarks WHERE user_id=$1 ORDER BY created_at DESC`,[req.user.id]);res.json({bookmarks:r.rows})}catch(e){next(e)}});
socialRouter.get("/likes",requireAuth,async(req,res,next)=>{try{const r=await pool.query(`SELECT * FROM likes WHERE user_id=$1 ORDER BY created_at DESC`,[req.user.id]);res.json({likes:r.rows})}catch(e){next(e)}});
const report=z.object({entityType:z.string().min(1).max(50),entityId:z.string().uuid(),reason:z.string().min(10).max(1000)});
socialRouter.post("/reports",requireAuth,async(req,res,next)=>{try{const x=report.parse(req.body);const r=await pool.query(`INSERT INTO reports(reporter_id,entity_type,entity_id,reason) VALUES($1,$2,$3,$4) RETURNING *`,[req.user.id,x.entityType,x.entityId,x.reason]);res.status(201).json({report:r.rows[0]})}catch(e){next(e)}});
