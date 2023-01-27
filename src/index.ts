import express from "express";
import morgan from "morgan";
import http from "http";
import WebSocket, { WebSocketServer } from 'ws';
import auth from 'basic-auth';

import { ADMIN_USERNAME, ADMIN_PASSWORD, ACCOUNT, HOSTNAME, PORT, PROTO, FDQN } from "./env.js";
import { activitypub } from "./activitypub.js";
import { admin } from "./admin.js";
import { webhook } from "./webhook.js";
import safeCompare from "./safeCompare.js";

const app = express();

const server = http.createServer(app);

const wss = new WebSocketServer({noServer: true, path: "/listen/websocket"});
app.set("wss", wss);

function onSocketError(err: any) {
  console.error(err);
}

wss.on('connection', function connection(ws: any) {
  ws.isAlive = true;
  ws.on('error', onSocketError);
  ws.on('pong', (ws: any) => {
    ws.isAlive = true;
  });
});

// Ping every 30 seconds
const interval = setInterval(function ping() {
  // With WebSocket for type annotation isAlive is not a property
  wss.clients.forEach(function each(ws: any) {
    if (ws.isAlive === false) return ws.terminate();

    ws.isAlive = false;
    ws.ping();
  });
}, 30000);

wss.on('close', function close() {
  clearInterval(interval);
});

// Basic function to validate credentials
function check (name: string, pass: string): boolean {
  var valid = true

  // Simple method to prevent short-circut and use timing-safe compare
  valid = safeCompare(name, ADMIN_USERNAME) && valid
  valid = safeCompare(pass, ADMIN_PASSWORD) && valid

  return valid
}

server.on('upgrade', function upgrade(req: any, socket: any, head: any) {
  // In case of error within upgrade
  socket.on('error', onSocketError);
  // Get credentials
  const credentials = auth(req);
  // Check credentials
  if (!credentials || !check(credentials.name, credentials.pass)) {
    socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
    // TODO realm as public key or content address of, or DID
    // socket.write('WWW-Authenticate: Basic realm="example"\r\n\r\n');
    socket.removeListener('error', onSocketError);
    socket.destroy();
    return;
  }
  // Do the upgrade if credentials check out
  wss.handleUpgrade(req, socket, head, function done(ws: WebSocket) {
    wss.emit('connection', ws, req, head);
  });
})

const endpoint: string = (FDQN != null ? FDQN: `${HOSTNAME}:${PORT}`);

app.set("actor", `${PROTO}://${endpoint}/${ACCOUNT}`);

app.use(
  express.text({ type: ["application/json", "application/activity+json"] })
);

app.use(morgan("tiny"));

app.get("/.well-known/webfinger", async (req, res) => {
  const actor: string = req.app.get("actor");

  const resource = req.query.resource;
  if (resource !== `acct:${ACCOUNT}@${endpoint}`) return res.sendStatus(404);

  return res.contentType("application/activity+json").json({
    subject: `acct:${ACCOUNT}@${endpoint}`,
    links: [
      {
        rel: "self",
        type: "application/activity+json",
        href: actor,
      },
    ],
  });
});

app.use("/admin", admin).use(activitypub);
app.use("/webhook", webhook);

server.listen(PORT, () => {
  console.log(`Dumbo listening on port ${PORT}…`);
});
