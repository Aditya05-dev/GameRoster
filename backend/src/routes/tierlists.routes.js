import { Router } from "express";
import { pool } from "../db/pool.js";
export const tierListsRouter=Router();
tierListsRouter.get("/",async(req,res,next)=>{try{
 const vals=[];let where="WHERE tl.is_published=true"; if(req.query.gameId){vals.push(req.query.gameId);where+=` AND tl.game_id=$${vals.length}`}
 const r=await pool.query(`SELECT tl.id,tl.game_id,tl.title,tl.methodology_notes,tl.version,json_agg(json_build_object('id',t.id,'label',t.label,'sortOrder',t.sort_order,'entries',COALESCE((SELECT json_agg(json_build_object('characterId',e.character_id,'explanation',e.explanation,'name',c.name,'rarity',c.rarity,'stats',c.stats) ORDER BY c.name) FROM tier_list_entries e JOIN characters c ON c.id=e.character_id WHERE e.tier_id=t.id),'[]'::json)) ORDER BY t.sort_order) AS tiers FROM tier_lists tl JOIN tier_list_tiers t ON t.tier_list_id=tl.id ${where} GROUP BY tl.id ORDER BY tl.title`,vals);
 res.json({tierLists:r.rows});
}catch(e){next(e)}});
