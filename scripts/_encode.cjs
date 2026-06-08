const c=require('fs').readFileSync(0,'utf8');  
process.stdout.write(Buffer.from(c).toString('base64'));  
