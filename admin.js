const loginView = document.getElementById("loginView");
const dashboard = document.getElementById("dashboard");
const loginForm = document.getElementById("loginForm");
const loginError = document.getElementById("loginError");
const applicantList = document.getElementById("applicantList");
const countLabel = document.getElementById("countLabel");

async function api(url, options = {}) {
  const response = await fetch(url, { credentials: "same-origin", ...options });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "Request failed.");
  return data;
}
function showDashboard() {
  loginView.classList.add("hidden");
  dashboard.classList.remove("hidden");
  loadApplications();
}
async function checkSession() {
  try { const data = await api("/api/admin/me"); if (data.authenticated) showDashboard(); }
  catch {}
}
loginForm.addEventListener("submit", async e => {
  e.preventDefault(); loginError.textContent = "";
  const button = loginForm.querySelector("button"); button.disabled = true;
  try {
    await api("/api/admin/login", { method: "POST", headers: {"Content-Type":"application/json"}, body: JSON.stringify({password: loginForm.password.value}) });
    loginForm.reset(); showDashboard();
  } catch (err) { loginError.textContent = err.message; }
  finally { button.disabled = false; }
});
document.getElementById("logoutBtn").addEventListener("click", async () => {
  await api("/api/admin/logout", {method:"POST"});
  dashboard.classList.add("hidden"); loginView.classList.remove("hidden");
});
async function loadApplications() {
  applicantList.innerHTML = "<p>Loading applications...</p>";
  try {
    const items = await api("/api/admin/applications");
    countLabel.textContent = `${items.length} application${items.length === 1 ? "" : "s"}`;
    if (!items.length) { applicantList.innerHTML = '<p class="section-intro">No applications yet. HR is enjoying the peace.</p>'; return; }
    applicantList.innerHTML = "";
    items.forEach(item => {
      const card = document.createElement("article");
      card.style.cssText = "border:1px solid #f0d5dc;border-radius:14px;padding:20px;margin:16px 0;background:#fffafa";
      const title = document.createElement("h3"); title.textContent = item.answers.fullName; title.style.cssText = "font:600 22px 'Playfair Display',serif;color:#762b40;margin:0 0 6px";
      const meta = document.createElement("p"); meta.textContent = `${item.answers.age} · ${item.answers.location} · Submitted ${new Date(item.submittedAt).toLocaleString()}`; meta.style.cssText = "font-size:11px;color:#927b82";
      const status = document.createElement("select");
      ["Under review","Shortlisted","Interview","Rejected"].forEach(s => { const o=document.createElement("option");o.value=s;o.textContent=s;status.appendChild(o); });
      status.value = item.status;
      status.addEventListener("change", async () => {
        try { await api(`/api/admin/applications/${item.id}/status`, {method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({status:status.value})}); }
        catch(err) { alert(err.message); }
      });
      status.style.cssText = "padding:9px;border:1px solid #ecd9de;border-radius:8px;color:#762b40;background:white";
      card.append(title, meta);
      if (item.photoUrl) { const img=document.createElement("img");img.src=item.photoUrl;img.alt="Applicant upload";img.style.cssText="max-width:150px;max-height:150px;object-fit:cover;border-radius:10px;margin:8px 0";card.append(img); }
      const answers = document.createElement("div"); answers.style.cssText = "display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:10px;margin:15px 0";
      Object.entries(item.answers).forEach(([key,value]) => {
        const block=document.createElement("div");block.style.cssText="background:white;border:1px solid #f2e4e8;border-radius:9px;padding:10px";
        const label=document.createElement("div");label.textContent=key.replace(/([A-Z])/g," $1").replace(/^./,c=>c.toUpperCase());label.style.cssText="font-size:10px;color:#bd405b;font-weight:700;text-transform:uppercase;margin-bottom:5px";
        const answer=document.createElement("div");answer.textContent=value;answer.style.cssText="font-size:12px;white-space:pre-wrap;overflow-wrap:anywhere";
        block.append(label,answer);answers.append(block);
      });
      card.append(answers);
      const actions=document.createElement("div");actions.style.cssText="display:flex;align-items:center;gap:12px;flex-wrap:wrap";
      const statusLabel=document.createElement("span");statusLabel.textContent="Application status";statusLabel.style.cssText="font-size:11px;color:#927b82";
      const del=document.createElement("button");del.textContent="DELETE APPLICATION";del.className="secondary-btn";del.addEventListener("click",async()=>{
        if(!confirm(`Delete ${item.answers.fullName}'s application permanently?`))return;
        try{await api(`/api/admin/applications/${item.id}`,{method:"DELETE"});loadApplications();}catch(err){alert(err.message);}
      });
      actions.append(statusLabel,status,del);card.append(actions);applicantList.append(card);
    });
  } catch(err) { applicantList.textContent = err.message; }
}
checkSession();