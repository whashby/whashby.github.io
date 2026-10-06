import {test} from 'node:test';
import assert from 'node:assert/strict';
import {sendSmtp,buildMessage} from '../backend/smtp.mjs';
const env={BREVO_SMTP_LOGIN:'smtp-user',BREVO_SMTP_KEY:'smtp-secret'};
const message={from:'sender@example.com',to:'wafiq.harris-ashby@outlook.com',replyTo:'visitor@example.com',subject:'Portfolio enquiry: WordPress plugin',text:'Hello Wafiq!\n.\nUnicode: café ↗'};
function fakeConnect({rejectAuth=false,rejectData=false,rejectTls=false}={}){
 let stream;const writes=[];let closed=false;let state=0;let encrypted=false;
 const reply=text=>{const bytes=new TextEncoder().encode(text);stream.enqueue(bytes.slice(0,5));stream.enqueue(bytes.slice(5));};
 function makeSocket(greeting=false){return {opened:Promise.resolve(),closed:Promise.resolve(),readable:new ReadableStream({start(controller){stream=controller;if(greeting)reply('220 Brevo ready\r\n');}}),writable:new WritableStream({write(bytes){const line=new TextDecoder().decode(bytes);writes.push(line);state++;
  if(state>=4)assert.ok(encrypted,'Credentials must only be sent after TLS upgrade');
  const responses=['250-relay\r\n250 STARTTLS\r\n',rejectTls?'454 TLS unavailable\r\n':'220 Ready for TLS\r\n','250-relay\r\n250-AUTH LOGIN PLAIN\r\n250 SIZE 100000\r\n','334 Username\r\n','334 Password\r\n',rejectAuth?'535 Authentication failed\r\n':'235 Authenticated\r\n','250 Sender accepted\r\n','250 Recipient accepted\r\n','354 Send data\r\n',rejectData?'550 Rejected\r\n':'250 Queued\r\n'];reply(responses[state-1]);
 }}),startTls(){assert.equal(state,2);encrypted=true;stream.close();return makeSocket();},async close(){closed=true;stream.close();}};}
 return {connect(address,options){assert.deepEqual(address,{hostname:'smtp-relay.brevo.com',port:587});assert.equal(options.secureTransport,'starttls');return makeSocket(true);},writes,isClosed:()=>closed};
}
test('STARTTLS SMTP authenticates after encryption and delivers MIME to Outlook',async()=>{
 const fake=fakeConnect();await sendSmtp(env,message,fake.connect);
 assert.equal(fake.writes[0],'EHLO whashby.github.io\r\n');assert.equal(fake.writes[1],'STARTTLS\r\n');assert.equal(fake.writes[2],'EHLO whashby.github.io\r\n');assert.equal(fake.writes[3],'AUTH LOGIN\r\n');assert.equal(fake.writes[4],btoa(env.BREVO_SMTP_LOGIN)+'\r\n');assert.equal(fake.writes[5],btoa(env.BREVO_SMTP_KEY)+'\r\n');assert.equal(fake.writes[7],'RCPT TO:<wafiq.harris-ashby@outlook.com>\r\n');
 const mime=fake.writes[9];assert.ok(mime.includes('Reply-To: <visitor@example.com>'));assert.ok(mime.endsWith('\r\n.\r\n'));const encoded=mime.split('\r\n\r\n')[1].replace(/\r\n\.\r\n$/,'').replace(/\r\n/g,'');assert.equal(Buffer.from(encoded,'base64').toString('utf8'),message.text);assert.ok(fake.isClosed());
});
test('STARTTLS refusal fails without transmitting credentials',async()=>{const fake=fakeConnect({rejectTls:true});await assert.rejects(sendSmtp(env,message,fake.connect));assert.equal(fake.writes.length,2);assert.ok(fake.isClosed());});
test('SMTP authentication failure closes connection before message',async()=>{const fake=fakeConnect({rejectAuth:true});await assert.rejects(sendSmtp(env,message,fake.connect));assert.equal(fake.writes.length,6);assert.ok(fake.isClosed());});
test('SMTP DATA rejection is not a successful send',async()=>{const fake=fakeConnect({rejectData:true});await assert.rejects(sendSmtp(env,message,fake.connect));assert.ok(fake.isClosed());});
test('MIME rejects header injection and encodes body terminators',()=>{assert.throws(()=>buildMessage({...message,replyTo:'a@example.com\r\nBcc: b@example.com'}));assert.throws(()=>buildMessage({...message,subject:'Hello\r\nBcc: b@example.com'}));assert.ok(!buildMessage(message).includes('\r\n.\r\n'));});
