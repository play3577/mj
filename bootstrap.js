let html = document.querySelector("html");
let ps = document.getElementById("pslide");
let ws = document.getElementById("wslide");
let discards = document.querySelector(".discards");

ps.addEventListener("input", e => {
  let v = e.target.value;
  html.style.setProperty("--ph", v + "em");
});

ws.addEventListener("input", e => {
  let v = e.target.value;
  html.style.setProperty("--w", v + "em");
});

// Simple general purpose modal
let modal = document.querySelector(".modal");
modal.setContent = (label, options, resolve) => {
  let panel = modal.querySelector('.panel');
  panel.innerHTML = `<p>${label}</p>`;

  options.forEach(data => {
    let btn = document.createElement("button");
    btn.textContent = data.label;
    btn.addEventListener("click", e => {
      resolve(data.value);
      modal.classList.add("hidden");
    });
    panel.appendChild(btn);
  });
}