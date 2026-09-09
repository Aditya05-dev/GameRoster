import React,{useEffect,useMemo,useState}from"react";
import{useParams}from"react-router-dom";
import{api}from"../lib/api";
import{Badge,Card,Empty}from"../components/UI";

const LABELS={weapon:"Recommended weapons",artifact_set:"Artifact sets",main_stats:"Main stats",substats:"Substats",talent_priority:"Talent priority",team_note:"Team notes"};
const normalize=s=>(s||"").trim().toLowerCase();

function GearImage({src,alt}){
  if(!src)return null;
  return <img className="recWeaponImage" src={src} alt={alt} loading="lazy" onError={e=>{e.currentTarget.style.display="none"}}/>;
}

export default function CharacterDetail(){
  const{id}=useParams();
  const[c,setC]=useState(null),[builds,setBuilds]=useState([]),[equipment,setEquipment]=useState([]);
  useEffect(()=>{
    api.get(`/characters/${id}`,{auth:false}).then(async r=>{setC(r.character);try{const e=await api.get(`/catalog/equipment?gameId=${r.character.game_id}`,{auth:false});setEquipment(e.equipment||[])}catch{setEquipment([])}});
    api.get(`/builds?characterId=${id}`,{auth:false}).then(r=>setBuilds(r.builds||[])).catch(()=>{});
  },[id]);
  const grouped=useMemo(()=>{const out={};for(const r of c?.recommendations||[])(out[r.category]??=[]).push(r);return out},[c]);
  const equipmentByName=useMemo(()=>new Map(equipment.map(e=>[normalize(e.name),e])),[equipment]);
  const compatibleWeapons=useMemo(()=>{const type=normalize(c?.stats?.weaponType);if(!type)return[];return equipment.filter(e=>e.kind==="weapon"&&normalize(e.stats?.weaponType)===type).sort((a,b)=>(Number(b.rarity)||0)-(Number(a.rarity)||0)||a.name.localeCompare(b.name))},[equipment,c]);
  if(!c)return <section className="section">Loading…</section>;
  return <section className="section">
    <div className="characterHero"><div><p className="eyebrow">CHARACTER</p><h1>{c.name}</h1><div className="badgeRow">{c.rarity&&<Badge>{c.rarity}★</Badge>}{c.tier&&<Badge>{c.tier} Tier</Badge>}{[c.stats?.element,c.stats?.weaponType,c.stats?.role,c.stats?.region].filter(Boolean).map(v=><Badge key={v}>{v}</Badge>)}</div>{c.source_meta?.provider&&<p className="sourceNote">Catalog data synced from {c.source_meta.provider}{c.source_meta.importedAt?` • ${new Date(c.source_meta.importedAt).toLocaleDateString()}`:""}</p>}</div>{(c.artwork_url||c.portrait_url)&&<img src={c.artwork_url||c.portrait_url} alt={c.name} loading="lazy" onError={e=>{if(c.portrait_url&&e.currentTarget.src!==c.portrait_url)e.currentTarget.src=c.portrait_url;else e.currentTarget.style.display="none"}}/>}</div>
    <div className="twoCol"><div><h2>Strengths</h2><Card>{c.strengths?.length?<ul>{c.strengths.map(x=><li key={x}>{x}</li>)}</ul>:"No reviewed notes yet."}</Card><h2>Gameplay</h2><Card>{c.gameplay_notes||c.stats?.description||"No reviewed gameplay notes yet."}</Card></div><div><h2>Weaknesses</h2><Card>{c.weaknesses?.length?<ul>{c.weaknesses.map(x=><li key={x}>{x}</li>)}</ul>:"No reviewed notes yet."}</Card><h2>Skills</h2>{c.skills?.length?c.skills.map(s=><Card key={s.id||s.name}><b>{s.name}</b><p>{s.type}</p><small>{s.description}</small></Card>):<Empty title="No skills" body="Skills have not been published yet."/>}</div></div>
    <h2>Starter build recommendations</h2><p className="muted">Reviewed recommendations are shown where available. They are guidance, not a claim that every item is universally best.</p>
    {Object.keys(grouped).length?<div className="recommendGrid">{Object.entries(grouped).map(([category,rows])=><Card key={category}><h3>{LABELS[category]||category}</h3><div className="recList">{rows.map(r=>{const gear=category==="weapon"?equipmentByName.get(normalize(r.item_name)):null;return <div className="recRow" key={`${category}-${r.item_name}`}><div className="recItem">{gear&&<GearImage src={gear.portrait_url} alt={gear.name}/>}<div><b>{r.item_name}</b>{r.notes&&<small>{r.notes}</small>}</div></div>{r.rank>0&&<Badge>#{r.rank}</Badge>}</div>})}</div></Card>)}</div>:<Empty title="No reviewed recommendations yet" body="Use the compatible weapon catalog below while reviewed build guidance is being added."/>}
    {c.stats?.weaponType&&<><div className="sectionHeading"><h2>Compatible {c.stats.weaponType} weapons</h2><span className="muted">{compatibleWeapons.length} in catalog</span></div>{compatibleWeapons.length?<div className="weaponStrip">{compatibleWeapons.map(w=><Card key={w.id} className="weaponMini"><GearImage src={w.portrait_url} alt={w.name}/><div><b>{w.name}</b><small>{w.rarity?`${w.rarity}★`:""}{w.stats?.secondaryStat?` • ${w.stats.secondaryStat}`:""}</small></div></Card>)}</div>:<Empty title="No compatible weapons synced" body="Run the Genshin catalog sync to load the weapon catalog."/>}</>}
    <h2>Community builds</h2>{builds.length?<div className="list">{builds.map(b=><Card key={b.id}><b>{b.title}</b><p>{b.build_type} • by {b.author_username||"community"}</p></Card>)}</div>:<Empty title="No public builds" body="Be the first to publish one after signing in."/>}
  </section>
}
