// Simple general purpose modal
let modal = document.querySelector(".modal");
modal.setContent = (label, options, resolve) => {
  let panel = modal.querySelector('.panel');
  panel.innerHTML = `<p>${label}</p>`;

  options.forEach(data => {
    let btn = document.createElement("button");
    btn.textContent = data.label;
    btn.addEventListener("click", e => {
      modal.classList.add("hidden");
      resolve(data.value);
    });
    panel.appendChild(btn);
  });

  modal.classList.remove("hidden");
}
