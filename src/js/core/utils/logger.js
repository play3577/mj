const playlog = {
    new: () => {},
    log: () => {}
};

if (typeof process !== "undefined") {
    const noop = ()=>{};
    const fs = require('fs');
    const config = require('../../../config');

    let lines = [];
    let prefix = () => ''; // `${Date.now()}: `;

    playlog.flush = (andThen=noop) => {
        let data = lines.slice().join('\n');
        lines = [];
        fs.writeFile(`play-log-${config.SEED}.log`, data, { flag: 'w', encoding: 'utf-8' }, andThen);
    };

    playlog.log = (text) => {
        text.split('\n').forEach(line => {
            lines.push(`${prefix()}${line}`);
        });
    };

    process.on('SIGINT', function() {
        playlog.flush(() => {
            process.exit();
        });
    });

    module.exports = playlog;
}
