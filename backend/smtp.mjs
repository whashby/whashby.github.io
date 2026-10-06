// SMTP submission over mandatory STARTTLS. Secrets never enter the browser or logs.
const encoder = new TextEncoder();
const mailbox = value => typeof value === 'string' && /^[\x21-\x7e]+$/.test(value) && /^[^<>@\s]+@[^<>@\s]+\.[^<>@\s]+$/.test(value);
function base64(value) {
  return btoa(Array.from(encoder.encode(value), byte => String.fromCharCode(byte)).join(''));
}
export function buildMessage({from, to, replyTo, subject, text}) {
  if (![from, to, replyTo].every(mailbox) || /[\r\n]/.test(subject)) throw new Error('Invalid email headers');
  const body = base64(text).match(/.{1,76}/g)?.join('\r\n') || '';
  return [
    `From: Wafiq Portfolio <${from}>`, `To: <${to}>`, `Reply-To: <${replyTo}>`,
    `Subject: =?UTF-8?B?${base64(subject)}?=`, `Date: ${new Date().toUTCString()}`,
    `Message-ID: <${crypto.randomUUID()}@whashby.github.io>`, 'MIME-Version: 1.0',
    'Content-Type: text/plain; charset=UTF-8', 'Content-Transfer-Encoding: base64', '', body, ''
  ].join('\r\n');
}
export async function sendSmtp(env, message, connectOverride) {
  const payload = buildMessage(message);
  const connect = connectOverride || (await import('cloudflare:sockets')).connect;
  let socket = connect({hostname: 'smtp-relay.brevo.com', port: 587}, {secureTransport: 'starttls'});
  // Consume connection rejections without exposing credentials in diagnostics.
  socket.closed.catch(() => {});
  let reader = socket.readable.getReader();
  let writer = socket.writable.getWriter();
  let stage = 'connect';
  let pending = '';
  const decoder = new TextDecoder();
  let timer;
  const timeout = new Promise((_, reject) => { timer = setTimeout(() => { socket.close().catch(() => {}); reject(new Error('SMTP timeout')); }, 10000); });
  async function response(expected) {
    let code;
    let lines = 0;
    let bytes = 0;
    while (true) {
      while (!pending.includes('\r\n')) {
        const chunk = await reader.read();
        if (chunk.done) throw new Error('SMTP connection closed');
        pending += decoder.decode(chunk.value, {stream: true});
        if (pending.length > 16384) throw new Error('SMTP response too large');
      }
      const end = pending.indexOf('\r\n');
      const line = pending.slice(0, end); pending = pending.slice(end + 2);
      bytes += line.length;
      if (++lines > 100 || bytes > 16384) throw new Error('SMTP response too large');
      const match = /^(\d{3})([ -])/.exec(line);
      if (!match || (code && code !== match[1])) throw new Error('Invalid SMTP response');
      code = match[1];
      if (match[2] === ' ') {
        if (!expected.includes(Number(code))) { const error = new Error('SMTP request rejected'); error.smtpCode = Number(code); throw error; }
        return;
      }
    }
  }
  async function command(value, expected) { await writer.write(encoder.encode(value + '\r\n')); await response(expected); }
  try {
    await Promise.race([(async () => {
      await socket.opened;
      await response([220]);
      stage = 'starttls';
      await command('EHLO whashby.github.io', [250]);
      await command('STARTTLS', [220]);
      reader.releaseLock(); writer.releaseLock();
      socket = socket.startTls();
      socket.closed.catch(() => {});
      reader = socket.readable.getReader(); writer = socket.writable.getWriter();
      pending = ''; // Discard plaintext state before using the encrypted connection.
      await socket.opened;
      await command('EHLO whashby.github.io', [250]);
      stage = 'authentication';
      await command('AUTH LOGIN', [334]);
      await command(base64(env.BREVO_SMTP_LOGIN), [334]);
      await command(base64(env.BREVO_SMTP_KEY), [235]);
      stage = 'sender';
      await command(`MAIL FROM:<${message.from}>`, [250]);
      stage = 'recipient';
      await command(`RCPT TO:<${message.to}>`, [250, 251]);
      stage = 'message';
      await command('DATA', [354]);
      // MIME body is base64, so it cannot contain an SMTP terminator or inject commands.
      await writer.write(encoder.encode(payload + '.\r\n'));
      await response([250]); // Report success only after relay accepts message data.
    })(), timeout]);
  } catch (error) {
    error.smtpStage = stage;
    throw error;
  } finally {
    clearTimeout(timer);
    // Closing after DATA acceptance avoids treating a failed QUIT as delivery failure.
    await socket.close().catch(() => {});
  }
}
