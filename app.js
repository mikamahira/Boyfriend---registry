const welcome = document.getElementById("welcome");
const application = document.getElementById("application");
const success = document.getElementById("success");
const form = document.getElementById("applicationForm");
const steps = [...document.querySelectorAll(".form-step")];
const backBtn = document.getElementById("backBtn");
const nextBtn = document.getElementById("nextBtn");
const submitBtn = document.getElementById("submitBtn");
const progressBar = document.getElementById("progressBar");
const progressPercent = document.getElementById("progressPercent");
const stepLabel = document.getElementById("stepLabel");
const errorBox = document.getElementById("formError");
let currentStep = 0;

document.getElementById("startBtn").addEventListener("click", () => {
  welcome.classList.add("hidden");
  application.classList.remove("hidden");
  window.scrollTo({ top: 0, behavior: "smooth" });
  renderStep();
});

function renderStep() {
  steps.forEach((step, i) => step.classList.toggle("active", i === currentStep));
  const percent = Math.round(((currentStep + 1) / steps.length) * 100);
  progressBar.style.width = `${percent}%`;
  progressPercent.textContent = `${percent}%`;
  stepLabel.textContent = `SECTION ${currentStep + 1} OF ${steps.length}`;
  backBtn.classList.toggle("hidden", currentStep === 0);
  nextBtn.classList.toggle("hidden", currentStep === steps.length - 1);
  submitBtn.classList.toggle("hidden", currentStep !== steps.length - 1);
  errorBox.textContent = "";
}
function validateCurrentStep() {
  const fields = [...steps[currentStep].querySelectorAll("input,textarea")].filter(el => el.type !== "file");
  for (const field of fields) {
    if (field.type === "radio") {
      const group = fields.filter(x => x.name === field.name);
      if (!group.some(x => x.checked)) {
        group[0].focus();
        errorBox.textContent = "Please choose an answer before continuing.";
        return false;
      }
    } else if (!field.checkValidity()) {
      field.reportValidity();
      return false;
    }
  }
  return true;
}
nextBtn.addEventListener("click", () => {
  if (!validateCurrentStep()) return;
  currentStep = Math.min(currentStep + 1, steps.length - 1);
  renderStep();
  window.scrollTo({ top: application.offsetTop - 15, behavior: "smooth" });
});
backBtn.addEventListener("click", () => {
  currentStep = Math.max(currentStep - 1, 0);
  renderStep();
  window.scrollTo({ top: application.offsetTop - 15, behavior: "smooth" });
});
form.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!validateCurrentStep()) return;
  submitBtn.disabled = true;
  submitBtn.textContent = "SUBMITTING...";
  errorBox.textContent = "";
  try {
    const response = await fetch("/api/applications", { method: "POST", body: new FormData(form) });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "Submission failed.");
    application.classList.add("hidden");
    success.classList.remove("hidden");
    window.scrollTo({ top: 0, behavior: "smooth" });
  } catch (err) {
    errorBox.textContent = err.message || "Could not submit. Please try again.";
  } finally {
    submitBtn.disabled = false;
    submitBtn.innerHTML = "SUBMIT APPLICATION ♥";
  }
});
renderStep();