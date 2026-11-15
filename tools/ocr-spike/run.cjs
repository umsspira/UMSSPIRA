const http = require('node:http');
const fs = require('node:fs/promises');
const path = require('node:path');
const { spawn } = require('node:child_process');
const root = path.resolve('public');
const server = http.createServer(async (req,res) => {
 try {
  const file=path.resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname));
  if (!file.startsWith(root+path.sep)) { res.writeHead(403).end(); return; }
  const bytes=await fs.readFile(file);
  res.setHeader('Content-Type',file.endsWith('.mjs')||file.endsWith('.js')?'text/javascript':file.endsWith('.wasm')?'application/wasm':'application/octet-stream');
  res.end(bytes);
 } catch { res.writeHead(404).end(); }
});
server.listen(3113,'127.0.0.1',()=> {
 const child=spawn(process.execPath,['scripts/verify-ocr-browser.cjs'],{stdio:'inherit',env:{...process.env,OCR_BASE_URL:'http://127.0.0.1:3113'}});
 child.on('exit',code=>server.close(()=>{process.exitCode=code??1;}));
 child.on('error',()=>server.close(()=>{process.exitCode=1;}));
});
