// whale-opening single preload begin
// Appended to preload-app.cjs inside the user's own archive at patch time.
// The patcher substitutes the poster token below with an inline JPEG data URL;
// when no poster is available it stays a transparent pixel over a dark curtain.
(() => {
 if (process.platform !== 'win32' || !location.href.startsWith('dsh-app://app/')) return;
 const ipc = require('electron').ipcRenderer;
 const channel = 'dsh-desktop:single-opening-';
 let mask, terminal=false, capture=false, revision=0, timer;
 const ensure=()=>{
  if(terminal||!document.documentElement)return;
  if(!mask){mask=document.createElement('img');mask.id='dsh-single-opening-bootstrap';mask.alt='';mask.draggable=false;mask.src='__WHALE_POSTER_DATA_URL__';mask.setAttribute('aria-hidden','true');mask.style.cssText='position:fixed!important;left:0!important;top:var(--dsh-frame-chrome-top,40px)!important;width:100vw!important;height:calc(100vh - var(--dsh-frame-chrome-top,40px))!important;object-fit:cover!important;z-index:2147483647!important;pointer-events:none!important;background:#080b13!important;';}
  if(!capture&&!mask.isConnected)document.documentElement.appendChild(mask);
 };
 // Observe document itself: preload can precede html, and DOMContentLoaded is too late.
 const observer=new MutationObserver(ensure);observer.observe(document,{childList:true,subtree:true});ensure();
 const paint=()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
 const finish=()=>{terminal=true;clearTimeout(timer);revision++;observer.disconnect();mask?.remove();};
 ipc.on(channel+'mask',async(_event,message)=>{
  if(!message||!['begin','capture','restore','ready','finish'].includes(message.op))return;
   if(message.op==='begin'){if(!terminal){clearTimeout(timer);timer=setTimeout(finish,Math.max(0,message.deadline-Date.now())+500);}return;}
  if(message.op==='finish'){finish();return;}
  const token=++revision;
  const current=()=>!terminal&&token===revision&&Date.now()<message.deadline;
  const ack=ok=>ipc.send(channel+'mask-ack',{id:message.id,op:message.op,ok});
  if(!current()){ack(false);return;}
  try{
   if(message.op==='capture'){capture=true;mask?.remove();await paint();}
   else if(message.op==='restore'){capture=false;ensure();if(!mask)throw Error('missing root');await mask.decode();await paint();}
   else {capture=true;mask?.remove();await paint();}
   if(!current()){ack(false);return;}
   if(message.op==='ready'){terminal=true;observer.disconnect();}
   ack(true);
  }catch{ack(false);}
 });
 // Local cleanup also covers a disconnected main process. Main's stricter deadline owns play.
 timer=setTimeout(finish,45000);
})();
// whale-opening single preload end
