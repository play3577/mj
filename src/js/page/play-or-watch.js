(function() {
    function play() {
        let manager = new GameManager();
        let game = manager.create();
        game.start();
    }

    function offerChoice() {
        modal.choiceInput("Welcome! Would you like to play test, or watch a game?", [
            { label: "Let me pit my wits against these bots!", value: 'play' },
            { label: "You know what: let's see them play each other instead!", value: 'watch' },
        ], result => {
            config.BOT_PLAY = (result === 'watch');
            play();
        });
    }

    if (config.PLAY_IMMEDIATELY) play();
    else offerChoice();
}());

