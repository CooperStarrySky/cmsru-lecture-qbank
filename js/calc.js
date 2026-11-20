/* calc.js — scientific calculator docked in the Tool Kit (Examplify layout:
   Radian | INV | AC / sin cos tan π n! / log ln √ 1/x xʸ / 7 8 9 ( ) / 4 5 6 × ÷ / 1 2 3 + − / 0 . EE Del =).
   Calc.mount(el). Also exports Drag (used by floating windows). */
(function () {
  let root, expr = "", ans = 0, deg = true, inv = false, justEval = false;

  const KEYS = [
    ["rad", "Radian", 2], ["inv", "INV", 2], ["ac", "AC", 1],
    ["sin", "sin"], ["cos", "cos"], ["tan", "tan"], ["pi", "π"], ["fact", "n!"],
    ["log", "log"], ["ln", "ln"], ["sqrt", "√"], ["recip", "1/x"], ["pow", "xʸ"],
    ["7", "7"], ["8", "8"], ["9", "9"], ["(", "("], [")", ")"],
    ["4", "4"], ["5", "5"], ["6", "6"], ["*", "×"], ["/", "÷"],
    ["1", "1"], ["2", "2"], ["3", "3"], ["+", "+"], ["-", "−"],
    ["0", "0"], [".", "."], ["ee", "EE"], ["del", "Del"], ["=", "="],
  ];
  const INV_LABEL = { sin: "sin⁻¹", cos: "cos⁻¹", tan: "tan⁻¹", log: "10ˣ", ln: "eˣ", sqrt: "x²", pow: "ʸ√x" };

  function evaluate(s) {
    const k = deg ? Math.PI / 180 : 1;
    const F = {
      sin: x => Math.sin(x * k), cos: x => Math.cos(x * k), tan: x => Math.tan(x * k),
      asin: x => Math.asin(x) / k, acos: x => Math.acos(x) / k, atan: x => Math.atan(x) / k,
      log: Math.log10, ln: Math.log, sqrt: Math.sqrt, exp: Math.exp, tenx: x => Math.pow(10, x),
      fact: x => { if (x < 0 || x > 170 || x % 1) throw 0; let r = 1; for (let i = 2; i <= x; i++) r *= i; return r; },
      root: (y, x) => Math.pow(x, 1 / y),
    };
    let js = s.replace(/×/g, "*").replace(/÷/g, "/").replace(/−/g, "-").replace(/π/g, "(PI)")
      .replace(/Ans/g, `(${ans})`).replace(/E/g, "*10**").replace(/\^/g, "**")
      .replace(/(\d+(?:\.\d+)?|\))!/g, "F.fact($1)")
      .replace(/\b(asin|acos|atan|sin|cos|tan|log|ln|sqrt|exp|tenx)\(/g, "F.$1(")
      .replace(/PI/g, "Math.PI");
    if (/[^0-9+\-*/().\s,FMathPIsincotaglqrexpfcu]/.test(js)) throw 0;
    js += ")".repeat(Math.max(0, (js.match(/\(/g) || []).length - (js.match(/\)/g) || []).length));
    const v = Function("F", `"use strict";return (${js})`)(F);
    if (typeof v !== "number" || !isFinite(v)) throw 0;
    return +parseFloat(v.toPrecision(12));
  }

  function press(k) {
    if (justEval && /^[0-9.]$/.test(k)) expr = "";
    if (justEval && /^[+\-*/^]$/.test(k)) expr = "Ans";
    justEval = false;
    const fn = name => { expr += name + "("; };
    switch (k) {
      case "ac": expr = ""; break;
      case "del": expr = expr.replace(/(asin\(|acos\(|atan\(|sin\(|cos\(|tan\(|log\(|ln\(|sqrt\(|exp\(|tenx\(|Ans|.)$/, ""); break;
      case "rad": deg = !deg; break;
      case "inv": inv = !inv; break;
      case "sin": case "cos": case "tan": fn((inv ? "a" : "") + k); inv = false; break;
      case "log": fn(inv ? "tenx" : "log"); inv = false; break;
      case "ln": fn(inv ? "exp" : "ln"); inv = false; break;
      case "sqrt": if (inv) { expr += "^2"; } else fn("sqrt"); inv = false; break;
      case "pow": expr += "^"; inv = false; break;
      case "pi": expr += "π"; break;
      case "fact": expr += "!"; break;
      case "recip": expr = `1/(${expr || "0"})`; break;
      case "ee": expr += "E"; break;
      case "*": expr += "×"; break; case "/": expr += "÷"; break; case "-": expr += "−"; break;
      case "=":
        try { const v = evaluate(expr || "0"); root.querySelector(".cx-ans").textContent = `${expr} =`; ans = v; expr = String(v); justEval = true; }
        catch (e) { root.querySelector(".cx-ans").textContent = "Error"; expr = ""; }
        break;
      default: expr += k;
    }
    render();
  }

  function render() {
    root.querySelector(".cx-val").textContent = expr || "0";
    root.querySelector(".cx-mode").textContent = deg ? "DEG" : "RAD";
    root.querySelector('[data-k="rad"]').textContent = deg ? "Radian" : "Degree";
    root.querySelector('[data-k="inv"]').classList.toggle("on", inv);
    for (const [k, l] of Object.entries(INV_LABEL)) root.querySelector(`[data-k="${k}"]`).textContent = inv ? l : KEYS.find(x => x[0] === k)[1];
  }

  window.Calc = {
    mount(el) {
      root = el;
      el.innerHTML = `<div class="cx-disp" tabindex="0" aria-label="Calculator display, type to enter">
          <span class="cx-ans">Ans = 0</span><span class="cx-val">0</span><span class="cx-mode">DEG</span></div>
        <div class="cx-keys">${KEYS.map(([k, l, span]) => `<button data-k="${k}" class="${/^[0-9.]$/.test(k) ? "n" : ""} ${k === "=" ? "eq" : ""}" ${span ? `style="grid-column:span ${span}"` : ""}>${l}</button>`).join("")}</div>`;
      el.addEventListener("click", e => { const b = e.target.closest("[data-k]"); if (b) { press(b.dataset.k); el.querySelector(".cx-disp").focus({ preventScroll: true }); } });
      el.addEventListener("keydown", e => {
        const m = { Enter: "=", "=": "=", Backspace: "del", Escape: "ac", "*": "*", x: "*", "/": "/", "+": "+", "-": "-", ".": ".", "(": "(", ")": ")", "^": "pow", "!": "fact" };
        if (/^[0-9]$/.test(e.key)) press(e.key); else if (m[e.key]) press(m[e.key]); else return;
        e.preventDefault(); e.stopPropagation();
      });
      render();
    },
  };

  window.Drag = {
    make(win, handle) {
      handle.addEventListener("pointerdown", e => {
        if (e.target.closest("button")) return;
        const r = win.getBoundingClientRect(), dx = e.clientX - r.left, dy = e.clientY - r.top;
        handle.setPointerCapture(e.pointerId);
        const mv = ev => {
          win.style.left = Math.min(innerWidth - 80, Math.max(0, ev.clientX - dx)) + "px";
          win.style.top = Math.min(innerHeight - 40, Math.max(0, ev.clientY - dy)) + "px";
        };
        const up = () => { handle.removeEventListener("pointermove", mv); handle.removeEventListener("pointerup", up); };
        handle.addEventListener("pointermove", mv); handle.addEventListener("pointerup", up);
      });
    },
  };
})();
