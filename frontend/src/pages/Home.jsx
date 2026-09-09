import React,{useEffect,useState}from"react";
import{Link}from"react-router-dom";
import{api}from"../lib/api";
import{Card}from"../components/UI";

export default function Home(){
  const[games,setGames]=useState([]);
  useEffect(()=>{api.get("/games",{auth:false}).then(g=>setGames(g.games||[]))},[]);
  return <>
    <section className="hero">
      <p className="eyebrow">MULTI-GAME COMPANION</p>
      <h1>One roster.<br/>Every game you're grinding.</h1>
      <p>Character databases, builds, teams, guides, farming plans, tier lists, maps and account tools backed by a real API.</p>
      <div><Link className="btn primary" to="/games">Browse games</Link><Link className="btn ghost" to="/lookup">Check a UID</Link></div>
    </section>
    <Section title="Games"><div className="grid games">{games.map(g=><Link key={g.id} to={`/games/${g.slug}`}><Card className="gameCard"><span className="gameDot" style={{background:g.accent_color}}/><b>{g.short_name}</b><small>{g.franchise||"Standalone"}</small></Card></Link>)}</div></Section>
  </>;
}
function Section({title,children}){return <section className="section"><div className="sectionTitle">{title}</div>{children}</section>}
