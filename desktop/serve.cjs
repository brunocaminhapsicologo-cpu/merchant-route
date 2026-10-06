const http=require("node:http"),fs=require("node:fs"),path=require("node:path");
const root=path.resolve(__dirname,"../out"),port=Number(process.env.PORT||3000);
if(!fs.existsSync(path.join(root,"index.html")))throw new Error("Run npm run build before npm start.");
const types={".html":"text/html",".js":"text/javascript",".css":"text/css",".svg":"image/svg+xml",".json":"application/json",".txt":"text/plain",".ico":"image/x-icon"};
http.createServer((req,res)=>{
  let name;try{name=decodeURIComponent(new URL(req.url,"http://127.0.0.1").pathname);}catch{res.writeHead(400);res.end();return;}
  if(!["GET","HEAD"].includes(req.method)){res.writeHead(405);res.end();return;}
  const file=path.resolve(root,"."+(name==="/"?"/index.html":name));
  if(!file.startsWith(root+path.sep)){res.writeHead(403);res.end();return;}
  fs.stat(file,(error,stat)=>{if(error||!stat.isFile()){res.writeHead(404);res.end();return;}res.writeHead(200,{"Content-Type":types[path.extname(file)]||"application/octet-stream","X-Content-Type-Options":"nosniff"});if(req.method==="HEAD")res.end();else fs.createReadStream(file).pipe(res);});
}).listen(port,"127.0.0.1",()=>console.log(`Merchant Route: http://127.0.0.1:${port}`));
