let me=null, dash=null, machines=[];
const money=n=>"KSh "+Number(n||0).toLocaleString();
async function api(url,opt={}){let r=await fetch(url,{headers:{"Content-Type":"application/json"},...opt});let d=await r.json();if(!r.ok)throw Error(d.error||"Request failed");return d}
function show(id){document.querySelectorAll(".screen").forEach(x=>x.classList.add("hidden"));document.getElementById(id).classList.remove("hidden");if(id==="machines")loadMachines();if(id==="earnings")renderEarnings();if(id==="activity")renderActivity();if(id==="profile")renderProfile();}
async function init(){try{me=(await api("/api/me")).user;machines=(await api("/api/machines")).machines;if(me)dash=await api("/api/dashboard");render();}catch(e){console.log(e)}}
function render(){document.getElementById("welcome").innerHTML=me?`Welcome, <b>${me.name}</b>.`:"Create an account to explore the demo.";document.getElementById("balance").textContent=money(dash?.balance);document.getElementById("count").textContent=dash?.purchases?.length||0;document.getElementById("loginNav").textContent=me?"Account":"Login";loadMachines();renderEarnings();renderProfile();}
async function loadMachines(){machines=(await api("/api/machines")).machines;
 const pay=document.getElementById("paymentBox");
 if(pay){try{const p=await api("/api/payment-info");pay.innerHTML=`<div class="payment-head"><div><span class="eyebrow">CHECKOUT</span><h3>Demo payment</h3><p class="muted">Use this screen to preview the payment experience before any real payment integration.</p></div><div class="demo-badge">DEMO</div></div><div class="payment-detail"><span>Method</span><strong>${p.method}</strong></div><div class="payment-detail"><span>Demo Till number</span><strong class="till">${p.tillNumber}</strong></div><label class="amount-label" for="demoAmount">Amount</label><input id="demoAmount" class="amount-input" type="number" min="1" placeholder="Enter amount"><button class="pay-demo" onclick="demoCheckout()">Continue to demo checkout</button><p class="warn">No real payment is processed. Do not send real money to the demo Till number.</p><div id="checkoutMsg"></div>`;}catch(e){pay.innerHTML="";}}
 document.getElementById("machineList").innerHTML=machines.map(m=>`<div class="machine"><h3>${m.name}</h3><p>${m.description}</p><div class="price">${money(m.price)}</div><p>Demo revenue: ${money(m.demoRevenue)}</p><button onclick="buy('${m.id}')">${me?"Add demo machine":"Login to add"}</button></div>`).join("")}
async function buy(id){if(!me){show("auth");return}try{await api("/api/purchases",{method:"POST",body:JSON.stringify({machineId:id})});dash=await api("/api/dashboard");render();alert("Demo machine added.");}catch(e){alert(e.message)}}
function renderEarnings(){let b=document.getElementById("earningsBox");if(!me){b.innerHTML='<div class="warn">Log in to view demo earnings.</div>';return}b.innerHTML=`<div class="panel"><h3>Demo balance: ${money(dash?.balance)}</h3><p>Revenue shown here is illustrative and tied to the demo machine records.</p><input id="wd" type="number" min="200" placeholder="Amount (min KSh 200)"><button onclick="withdraw()">Request demo withdrawal</button></div><h3>Recent activity</h3>${(dash?.notifications||[]).map(n=>`<div class="ok">${n.message}<br><small>${new Date(n.createdAt).toLocaleString()}</small></div>`).join("")||"<p>No activity yet.</p>"}`;}
async function withdraw(){try{let amount=Number(document.getElementById("wd").value);await api("/api/withdrawals",{method:"POST",body:JSON.stringify({amount})});dash=await api("/api/dashboard");renderEarnings();alert("Demo request submitted.");}catch(e){alert(e.message)}}
function renderProfile(){let b=document.getElementById("profileBox");b.innerHTML=me?`<div class="panel"><h3>${me.name}</h3><p>${me.email}</p><p>Role: ${me.role}</p><button onclick="logout()">Log out</button></div>`:'<div class="warn">You are not logged in.</div>'}
async function register(){try{await api("/api/register",{method:"POST",body:JSON.stringify({name:name.value,email:email.value,password:password.value})});authMsg.textContent="Account created. Now log in."}catch(e){authMsg.textContent=e.message}}
async function login(){try{await api("/api/login",{method:"POST",body:JSON.stringify({email:email.value,password:password.value})});await init();show("home")}catch(e){authMsg.textContent=e.message}}
async function logout(){await api("/api/logout",{method:"POST"});location.reload()}init();

function renderActivity(){
 const b=document.getElementById("activityBox");
 if(!me){b.innerHTML='<div class="warn">Log in to view your machines and activity.</div>';return;}
 b.innerHTML="<p>Loading...</p>";
 api("/api/dashboard").then(d=>{
   b.innerHTML="<div class='panel'><h3>My Machines</h3>"+
   (d.purchases||[]).map(p=>`<div class="ok"><b>${p.machineName}</b><br>Price: ${money(p.price)}<br>Demo revenue: ${money(p.demoRevenue)}<br><small>${new Date(p.createdAt).toLocaleString()}</small></div>`).join("")+
   "</div><div class='panel'><h3>Withdrawal requests</h3>"+
   (d.withdrawals||[]).map(w=>`<div class="warn">KSh ${Number(w.amount).toLocaleString()} — ${w.status}<br><small>${new Date(w.createdAt).toLocaleString()}</small></div>`).join("")+
   "</div>";
 }).catch(e=>b.innerHTML="<div class='warn'>Unable to load activity.</div>");
}

function demoCheckout(){
 const amount=Number(document.getElementById("demoAmount")?.value||0);
 const box=document.getElementById("checkoutMsg");
 if(!amount||amount<=0){box.innerHTML='<div class="warn">Enter a demo amount greater than KSh 0.</div>';return;}
 box.innerHTML=`<div class="checkout"><h4>Demo checkout ready</h4><p>Amount: <b>${money(amount)}</b></p><p>Payment method: <b>M-Pesa Till</b></p><p>This is a simulation only. No money has been requested, received, or transferred.</p><button onclick="document.getElementById('checkoutMsg').innerHTML=''">Close</button></div>`;
}
