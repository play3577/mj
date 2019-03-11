const playlog = {
    new: () => {},
    log: () => {}
};

if (typeof process !== "undefined") {
    var fs = require('fs');

    let noop = ()=>{};
    let lines = [];

    playlog.flush = () => {
        let data = lines.slice().join('\n');
        lines = [];
        fs.writeFile(`play-log-${Date.now()}.log`, data, { flag: 'a', encoding: 'utf-8' }, noop);
    };

    playlog.log = (text) => {
        text.split('\n').forEach(line => {
            lines.push(`${Date.now()}: ${line}`);
        });
    };

    module.exports = playlog;
}
