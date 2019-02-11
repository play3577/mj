if (config.PLAY_IMMEDIATELY) setup().play();
else

modal.setContent("Welcome! Would you like to play test, or watch a game?", [
    { label: "Let me see what this game is made of!", value: 'play' },
    { label: "You know what: let's see those bots in action!", value: 'watch' },
], result => {
    config.BOT_PLAY = (result === 'watch');
    setup().play();
});
