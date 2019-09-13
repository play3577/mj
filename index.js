const fs = require('fs');
const path = require('path');

// First, bootstrap the ClientServer object:
const { generateClientServer } = require("socketless");
const ClientServer = generateClientServer(
  require("./src/core/client.js"),
  require("./src/core/server.js")
);

// Then create a server, and start it up.
const server = ClientServer.createServer();
server.listen(8080, () => {
  console.log(`index> game server listening on http://localhost:8080`);
});

// We want people to be able to connect to the server with their
// browser, so they can click a "join" button and have that create
// a client for them, and then redirect them to the client's url.
const createWebClient = require("./create-web-client.js");

// The web server only knows how to service two routes: the base
// route, which serves the above HTML code, and the /create route,
// which creates a web client and redirects users over to its
// associated web interface.
const clients = [];
const routeHandler = (request, response) => {
  const url = request.url;

  if (request.method === 'POST') {
    if (url === `/admin/score`) {
      let body = [];
      request.on('data', chunk => {
        body.push(chunk.toString('utf-8'));
      });
      request.on('end', () => {
        payload = JSON.parse(body.join(''));

        // PERFORM SCORE COMPUTATION HERE
        let Ruleset = require("./src/game/rules/ruleset.js");
        let getConfig = require("./src/utils/get-config.js");
        let rules = new Ruleset(getConfig().ruleset.value);
        let score = rules.score({
          tiles: payload.tiles,
          locked: [],
          bonus: [],
          wind: 0
        }, 0);

        response.writeHead(200, { "Content-Type": "application/json"});
        response.end(JSON.stringify(score));
      });
      return;
    }
    // do nothing, we'll end on 404
  }

  if (url.indexOf('/css/') === 0) {
    let fpath = path.join(__dirname, 'public', url);
    try {
      const css = fs.readFileSync(fpath).toString('utf-8');
      response.writeHead(200, { "Content-Type": "text/css" });
      return response.end(css);
    } catch (e) {
      // do noting, we'll end on 404
    }
  }

  if (url.indexOf('/images/') === 0) {
    let fpath = path.join(__dirname, 'public', url);
    try {
      const img = fs.readFileSync(fpath);
      response.writeHead(200, { "Content-Type": "image/jpeg" });
      return response.end(img);
    } catch (e) {
      // do noting, we'll end on 404
    }
  }

  if (url === `/create`) {
    return createWebClient(request, response, url =>
      clients.push(url)
    );
  }

  if (url === `/`) {
    response.writeHead(200, { "Content-Type": "text/html" });
    let index = fs.readFileSync(`index.html`).toString('utf-8');
    return response.end(
      index.replace(
        `{{ clientCode }}`,
        clients
          .map(url => `<li><a target="_blank" href="${url}">${url}</a></li>`)
          .join('\n')
      )
    );
  }
  response.writeHead(404);
  response.end("not found");
};

// So: create a simple http server and run it on port 8000.
const http = require("http");
const webserver = http.createServer(routeHandler);
webserver.listen(8000, () =>
  console.log(`index> primary web server running on http://localhost:8000`)
);
