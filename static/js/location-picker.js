(() => {
  "use strict";
  const normalize = (v) => String(v || "").normalize("NFKC").replace(/[يى]/g,"ی").replace(/[ك]/g,"ک").replace(/[\u064B-\u065F\u0670\u0640]/g,"").replace(/\s+/g," ").trim();
  function init() {
    const input=document.getElementById("citySelect"), toggle=document.getElementById("toggleMarketCityPicker");
    if(!input || input.dataset.cityDialogReady==="true") return;
    input.dataset.cityDialogReady="true"; input.readOnly=true;
    input.setAttribute("aria-haspopup","dialog"); input.setAttribute("aria-label","شهر بازار؛ برای تغییر انتخاب کنید");
    input.setAttribute("aria-expanded","false");
    const overlay=document.createElement("div"); overlay.className="city-dialog-overlay"; overlay.hidden=true;
    overlay.innerHTML = '<section class="city-dialog" role="dialog" aria-modal="true" aria-labelledby="cityDialogTitle" aria-describedby="cityDialogHint" tabindex="-1">'+
      '<header class="city-dialog-header"><div><h2 id="cityDialogTitle">انتخاب شهر</h2><p id="cityDialogHint">بازار شهر موردنظرت را انتخاب کن.</p></div><button class="city-dialog-close" type="button" aria-label="بستن پنجره">×</button></header>'+
      '<label class="city-dialog-search"><span aria-hidden="true">⌕</span><input class="city-dialog-query" type="search" autocomplete="off" placeholder="نام شهر یا استان را جست‌وجو کن…" aria-label="جست‌وجوی شهر یا استان"><button class="city-dialog-clear" type="button" aria-label="پاک کردن جست‌وجو" hidden>×</button></label>'+
      '<div class="city-dialog-status" role="status" aria-live="polite"></div>'+
      '<section class="city-dialog-popular" aria-labelledby="cityDialogPopularTitle"><h3 id="cityDialogPopularTitle">شهرهای پرطرفدار</h3><div class="city-dialog-chips"></div></section>'+
      '<section class="city-dialog-results-wrap"><div class="city-dialog-results-heading"><h3 class="city-dialog-results-title">استان و شهر</h3><span class="city-dialog-count"></span></div><div class="city-dialog-results" role="listbox" aria-label="فهرست شهرهای ایران"></div></section>'+
      '<footer class="city-dialog-footer">فقط شهرهای یکتای ایران نمایش داده می‌شوند؛ محله و روستا در فهرست نیست.</footer></section>';
    document.body.appendChild(overlay);
    const dialog=overlay.querySelector(".city-dialog"), query=overlay.querySelector(".city-dialog-query"), chips=overlay.querySelector(".city-dialog-chips");
    const results=overlay.querySelector(".city-dialog-results"), title=overlay.querySelector(".city-dialog-results-title"), count=overlay.querySelector(".city-dialog-count");
    const status=overlay.querySelector(".city-dialog-status"), clear=overlay.querySelector(".city-dialog-clear"), close=overlay.querySelector(".city-dialog-close");
    let cities=[], popular=[], req=0, timer=null, previousFocus=null, oldOverflow="", active=-1, directoryPromise=null;
    const say=(s)=>{status.textContent=s;};
    function choose(item){ input.value=item.name; input.dataset.selectedType="city"; input.dataset.selectedId=item.id==null?"":String(item.id); input.dispatchEvent(new Event("change",{bubbles:true})); closeDialog(); }
    function cityButton(item,isPopular=false){
      const b=document.createElement("button"); b.type="button"; b.className="city-dialog-city"+(isPopular?" is-popular":""); b.setAttribute("role","option");
      b.setAttribute("aria-selected",normalize(input.value)===normalize(item.name)?"true":"false");
      const n=document.createElement("strong"); n.textContent=item.name;
      const p=document.createElement("small"); p.textContent=item.province||"ایران"; b.append(n,p); b.addEventListener("click",()=>choose(item)); return b;
    }
    function renderPopular(items){ chips.replaceChildren(); const all=document.createElement("button"); all.type="button"; all.className="city-dialog-city is-popular city-dialog-all"; all.setAttribute("role","option"); all.setAttribute("aria-selected",normalize(input.value)==="همه شهرها"?"true":"false"); const label=document.createElement("strong"); label.textContent="کل ایران"; const meta=document.createElement("small"); meta.textContent="نمایش کالاهای همه شهرها"; all.append(label,meta); all.addEventListener("click",()=>choose({id:null,name:"همه شهرها",province:"ایران",type:"city"})); chips.appendChild(all); (items||[]).slice(0,15).forEach(x=>chips.appendChild(cityButton(x,true))); overlay.querySelector(".city-dialog-popular").hidden=false; }
    function render(items,q){
      results.replaceChildren(); active=-1; count.textContent=items.length?new Intl.NumberFormat("fa-IR").format(items.length)+" شهر":"۰ شهر";
      if(!items.length){const p=document.createElement("p");p.className="city-dialog-empty";p.textContent=q?"شهری با این نام پیدا نشد. املای نام شهر یا استان را بررسی کن.":"فهرست شهری برای نمایش وجود ندارد.";results.appendChild(p);say(p.textContent);return;}
      if(q){items.forEach(x=>results.appendChild(cityButton(x)));}
      else {
        const groups=new Map();
        items.forEach(x=>{const ps=String(x.province||"سایر استان‌ها").split("،").map(v=>v.trim()).filter(Boolean);const key=ps.length===1?ps[0]:"نام‌های مشترک در چند استان";if(!groups.has(key))groups.set(key,[]);groups.get(key).push(x);});
        [...groups.keys()].sort((a,b)=>a.localeCompare(b,"fa")).forEach(province=>{
          const section=document.createElement("section");section.className="city-dialog-province";
          const h=document.createElement("h4");h.textContent=province;const list=document.createElement("div");list.className="city-dialog-province-cities";
          groups.get(province).sort((a,b)=>a.name.localeCompare(b.name,"fa")).forEach(x=>list.appendChild(cityButton(x)));
          section.append(h,list);results.appendChild(section);
        });
      }
      say(q?items.length+" شهر پیدا شد.":items.length+" شهر در فهرست ایران.");
    }
    async function loadDirectory(){
      if(cities.length)return true;
      if(directoryPromise)return directoryPromise;
      directoryPromise=(async()=>{
        say("در حال دریافت فهرست شهرها…");
        results.replaceChildren();
        const loading=document.createElement("p");loading.className="city-dialog-loading";loading.textContent="در حال دریافت فهرست شهرها…";results.appendChild(loading);
        try{
          const response=await fetch("/api/locations?kind=city&all=1",{credentials:"same-origin",headers:{Accept:"application/json"}});
          if(!response.ok)throw new Error("failed");
          const data=await response.json();
          cities=Array.isArray(data.items)?data.items.filter(x=>x.type==="city"&&x.name):[];
          popular=Array.isArray(data.popular)?data.popular:[];
          if(!cities.length)throw new Error("empty");
          renderPopular(popular);
          return true;
        }catch(_){
          directoryPromise=null;results.replaceChildren();
          const wrap=document.createElement("div");wrap.className="city-dialog-error";
          const p=document.createElement("p");p.textContent="دریافت فهرست شهرها ممکن نشد. اتصال اینترنت را بررسی کن.";
          const retry=document.createElement("button");retry.type="button";retry.className="city-dialog-retry";retry.textContent="تلاش دوباره";
          retry.addEventListener("click",async()=>{if(await loadDirectory())searchCities(query.value);});
          wrap.append(p,retry);results.appendChild(wrap);say(p.textContent);return false;
        }
      })();
      return directoryPromise;
    }
    async function searchCities(raw){
      const q=normalize(raw),id=++req;
      if(!(await loadDirectory()))return;
      if(id!==req||normalize(query.value)!==q)return;
      const matches=q.length<2?cities:cities.filter(item=>
        normalize(item.name).includes(q)||normalize(item.province).includes(q)
      );
      title.textContent=q.length<2?"استان و شهر":"نتایج جست‌وجو";
      render(matches,q);
    }
    function closeDialog(){if(overlay.hidden)return;overlay.hidden=true;document.body.classList.remove("city-dialog-open");document.body.style.overflow=oldOverflow;input.setAttribute("aria-expanded","false");if(previousFocus&&previousFocus.isConnected)previousFocus.focus({preventScroll:true});}
    async function openDialog(){if(!overlay.hidden)return;previousFocus=document.activeElement;oldOverflow=document.body.style.overflow;overlay.hidden=false;document.body.classList.add("city-dialog-open");document.body.style.overflow="hidden";input.setAttribute("aria-expanded","true");query.value="";clear.hidden=true;title.textContent="استان و شهر";requestAnimationFrame(()=>query.focus({preventScroll:true}));if(await loadDirectory()&&!normalize(query.value))render(cities,"");}
    function move(delta){const options=Array.from(results.querySelectorAll(".city-dialog-city"));if(!options.length)return;active=(active+delta+options.length)%options.length;options.forEach((b,i)=>{b.classList.toggle("is-active",i===active);b.setAttribute("aria-selected",i===active?"true":"false");});options[active].scrollIntoView({block:"nearest"});}
    input.addEventListener("click",openDialog);input.addEventListener("keydown",e=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();openDialog();}});
    toggle?.addEventListener("mousedown",e=>e.preventDefault());toggle?.addEventListener("click",e=>{e.preventDefault();openDialog();});
    close.addEventListener("click",closeDialog);overlay.addEventListener("click",e=>{if(e.target===overlay)closeDialog();});
    query.addEventListener("input",()=>{clear.hidden=!query.value;clearTimeout(timer);timer=setTimeout(()=>searchCities(query.value),180);});
    clear.addEventListener("click",()=>{query.value="";clear.hidden=true;searchCities("");query.focus();});
    query.addEventListener("keydown",e=>{if(e.key==="ArrowDown"||e.key==="ArrowUp"){e.preventDefault();move(e.key==="ArrowDown"?1:-1);}else if(e.key==="Enter"){const opts=Array.from(results.querySelectorAll(".city-dialog-city"));if(active>=0&&opts[active]){e.preventDefault();opts[active].click();}else if(opts.length===1){e.preventDefault();opts[0].click();}}});
    overlay.addEventListener("keydown",e=>{
      if(e.key==="Escape"){e.preventDefault();closeDialog();return;}if(e.key!=="Tab")return;
      const focusable=Array.from(dialog.querySelectorAll('button:not([hidden]):not(:disabled),input:not([hidden]):not(:disabled)')).filter(x=>x.getClientRects().length);
      if(!focusable.length){e.preventDefault();dialog.focus();return;}const first=focusable[0],last=focusable[focusable.length-1];
      if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}
    });
  }

  // Preserve the lightweight inline/datalist pickers used by internal search
  // and seller forms; only the homepage selector uses the full-screen dialog.
  const datalistTimers = new WeakMap();
  async function suggestDatalist(field) {
    const q=normalize(field.value), list=document.getElementById(field.getAttribute("list")||"iranCityOptions");
    if(!list||q.length<2){if(list)list.replaceChildren();return;}
    clearTimeout(datalistTimers.get(field));
    const timer=setTimeout(async()=>{
      try{
        const response=await fetch("/api/locations?kind=city&q="+encodeURIComponent(q),{credentials:"same-origin",headers:{Accept:"application/json"}});
        if(!response.ok)return;const data=await response.json();if(normalize(field.value)!==q)return;
        list.replaceChildren(...(data.items||[]).map(item=>{const option=document.createElement("option");option.value=item.name;option.label=[item.province,item.county].filter(Boolean).join(" · ");return option;}));
      }catch(_){/* Manual entry remains available when suggestions fail. */}
    },160);
    datalistTimers.set(field,timer);
  }
  function initCityCombobox(rootId,inputId,listId,toggleId){
    const root=document.getElementById(rootId),field=document.getElementById(inputId),list=document.getElementById(listId),toggle=document.getElementById(toggleId);
    if(!root||!field||!list)return;
    let request=0,timer=null,active=-1,items=[];
    function close(){list.hidden=true;field.setAttribute("aria-expanded","false");active=-1;}
    function select(item){field.value=item.name;field.dataset.selectedType="city";field.dataset.selectedId=item.id==null?"":String(item.id);field.dispatchEvent(new Event("change",{bubbles:true}));close();}
    function render(rows,q){
      items=rows;active=-1;list.replaceChildren();
      if(!rows.length){const p=document.createElement("div");p.className="market-city-empty";p.textContent=q.length<2?"برای جست‌وجوی شهر، حداقل دو حرف بنویسید.":"شهری با این نام پیدا نشد.";list.appendChild(p);}
      rows.forEach((item,index)=>{const b=document.createElement("button");b.type="button";b.className="market-city-option";b.setAttribute("role","option");b.setAttribute("aria-selected","false");const name=document.createElement("span");name.className="market-city-option-name";name.textContent=item.name;const meta=document.createElement("small");meta.className="market-city-option-meta";meta.textContent=[item.province,item.county].filter(Boolean).join(" · ");b.append(name,meta);b.addEventListener("mousedown",e=>e.preventDefault());b.addEventListener("click",()=>select(item));list.appendChild(b);});
      list.hidden=false;field.setAttribute("aria-expanded","true");
    }
    async function search(){
      const q=normalize(field.value),id=++request;
      try{const url=q.length>=2?"/api/locations?kind=city&q="+encodeURIComponent(q):"/api/locations?kind=city";
        const response=await fetch(url,{credentials:"same-origin",headers:{Accept:"application/json"}});
        if(!response.ok)throw new Error("lookup failed");const data=await response.json();if(id!==request||normalize(field.value)!==q)return;render(data.items||[],q);
      }catch(_){if(id===request)render([],"error");}
    }
    field.addEventListener("focus",search);field.addEventListener("click",()=>{if(list.hidden)search();});
    field.addEventListener("input",()=>{delete field.dataset.selectedType;delete field.dataset.selectedId;clearTimeout(timer);timer=setTimeout(search,160);});
    field.addEventListener("keydown",e=>{
      if(e.key==="ArrowDown"||e.key==="ArrowUp"){e.preventDefault();if(list.hidden){search();return;}const options=Array.from(list.querySelectorAll(".market-city-option"));if(!options.length)return;active=(active+(e.key==="ArrowDown"?1:-1)+options.length)%options.length;options.forEach((b,i)=>{b.classList.toggle("active",i===active);b.setAttribute("aria-selected",i===active?"true":"false");});options[active].scrollIntoView({block:"nearest"});}
      else if(e.key==="Enter"&&!list.hidden){if(active>=0&&items[active]){e.preventDefault();select(items[active]);}else if(items.length===1){e.preventDefault();select(items[0]);}}
      else if(e.key==="Escape")close();
    });
    toggle?.addEventListener("mousedown",e=>e.preventDefault());toggle?.addEventListener("click",e=>{e.preventDefault();if(list.hidden){field.focus();search();}else close();});
    document.addEventListener("click",e=>{if(!root.contains(e.target))close();});
    field.addEventListener("blur",()=>setTimeout(()=>{if(!root.contains(document.activeElement))close();},120));
  }

  function initAll(){
    init();
    initCityCombobox("searchCityCombobox","pageCity","searchCityOptions","toggleSearchCityPicker");
    document.querySelectorAll("input[data-iran-location]").forEach(field=>{
      field.addEventListener("input",()=>suggestDatalist(field));
      field.setAttribute("autocomplete","off");
    });
  }
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",initAll,{once:true});else initAll();
})();