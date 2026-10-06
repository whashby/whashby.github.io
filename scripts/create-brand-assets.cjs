const fs = require('fs');
const path = require('path');
const { chromium } = require('C:/Users/wafiq/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root = path.resolve(__dirname, '..');
const regular = fs.readFileSync(path.join(root,'assets/fonts/Noto-Sans-regular/Noto-Sans-regular.woff2')).toString('base64');
const bold = fs.readFileSync(path.join(root,'assets/fonts/Noto-Sans-700/Noto-Sans-700.woff2')).toString('base64');
const style = `<style>@font-face{font-family:Brand;src:url(data:font/woff2;base64,${regular})}@font-face{font-family:Brand;src:url(data:font/woff2;base64,${bold});font-weight:700}text{font-family:Brand,Arial,sans-serif}</style>`;
const icon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><rect width="512" height="512" rx="108" fill="#292d33"/><text x="45" y="331" fill="#f5f6f8" font-family="Arial,sans-serif" font-weight="700" font-size="302" letter-spacing="-23">wh</text><circle cx="438" cy="316" r="26" fill="#00aaff"/></svg>`;
fs.writeFileSync(path.join(root,'assets/brand/favicon.svg'),icon);
function cover(width,height,isFacebook){
 const sx=isFacebook?340:425;
 const nameY=isFacebook?195:122;
 const headingY=isFacebook?278:182;
 const nameSize=isFacebook?46:46;
 const graphicX=isFacebook?1270:1220, graphicY=isFacebook?153:64;
 const graphicScale=isFacebook?1.3:1;
 const graphic = `<g transform="translate(${graphicX} ${graphicY}) scale(${graphicScale})" stroke="#0053ad" stroke-width="2" fill="none"><circle cx="140" cy="135" r="122" opacity=".1"/><circle cx="140" cy="135" r="99" stroke-dasharray="3 8" opacity=".25"/><g opacity=".6"><path d="M140 46v39M66 87l43 30M214 87l-43 30M66 186l43-32M214 186l-43-32M140 221v-34"/></g><path d="m140 83 43 17v38c0 26-19 44-43 55-24-11-43-29-43-55v-38z" fill="#f0f4f9"/><path d="m121 137 13 13 26-29" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/><g fill="#edf2f8"><rect x="111" y="17" width="58" height="29" rx="5"/><rect x="32" y="69" width="45" height="32" rx="4"/><rect x="203" y="69" width="45" height="32" rx="4"/><rect x="32" y="173" width="45" height="32" rx="4"/><rect x="203" y="173" width="45" height="32" rx="4"/><rect x="111" y="221" width="58" height="29" rx="5"/></g><g stroke-linecap="round"><path d="M122 28h24m-24 7h35M43 79h22m-22 11h15m170-11-6 6 6 6m8-12 6 6-6 6M43 183h22m-22 11h15M213 191l5 5 15-14M122 232h24m-24 7h35"/></g><g fill="#016bff" stroke="none"><circle cx="175" cy="234" r="3"/><circle cx="140" cy="6" r="3"/><circle cx="265" cy="135" r="3"/></g></g>`;
 return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><defs><linearGradient id="bg" x2="1" y2=".5"><stop stop-color="#f6f7f9"/><stop offset=".55" stop-color="#e3e6eb"/><stop offset="1" stop-color="#bbc3ce"/></linearGradient></defs>${style}<rect width="100%" height="100%" fill="url(#bg)"/><g stroke="#016bff" fill="none" opacity=".13"><path d="M-100 ${height*.15} Q250 -50 390 ${height*.5} T1000 ${height*1.1}"/><path d="M-80 ${height*.19} Q260 -25 410 ${height*.54} T1020 ${height*1.14}"/><circle cx="90" cy="${height*.9}" r="210"/><circle cx="90" cy="${height*.9}" r="250"/></g><text x="${isFacebook?110:70}" y="${isFacebook?166:103}" font-size="68" font-weight="700" letter-spacing="-5" fill="#292d33">wh<tspan fill="#016bff">.</tspan></text><rect x="${sx}" y="${nameY-60}" width="45" height="4" rx="2" fill="#016bff"/><text x="${sx}" y="${nameY}" font-size="${nameSize}" font-weight="700" letter-spacing="-1" fill="#292d33">Wafiq Harris-Ashby</text><text x="${sx}" y="${headingY}" style="font-family:Georgia,serif;font-style:italic" font-size="${isFacebook?44:38}" fill="#0053ad">Technology with purpose. Built for people.</text><text x="${sx}" y="${headingY+51}" font-size="${isFacebook?23:20}" fill="#3f4c5e">Technology leadership · Cybersecurity · Development</text><text x="${sx}" y="${headingY+101}" font-size="${isFacebook?24:21}" fill="#0053ad">whashby.github.io</text>${graphic}<path d="M${sx} ${height-43} H${isFacebook?1160:1130}" stroke="#98a7bc" opacity=".5"/></svg>`;
}
(async()=>{
 const browser=await chromium.launch({headless:true,channel:'msedge'});
 try{
  const page=await browser.newPage({deviceScaleFactor:1});
  async function render(svg,width,height,file){await page.setViewportSize({width,height});await page.setContent(`<html><head><style>html,body{margin:0;width:100%;height:100%;}svg{display:block;width:100%;height:100%;}</style></head><body>${svg}</body></html>`);await page.evaluate(()=>document.fonts.ready);await page.locator('svg').screenshot({path:path.join(root,file)});}
  for(const size of [16,32,48,180,192,512])await render(icon,size,size,`assets/brand/favicon-${size}.png`);
  const entries=[16,32,48].map(size=>({size,data:fs.readFileSync(path.join(root,`assets/brand/favicon-${size}.png`))}));
  const head=Buffer.alloc(6+16*entries.length);head.writeUInt16LE(1,2);head.writeUInt16LE(entries.length,4);let offset=head.length;
  entries.forEach(({size,data},i)=>{const pos=6+16*i;head[pos]=size;head[pos+1]=size;head.writeUInt16LE(1,pos+4);head.writeUInt16LE(32,pos+6);head.writeUInt32LE(data.length,pos+8);head.writeUInt32LE(offset,pos+12);offset+=data.length;});
  fs.writeFileSync(path.join(root,'favicon.ico'),Buffer.concat([head,...entries.map(e=>e.data)]));
  for(const [platform,w,h,fb] of [['linkedin',1584,396,false],['facebook',1702,630,true]]){const svg=cover(w,h,fb);fs.writeFileSync(path.join(root,`assets/social/${platform}-cover.svg`),svg);await render(svg,w,h,`assets/social/${platform}-cover.png`);console.log(`${platform}: ${w} × ${h}`);}
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
