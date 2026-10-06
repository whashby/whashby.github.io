export default {
 async fetch(request, env) {
  const origin=request.headers.get('Origin');
  const allowed=(env.ALLOWED_ORIGINS||'').split(',').map(s=>s.trim()).filter(Boolean);
  const headers={'Content-Type':'application/json','Cache-Control':'no-store','Vary':'Origin'};
  const reply=(status,error)=>new Response(JSON.stringify(error?{ok:false,error}:{ok:true}),{status,headers});
  if(!allowed.includes(origin))return reply(403,'Origin not allowed');
  headers['Access-Control-Allow-Origin']=origin;
  if(new URL(request.url).pathname!=='/contact')return reply(404,'Not found');
  if(request.method==='OPTIONS')return new Response(null,{status:204,headers:{...headers,'Access-Control-Allow-Methods':'POST, OPTIONS','Access-Control-Allow-Headers':'Content-Type','Access-Control-Max-Age':'600'}});
  if(request.method!=='POST')return reply(405,'Method not allowed');
  if(!request.headers.get('Content-Type')?.startsWith('application/json'))return reply(415,'JSON required');
  if(!env.BREVO_API_KEY||!env.TURNSTILE_SECRET_KEY||!env.FROM_EMAIL||!env.TO_EMAIL)return reply(503,'Service unavailable');
  try {
   // Bound the streamed body, including requests without Content-Length.
   const reader=request.body?.getReader();if(!reader)return reply(400,'Body required');
   let bytes=0;const chunks=[];
   while(true){const {done,value}=await reader.read();if(done)break;bytes+=value.byteLength;if(bytes>24000){await reader.cancel();return reply(413,'Message too large');}chunks.push(value);}
   const buffer=new Uint8Array(bytes);let offset=0;for(const chunk of chunks){buffer.set(chunk,offset);offset+=chunk.length;}
   let data;try{data=JSON.parse(new TextDecoder().decode(buffer));}catch{return reply(400,'Invalid JSON');}
   if(!data||typeof data!=='object'||Array.isArray(data))return reply(400,'Invalid message');
   if(typeof data.website==='string'&&data.website.trim())return reply(400,'Invalid message');
   const valid=(value,min,max)=>typeof value==='string'&&value.trim().length>=min&&value.length<=max;
   const topics=['Project or consulting','WordPress plugin','Career opportunity','Something else'];
   if(!valid(data.name,1,100)||/[\r\n]/.test(data.name)||!valid(data.email,3,254)||!/^\S+@[^\s@]+\.[^\s@]+$/.test(data.email)||!valid(data.message,10,5000)||!topics.includes(data.topic)||!valid(data.token,1,2048))return reply(400,'Please check your message');
   const verification=await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({secret:env.TURNSTILE_SECRET_KEY,response:data.token,remoteip:request.headers.get('CF-Connecting-IP')||undefined}),signal:AbortSignal.timeout(8000)});
   if(!verification.ok)return reply(503,'Security check unavailable');
   const challenge=await verification.json();
   if(!challenge.success||challenge.action!=='contact'||challenge.hostname!==new URL(origin).hostname)return reply(400,'Please repeat the security check');
   const delivery=await fetch('https://api.brevo.com/v3/smtp/email',{method:'POST',headers:{'api-key':env.BREVO_API_KEY,'Content-Type':'application/json'},body:JSON.stringify({sender:{name:'Wafiq Portfolio',email:env.FROM_EMAIL},to:[{email:env.TO_EMAIL}],replyTo:{email:data.email.trim(),name:data.name.trim()},subject:`Portfolio enquiry: ${data.topic}`,textContent:`Name: ${data.name.trim()}\nEmail: ${data.email.trim()}\nTopic: ${data.topic}\n\n${data.message.trim()}`}),signal:AbortSignal.timeout(8000)});
   if(!delivery.ok)return reply(502,'Unable to deliver message');
   const sent=await delivery.json();if(!sent.messageId)return reply(502,'Unable to confirm delivery');
   return reply(200);
  }catch{return reply(503,'Service temporarily unavailable');}
 }
};
