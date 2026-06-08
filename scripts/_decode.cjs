const fs=require('fs');  
const b64=require('fs').readFileSync(0,'utf8').trim();  
fs.writeFileSync(process.argv[2], Buffer.from(b64,'base64').toString());  
