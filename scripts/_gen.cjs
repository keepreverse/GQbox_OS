const fs=require('fs'); 
const content = require('fs').readFileSync(0,'utf8'); 
fs.writeFileSync(process.argv[1], content);  
