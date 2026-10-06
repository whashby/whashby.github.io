import { sendSmtp } from './smtp.mjs';

export function createWorker(deliver = sendSmtp) { return {
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
  if(!env.BREVO_SMTP_LOGIN||!env.BREVO_SMTP_KEY||!env.TURNSTILE_SECRET_KEY||!env.FROM_EMAIL||!env.TO_EMAIL)return reply(503,'Service unavailable');
  let stage = 'validation';
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
   if(!valid(data.name,1,100)||/[\r\n]/.test(data.name)||!valid(data.email,3,254)||!/^\S+@[^\s@]+\.[^\s@]+$/.test(data.email)||!/^[\x21-\x7e]+$/.test(data.email)||/[<>]/.test(data.email)||!valid(data.message,10,5000)||!topics.includes(data.topic)||!valid(data.token,1,2048))return reply(400,'Please check your message');
   stage = 'security_check';
   const verification=await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({secret:env.TURNSTILE_SECRET_KEY,response:data.token,remoteip:request.headers.get('CF-Connecting-IP')||undefined}),signal:AbortSignal.timeout(8000)});
   if(!verification.ok)return reply(503,'Security check unavailable');
   const challenge=await verification.json();
   if(!challenge.success||challenge.action!=='contact'||challenge.hostname!==new URL(origin).hostname)return reply(400,'Please repeat the security check');
   stage = 'smtp';
   await deliver(env, {
    from:env.FROM_EMAIL, to:env.TO_EMAIL, replyTo:data.email.trim(),
    subject:`Portfolio enquiry: ${data.topic}`,
    text:`Name: ${data.name.trim()}\nEmail: ${data.email.trim()}\nTopic: ${data.topic}\n\n${data.message.trim()}`
   });
   console.info(JSON.stringify({event:'contact_smtp_accepted'}));
   return reply(200);
  }catch(error){
   // Log only fixed stages and numeric codes; never credentials, tokens or message data.
   const smtpStage = ['connect','starttls','authentication','sender','recipient','message'].includes(error.smtpStage) ? error.smtpStage : undefined;
   const smtpCode = Number.isInteger(error.smtpCode) ? error.smtpCode : undefined;
   console.error(JSON.stringify({event:'contact_failed',stage,smtpStage,smtpCode}));
   return reply(503,'Service temporarily unavailable');
  }
 }
}; }

export default createWorker();
