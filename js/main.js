(()=>{var y=(o,n)=>()=>{try{return n||o((n={exports:{}}).exports,n),n.exports}catch(l){throw n=0,l}};var p=y(h=>{window.throttle=(o,n)=>{let l,a;return(...c)=>{let m=h;!a||Date.now()-a>=n?(o.apply(m,c),a=Date.now()):(clearTimeout(l),l=setTimeout(()=>{o.apply(m,c),a=Date.now()},n-(Date.now()-a)))}};(function(){[Element,Document,Window].forEach(e=>{e.prototype._addEventListener=e.prototype.addEventListener,e.prototype._removeEventListener=e.prototype.removeEventListener,e.prototype.addEventListener=e.prototype.on=function(r,t,s){this.__listeners__=this.__listeners__||{},this.__listeners__[r]=this.__listeners__[r]||[];for(let[i,d]of this.__listeners__[r])if(i===t&&JSON.stringify(d)===JSON.stringify(s))return this;return this.__listeners__[r].push([t,s]),this._addEventListener(r,t,s),this},e.prototype.removeEventListener=e.prototype.off=function(r,t,s){return!this.__listeners__||!this.__listeners__[r]?this:t?(this._removeEventListener(r,t,s),this.__listeners__[r]=this.__listeners__[r].filter(([i,d])=>i!==t||JSON.stringify(d)!==JSON.stringify(s)),this.__listeners__[r].length===0&&delete this.__listeners__[r],this):(this.__listeners__[r].forEach(([i,d])=>{this.removeEventListener(r,i,d)}),delete this.__listeners__[r],this)}}),window._$=e=>document.querySelector(e),window._$$=e=>document.querySelectorAll(e);let o=document.createElement("a");o.className="nav-icon dark-mode-btn",_$("#sub-nav").append(o);let n=window.matchMedia("(prefers-color-scheme: dark)").matches;function l(e){let t=e==="true"||e==="auto"&&n;document.documentElement.setAttribute("data-theme",t?"dark":null),localStorage.setItem("dark_mode",e),o.id=`nav-${e==="true"?"moon":e==="false"?"sun":"circle-half-stroke"}-btn`,document.body.dispatchEvent(new CustomEvent(`${t?"dark":"light"}-theme-set`))}let a=localStorage.getItem("dark_mode")||document.documentElement.getAttribute("data-theme-mode")||"auto";l(a),o.addEventListener("click",throttle(()=>{let e=["auto","false","true"],r=e[(e.indexOf(localStorage.getItem("dark_mode"))+1)%3];l(r)},1e3));let c=0;if(document.addEventListener("scroll",()=>{let e=document.documentElement.scrollTop||document.body.scrollTop,r=e-c;window.diffY=r,c=e,r<0?_$("#header-nav")?.classList.remove("header-nav-hidden"):_$("#header-nav")?.classList.add("header-nav-hidden")}),window.Pace&&Pace.on("done",()=>{Pace.sources[0].elements=[]}),window.materialTheme){let r=function(){if(_$("#reimu-generated-theme-style"))return;let i=`
    :root {
      --red-0: var(--md-sys-color-primary-light);
      --red-1: color-mix(in srgb, var(--md-sys-color-primary-light) 90%, white);
      --red-2: color-mix(in srgb, var(--md-sys-color-primary-light) 75%, white);
      --red-3: color-mix(in srgb, var(--md-sys-color-primary-light) 55%, white);
      --red-4: color-mix(in srgb, var(--md-sys-color-primary-light) 40%, white);
      --red-5: color-mix(in srgb, var(--md-sys-color-primary-light) 15%, white);
      --red-5-5: color-mix(in srgb, var(--md-sys-color-primary-light) 10%, white);
      --red-6: color-mix(in srgb, var(--md-sys-color-primary-light) 5%, white);
    
      --color-border: var(--red-3);
      --color-link: var(--red-1);
      --color-meta-shadow: var(--red-6);
      --color-h2-after: var(--red-1);
      --color-red-6-shadow: var(--red-2);
      --color-red-3-shadow: var(--red-3);
    }
    
    [data-theme="dark"]:root {
      --red-0: var(--red-1);
      --red-1: color-mix(in srgb, var(--md-sys-color-primary-dark) 90%, white);
      --red-2: color-mix(in srgb, var(--md-sys-color-primary-dark) 80%, white);
      --red-3: color-mix(in srgb, var(--md-sys-color-primary-dark) 75%, white);
      --red-4: color-mix(in srgb, var(--md-sys-color-primary-dark) 30%, transparent);
      --red-5: color-mix(in srgb, var(--md-sys-color-primary-dark) 20%, transparent);
      --red-5-5: color-mix(in srgb, var(--md-sys-color-primary-dark) 10%, transparent);
      --red-6: color-mix(in srgb, var(--md-sys-color-primary-dark) 5%, transparent);
      
      --color-border: var(--red-5);
    }
    `,d=document.createElement("style");d.id="reimu-generated-theme-style",d.textContent=i,document.body.appendChild(d)};var m=r;let e=new materialTheme.ColorThemeExtractor({needTransition:!1});async function t(s){let i=await e.generateThemeSchemeFromImage(s);document.documentElement.style.setProperty("--md-sys-color-primary-light",e.hexFromArgb(i.schemes.light.props.primary)),document.documentElement.style.setProperty("--md-sys-color-primary-dark",e.hexFromArgb(i.schemes.dark.props.primary)),r()}window.generateSchemeHandler=()=>{if(window.bannerElement?.src)window.bannerElement.complete?t(bannerElement):window.bannerElement.addEventListener("load",()=>{t(bannerElement)},{once:!0});else if(window.bannerElement?.style.background){let s=window.bannerElement.style.background.match(/\d+/g),i=e.generateThemeScheme({r:parseInt(s[0]),g:parseInt(s[1]),b:parseInt(s[2])});document.documentElement.style.setProperty("--md-sys-color-primary-light",e.hexFromArgb(i.schemes.light.props.primary)),document.documentElement.style.setProperty("--md-sys-color-primary-dark",e.hexFromArgb(i.schemes.dark.props.primary)),r()}}}})();window.safeImport=async(o,n)=>{if(!n)return import(o);let a=await(await fetch(o)).text(),c=await crypto.subtle.digest("SHA-384",new TextEncoder().encode(a));if("sha384-"+btoa(String.fromCharCode(...new Uint8Array(c)))!==n)throw new Error(`Integrity check failed for ${o}`);let e=new Blob([a],{type:"application/javascript"}),r=URL.createObjectURL(e),t=await import(r);return URL.revokeObjectURL(r),t}});p();})();
