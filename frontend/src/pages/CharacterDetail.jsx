import React,{useEffect,useMemo,useState}from"react";
import{useParams}from"react-router-dom";
import{api}from"../lib/api";
import{Badge,Card,Empty}from"../components/UI";

const LABELS={weapon:"Weapons",artifact_set:"Artifact sets",main_stats:"Main stats",substats:"Substats",talent_priority:"Talent priority",team_note:"Team notes"};

export default function CharacterDetail(){
  const{id}=useParams();
  const[c,setC]=useState(null),[builds,setBuilds]=useState([]);
  useEffect(()=>{
    api.get(`/characters/${id}`,{auth:false}).then(r=>setC(r.character));
    api.get(`/builds?characterId=${id}`,{auth:false}).then(r=>setBuilds(r.builds||[])).catch(()=>{});
  },[id]);
  const grouped=useMemo(()=>{
    const out={};
    for(const r of c?.recommendations||[])(out[r.category]??=[]).push(r);
    return out;
  },[c]);
  if(!c)return <section className="section">Loading…</section>;
  return <section className="section">
    <div className="characterHero"><div><p className="eyebrow">CHARACTER</p><h1>{c.name}</h1><div className="badgeRow">{c.rarity&&<Badge>{c.rarity}★</Badge>}{c.tier&&<Badge>{c.tier} Tier</Badge>}{Object.entries(c.stats||{}).slice(0,4).map(([k,v])=><Badge key={k}>{v}</Badge>)}</div>{c.source_meta?.reviewedOn&&<p className="sourceNote">Catalog reviewed {c.source_meta.reviewedOn} • {c.source_meta.factualSource}</p>}</div>{c.portrait_url&&<img src={c.portrait_url} alt={c.name}/>}</div>
    <div className="twoCol"><div><h2>Strengths</h2><Card>{c.strengths?.length?<ul>{c.strengths.map(x=><li key={x}>{x}</li>)}</ul>:"No reviewed notes yet."}</Card><h2>Gameplay</h2><Card>{c.gameplay_notes||"No reviewed gameplay notes yet."}</Card></div><div><h2>Weaknesses</h2><Card>{c.weaknesses?.length?<ul>{c.weaknesses.map(x=><li key={x}>{x}</li>)}</ul>:"No reviewed notes yet."}</Card><h2>Skills</h2>{c.skills?.length?c.skills.map(s=><Card key={s.id||s.name}><b>{s.name}</b><p>{s.type}</p><small>{s.description}</small></Card>):<Empty title="No skills" body="Skills have not been reviewed and published yet."/>}</div></div>
    <h2>Starter build recommendations</h2><p className="muted">These are editorial starter recommendations, not a claim that every item is universally best. Team, constellation, weapon availability and game updates can change priorities.</p>
    {Object.keys(grouped).length?<div className="recommendGrid">{Object.entries(grouped).map(([category,rows])=><Card key={category}><h3>{LABELS[category]||category}</h3><div className="recList">{rows.map(r=><div className="recRow" key={`${category}-${r.item_name}`}><div><b>{r.item_name}</b>{r.notes&&<small>{r.notes}</small>}</div>{r.rank>0&&<Badge>#{r.rank}</Badge>}</div>)}</div></Card>)}</div>:<Empty title="No recommendations yet" body="Reviewed build guidance has not been added for this character."/>}
    <h2>Community builds</h2>{builds.length?<div className="list">{builds.map(b=><Card key={b.id}><b>{b.title}</b><p>{b.build_type} • by {b.author_username||"community"}</p></Card>)}</div>:<Empty title="No public builds" body="Be the first to publish one after signing in."/>}
  </section>
}
