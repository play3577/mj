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
