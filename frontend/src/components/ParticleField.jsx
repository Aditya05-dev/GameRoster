import React,{useEffect,useRef}from"react";

export default function ParticleField(){
  const ref=useRef(null);
  useEffect(()=>{
    const canvas=ref.current;if(!canvas)return;
    const ctx=canvas.getContext("2d");
    let raf=0,w=0,h=0,dpr=Math.min(window.devicePixelRatio||1,2),mouse={x:-9999,y:-9999};
    const dots=[];
    function resize(){w=window.innerWidth;h=window.innerHeight;canvas.width=w*dpr;canvas.height=h*dpr;canvas.style.width=w+"px";canvas.style.height=h+"px";ctx.setTransform(dpr,0,0,dpr,0,0);const target=Math.min(110,Math.max(45,Math.floor(w*h/18000)));while(dots.length<target)dots.push({x:Math.random()*w,y:Math.random()*h,vx:(Math.random()-.5)*.22,vy:(Math.random()-.5)*.22,r:.7+Math.random()*1.6,a:.16+Math.random()*.34});dots.length=target}
    function move(e){mouse.x=e.clientX;mouse.y=e.clientY}
    function leave(){mouse.x=-9999;mouse.y=-9999}
    function frame(){ctx.clearRect(0,0,w,h);for(const p of dots){const dx=p.x-mouse.x,dy=p.y-mouse.y,dist=Math.hypot(dx,dy);if(dist<150&&dist>1){const force=(150-dist)/150*.09;p.vx+=dx/dist*force;p.vy+=dy/dist*force}p.vx*=.992;p.vy*=.992;p.x+=p.vx;p.y+=p.vy;if(p.x<-10)p.x=w+10;if(p.x>w+10)p.x=-10;if(p.y<-10)p.y=h+10;if(p.y>h+10)p.y=-10;ctx.beginPath();ctx.fillStyle=`rgba(150,206,255,${p.a})`;ctx.shadowBlur=8;ctx.shadowColor="rgba(102,178,255,.45)";ctx.arc(p.x,p.y,p.r,0,Math.PI*2);ctx.fill()}ctx.shadowBlur=0;raf=requestAnimationFrame(frame)}
    resize();window.addEventListener("resize",resize);window.addEventListener("pointermove",move,{passive:true});window.addEventListener("pointerleave",leave);frame();
    return()=>{cancelAnimationFrame(raf);window.removeEventListener("resize",resize);window.removeEventListener("pointermove",move);window.removeEventListener("pointerleave",leave)};
  },[]);
  return <canvas ref={ref} className="particleField" aria-hidden="true"/>;
}
