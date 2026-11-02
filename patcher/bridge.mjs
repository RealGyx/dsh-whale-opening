// This function is serialized with Function.prototype.toString() into Electron's
// main scope, so it must stay self-contained: no imports, no closures over module
// state, no reference to anything except its parameter object and globals that
// exist in that scope (ipcMain, mainWindow, process, setTimeout, Date, Promise).
export function installSingleWindowOpening({ipcMain,getMain,platform,timeoutMs=8000}) {
 const PREFIX='dsh-desktop:single-opening-', gates=new WeakMap();
 const valid=e=>{const w=getMain();return platform==='win32'&&w&&!w.isDestroyed()&&!w.webContents.isDestroyed()&&e.sender===w.webContents&&e.senderFrame===w.webContents.mainFrame&&e.senderFrame.url.startsWith('dsh-app://app/')?w:null;};
 const send=(g,op)=>{if(!g.window.isDestroyed()&&!g.window.webContents.isDestroyed())g.window.webContents.send(PREFIX+'mask',{op,id:g.id,deadline:g.deadline});};
 const settle=(g,reason)=>{if(g.released)return;g.released=true;g.reason=reason;clearTimeout(g.timer);g.pending?.(false);g.pending=null;if(reason!=='ready'){g.cancelled=true;send(g,'finish');}g.resolve();};
 const begin=g=>{if(!g||g.released||g.deadline)return;g.deadline=Date.now()+Math.min(8000,timeoutMs);send(g,'begin');g.timer=setTimeout(()=>settle(g,'timeout'),Math.min(8000,timeoutMs));};
 const live=g=>g&&!g.released&&!g.cancelled&&!g.window.isDestroyed()&&!g.window.isVisible()&&Date.now()<g.deadline;
 const command=(g,op)=>new Promise(resolve=>{if(!live(g))return resolve(false);g.pending=resolve;g.operation=op;send(g,op);});
 ipcMain.on(PREFIX+'mask-ack',(e,value)=>{const w=valid(e),g=w&&gates.get(w);if(!g||value?.id!==g.id||value.op!==g.operation||!g.pending)return;const done=g.pending;g.pending=null;done(value.ok===true&&live(g));});
 const startup={
  arm(window){if(platform!=='win32'||gates.has(window))return;let resolve;const g={window,id:1,deadline:0,released:false,cancelled:false,prepared:false,resolve:null,promise:new Promise(r=>{resolve=r;})};g.resolve=resolve;gates.set(window,g);window.webContents.setBackgroundThrottling?.(false);window.once('closed',()=>settle(g,'closed'));window.webContents.once('render-process-gone',()=>settle(g,'renderer-gone'));window.webContents.on('did-start-navigation',(_e,_url,inPlace,isMain)=>{if(isMain&&!inPlace&&g.started)settle(g,'navigation');});},
  wait(window){const g=gates.get(window);begin(g);return g?.promise||Promise.resolve();},
  schedule(window,present,onError){const g=gates.get(window);if(g?.scheduled)return;if(g)g.scheduled=true;startup.wait(window).then(present).catch(onError);},
  present(window,activate){if(window.isDestroyed())return;const g=gates.get(window);if(g&&!g.released){g.promise.then(()=>startup.present(window,activate));return;}if(activate)window.show();else window.showInactive();}
 };
 ipcMain.handle(PREFIX+'prepare',async(e,input)=>{
  const w=valid(e),g=w&&gates.get(w),no=reason=>({play:false,reason});
  if(!w)return no('unauthorized');begin(g);if(!live(g)||g.started)return no(g?.reason||'not-startup');
  if(!input||!['top','width','height'].every(k=>Number.isFinite(input[k]))||input.top<0||input.width<1||input.height<1)return no('invalid-input');
  const bounds=w.getContentBounds(),zoom=w.webContents.getZoomFactor();
  // Client measures CSS pixels; capturePage rect uses content DIPs (not physical pixels).
  const top=Math.round(input.top*zoom),width=bounds.width,height=bounds.height-top;
  if((input.top<1&&!w.isFullScreen?.())||height<1||Math.abs(input.width*zoom-width)>3||Math.abs(input.height*zoom-height)>3)return no('invalid-bounds');
  g.started=true;
  try {
   if(!await command(g,'capture')){settle(g,'mask-unavailable');return no(g.reason);}
   if(!live(g)){settle(g,'timeout');return no(g.reason);}
   const image=await Promise.race([w.webContents.capturePage({x:0,y:top,width,height},{stayHidden:true,stayAwake:true}),g.promise.then(()=>null)]);
   if(!live(g))return no(g.reason||'timeout');
   if(!await command(g,'restore')){settle(g,'mask-unavailable');return no(g.reason);}
   const now=w.getContentBounds();if(now.width!==bounds.width||now.height!==bounds.height||w.webContents.getZoomFactor()!==zoom){settle(g,'bounds-changed');return no(g.reason);}
   if(!image||image.isEmpty()){settle(g,'empty-snapshot');return no(g.reason);}
   const size=image.getSize();if(size.width<1||size.height<1||size.width*size.height>40000000){settle(g,'invalid-snapshot');return no(g.reason);}
   g.prepared=true;return {play:true,reason:'prepared',snapshot:{dataUrl:'data:image/png;base64,'+image.toPNG().toString('base64'),width:width/zoom,height:height/zoom}};
  }catch{settle(g,'capture-error');return no(g.reason);}
 });
 ipcMain.handle(PREFIX+'ready',async e=>{const w=valid(e),g=w&&gates.get(w);if(!live(g)||!g.prepared)return {play:false,reason:g?.reason||'not-prepared'};if(!await command(g,'ready')){settle(g,'mask-unavailable');return {play:false,reason:g.reason};}settle(g,'ready');return {play:true,reason:'ready'};});
 ipcMain.handle(PREFIX+'finish',e=>{const w=valid(e),g=w&&gates.get(w);if(!g)return {ok:false};send(g,'finish');settle(g,'finished');return {ok:true};});
 return startup;
}
