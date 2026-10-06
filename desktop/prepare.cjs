const fs=require("node:fs"),path=require("node:path");
const root=path.resolve(__dirname,"..");
const target=path.join(root,".desktop-build");
const pkg=JSON.parse(fs.readFileSync(path.join(root,"package.json"),"utf8"));
fs.mkdirSync(path.join(target,"electron"),{recursive:true});
fs.cpSync(path.join(root,"out"),path.join(target,"out"),{recursive:true});
fs.copyFileSync(path.join(root,"electron/main.cjs"),path.join(target,"electron/main.cjs"));
fs.writeFileSync(path.join(target,"package.json"),JSON.stringify({name:pkg.name,version:pkg.version,description:pkg.description,author:pkg.author,main:"electron/main.cjs"},null,2));
