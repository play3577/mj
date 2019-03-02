/**
 * This is the function that runs as the very first call
 * when the web page loads: do you want to play a game,
 * or do you want to watch the bots play each other?
 */
(function() {
    // functions are always "hoisted" to above any
    // actual code, so the following lines work,
    // despite the functions being declared "later".
    if (config.PLAY_IMMEDIATELY) play();
    else offerChoice();

    // Forced bot play
    function play() {
        let manager = new GameManager();
        let game = manager.create();
        game.startGame();
    }

    // Optional bot play.
    function offerChoice() {
        modal.choiceInput("Welcome! What would you like to do?", [
            { label: "I'd like to play some mahjong!", value: 'play' },
            { label: "I want to see the bots play each other...", value: 'watch' },
            { heading: "- or - "},
            { label: "Change play setting", value: 'settings' },
        ], result => {
            config.BOT_PLAY = (result === 'watch');

            if (result === 'settings') {
                return modal.pickPlaySettings();
            }

            play();
        });
    }
}());
