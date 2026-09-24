import"dotenv/config";import{pool}from"./pool.js";
const markers=[
 ["Region",18,24,"Mondstadt","Starter nation and city-state region."],["Statue",20,31,"Mondstadt Statue cluster","Schematic marker; replace with reviewed coordinates when using a licensed geographic map."],
 ["Region",34,58,"Liyue","Harbor nation and mountain region."],["Statue",38,49,"Liyue Statue cluster","Schematic exploration marker."],
 ["Region",68,68,"Inazuma","Island nation."],["Statue",69,61,"Inazuma Statue cluster","Schematic exploration marker."],
 ["Region",48,44,"Sumeru","Rainforest and desert nation."],["Domain",53,50,"Sumeru domain area","Representative farming-zone marker."],
 ["Region",53,20,"Fontaine","Hydro nation."],["Boss",59,27,"Fontaine boss area","Representative world-boss marker."],
 ["Region",28,78,"Natlan","Pyro nation."],["Boss",33,73,"Natlan boss area","Representative world-boss marker."],
 ["Waypoint",43,35,"Central Teyvat waypoint","Starter schematic waypoint."],["Domain",28,45,"Talent/weapon domain cluster","Representative farming-zone marker."],["Specialty",44,67,"Local specialty area","Representative collection marker."]
];
async function run(){const c=await pool.connect();try{await c.query("BEGIN");const g=await c.query(`SELECT id FROM games WHERE slug='genshin-impact' LIMIT 1`);if(!g.rowCount)throw new Error("Run npm run seed first.");const gid=g.rows[0].id;let m=await c.query(`SELECT id FROM maps WHERE game_id=$1 AND name='Teyvat Explorer' LIMIT 1`,[gid]);let mid;if(m.rowCount)mid=m.rows[0].id;else{m=await c.query(`INSERT INTO maps(game_id,name,image_url) VALUES($1,'Teyvat Explorer',NULL) RETURNING id`,[gid]);mid=m.rows[0].id}await c.query(`DELETE FROM map_markers WHERE map_id=$1 AND created_by IS NULL`,[mid]);for(const[x,a,b,l,n]of markers)await c.query(`INSERT INTO map_markers(map_id,category,x,y,label,notes) VALUES($1,$2,$3,$4,$5,$6)`,[mid,x,a,b,l,n]);await c.query("COMMIT");console.log(`Seeded Teyvat Explorer with ${markers.length} schematic markers.`)}catch(e){await c.query("ROLLBACK");throw e}finally{c.release();await pool.end()}}
run().catch(e=>{console.error(e);process.exit(1)});
