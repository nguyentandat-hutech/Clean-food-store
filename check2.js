const fs=require("fs");
const c=JSON.parse(fs.readFileSync("d:/da/a/Clean-Food-Store.postman_collection.json","utf8"));
function findByFolder(fname, items){
  for(const i of items){
    if(i.item && i.name===fname) return i.item;
    if(i.item){ const r=findByFolder(fname,i.item); if(r) return r; }
  }
}
const auth=findByFolder("?? Auth",c.item);
auth.forEach(function(r){
  console.log("--- "+r.name+" ---");
  if(r.request && r.request.body){
    console.log("Body mode:",r.request.body.mode);
    if(r.request.body.raw) console.log("Body:",r.request.body.raw.substring(0,200));
  }
});
