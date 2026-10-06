import {test} from 'node:test';
import assert from 'node:assert/strict';
import worker from '../backend/worker.mjs';
const env={ALLOWED_ORIGINS:'https://whashby.github.io',BREVO_API_KEY:'test',TURNSTILE_SECRET_KEY:'test',FROM_EMAIL:'test@example.com',TO_EMAIL:'wafiq.harris-ashby@outlook.com'};
const data={to:'attacker@example.com',name:'Alex',email:'alex@example.com',topic:'Project or consulting',message:'A useful project enquiry.',website:'',token:'token'};
function request(body=data,origin='https://whashby.github.io',method='POST'){return new Request('https://contact.example/contact',{method,headers:{Origin:origin,'Content-Type':'application/json'},body:method==='POST'?JSON.stringify(body):undefined});}
test('contact backend',async t=>{
 const original=globalThis.fetch;
 try{
  await t.test('rejects foreign origin',async()=>assert.equal((await worker.fetch(request(data,'https://evil.example'),env)).status,403));
  await t.test('preflight permits only configured origin',async()=>{const r=await worker.fetch(request(data,undefined,'OPTIONS'),env);assert.equal(r.status,204);assert.equal(r.headers.get('Access-Control-Allow-Origin'),'https://whashby.github.io');});
  await t.test('rejects invalid email, honeypot and oversized body',async()=>{for(const payload of [{...data,email:'invalid'},{...data,website:'bot'},{...data,message:'x'.repeat(25000)}])assert.ok((await worker.fetch(request(payload),env)).status>=400);});
  await t.test('missing service secrets fails closed',async()=>assert.equal((await worker.fetch(request(),{...env,BREVO_API_KEY:''})).status,503));
  await t.test('challenge rejection never sends email',async()=>{let calls=0;globalThis.fetch=async()=>{calls++;return Response.json({success:false});};assert.equal((await worker.fetch(request(),env)).status,400);assert.equal(calls,1);});
  await t.test('checks hostname and action',async()=>{globalThis.fetch=async()=>Response.json({success:true,action:'other',hostname:'whashby.github.io'});assert.equal((await worker.fetch(request(),env)).status,400);});
  await t.test('provider failure never reports success',async()=>{globalThis.fetch=async url=>url.includes('siteverify')?Response.json({success:true,action:'contact',hostname:'whashby.github.io'}):Response.json({error:'failure'},{status:500});assert.equal((await worker.fetch(request(),env)).status,502);});
  await t.test('confirmed delivery succeeds and sends correct recipient',async()=>{globalThis.fetch=async(url,options)=>{if(url.includes('siteverify'))return Response.json({success:true,action:'contact',hostname:'whashby.github.io'});const sent=JSON.parse(options.body);assert.deepEqual(sent.to,[{email:'wafiq.harris-ashby@outlook.com'}]);assert.equal(sent.replyTo.email,data.email);assert.ok(sent.textContent.includes(data.message));assert.ok(sent.textContent.includes(data.name));assert.ok(sent.textContent.includes(data.email));assert.ok(sent.textContent.includes(data.topic));assert.equal(sent.subject,'Portfolio enquiry: Project or consulting');return Response.json({messageId:'sent'});};const response=await worker.fetch(request(),env);assert.equal(response.status,200);assert.deepEqual(await response.json(),{ok:true});});
 }finally{globalThis.fetch=original;}
});
