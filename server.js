const http = require("http");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const PORT = process.env.PORT || 3000;
const DATA = path.join(__dirname, "data", "db.json");
const PUBLIC = path.join(__dirname, "public");

function readDB() {
  try { return JSON.parse(fs.readFileSync(DATA, "utf8")); }
  catch { return {users:[], machines:[], purchases:[], withdrawals:[], notifications:[], audit:[]};}
}
function writeDB(db){ fs.writeFileSync(DATA, JSON.stringify(db,null,2)); }
function hash(p){ return crypto.createHash("sha256").update(p).digest("hex"); }
function id(){ return crypto.randomUUID(); }
function cookies(req){ return Object.fromEntries((req.headers.cookie||"").split(";").filter(Boolean).map(x=>x.trim().split("="))); }
function userFrom(req, db){
  const sid=cookies(req).sid; if(!sid) return null;
  const u=db.users.find(x=>x.sessions?.includes(sid)); return u||null;
}
function send(res,status,data,headers={}){ res.writeHead(status,{"Content-Type":"application/json",...headers}); res.end(JSON.stringify(data)); }
function body(req){ return new Promise((resolve,reject)=>{let s="";req.on("data",c=>s+=c);req.on("end",()=>{try{resolve(s?JSON.parse(s):{})}catch(e){reject(e)}})}); }

const seed = () => {
 let db=readDB();
 if(!db.machines?.length){
   db.machines=[
    {id:id(),name:"Mini Machine",price:600,description:"Entry-level demo machine",demoRevenue:50,active:true},
    {id:id(),name:"Standard Machine",price:1500,description:"Mid-level demo machine",demoRevenue:120,active:true},
    {id:id(),name:"Pro Machine",price:5000,description:"Advanced demo machine",demoRevenue:450,active:true}
   ];
 }
 writeDB(db);
};
seed();

