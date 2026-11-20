/* labs.js — searchable laboratory reference values (standard adult ranges),
   grouped like the NBME sheet. LabSheet.mount(el) renders into the
   "Exam Attachments" pop-up; LabSheet.open() for other pages.
   Rows: [test, conventional, SI] — use "" when there is no SI value. */
(function () {
  const D = {
    "Serum": [
      ["Alanine aminotransferase (ALT)", "10–40 U/L", "10–40 U/L"],
      ["Aspartate aminotransferase (AST)", "12–38 U/L", "12–38 U/L"],
      ["Alkaline phosphatase", "25–100 U/L", "25–100 U/L"],
      ["Amylase", "25–125 U/L", "25–125 U/L"],
      ["Lipase", "13–60 U/L", "13–60 U/L"],
      ["Troponin I", "≤0.04 ng/mL", "≤0.04 µg/L"],
      ["Bilirubin, total", "0.1–1.0 mg/dL", "2–17 µmol/L"],
      ["Bilirubin, direct", "0.0–0.3 mg/dL", "0–5 µmol/L"],
      ["Calcium", "8.4–10.2 mg/dL", "2.1–2.6 mmol/L"],
      ["Cholesterol, total (normal)", "<200 mg/dL", "<5.2 mmol/L"],
      ["Cholesterol, total (high)", ">240 mg/dL", ">6.2 mmol/L"],
      ["Cholesterol, HDL", "40–60 mg/dL", "1.0–1.6 mmol/L"],
      ["Cholesterol, LDL", "<160 mg/dL", "<4.2 mmol/L"],
      ["Triglycerides (normal)", "<150 mg/dL", "<1.70 mmol/L"],
      ["Triglycerides (borderline)", "151–199 mg/dL", "1.71–2.25 mmol/L"],
      ["Cortisol, 0800 h", "5–23 µg/dL", "138–635 nmol/L"],
      ["Cortisol, 1600 h", "3–15 µg/dL", "82–413 nmol/L"],
      ["Cortisol, 2000 h", "<50% of 0800 h", "Fraction of 0800 h: <0.50"],
      ["Creatine kinase, male", "25–90 U/L", "25–90 U/L"],
      ["Creatine kinase, female", "10–70 U/L", "10–70 U/L"],
      ["Creatinine", "0.6–1.2 mg/dL", "53–106 µmol/L"],
      ["Creatinine clearance, male", "97–137 mL/min", "97–137 mL/min"],
      ["Creatinine clearance, female", "88–128 mL/min", "88–128 mL/min"],
      ["Sodium (Na⁺)", "136–146 mEq/L", "136–146 mmol/L"],
      ["Potassium (K⁺)", "3.5–5.0 mEq/L", "3.5–5.0 mmol/L"],
      ["Chloride (Cl⁻)", "95–105 mEq/L", "95–105 mmol/L"],
      ["Bicarbonate (HCO₃⁻)", "22–28 mEq/L", "22–28 mmol/L"],
      ["Magnesium (Mg²⁺)", "1.5–2.0 mg/dL", "0.75–1.0 mmol/L"],
      ["Phosphorus (inorganic)", "3.0–4.5 mg/dL", "1.0–1.5 mmol/L"],
      ["Ferritin, male", "20–250 ng/mL", "20–250 µg/L"],
      ["Ferritin, female", "10–120 ng/mL", "10–120 µg/L"],
      ["Iron, male", "65–175 µg/dL", "11.6–31.3 µmol/L"],
      ["Iron, female", "50–170 µg/dL", "9.0–30.4 µmol/L"],
      ["Total iron-binding capacity (TIBC)", "250–400 µg/dL", "44.8–71.6 µmol/L"],
      ["Transferrin", "200–360 mg/dL", "2.0–3.6 g/L"],
      ["Glucose, fasting", "70–100 mg/dL", "3.8–5.6 mmol/L"],
      ["Glucose, random, non-fasting", "<140 mg/dL", "<7.77 mmol/L"],
      ["Hemoglobin A1c", "≤6%", "≤42 mmol/mol"],
      ["Lactate dehydrogenase (LDH)", "45–200 U/L", "45–200 U/L"],
      ["Osmolality", "275–295 mOsmol/kg H₂O", "275–295 mOsmol/kg H₂O"],
      ["Parathyroid hormone (PTH), intact", "10–60 pg/mL", "10–60 ng/L"],
      ["Protein, total", "6.0–7.8 g/dL", "60–78 g/L"],
      ["Albumin", "3.5–5.5 g/dL", "35–55 g/L"],
      ["Globulin", "2.3–3.5 g/dL", "23–35 g/L"],
      ["Thyroid-stimulating hormone (TSH)", "0.4–4.0 µU/mL", "0.4–4.0 mIU/L"],
      ["Thyroxine (T₄), total", "5–12 µg/dL", "64–155 nmol/L"],
      ["Thyroxine (T₄), free", "0.9–1.7 ng/dL", "12.0–21.9 pmol/L"],
      ["Triiodothyronine (T₃), total", "100–200 ng/dL", "1.5–3.1 nmol/L"],
      ["Urea nitrogen (BUN)", "7–18 mg/dL", "2.5–6.4 mmol/L"],
      ["Uric acid", "3.0–8.2 mg/dL", "0.18–0.48 mmol/L"],
      ["Follicle-stimulating hormone (FSH), male", "4–25 mIU/mL", "4–25 IU/L"],
      ["FSH, female, premenopause", "4–30 mIU/mL", "4–30 IU/L"],
      ["FSH, female, midcycle peak", "10–90 mIU/mL", "10–90 IU/L"],
      ["FSH, female, postmenopause", "40–250 mIU/mL", "40–250 IU/L"],
      ["Luteinizing hormone (LH), male", "6–23 mIU/mL", "6–23 IU/L"],
      ["LH, female, follicular phase", "5–30 mIU/mL", "5–30 IU/L"],
      ["LH, female, midcycle", "75–150 mIU/mL", "75–150 IU/L"],
      ["LH, female, postmenopause", "30–200 mIU/mL", "30–200 IU/L"],
      ["Growth hormone (arginine stimulation), fasting", "<5 ng/mL", "<5 µg/L"],
      ["Growth hormone (arginine stimulation), provocative stimuli", ">7 ng/mL", ">7 µg/L"],
      ["Triiodothyronine (T₃) resin uptake", "25%–35%", "0.25–0.35"],
      ["Thyroidal iodine (¹²³I) uptake", "8%–30% of administered dose/24 h", "0.08–0.30/24 h"],
      ["Prolactin, male", "<17 ng/mL", "<17 µg/L"],
      ["Prolactin, female", "<25 ng/mL", "<25 µg/L"],
      ["Immunoglobulin IgA", "76–390 mg/dL", "0.76–3.90 g/L"],
      ["Immunoglobulin IgE", "0–380 IU/mL", "0–380 kIU/L"],
      ["Immunoglobulin IgG", "650–1500 mg/dL", "6.5–15.0 g/L"],
      ["Immunoglobulin IgM", "50–300 mg/dL", "0.5–3.0 g/L"],
    ],
    "Arterial blood gases (room air)": [
      ["pH", "7.35–7.45", "[H⁺] 36–44 nmol/L"],
      ["PCO₂", "33–45 mm Hg", "4.4–5.9 kPa"],
      ["PO₂", "75–105 mm Hg", "10.0–14.0 kPa"],
    ],
    "Hematologic": [
      ["Erythrocyte count (RBC), male", "4.3–5.9 million/mm³", "4.3–5.9 × 10¹²/L"],
      ["Erythrocyte count (RBC), female", "3.5–5.5 million/mm³", "3.5–5.5 × 10¹²/L"],
      ["Hemoglobin, male", "13.5–17.5 g/dL", "135–175 g/L"],
      ["Hemoglobin, female", "12.0–16.0 g/dL", "120–160 g/L"],
      ["Hematocrit, male", "41%–53%", "0.41–0.53"],
      ["Hematocrit, female", "36%–46%", "0.36–0.46"],
      ["Mean corpuscular volume (MCV)", "80–100 µm³", "80–100 fL"],
      ["Plasma volume, male", "25–43 mL/kg", "0.025–0.043 L/kg"],
      ["Plasma volume, female", "28–45 mL/kg", "0.028–0.045 L/kg"],
      ["Red cell volume, male", "20–36 mL/kg", "0.020–0.036 L/kg"],
      ["Red cell volume, female", "19–31 mL/kg", "0.019–0.031 L/kg"],
      ["Mean corpuscular hemoglobin (MCH)", "25–35 pg/cell", "0.39–0.54 fmol/cell"],
      ["Mean corpuscular hemoglobin concentration (MCHC)", "31%–36% Hb/cell", "4.8–5.6 mmol Hb/L"],
      ["Leukocyte count (WBC)", "4,500–11,000/mm³", "4.5–11.0 × 10⁹/L"],
      ["Neutrophils, segmented", "54%–62%", "0.54–0.62"],
      ["Neutrophils, bands", "3%–5%", "0.03–0.05"],
      ["Eosinophils", "1%–3%", "0.01–0.03"],
      ["Basophils", "0%–0.75%", "0.00–0.0075"],
      ["Lymphocytes", "25%–33%", "0.25–0.33"],
      ["Monocytes", "3%–7%", "0.03–0.07"],
      ["CD4⁺ T-lymphocyte count", "≥500/mm³", "≥0.5 × 10⁹/L"],
      ["Platelet count", "150,000–400,000/mm³", "150–400 × 10⁹/L"],
      ["Reticulocyte count", "0.5%–1.5%", "0.005–0.015"],
      ["Erythrocyte sedimentation rate (Westergren), male", "0–15 mm/h", "0–15 mm/h"],
      ["Erythrocyte sedimentation rate (Westergren), female", "0–20 mm/h", "0–20 mm/h"],
      ["Prothrombin time (PT)", "11–15 seconds", "11–15 seconds"],
      ["Partial thromboplastin time (PTT, activated)", "25–40 seconds", "25–40 seconds"],
      ["D-dimer", "≤250 ng/mL", "≤1.4 nmol/L"],
    ],
    "Cerebrospinal fluid": [
      ["Cell count", "0–5/mm³", "0–5 × 10⁶/L"],
      ["Chloride", "118–132 mEq/L", "118–132 mmol/L"],
      ["Gamma globulin", "3%–12% total proteins", "0.03–0.12"],
      ["Glucose", "40–70 mg/dL", "2.2–3.9 mmol/L"],
      ["Pressure", "70–180 mm H₂O", "70–180 mm H₂O"],
      ["Proteins, total", "<40 mg/dL", "<0.40 g/L"],
    ],
    "Urine": [
      ["Calcium", "100–300 mg/24 h", "2.5–7.5 mmol/24 h"],
      ["Osmolality", "50–1200 mOsmol/kg H₂O", "50–1200 mOsmol/kg H₂O"],
      ["Oxalate", "8–40 µg/mL", "90–445 µmol/L"],
      ["Proteins, total", "<150 mg/24 h", "<0.15 g/24 h"],
      ["17-Hydroxycorticosteroids, male", "3.0–10.0 mg/24 h", "8.2–27.6 µmol/24 h"],
      ["17-Hydroxycorticosteroids, female", "2.0–8.0 mg/24 h", "5.5–22.0 µmol/24 h"],
      ["17-Ketosteroids, total, male", "8–20 mg/24 h", "28–70 µmol/24 h"],
      ["17-Ketosteroids, total, female", "6–15 mg/24 h", "21–52 µmol/24 h"],
    ],
    "Body mass index": [
      ["BMI, adult", "19–25 kg/m²", "19–25 kg/m²"],
    ],
  };

  let tab = "Serum", q = "", si = false, root;
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const norm = s => s.toLowerCase().normalize("NFKD").replace(/[₀-₉⁰-⁹⁺⁻]/g, ch => "0123456789".charAt("₀₁₂₃₄₅₆₇₈₉".indexOf(ch)) || "");
  // every search word must appear somewhere in the test name ("cortisol 1600" finds "Cortisol, 1600 h")
  const words = () => norm(q).split(/[\s,()]+/).filter(Boolean);
  const hit = name => { const n = norm(name); return words().every(w => n.includes(w)); };
  const mark = s => {
    if (!q) return esc(s);
    const n = norm(s), on = new Array(s.length).fill(false);
    for (const w of words()) { const i = n.indexOf(w); if (i >= 0) for (let k = i; k < i + w.length; k++) on[k] = true; }
    let out = "", open = false;
    for (let k = 0; k < s.length; k++) {
      if (on[k] && !open) { out += "<mark>"; open = true; }
      if (!on[k] && open) { out += "</mark>"; open = false; }
      out += esc(s[k]);
    }
    return out + (open ? "</mark>" : "");
  };

  function rows() {
    const groups = q ? Object.keys(D) : [tab];
    let h = "", n = 0;
    for (const g of groups) {
      const r = D[g].filter(x => !q || hit(x[0]));
      if (!r.length) continue;
      n += r.length;
      h += `<tr class="lv-g"><th colspan="2">${esc(g)}</th></tr>` +
        r.map(x => `<tr><td>${mark(x[0])}</td><td>${esc(si ? (x[2] || x[1]) : x[1])}</td></tr>`).join("");
    }
    return n ? h : `<tr><td colspan="2" class="lv-none">No match for “${esc(q)}”.</td></tr>`;
  }
  function draw() {
    root.querySelector(".lv-tabs").innerHTML = Object.keys(D).map(g => `<button data-t="${esc(g)}" aria-selected="${!q && g === tab}">${esc(g)}</button>`).join("");
    root.querySelector("tbody").innerHTML = rows();
    root.querySelector(".lv-unit").textContent = si ? "SI reference intervals" : "Reference range";
  }

  window.LabSheet = {
    mount(el) {
      if (el.dataset.mounted) { el.querySelector(".lv-search").focus(); return; }
      el.dataset.mounted = "1"; root = el;
      el.innerHTML = `<div class="lv">
        <div class="lv-bar"><input class="lv-search" type="search" placeholder="Search lab values (e.g. ferritin, PTH, CSF glucose)" aria-label="Search lab values">
          <label class="lv-si"><input type="checkbox"> SI units</label></div>
        <div class="lv-tabs" role="tablist"></div>
        <table class="lv-t"><thead><tr><th>Test</th><th class="lv-unit">Reference range</th></tr></thead><tbody></tbody></table>
        <p class="lv-note">Values follow the NBME Laboratory Reference Values sheet (2025 revision). If a question gives its own reference values, use those.</p></div>`;
      el.querySelector(".lv-search").oninput = e => { q = e.target.value.trim(); draw(); };
      el.querySelector(".lv-si input").onchange = e => { si = e.target.checked; draw(); };
      el.querySelector(".lv-tabs").onclick = e => { const b = e.target.closest("[data-t]"); if (b) { tab = b.dataset.t; q = ""; el.querySelector(".lv-search").value = ""; draw(); } };
      draw(); el.querySelector(".lv-search").focus();
    },
    data: D,
  };
})();
