'use strict';
const config = window.PORTFOLIO_CONFIG || {};
const menu = document.querySelector('#menu');
const nav = document.querySelector('#navigation');
function closeMenu(){menu.setAttribute('aria-expanded','false');nav.classList.remove('open');}
menu.addEventListener('click',()=>{const open=menu.getAttribute('aria-expanded')!=='true';menu.setAttribute('aria-expanded',String(open));nav.classList.toggle('open',open);});
nav.addEventListener('click',e=>{if(e.target.closest('a'))closeMenu();});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&nav.classList.contains('open')){closeMenu();menu.focus();}});
document.querySelector('#year').textContent=new Date().getFullYear();
for(const plugin of config.plugins||[]){
 const article=document.createElement('article');article.className='plugin-card';
 const top=document.createElement('div');top.className='plugin-top';
 for(const [cls,value] of [['plugin-icon',plugin.icon],['pill',plugin.category]]){const span=document.createElement('span');span.className=cls;span.textContent=value;top.append(span);}
 const title=document.createElement('h3');title.textContent=plugin.name;
 const p=document.createElement('p');p.textContent=plugin.description;
 const a=document.createElement('a');a.className='plugin-download';a.href='#contact';a.textContent='Request download ↗';
 a.addEventListener('click',()=>{if(a.getAttribute('href')==='#contact'){document.querySelector('[name="topic"]').value='WordPress plugin';const message=document.querySelector('[name="message"]');if(!message.value)message.value=`I’d like to download ${plugin.name}.`;}});
 article.append(top,title,p,a);document.querySelector('#plugin-grid').append(article);
 const url=new URL(`assets/plugins/${plugin.file}`,location.href);
 fetch(url,{method:'HEAD'}).then(response=>{if(response.ok){a.href=url.href;a.setAttribute('download',plugin.file);a.textContent='Download plugin ↓';}}).catch(()=>{});
}
const form=document.querySelector('#contact-form');const status=document.querySelector('#form-status');const submit=form.querySelector('button');
let endpoint;try{const url=new URL(config.contactEndpoint);if(url.protocol==='https:')endpoint=url.href;}catch{}
submit.disabled=true;
if(!endpoint||!config.turnstileSiteKey){status.textContent='The message form is being connected. You can reach me directly by email.';}else{
 status.textContent='Loading security check…';
 window.onContactChallengeReady=()=>window.turnstile.render('#turnstile-widget',{sitekey:config.turnstileSiteKey,theme:'light',action:'contact',callback:()=>{submit.disabled=false;status.textContent='';},'expired-callback':()=>{submit.disabled=true;status.textContent='Please complete the security check again.';},'error-callback':()=>{submit.disabled=true;status.textContent='Security check unavailable. Please use the email link.';}});
 const script=document.createElement('script');script.src='https://challenges.cloudflare.com/turnstile/v0/api.js?onload=onContactChallengeReady&render=explicit';script.async=true;script.onerror=()=>{status.textContent='Security check unavailable. Please use the email link.';};document.head.append(script);
}
form.addEventListener('submit',async e=>{
 e.preventDefault();if(!endpoint||!form.reportValidity())return;
 const data=Object.fromEntries(new FormData(form));data.token=window.turnstile?.getResponse();if(!data.token){status.textContent='Please complete the security check.';return;}
 submit.disabled=true;form.setAttribute('aria-busy','true');status.textContent='Sending your message…';
 try{const response=await fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data),signal:AbortSignal.timeout(25000)});const result=await response.json();if(!response.ok||!result.ok)throw new Error('Delivery failed');form.reset();status.textContent='Thanks — your message has been sent. I’ll get back to you by email.';}
 catch{status.textContent='Your message could not be confirmed. Your text is still here; please try again or use the email link.';}
 finally{form.removeAttribute('aria-busy');window.turnstile?.reset();submit.disabled=true;}
});

// Animate career highlights once as they enter view; keep final values without JS.
const metrics = document.querySelector('.metrics');
const motionPreference = window.matchMedia('(prefers-reduced-motion: reduce)');
if (metrics && !motionPreference.matches && 'IntersectionObserver' in window) {
  let frame;
  const finishMetrics = () => {
    cancelAnimationFrame(frame);
    metrics.querySelectorAll('[data-count]').forEach(el => { el.textContent = `${el.dataset.count}+`; });
    metrics.classList.remove('metrics-animating');
  };
  const observer = new IntersectionObserver(entries => {
    if (!entries.some(entry => entry.isIntersecting)) return;
    observer.disconnect();
    if (motionPreference.matches) return;
    metrics.classList.add('metrics-animating');
    const start = performance.now();
    const counters = [...metrics.querySelectorAll('[data-count]')];
    const tick = now => {
      const progress = Math.min((now - start) / 1400, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      counters.forEach(el => { el.textContent = `${Math.round(Number(el.dataset.count) * eased)}+`; });
      if (progress < 1) frame = requestAnimationFrame(tick);
      else finishMetrics();
    };
    frame = requestAnimationFrame(tick);
  }, { threshold: 0.3 });
  observer.observe(metrics);
  motionPreference.addEventListener('change', event => { if (event.matches) { observer.disconnect(); finishMetrics(); } });
}