function jsonRoute(req,res,db){
 const u=userFrom(req,db);
 if(req.method==="GET" && req.url==="/api/machines") return send(res,200,{machines:db.machines.filter(m=>m.active)});
 if(req.method==="GET" && req.url==="/api/me") return send(res,200,{user:u?{id:u.id,name:u.name,email:u.email,role:u.role}:null});
 if(req.method==="GET" && req.url==="/api/payment-info") return send(res,200,{method:db.settings?.demoPaymentMethod||"M-Pesa Till",tillNumber:db.settings?.demoTillNumber||"1720946",demoOnly:true});
 if(req.method==="GET" && req.url==="/api/dashboard"){
   if(!u) return send(res,401,{error:"Login required"});
   const purchases=db.purchases.filter(p=>p.userId===u.id);
   const revenue=purchases.reduce((s,p)=>s+p.demoRevenue,0);
   const withdrawals=db.withdrawals.filter(w=>w.userId===u.id);
   return send(res,200,{balance:revenue-withdrawals.filter(w=>w.status!=="rejected").reduce((s,w)=>s+w.amount,0),purchases,revenue,withdrawals,notifications:db.notifications.filter(n=>n.userId===u.id).slice(-20).reverse()});
 }
 if(req.method==="POST" && req.url==="/api/register") return body(req).then(b=>{
   if(!b.name||!b.email||!b.password||b.password.length<6) return send(res,400,{error:"Name, email and password (6+ chars) required"});
   if(db.users.some(x=>x.email===b.email.toLowerCase())) return send(res,409,{error:"Email already registered"});
   const user={id:id(),name:b.name,email:b.email.toLowerCase(),password:hash(b.password),role:"user",sessions:[]};
   db.users.push(user); writeDB(db); return send(res,201,{ok:true});
 });
 if(req.method==="POST" && req.url==="/api/login") return body(req).then(b=>{
   const user=db.users.find(x=>x.email===String(b.email||"").toLowerCase() && x.password===hash(b.password||""));
   if(!user) return send(res,401,{error:"Invalid login"});
   const sid=crypto.randomBytes(24).toString("hex"); user.sessions=(user.sessions||[]).slice(-3); user.sessions.push(sid);
   writeDB(db); return send(res,200,{ok:true,user:{name:user.name,email:user.email,role:user.role}},{"Set-Cookie":`sid=${sid}; HttpOnly; SameSite=Lax; Path=/`});
 });
 if(req.method==="POST" && req.url==="/api/logout"){
   if(u){u.sessions=[];writeDB(db)} return send(res,200,{ok:true},{"Set-Cookie":"sid=; Max-Age=0; Path=/"});
 }
 if(req.method==="POST" && req.url==="/api/purchases") return body(req).then(b=>{
   if(!u)return send(res,401,{error:"Login required"});
   const m=db.machines.find(x=>x.id===b.machineId && x.active); if(!m)return send(res,404,{error:"Machine not found"});
   const p={id:id(),userId:u.id,machineId:m.id,machineName:m.name,price:m.price,demoRevenue:m.demoRevenue,createdAt:new Date().toISOString()};
   db.purchases.push(p); db.notifications.push({id:id(),userId:u.id,message:`Demo machine added: ${m.name}`,createdAt:new Date().toISOString()}); writeDB(db);
   return send(res,201,{ok:true,purchase:p});
 });
 if(req.method==="POST" && req.url==="/api/withdrawals") return body(req).then(b=>{
   if(!u)return send(res,401,{error:"Login required"});
   const amount=Number(b.amount); if(!Number.isFinite(amount)||amount<200)return send(res,400,{error:"Demo minimum withdrawal is KSh 200"});
   const purchases=db.purchases.filter(p=>p.userId===u.id); const earned=purchases.reduce((s,p)=>s+p.demoRevenue,0);
   const used=db.withdrawals.filter(w=>w.userId===u.id&&w.status!=="rejected").reduce((s,w)=>s+w.amount,0);
   if(amount>earned-used)return send(res,400,{error:"Insufficient demo balance"});
   const w={id:id(),userId:u.id,amount,status:"pending-demo-review",createdAt:new Date().toISOString()};
   db.withdrawals.push(w); db.notifications.push({id:id(),userId:u.id,message:`Demo withdrawal request of KSh ${amount} submitted`,createdAt:new Date().toISOString()}); writeDB(db);
   return send(res,201,{ok:true,withdrawal:w});
 });
 if(req.url.startsWith("/api/admin/")){
   if(!u||u.role!=="admin")return send(res,403,{error:"Admin access required"});
   if(req.method==="GET"&&req.url==="/api/admin/overview")return send(res,200,{users:db.users.map(x=>({id:x.id,name:x.name,email:x.email,role:x.role})),machines:db.machines,purchases:db.purchases,withdrawals:db.withdrawals,audit:db.audit.slice(-50).reverse()});
   if(req.method==="POST"&&req.url==="/api/admin/machines")return body(req).then(b=>{
     const m={id:id(),name:String(b.name||"New Machine"),price:Number(b.price)||0,description:String(b.description||"Demo machine"),demoRevenue:Number(b.demoRevenue)||0,active:true};
     db.machines.push(m); db.audit.push({id:id(),admin:u.email,action:"create_machine",at:new Date().toISOString(),details:m});writeDB(db);return send(res,201,{machine:m});
   });
   if(req.method==="POST"&&req.url==="/api/admin/withdrawals/review")return body(req).then(b=>{
     const w=db.withdrawals.find(x=>x.id===b.id); if(!w)return send(res,404,{error:"Request not found"});
     w.status=b.status==="approved"?"approved-demo":"rejected"; w.reviewedBy=u.email; w.reviewedAt=new Date().toISOString();
     db.audit.push({id:id(),admin:u.email,action:"review_withdrawal",at:new Date().toISOString(),details:{id:w.id,status:w.status}});
     db.notifications.push({id:id(),userId:w.userId,message:`Demo withdrawal ${w.status}`,createdAt:new Date().toISOString()});writeDB(db);return send(res,200,{ok:true});
   });
 }
 return false;
}

const server=http.createServer(async(req,res)=>{
 try{
  if(req.url.startsWith("/api/")){
   const db=readDB();
   const result=await jsonRoute(req,res,db); if(result!==false)return;
   return;
  }
  let p=req.url.split("?")[0]; if(p==="/")p="/index.html";
  const file=path.normalize(path.join(PUBLIC,p));
  if(!file.startsWith(PUBLIC))return res.writeHead(403).end();
  if(!fs.existsSync(file)||fs.statSync(file).isDirectory())return res.writeHead(404).end("Not found");
  const ext=path.extname(file); const types={".html":"text/html",".css":"text/css",".js":"application/javascript",".json":"application/json"};
  res.writeHead(200,{"Content-Type":types[ext]||"application/octet-stream"});fs.createReadStream(file).pipe(res);
 }catch(e){console.error(e);send(res,500,{error:"Server error"});}
});
server.listen(PORT,()=>console.log(`MachineEarn demo running at http://localhost:${PORT}`));
