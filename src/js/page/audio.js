const clips = {
  thud: [
    `play-01.mp3`,
    `play-02.mp3`,
    `play-03.mp3`,
    `play-04.mp3`,
    `play-05.mp3`,
    `play-06.mp3`,
    `play-07.mp3`,
  ],

  click: [
    `click-01.mp3`,
    `click-02.mp3`,
    `click-03.mp3`,
    `click2-01.mp3`,
    `click2-02.mp3`,
  ],

  multi: [
    `click-multi-01.mp3`,
    `click-multi-02.mp3`,
    `click-multi-03.mp3`,
    `click-multi-04.mp3`,
    `click-multi-05.mp3`,
  ],

  kong: [
    `click-multi-large-01.mp3`,
    `click-multi-large-02.mp3`,
  ],

  start: [`start.mp3`],
  win: [`win.mp3`],
  end: [`end.mp3`],
};

function playClip(name, id) {
  if (config.NO_SOUND) return;
  let bin = clips[name];
  if (!bin) return console.error(`'audio bin ${name} does not exist`);
  id = id || random(bin.length);
  let audio = document.createElement("audio");
  audio.src = `audio/${bin[id]}`;
  audio.type = `mp3`;
  document.body.appendChild(audio);
  audio.addEventListener("ended", evt => document.body.removeChild(audio));
  setTimeout(() => audio.play());
}
