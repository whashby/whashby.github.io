import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createWorker} from '../backend/worker.mjs';
const env={ALLOWED_ORIGINS:'https://whashby.github.io',BREVO_SMTP_LOGIN:'test-login',BREVO_SMTP_KEY:'test-key',TURNSTILE_SECRET_KEY:'test',FROM_EMAIL:'test@example.com',TO_EMAIL:'wafiq.harris-ashby@outlook.com'};
const data={to:'attacker@example.com',name:'Alex',email:'alex@example.com',topic:'Project or consulting',message:'A useful project enquiry.',website:'',token:'token'};
function request(body=data,origin='https://whashby.github.io',method='POST'){return new Request('https://contact.example/contact',{method,headers:{Origin:origin,'Content-Type':'application/json'},body:method==='POST'?JSON.stringify(body):undefined});}
test('contact backend',async t=>{
 const original=globalThis.fetch;let calls=0;
 let deliver=async()=>{calls++;};const worker=createWorker((...args)=>deliver(...args));
 const verified=()=>{globalThis.fetch=async()=>Response.json({success:true,action:'contact',hostname:'whashby.github.io'});};
 try{
  await t.test('rejects foreign origin',async()=>assert.equal((await worker.fetch(request(data,'https://evil.example'),env)).status,403));
  await t.test('preflight permits configured origin',async()=>{const r=await worker.fetch(request(data,undefined,'OPTIONS'),env);assert.equal(r.status,204);assert.equal(r.headers.get('Access-Control-Allow-Origin'),'https://whashby.github.io');});
  await t.test('rejects invalid email, header injection, honeypot and oversized body',async()=>{for(const payload of [{...data,email:'invalid'},{...data,email:'alex@example.com\r\nBcc:other@example.com'},{...data,website:'bot'},{...data,message:'x'.repeat(25000)}])assert.ok((await worker.fetch(request(payload),env)).status>=400);assert.equal(calls,0);});
  await t.test('missing SMTP secrets fails closed',async()=>assert.equal((await worker.fetch(request(),{...env,BREVO_SMTP_KEY:''})).status,503));
  await t.test('challenge rejection never sends email',async()=>{globalThis.fetch=async()=>Response.json({success:false});assert.equal((await worker.fetch(request(),env)).status,400);assert.equal(calls,0);});
  await t.test('checks hostname and action',async()=>{globalThis.fetch=async()=>Response.json({success:true,action:'other',hostname:'whashby.github.io'});assert.equal((await worker.fetch(request(),env)).status,400);});
  await t.test('SMTP failure never reports success',async()=>{verified();deliver=async()=>{throw new Error('SMTP rejected');};assert.equal((await worker.fetch(request(),env)).status,503);});
  await t.test('accepted message uses fixed recipient and visitor reply address',async()=>{verified();deliver=async(settings,sent)=>{assert.equal(settings.BREVO_SMTP_LOGIN,'test-login');assert.equal(sent.to,'wafiq.harris-ashby@outlook.com');assert.equal(sent.replyTo,data.email);for(const value of [data.message,data.name,data.email,data.topic])assert.ok(sent.text.includes(value));assert.equal(sent.subject,'Portfolio enquiry: Project or consulting');};const r=await worker.fetch(request(),env);assert.equal(r.status,200);assert.deepEqual(await r.json(),{ok:true});});
 }finally{globalThis.fetch=original;}
});
