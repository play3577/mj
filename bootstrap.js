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
