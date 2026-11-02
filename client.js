window.__ModuleLoader__.load({id:"dsh-whale-opening",factory(require){var module={exports:{}};var exports=module.exports;
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/client.jsx
var client_exports = {};
__export(client_exports, {
  apply: () => apply,
  inject: () => inject
});
module.exports = __toCommonJS(client_exports);
var import_react2 = __toESM(require("react"), 1);

// src/Opening.jsx
var import_react = __toESM(require("react"), 1);

// src/timeline.js
var MEDIA_SPEED = 1.1;
var CUES = Object.freeze(Object.fromEntries(Object.entries({
  tap: 10.5,
  reveal: 10.61,
  panel: 10.83,
  formed: 11.55,
  grow: 11.75,
  center: 12.55,
  align: 13.1,
  waveEnd: 11.6,
  waveRadiusEnd: 11.4,
  scanEnd: 11.75,
  videoFade: 13.35,
  full: 13.72,
  handoff: 14.12,
  done: 14.85
}).map(([key, value]) => [key, value / MEDIA_SPEED])));
var TAP = Object.freeze({ x: 0.135, y: 0.24 });
var clamp = (n, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, n));
var lerp = (a, b, t) => t === 0 ? a : t === 1 ? b : a + (b - a) * t;
var progress = (t, a, b) => clamp((t - a) / (b - a));
var smooth = (t) => t * t * (3 - 2 * t);
var easeOut = (t) => 1 - (1 - t) ** 3;
function videoRect(width, height, mode = "contain") {
  const k = mode === "cover" ? Math.max(width / 16, height / 9) : Math.min(width / 16, height / 9);
  const w = 16 * k, h = 9 * k;
  return { x: (width - w) / 2, y: (height - h) / 2, width: w, height: h };
}
function tapPoint(width, height, mode = "contain") {
  const r = videoRect(width, height, mode);
  return { x: r.x + r.width * TAP.x, y: r.y + r.height * TAP.y };
}
function sidebarGeometry(width, inheritedWidth) {
  const value = typeof inheritedWidth === "number" ? inheritedWidth : Number.parseFloat(inheritedWidth);
  if (Number.isFinite(value)) return clamp(value, 0, Math.max(0, width - 180));
  return width < 1024 ? 56 : 280;
}
function frameAt(time, width, height, ready = true) {
  const t = Math.max(0, time);
  const p = tapPoint(width, height, "cover");
  const show = easeOut(progress(t, CUES.panel, CUES.formed));
  const grow = smooth(progress(t, CUES.grow, CUES.full));
  const align = smooth(progress(t, CUES.formed, CUES.align));
  const scale = lerp(lerp(0.3, 0.67, show), 1, grow);
  const cx = lerp(p.x, width / 2, easeOut(progress(t, CUES.panel, CUES.center)));
  const cy = lerp(p.y + height * 0.11, height / 2, easeOut(progress(t, CUES.panel, CUES.center)));
  const radius = Math.hypot(width, height) * 0.55 * easeOut(progress(t, CUES.tap, CUES.waveRadiusEnd));
  const handoff = ready ? smooth(progress(t, CUES.handoff, CUES.done)) : 0;
  const waveAge = t - CUES.tap;
  return {
    time: t,
    point: p,
    scale,
    x: cx - width / 2,
    y: cy - height / 2,
    rotateX: lerp(7, 0, align),
    rotateY: lerp(-8, 0, align),
    rotateZ: lerp(-1.2, 0, align),
    panelOpacity: show,
    glass: lerp(0.36, 1, grow),
    borderRadius: lerp(24, 0, smooth(progress(t, CUES.align, CUES.full))),
    glow: (1 - grow) * show,
    waveRadius: radius,
    waveOpacity: waveAge < 0 ? 0 : Math.sin(Math.PI * progress(t, CUES.tap, CUES.waveEnd)) * 0.9,
    flash: Math.max(0, 1 - Math.abs(t - CUES.reveal) / (0.18 / MEDIA_SPEED)) * 0.3,
    scan: progress(t, CUES.reveal, CUES.scanEnd),
    handoff,
    rootOpacity: 1 - handoff,
    videoOpacity: 1 - smooth(progress(t, CUES.videoFade, CUES.full)),
    complete: ready && t >= CUES.done,
    phase: t < CUES.tap ? "video" : t < CUES.formed ? "summon" : t < CUES.full ? "expand" : t < CUES.done ? "handoff" : "complete"
  };
}
function transformFor(f) {
  return `translate3d(${f.x}px, ${f.y}px, 0) perspective(2200px) rotateX(${f.rotateX}deg) rotateY(${f.rotateY}deg) rotateZ(${f.rotateZ}deg) scale(${f.scale})`;
}

// src/opening.css
var opening_default = '.dso-root{position:fixed;inset:0;z-index:2000;overflow:hidden;isolation:isolate;pointer-events:auto;contain:layout paint style;color:var(--dsw-alias-label-primary,#243348);font:14px/1.5 var(--dsh-font-family-ui,system-ui,-apple-system,"Segoe UI","Microsoft YaHei",sans-serif);background:var(--dsw-alias-bg-base,#fcfdff);outline:none}.dso-root *{box-sizing:border-box}.dso-stage{position:absolute;inset:0;overflow:hidden;background:#e6edf5}.dso-backdrop{position:absolute;inset:-8%;background:linear-gradient(180deg,#4274ac 0%,#bcd4e7 49%,#f4f7fa 73%,#a4bfd6 100%);filter:blur(35px)}.dso-video{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;object-position:50% 50%;display:block}.dso-vignette{position:absolute;inset:0;box-shadow:inset 0 0 12vw #e1eaf00d;pointer-events:none}.dso-plane{position:absolute;inset:0;transform-origin:50% 50%;will-change:transform,opacity;border-radius:24px;overflow:hidden;isolation:isolate;pointer-events:none;box-shadow:0 22px 90px #123c6a3b,0 0 35px #90e5ff70;outline:1px solid #dcf8ffc9;opacity:0}.dso-glass{position:absolute;inset:0;background:var(--dsw-alias-bg-base,#fcfdff);opacity:var(--dso-glass,.36)}.dso-page{position:absolute;inset:0;display:grid;grid-template-columns:var(--dso-sidebar,280px) minmax(0,1fr);grid-template-rows:var(--dso-caption-height,36px) minmax(0,1fr);overflow:hidden;color:var(--dsw-alias-label-primary,#273247);font-size:14px;background:transparent;pointer-events:none;user-select:none}.dso-caption{grid-column:1/-1;grid-row:1;display:flex;align-items:center;justify-content:space-between;position:relative;min-width:0;border-bottom:1px solid var(--dsw-alias-border-l1,#cbd7e460);background:color-mix(in srgb,var(--dsw-alias-bg-layer-1,#f1f4f9) 58%,transparent);color:var(--dsw-alias-label-secondary,#66768c);font-size:11px}.dso-caption-brand{display:flex;align-items:center;gap:8px;min-width:0;padding-left:14px;white-space:nowrap}.dso-caption-brand img{width:18px;height:18px;object-fit:contain;border-radius:5px}.dso-caption-center{position:absolute;left:50%;transform:translateX(-50%);font-size:11px;opacity:.65;white-space:nowrap}.dso-caption-controls{height:100%;display:flex;align-items:stretch;margin-left:auto;padding-left:18px}.dso-caption-controls span{width:46px;display:grid;place-items:center;font-size:15px}.dso-sidebar{grid-column:1;grid-row:2;display:flex;flex-direction:column;gap:6px;min-width:0;padding:24px 14px 16px;border-right:1px solid var(--dsw-alias-border-l1,#cbd7e460);background:color-mix(in srgb,var(--dsw-alias-bg-layer-1,#f1f4f9) 58%,transparent);overflow:hidden}.dso-brand{display:flex;align-items:center;gap:10px;height:38px;margin-bottom:21px;white-space:nowrap;font-weight:650;font-size:16px;letter-spacing:-.35px}.dso-mark{width:32px;height:32px;object-fit:contain;border-radius:9px;mix-blend-mode:multiply}.dso-label{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.dso-nav{height:37px;display:flex;align-items:center;gap:12px;padding:0 12px;border-radius:9px;white-space:nowrap;color:var(--dsw-alias-label-secondary,#66768c)}.dso-nav-active{background:color-mix(in srgb,var(--dsw-alias-brand-primary,#4d7ceb) 12%,transparent);color:var(--dsw-alias-label-primary,#273247)}.dso-icon{display:inline-flex;flex:0 0 18px;width:18px;justify-content:center;font-size:19px;font-weight:400}.dso-section-title{margin:22px 12px 8px;font-size:11px;color:var(--dsw-alias-label-secondary,#78879a);letter-spacing:.08em}.dso-project-dot{width:7px;height:7px;border:1px solid currentColor;border-radius:50%;margin:0 6px}.dso-sidebar-footer{margin-top:auto;display:flex;align-items:center;gap:10px;padding:12px 8px;color:var(--dsw-alias-label-secondary,#66768c);font-size:12px;white-space:nowrap}.dso-avatar{width:27px;height:27px;border-radius:50%;background:color-mix(in srgb,var(--dsw-alias-brand-primary,#4d7ceb) 12%,transparent);display:grid;place-items:center;flex-shrink:0}.dso-root[data-narrow="true"] .dso-caption-center{display:none}.dso-root[data-narrow="true"] .dso-caption-controls span{width:34px}.dso-main{grid-column:2;grid-row:2;position:relative;min-width:0;display:flex;flex-direction:column;overflow:hidden}.dso-topbar{display:flex;justify-content:space-between;align-items:center;padding:20px 28px;min-height:64px;color:var(--dsw-alias-label-secondary,#728199);font-size:13px}.dso-topbar-name{display:flex;align-items:center;gap:10px}.dso-live-dot{width:6px;height:6px;border-radius:50%;background:#6db6d0;box-shadow:0 0 8px #74d2eb50}.dso-topbar-tools{display:flex;gap:21px;font-size:17px}.dso-center{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:10px 30px 20px;min-height:0;transform:translateY(-2.8%)}.dso-hero-logo{width:76px;height:76px;object-fit:contain;border-radius:21px;mix-blend-mode:multiply;margin-bottom:24px}.dso-heading{font-size:clamp(22px,2.3vw,35px);font-weight:550;letter-spacing:-.7px;margin:0 0 9px;text-align:center}.dso-subheading{font-size:14px;color:var(--dsw-alias-label-secondary,#75839a);margin:0 0 31px;text-align:center}.dso-composer{width:min(760px,100%);min-height:148px;border:1px solid var(--dsw-alias-border-l1,#cdd8e5);border-radius:19px;background:color-mix(in srgb,var(--dsw-alias-bg-base,#fff) 65%,transparent);box-shadow:0 7px 25px #162f4f04;display:flex;flex-direction:column;justify-content:space-between;padding:21px 22px 15px}.dso-placeholder{color:var(--dsw-alias-label-secondary,#8791a2);font-size:15px}.dso-composer-bottom{display:flex;justify-content:space-between;align-items:center;margin-top:25px}.dso-composer-left{display:flex;gap:12px;align-items:center;color:var(--dsw-alias-label-secondary,#75839a);font-size:12px}.dso-model-pill{border:1px solid var(--dsw-alias-border-l1,#d7dfe9);border-radius:7px;padding:3px 9px}.dso-send{height:30px;width:30px;border-radius:50%;display:grid;place-items:center;color:var(--dsw-alias-label-primary-foreground,#fff);background:var(--dsw-alias-brand-primary,#5885e6);font-size:19px}.dso-chips{display:flex;justify-content:center;gap:9px;margin-top:18px;flex-wrap:wrap}.dso-chip{border:1px solid var(--dsw-alias-border-l1,#d8e0e9);border-radius:9px;padding:8px 13px;color:var(--dsw-alias-label-secondary,#75839a);font-size:12px;background:color-mix(in srgb,var(--dsw-alias-bg-base,#fff) 32%,transparent)}.dso-footnote{text-align:center;color:var(--dsw-alias-label-secondary,#8692a4);font-size:11px;padding:14px 25px 18px}.dso-root[data-rail="true"] .dso-sidebar{padding:22px 9px}.dso-root[data-rail="true"] .dso-brand{justify-content:center}.dso-root[data-rail="true"] .dso-sidebar .dso-label,.dso-root[data-rail="true"] .dso-section-title,.dso-root[data-rail="true"] .dso-sidebar-footer .dso-label{display:none}.dso-root[data-rail="true"] .dso-nav{justify-content:center;padding:0}.dso-root[data-rail="true"] .dso-sidebar-footer{justify-content:center;padding:10px 0}.dso-root[data-no-sidebar="true"] .dso-sidebar{display:none}.dso-plane-glow{position:absolute;inset:0;border:1px solid #d4f5ff;box-shadow:inset 0 0 35px #adf0ff32;pointer-events:none;border-radius:inherit}.dso-scan{position:absolute;inset:-60% -30%;pointer-events:none;background:linear-gradient(112deg,transparent 35%,#d7f7ff00 43%,#effeffaa 49%,#82d7ff35 52%,transparent 61%);mix-blend-mode:screen}.dso-wave{position:absolute;pointer-events:none;width:2px;height:2px;border-radius:50%;border:1px solid #cbf6ff;box-shadow:0 0 15px #b7f4ff,inset 0 0 12px #b7f4ff;transform:translate(-50%,-50%);opacity:0}.dso-wave-secondary{border-color:#e8fcff99;box-shadow:0 0 22px #e2fbff55}.dso-flash{position:absolute;inset:0;pointer-events:none;background:radial-gradient(circle at var(--dso-tap-x,47%) var(--dso-tap-y,26.3%),#f4ffffee 0, #c6f4ff99 9%,transparent 45%);mix-blend-mode:screen;opacity:0}.dso-skip,.dso-retry{position:absolute;right:22px;top:20px;z-index:10;border:1px solid var(--dsw-alias-border-l1,#ced9e380);border-radius:999px;color:var(--dsw-alias-label-primary,#36455d);background:color-mix(in srgb,var(--dsw-alias-bg-base,#fff) 80%,transparent);backdrop-filter:blur(10px);padding:8px 15px;cursor:pointer;font:inherit;font-size:12px;pointer-events:auto}.dso-skip:focus-visible,.dso-retry:focus-visible{outline:2px solid var(--dsw-alias-brand-primary,#4d7ceb);outline-offset:3px}.dso-retry{top:50%;right:50%;transform:translate(50%,-50%);font-size:14px;padding:12px 25px}.dso-loading{position:absolute;bottom:30px;left:50%;transform:translateX(-50%);font-size:12px;color:#52657b;pointer-events:none}.dso-status{position:absolute;bottom:20px;left:20px;font-size:11px;color:var(--dsw-alias-label-secondary,#6d7c90);pointer-events:none}.dso-root[data-narrow="true"] .dso-topbar{padding:16px 18px}.dso-root[data-narrow="true"] .dso-center{padding:10px 18px}.dso-root[data-narrow="true"] .dso-heading{font-size:23px}.dso-root[data-narrow="true"] .dso-chips{gap:6px}.dso-root[data-narrow="true"] .dso-chip{font-size:11px;padding:7px 8px}.dso-root[data-narrow="true"] .dso-hero-logo{width:60px;height:60px}.dso-root[data-short="true"] .dso-center{transform:none}.dso-root[data-short="true"] .dso-hero-logo{width:45px;height:45px;margin-bottom:9px}.dso-root[data-short="true"] .dso-subheading{margin-bottom:15px}.dso-root[data-short="true"] .dso-composer{min-height:110px}.dso-root[data-short="true"] .dso-chips,.dso-root[data-short="true"] .dso-footnote{display:none}\n/* Screenshot-matched shell composition. All surfaces share the page glass opacity. */\n.dso-page{container-type:inline-size}.dso-caption{border:0;background:color-mix(in srgb,var(--dsw-specific-sidebar-fill,var(--dsw-alias-bg-layer-1,#1c1c1c)) calc(var(--dso-glass,1)*100%),transparent);font-size:14px}.dso-caption-brand{gap:24px;padding-left:20px}.dso-caption-brand>span:first-child{font-size:18px}.dso-whale{display:inline-block;width:30px;height:30px;flex-shrink:0;background:currentColor;mask-size:contain;mask-repeat:no-repeat;mask-position:center;-webkit-mask-size:contain;-webkit-mask-repeat:no-repeat;-webkit-mask-position:center}.dso-sidebar{padding:14px 14px 18px;gap:2px;border:0;background:color-mix(in srgb,var(--dsw-specific-sidebar-fill,var(--dsw-alias-bg-layer-1,#1c1c1c)) calc(var(--dso-glass,1)*100%),transparent)}.dso-brand{gap:9px;margin-bottom:14px;height:40px}.dso-wordmark{font-size:23px;font-weight:650;letter-spacing:-.6px}.dso-wordmark b{display:inline-block;font-size:10px;line-height:16px;letter-spacing:.4px;padding:0 3px;border-radius:2px;vertical-align:middle;color:var(--dsw-alias-bg-base,#141416);background:var(--dsw-alias-label-primary,#eee)}.dso-nav{height:40px;padding:0 10px;gap:10px;color:var(--dsw-alias-label-primary,#eee);font-size:15px}.dso-nav-active{justify-content:center;margin-bottom:12px;background:color-mix(in srgb,var(--dsw-alias-label-secondary,#aaa) 24%,transparent);border:1px solid color-mix(in srgb,var(--dsw-alias-border-l1,#555) 55%,transparent);border-radius:11px}.dso-section-title{margin:22px 5px 10px;display:flex;justify-content:space-between;font-size:13px;letter-spacing:0}.dso-workspace-tools{font-size:15px}.dso-sidebar-footer{font-size:14px;color:var(--dsw-alias-label-primary,#eee)}.dso-main{border-radius:16px 0 0 0;background:color-mix(in srgb,var(--dsw-alias-bg-base,#141416) calc(var(--dso-glass,1)*100%),transparent)}.dso-topbar{position:absolute;top:0;right:0;min-height:0;padding:16px 20px;font-size:17px}.dso-center{flex:none;position:absolute;left:7%;right:7%;top:50%;transform:translateY(-50%);padding:0;align-items:stretch;min-height:0}.dso-heading{display:flex;align-items:center;justify-content:center;gap:12px;margin:0 0 30px;white-space:nowrap}.dso-heading .dso-whale{width:38px;height:38px}.dso-heading h1{font-size:clamp(23px,2.05cqw,32px);font-weight:500;letter-spacing:-.5px;margin:0}.dso-preview-badge{font-size:11px;line-height:20px;padding:0 7px;border-radius:12px;color:#c0d0ec;background:#34425b;align-self:center;white-space:nowrap}.dso-workspace-line{display:flex;gap:24px;padding:0 12px;margin-bottom:12px;font-size:14px}.dso-composer{width:100%;min-height:126px;border:0;border-radius:23px;padding:16px;background:color-mix(in srgb,var(--dsw-alias-bg-layer-1,#2b2b2e) calc(var(--dso-glass,1)*100%),transparent);box-shadow:none}.dso-placeholder{font-size:14px;line-height:22px}.dso-composer-bottom{margin-top:38px;gap:12px}.dso-composer-left{font-size:13px;gap:20px;color:var(--dsw-alias-label-primary,#eee)}.dso-add{border-radius:50%;width:30px;height:30px;font-size:23px;display:grid;place-items:center;background:color-mix(in srgb,var(--dsw-alias-label-secondary,#999) 7%,transparent)}.dso-model-tools{display:flex;align-items:center;gap:9px;font-size:12px;color:var(--dsw-alias-label-secondary,#aaa);white-space:nowrap}.dso-send{margin-left:14px;background:#455c82;color:#91a3bd;width:36px;height:36px;font-size:26px}.dso-root[data-narrow="true"] .dso-center{padding:0;left:6%;right:6%}.dso-root[data-narrow="true"] .dso-caption-brand{gap:15px}.dso-root[data-narrow="true"] .dso-heading{gap:7px;margin-bottom:25px}.dso-root[data-narrow="true"] .dso-heading h1{font-size:20px}.dso-root[data-narrow="true"] .dso-heading .dso-whale{width:27px;height:27px}.dso-root[data-narrow="true"] .dso-model-tools>span:not(:last-child){display:none}.dso-root[data-narrow="true"] .dso-workspace-line{font-size:11px;gap:12px;padding:0}.dso-root[data-narrow="true"] .dso-placeholder{font-size:12px}.dso-root[data-short="true"] .dso-center{transform:translateY(-50%)}\n/* Keep native caption and its controls untouched; animate only the client area. */\n.dso-root[data-content-only="true"]{top:var(--dsh-frame-chrome-top,0px)}\n.dso-root[data-content-only="true"] .dso-page{grid-template-rows:0 minmax(0,1fr)}\n.dso-root[data-content-only="true"] .dso-caption{display:none}\n.dso-real-snapshot{position:absolute;inset:0;width:100%;height:100%;object-fit:contain;object-position:center;opacity:var(--dso-glass,1);pointer-events:none;user-select:none;display:block}\n';

// src/assets/whale.svg
var whale_default = '<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="50.000000" height="50.000000" viewBox="0 0 50 50" fill="none">\n	<path id="path" d="M48.8354 10.0479C48.3232 9.79199 48.1025 10.2798 47.8032 10.5278C47.7007 10.6079 47.6143 10.7119 47.5273 10.8076C46.7793 11.624 45.9048 12.1597 44.7622 12.0957C43.0923 12 41.666 12.5356 40.4058 13.8398C40.1377 12.2319 39.2476 11.272 37.8926 10.6558C37.1836 10.3359 36.4668 10.0156 35.9702 9.31982C35.6235 8.82373 35.5293 8.27197 35.356 7.72754C35.2456 7.3999 35.1353 7.06396 34.7651 7.00781C34.3633 6.94385 34.2056 7.2876 34.0479 7.57568C33.418 8.75195 33.1733 10.0479 33.1973 11.3599C33.2524 14.312 34.4736 16.6641 36.8999 18.3359C37.1758 18.5278 37.2466 18.7197 37.1597 19C36.9946 19.5757 36.7974 20.1357 36.624 20.7119C36.5137 21.0801 36.3486 21.1597 35.9624 21C34.6309 20.4321 33.481 19.5918 32.4644 18.5757C30.7393 16.8721 29.1792 14.9917 27.2334 13.52C26.7764 13.1758 26.3193 12.856 25.8467 12.5518C23.8618 10.584 26.1069 8.96777 26.627 8.77588C27.1704 8.57568 26.8159 7.8877 25.0591 7.896C23.3022 7.90381 21.6953 8.50391 19.647 9.30371C19.3477 9.42383 19.0322 9.51172 18.7095 9.58398C16.8501 9.22363 14.9199 9.14355 12.9033 9.37598C9.10596 9.80762 6.07275 11.6396 3.84326 14.7681C1.16455 18.5278 0.53418 22.7998 1.30664 27.2559C2.11768 31.9521 4.46582 35.8398 8.07373 38.8799C11.8159 42.0322 16.1255 43.5762 21.041 43.2803C24.0269 43.104 27.3516 42.6963 31.1016 39.4561C32.0469 39.936 33.0396 40.1279 34.686 40.272C35.9546 40.3921 37.1758 40.208 38.1211 40.0078C39.6021 39.688 39.4995 38.2881 38.9639 38.0322C34.623 35.9678 35.5762 36.8081 34.71 36.1279C36.9155 33.4639 40.2402 30.6958 41.54 21.728C41.6426 21.0161 41.5557 20.5679 41.54 19.9917C41.5322 19.6396 41.6108 19.5039 42.0049 19.4639C43.0923 19.3359 44.1479 19.0317 45.1167 18.4878C47.9292 16.9199 49.064 14.3438 49.3315 11.2559C49.3711 10.7837 49.3237 10.2959 48.8354 10.0479ZM24.3262 37.8398C20.1196 34.4639 18.0791 33.3521 17.2358 33.3999C16.4482 33.4482 16.5898 34.3682 16.7632 34.9678C16.9443 35.5601 17.1812 35.9683 17.5117 36.4878C17.7402 36.832 17.8979 37.3442 17.2832 37.728C15.9282 38.584 13.5728 37.4399 13.4624 37.3838C10.7207 35.7358 8.42822 33.5601 6.81348 30.584C5.25342 27.7197 4.34766 24.6479 4.19775 21.3677C4.1582 20.5757 4.38672 20.2959 5.15869 20.1519C6.17529 19.96 7.22314 19.9199 8.23926 20.0718C12.5327 20.7119 16.1885 22.6719 19.2529 25.7759C21.002 27.5439 22.3252 29.6558 23.6885 31.7202C25.1377 33.9121 26.6978 36 28.6831 37.7119C29.3843 38.312 29.9434 38.7681 30.479 39.104C28.8643 39.2881 26.1699 39.3281 24.3262 37.8398ZM26.3433 24.6001C26.3433 24.248 26.6191 23.9678 26.9658 23.9678C27.0444 23.9678 27.1152 23.9839 27.1782 24.0078C27.2651 24.04 27.3438 24.0879 27.4067 24.1602C27.5171 24.272 27.5801 24.4321 27.5801 24.6001C27.5801 24.9521 27.3042 25.2319 26.9575 25.2319C26.6108 25.2319 26.3433 24.9521 26.3433 24.6001ZM32.6064 27.8799C32.2046 28.0479 31.8027 28.1919 31.4165 28.208C30.8179 28.2397 30.1641 27.9922 29.8096 27.688C29.2583 27.2158 28.8643 26.9521 28.6987 26.1279C28.6279 25.7759 28.6675 25.2319 28.7305 24.9199C28.8721 24.248 28.7144 23.8159 28.2495 23.4238C27.8716 23.104 27.3911 23.0161 26.8633 23.0161C26.666 23.0161 26.4849 22.9277 26.3511 22.856C26.1304 22.7441 25.9492 22.4639 26.1226 22.1201C26.1777 22.0078 26.4458 21.7358 26.5088 21.688C27.2256 21.272 28.0527 21.4077 28.8169 21.7197C29.5259 22.0161 30.0615 22.5601 30.834 23.3281C31.6216 24.2559 31.7632 24.5117 32.2124 25.208C32.5669 25.752 32.8901 26.312 33.1104 26.9521C33.2446 27.3521 33.0713 27.6802 32.6064 27.8799Z" fill="#000" fill-opacity="1.000000" fill-rule="nonzero"/>\n</svg>\n';

// src/Opening.jsx
var whaleMask = `url("data:image/svg+xml,${encodeURIComponent(whale_default)}")`;
function Whale() {
  return /* @__PURE__ */ import_react.default.createElement("span", { className: "dso-whale", style: { maskImage: whaleMask, WebkitMaskImage: whaleMask } });
}
var messages = { zh: { skip: "\u8DF3\u8FC7\u52A8\u753B \xB7 Esc", play: "\u70B9\u51FB\u64AD\u653E\u5F00\u5C4F", loading: "\u6B63\u5728\u8F7D\u5165\u5F00\u5C4F\u52A8\u753B\u2026", newSession: "\u65B0\u5EFA\u4F1A\u8BDD", search: "\u641C\u7D22\u4F1A\u8BDD", projects: "\u5DE5\u4F5C\u533A", currentProject: "\u5F53\u524D\u5DE5\u4F5C\u533A", recent: "\u6700\u8FD1\u4F1A\u8BDD", welcome: "\u6B22\u8FCE\u56DE\u6765", history: "\u5F00\u59CB\u65B0\u7684\u5BF9\u8BDD", plugins: "\u63D2\u4EF6", settings: "\u8BBE\u7F6E", local: "\u672C\u5730\u5DE5\u4F5C\u533A", title: "DeepSeek Harness", subtitle: "\u8BA9\u60F3\u6CD5\u6210\u4E3A\u73B0\u5B9E", placeholder: "\u63CF\u8FF0\u4F60\u60F3\u6784\u5EFA\u7684\u5185\u5BB9\u2026", model: "\u9ED8\u8BA4\u6A21\u578B", build: "\u6784\u5EFA\u5E94\u7528", review: "\u5206\u6790\u4EE3\u7801", explore: "\u63A2\u7D22\u60F3\u6CD5", footer: "\u7531 DeepSeek Harness \u9A71\u52A8", waiting: "\u6B63\u5728\u8FDE\u63A5\u5DE5\u4F5C\u533A\u2026" }, en: { skip: "Skip \xB7 Esc", play: "Play opening", loading: "Loading opening\u2026", newSession: "New session", search: "Search sessions", projects: "Workspace", currentProject: "Current workspace", recent: "Recent sessions", welcome: "Welcome back", history: "Start a conversation", plugins: "Plugins", settings: "Settings", local: "Local workspace", title: "DeepSeek Harness", subtitle: "Bring your ideas to life", placeholder: "Describe what you want to build\u2026", model: "Default model", build: "Build an app", review: "Review code", explore: "Explore ideas", footer: "Powered by DeepSeek Harness", waiting: "Connecting to workspace\u2026" } };
var fallbackT = (key) => messages.zh[key] || key;
function DisplayPage({ t = fallbackT }) {
  const text = (zh, en) => t("newSession") === "New session" ? en : zh;
  const nav = (icon, key, active = false) => /* @__PURE__ */ import_react.default.createElement("div", { className: "dso-nav" + (active ? " dso-nav-active" : ""), key }, /* @__PURE__ */ import_react.default.createElement("span", { className: "dso-icon" }, icon), /* @__PURE__ */ import_react.default.createElement("span", { className: "dso-label" }, t(key)));
  return /* @__PURE__ */ import_react.default.createElement("div", { className: "dso-page", "aria-hidden": "true" }, /* @__PURE__ */ import_react.default.createElement("div", { className: "dso-caption" }, /* @__PURE__ */ import_react.default.createElement("div", { className: "dso-caption-brand" }, /* @__PURE__ */ import_react.default.createElement("span", null, "\u25EB"), /* @__PURE__ */ import_react.default.createElement("span", null, text("\u5E94\u7528", "App")), /* @__PURE__ */ import_react.default.createElement("span", null, text("\u7F16\u8F91", "Edit"))), /* @__PURE__ */ import_react.default.createElement("div", { className: "dso-caption-controls" }, /* @__PURE__ */ import_react.default.createElement("span", null, "\u2500"), /* @__PURE__ */ import_react.default.createElement("span", null, "\u25A1"), /* @__PURE__ */ import_react.default.createElement("span", null, "\xD7"))), /* @__PURE__ */ import_react.default.createElement("aside", { className: "dso-sidebar" }, /* @__PURE__ */ import_react.default.createElement("div", { className: "dso-brand" }, /* @__PURE__ */ import_react.default.createElement(Whale, null), /* @__PURE__ */ import_react.default.createElement("span", { className: "dso-label dso-wordmark" }, "deepseek ", /* @__PURE__ */ import_react.default.createElement("b", null, "HARNESS"))), nav("\u2295", "newSession", true), nav("\u2667", "plugins"), /* @__PURE__ */ import_react.default.createElement("div", { className: "dso-nav" }, /* @__PURE__ */ import_react.default.createElement("span", { className: "dso-icon" }, "\u25F7"), /* @__PURE__ */ import_react.default.createElement("span", { className: "dso-label" }, text("\u81EA\u52A8\u5316\u4EFB\u52A1", "Automations"))), /* @__PURE__ */ import_react.default.createElement("div", { className: "dso-nav" }, /* @__PURE__ */ import_react.default.createElement("span", { className: "dso-icon" }, "\u229E"), /* @__PURE__ */ import_react.default.createElement("span", { className: "dso-label" }, text("\u66F4\u591A", "More"))), /* @__PURE__ */ import_react.default.createElement("div", { className: "dso-section-title" }, /* @__PURE__ */ import_react.default.createElement("span", null, t("projects")), /* @__PURE__ */ import_react.default.createElement("span", { className: "dso-workspace-tools" }, "\u2315\u3000\u2637\u3000\u229E")), /* @__PURE__ */ import_react.default.createElement("div", { className: "dso-workspace-empty" }), /* @__PURE__ */ import_react.default.createElement("div", { className: "dso-sidebar-footer" }, /* @__PURE__ */ import_react.default.createElement("span", { className: "dso-avatar" }, "\u25EF"), /* @__PURE__ */ import_react.default.createElement("span", { className: "dso-label" }, text("\u7528\u6237", "User")))), /* @__PURE__ */ import_react.default.createElement("main", { className: "dso-main" }, /* @__PURE__ */ import_react.default.createElement("header", { className: "dso-topbar" }, /* @__PURE__ */ import_react.default.createElement("span", null, "\u25EB")), /* @__PURE__ */ import_react.default.createElement("section", { className: "dso-center" }, /* @__PURE__ */ import_react.default.createElement("div", { className: "dso-heading" }, /* @__PURE__ */ import_react.default.createElement(Whale, null), /* @__PURE__ */ import_react.default.createElement("h1", null, text("\u63A2\u7D22\u672A\u81F3\u4E4B\u5883", "Explore the unknown")), /* @__PURE__ */ import_react.default.createElement("span", { className: "dso-preview-badge" }, text("\u9884\u89C8\u7248", "Preview"))), /* @__PURE__ */ import_react.default.createElement("div", { className: "dso-workspace-line" }, /* @__PURE__ */ import_react.default.createElement("span", null, "\u25B1 \xA0", text("\u9009\u62E9\u5DE5\u4F5C\u533A", "Select workspace"), "\u2304"), /* @__PURE__ */ import_react.default.createElement("span", null, "\u2667 \xA0", text("\u6807\u51C6\u6A21\u5F0F", "Standard mode"), "\u2304")), /* @__PURE__ */ import_react.default.createElement("div", { className: "dso-composer" }, /* @__PURE__ */ import_react.default.createElement("div", { className: "dso-placeholder" }, text("\u63CF\u8FF0\u4F60\u60F3\u8981\u6784\u5EFA\u7684\u5185\u5BB9\uFF0C/ \u8C03\u7528\u6307\u4EE4\uFF0C@ \u6587\u4EF6\u6216\u5BF9\u8BDD", "Describe what you want to build, / commands, @ files or conversations")), /* @__PURE__ */ import_react.default.createElement("div", { className: "dso-composer-bottom" }, /* @__PURE__ */ import_react.default.createElement("div", { className: "dso-composer-left" }, /* @__PURE__ */ import_react.default.createElement("span", { className: "dso-add" }, "+"), /* @__PURE__ */ import_react.default.createElement("span", null, "\u2667 \xA0", text("\u5B8C\u5168\u6743\u9650", "Full access"), "\u2304")), /* @__PURE__ */ import_react.default.createElement("div", { className: "dso-model-tools" }, /* @__PURE__ */ import_react.default.createElement("span", null, "DeepSeek-V4.1-Flash"), /* @__PURE__ */ import_react.default.createElement("span", { className: "dso-preview-badge" }, "1017"), /* @__PURE__ */ import_react.default.createElement("span", null, "High\u2304"), /* @__PURE__ */ import_react.default.createElement("span", { className: "dso-send" }, "\u2191")))))));
}
var DONE_KEY = "dsh-opening-v2:played:0.1.1";
function alreadyPlayed() {
  try {
    return sessionStorage.getItem(DONE_KEY) === "1";
  } catch {
    return false;
  }
}
function markPlayed() {
  try {
    sessionStorage.setItem(DONE_KEY, "1");
  } catch {
  }
}
function Opening({ t = fallbackT, useConnectionState, mediaUrl, manualTime = null, force = false, onFinished, onMediaReady, snapshot, preview = false, contentOnly = false, posterUrl, playbackEnabled = true }) {
  const connected = useConnectionState ? useConnectionState((s) => s === "connected") : true;
  const [active, setActive] = (0, import_react.useState)(() => manualTime !== null || force || !alreadyPlayed());
  const [playBlocked, setPlayBlocked] = (0, import_react.useState)(false), [loaded, setLoaded] = (0, import_react.useState)(false);
  const blockedRef = (0, import_react.useRef)(false);
  blockedRef.current = playBlocked;
  const root = (0, import_react.useRef)(null), video = (0, import_react.useRef)(null), plane = (0, import_react.useRef)(null), stage = (0, import_react.useRef)(null), ring = (0, import_react.useRef)(null), ring2 = (0, import_react.useRef)(null), flash = (0, import_react.useRef)(null), scan = (0, import_react.useRef)(null), glow = (0, import_react.useRef)(null);
  const size = (0, import_react.useRef)({ width: 1, height: 1 }), ready = (0, import_react.useRef)(false), stable = (0, import_react.useRef)(false), finished = (0, import_react.useRef)(false), lastTime = (0, import_react.useRef)(0), realStart = (0, import_react.useRef)(0), lastProgress = (0, import_react.useRef)(0), rvfc = (0, import_react.useRef)(null);
  const priorFocus = (0, import_react.useRef)(null);
  const connectedRef = (0, import_react.useRef)(connected);
  connectedRef.current = connected;
  const finish = (0, import_react.useCallback)((reason = "ended") => {
    if (finished.current) return;
    finished.current = true;
    video.current?.pause();
    if (!preview && ["ended", "skip", "reduced-motion"].includes(reason)) markPlayed();
    setActive(false);
    const previous = priorFocus.current;
    if (previous?.isConnected && previous !== document.body) requestAnimationFrame(() => previous.focus?.({ preventScroll: true }));
    onFinished?.(reason);
  }, [onFinished, preview]);
  const paint = (0, import_react.useCallback)((time) => {
    const el = root.current;
    if (!el || !plane.current) return;
    const { width, height } = size.current;
    const f = frameAt(time, width, height, ready.current);
    lastTime.current = time;
    el.dataset.phase = f.phase;
    el.dataset.time = time.toFixed(3);
    el.style.opacity = String(f.rootOpacity);
    el.style.setProperty("--dso-tap-x", `${f.point.x}px`);
    el.style.setProperty("--dso-tap-y", `${f.point.y}px`);
    plane.current.style.transform = transformFor(f);
    plane.current.style.opacity = String(f.panelOpacity);
    plane.current.style.borderRadius = `${f.borderRadius}px`;
    plane.current.style.setProperty("--dso-glass", f.glass);
    plane.current.style.boxShadow = f.glow > 1e-3 ? `0 22px 90px rgb(18 60 106 / ${0.22 * f.glow}),0 0 35px rgb(144 229 255 / ${0.4 * f.glow})` : "none";
    plane.current.style.outlineColor = `rgb(220 248 255 / ${f.glow * 0.8})`;
    stage.current.style.opacity = String(f.videoOpacity);
    for (const [node, factor] of [[ring.current, 1], [ring2.current, 0.72]]) {
      node.style.left = `${f.point.x}px`;
      node.style.top = `${f.point.y}px`;
      node.style.width = `${Math.max(2, f.waveRadius * factor * 2)}px`;
      node.style.height = node.style.width;
      node.style.opacity = String(f.waveOpacity * (factor === 1 ? 1 : 0.55));
    }
    flash.current.style.opacity = String(f.flash);
    scan.current.style.transform = `translateX(${(f.scan - 0.5) * 105}%)`;
    scan.current.style.opacity = String(Math.sin(f.scan * Math.PI) * 0.7);
    glow.current.style.opacity = String(f.glow);
    if (f.complete && manualTime === null) finish();
  }, [finish, manualTime]);
  (0, import_react.useLayoutEffect)(() => {
    if (!active || !root.current) return;
    const el = root.current;
    const measure = () => {
      const r = el.getBoundingClientRect();
      size.current = { width: r.width, height: r.height };
      const style = getComputedStyle(el);
      const sidebar = sidebarGeometry(r.width, style.getPropertyValue("--dsh-windows-sidebar-width"));
      el.style.setProperty("--dso-caption-height", `${Number.parseFloat(style.getPropertyValue("--dsh-frame-chrome-top")) || 36}px`);
      el.style.setProperty("--dso-sidebar", `${sidebar}px`);
      el.dataset.rail = String(sidebar > 0 && sidebar < 100);
      el.dataset.noSidebar = String(sidebar === 0);
      el.dataset.narrow = String(r.width < 760);
      el.dataset.short = String(r.height < 650);
      paint(lastTime.current);
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    let cancelled = false;
    let raf1 = 0, raf2 = 0;
    Promise.resolve(document.fonts?.ready).then(() => {
      if (cancelled) return;
      raf1 = requestAnimationFrame(() => {
        raf2 = requestAnimationFrame(() => {
          stable.current = true;
          ready.current = connectedRef.current;
        });
      });
    });
    if (!preview) {
      priorFocus.current = document.activeElement;
      el.focus({ preventScroll: true });
    }
    return () => {
      cancelled = true;
      observer.disconnect();
      cancelAnimationFrame(raf1);
      cancelAnimationFrame(raf2);
      stable.current = false;
    };
  }, [active, paint, preview]);
  (0, import_react.useEffect)(() => {
    ready.current = stable.current && connected;
  }, [connected]);
  (0, import_react.useEffect)(() => {
    if (!active || manualTime === null) return;
    const v = video.current;
    ready.current = true;
    v.pause();
    const seek = () => {
      if (v.readyState >= 2) setLoaded(true);
      if (Math.abs(v.currentTime - manualTime) > 0.03) v.currentTime = Math.min(manualTime, Math.max(0, (v.duration || 15) - 0.03));
      paint(manualTime);
    };
    v.addEventListener("loadedmetadata", seek);
    v.addEventListener("seeked", seek);
    seek();
    return () => {
      v.removeEventListener("loadedmetadata", seek);
      v.removeEventListener("seeked", seek);
    };
  }, [manualTime, active, paint]);
  (0, import_react.useEffect)(() => {
    if (!active || manualTime !== null || !playbackEnabled) return;
    const v = video.current;
    let disposed = false, raf = 0;
    let previous = -1;
    realStart.current = performance.now();
    lastProgress.current = realStart.current;
    const reduced = matchMedia("(prefers-reduced-motion: reduce)");
    if (reduced.matches && !force) {
      finish("reduced-motion");
      return;
    }
    const onKey = (e) => {
      if (e.key === "Escape") {
        e.preventDefault();
        finish("skip");
      } else if (e.key === "Tab") {
        e.preventDefault();
        root.current?.querySelector(".dso-skip")?.focus();
      }
    };
    root.current?.addEventListener("keydown", onKey);
    const frame = () => {
      if (disposed) return;
      const now = performance.now(), at = v.currentTime;
      if (at !== previous) {
        previous = at;
        lastProgress.current = now;
      }
      if (document.visibilityState === "visible") {
        paint(at);
        if (now - lastProgress.current > 12e3 && !blockedRef.current) finish("media-timeout");
        if (now - realStart.current > 45e3) finish("watchdog");
        if (v.ended && !ready.current && now - lastProgress.current > 3500) finish("connection-timeout");
      } else {
        lastProgress.current = now;
        realStart.current = now;
      }
      raf = requestAnimationFrame(frame);
    };
    if ("requestVideoFrameCallback" in v) {
      const step = (_, meta) => {
        if (disposed) return;
        paint(meta.mediaTime);
        rvfc.current = v.requestVideoFrameCallback(step);
      };
      rvfc.current = v.requestVideoFrameCallback(step);
    }
    const start = () => v.play().then(() => setPlayBlocked(false)).catch(() => setPlayBlocked(true));
    start();
    raf = requestAnimationFrame(frame);
    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      if (rvfc.current !== null && v.cancelVideoFrameCallback) v.cancelVideoFrameCallback(rvfc.current);
      v.pause();
      root.current?.removeEventListener("keydown", onKey);
    };
  }, [active, manualTime, paint, finish, force, playbackEnabled]);
  if (!active) return null;
  return /* @__PURE__ */ import_react.default.createElement("div", { className: "dso-root", "data-content-only": contentOnly, ref: root, tabIndex: -1, role: "dialog", "aria-modal": "true", "aria-label": t("title") }, /* @__PURE__ */ import_react.default.createElement("style", null, opening_default), /* @__PURE__ */ import_react.default.createElement("div", { ref: stage, className: "dso-stage" }, /* @__PURE__ */ import_react.default.createElement("div", { className: "dso-backdrop" }), /* @__PURE__ */ import_react.default.createElement("video", { ref: video, className: "dso-video", src: mediaUrl, poster: posterUrl, muted: true, playsInline: true, preload: "auto", onLoadedData: () => {
    setLoaded(true);
    onMediaReady?.();
  }, onError: (e) => {
    console.warn("[dsh-opening-v2] media playback failed", { code: e.currentTarget.error?.code, message: e.currentTarget.error?.message, src: e.currentTarget.currentSrc });
    finish("media-error");
  } }), /* @__PURE__ */ import_react.default.createElement("div", { className: "dso-vignette" })), /* @__PURE__ */ import_react.default.createElement("div", { ref: plane, className: "dso-plane" }, /* @__PURE__ */ import_react.default.createElement("div", { className: "dso-glass" }), snapshot ? /* @__PURE__ */ import_react.default.createElement("img", { className: "dso-real-snapshot", src: snapshot.dataUrl, alt: "", draggable: false }) : /* @__PURE__ */ import_react.default.createElement(DisplayPage, { t }), /* @__PURE__ */ import_react.default.createElement("div", { className: "dso-plane-glow", ref: glow }), /* @__PURE__ */ import_react.default.createElement("div", { className: "dso-scan", ref: scan })), /* @__PURE__ */ import_react.default.createElement("div", { className: "dso-wave", ref: ring }), /* @__PURE__ */ import_react.default.createElement("div", { className: "dso-wave dso-wave-secondary", ref: ring2 }), /* @__PURE__ */ import_react.default.createElement("div", { className: "dso-flash", ref: flash }), manualTime === null && /* @__PURE__ */ import_react.default.createElement("button", { className: "dso-skip", onClick: () => finish("skip") }, t("skip")), playBlocked && /* @__PURE__ */ import_react.default.createElement("button", { className: "dso-retry", onClick: () => video.current.play().then(() => setPlayBlocked(false)) }, t("play")), !loaded && /* @__PURE__ */ import_react.default.createElement("span", { className: "dso-loading" }, t("loading")), !connected && /* @__PURE__ */ import_react.default.createElement("span", { className: "dso-status" }, t("waiting")));
}

// src/client.jsx
var NS = "local.dsh-opening-v2";
var preparation = null;
function OpeningSlot(props) {
  const connected = props.useConnectionState((s) => s === "connected");
  const bridge = window.dshDesktop?.opening;
  const desktop = typeof bridge?.singlePrepare === "function";
  const [mode, setMode] = (0, import_react2.useState)(() => desktop ? "prepare" : alreadyPlayed() ? "done" : "web");
  const [snapshot, setSnapshot] = (0, import_react2.useState)(null), [playing, setPlaying] = (0, import_react2.useState)(false);
  const own = (0, import_react2.useRef)(null), started = (0, import_react2.useRef)(false);
  const finish = (0, import_react2.useCallback)((reason) => {
    if (!desktop && ["ended", "skip", "reduced-motion"].includes(reason)) markPlayed();
    setMode("done");
    bridge?.singleFinish?.().catch(() => {
    });
  }, [bridge, desktop]);
  (0, import_react2.useEffect)(() => {
    if (mode === "done") {
      bridge?.singleFinish?.().catch(() => {
      });
      return;
    }
    if (mode !== "prepare" || !connected || !own.current) return;
    let disposed = false;
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) {
      finish();
      return;
    }
    if (!preparation) preparation = (async () => {
      await document.fonts?.ready;
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      const style = getComputedStyle(own.current);
      const top = Math.max(0, parseFloat(style.getPropertyValue("--dsh-frame-chrome-top")) || 0);
      return bridge.singlePrepare({ top, width: innerWidth, height: innerHeight - top });
    })().catch(() => ({ play: false }));
    preparation.then((result) => {
      if (disposed) return;
      if (!result?.play) {
        console.warn("[dsh-whale-opening] startup skipped", result?.reason || "bridge-error");
        finish();
        return;
      }
      setSnapshot(result.snapshot || null);
      setMode("single");
    });
    return () => {
      disposed = true;
    };
  }, [mode, connected, bridge, finish]);
  (0, import_react2.useEffect)(() => {
    if (!snapshot) return;
    const resize = () => {
      setSnapshot(null);
    };
    addEventListener("resize", resize);
    return () => removeEventListener("resize", resize);
  }, [snapshot]);
  const ready = (0, import_react2.useCallback)(() => {
    if (started.current) return;
    started.current = true;
    bridge.singleReady().then((result) => {
      if (!result?.play) finish();
      else setPlaying(true);
    }).catch(finish);
  }, [bridge, finish]);
  if (mode === "done") return null;
  if (mode === "prepare") return /* @__PURE__ */ import_react2.default.createElement("span", { ref: own, "aria-hidden": "true", style: { position: "absolute", width: 0, height: 0, pointerEvents: "none" } });
  return /* @__PURE__ */ import_react2.default.createElement(Opening, { ...props, force: mode === "single", playbackEnabled: mode !== "single" || playing, contentOnly: !!window.dshDesktop, snapshot, onMediaReady: mode === "single" ? ready : void 0, onFinished: finish, mediaUrl: "/dsh-opening-v2/video.mp4?v=white-cyber-11x", posterUrl: "/dsh-opening-v2/poster.jpg?v=white-cyber-11x" });
}
var inject = ["slots", "locale", "connection"];
function apply(ctx) {
  ctx.effect(() => ctx.locale.register(NS, messages));
  ctx.slots.inject("shell.overlay", () => ctx.slots.register({ name: "shell.overlay", id: "dsh-opening-v2", order: 1e3, locale: NS, inject: () => ({ hooks: { connectionState: ctx.connection.state } }) }, OpeningSlot));
  ctx.effect(() => () => {
    preparation = null;
    window.dshDesktop?.opening?.singleFinish?.().catch(() => {
    });
  });
}

return module.exports;}});
