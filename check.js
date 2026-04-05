const fs=require("fs");
const c=JSON.parse(fs.readFileSync("d:/da/a/Clean-Food-Store.postman_collection.json","utf8"));
function walk(items,f){
  for(const i of items){
    if(i.item){walk(i.item,i.name);}
    else{
      const t=(i.event||[]).find(e=>e.listen==="test");
      if(t){
        const code=t.script.exec.join("\n");
        if(code.includes("collectionVariables.set")){
          const lines=code.split("\n").filter(l=>l.includes("collectionVariables.set"));
          console.log(f+" > "+i.name+": "+lines.join(" | "));
        }
      }
    }
  }
}
walk(c.item,"root");
