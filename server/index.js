// server.js
const express = require('express');
const { spawn } = require('child_process');
const WebSocket = require('ws');

const app = express();
app.use(express.json());
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// Store WebSocket clients
const wss = new WebSocket.Server({ noServer: true });
let clients = [];

// Upgrade HTTP to WebSocket
const server = app.listen(8008, () => console.log('Terminal proxy server running on port 8008'));

server.on('upgrade', (request, socket, head) => {
  wss.handleUpgrade(request, socket, head, (ws) => {
    wss.emit('connection', ws, request);
  });
});

// Handle WebSocket connections
wss.on('connection', (ws) => {
  clients.push(ws);
  ws.on('close', () => {
    clients = clients.filter(c => c !== ws);
  });
});

app.get('/heartbeat', (req, res) => {
  res.send({ status: 'ok', uptime: process.uptime() });
});

// API endpoint to execute command
app.post('/run', (req, res) => {
  const { command } = req.body;

  if (!command) return res.status(400).send({ error: 'No command provided' });

  let proc;
  try {
    proc = spawn(command, [], { shell: true });
  } catch (err) {
    return res.status(500).send({ error: err.message });
  }

  proc.on('error', (err) => {
    clients.forEach(ws => ws.send(JSON.stringify({ type: 'stderr', data: err.message })));
    clients.forEach(ws => ws.send(JSON.stringify({ type: 'close', code: 1 })));
  });

  proc.stdout.on('data', (data) => {
    clients.forEach(ws => ws.send(JSON.stringify({ type: 'stdout', data: data.toString() })));
  });

  proc.stderr.on('data', (data) => {
    clients.forEach(ws => ws.send(JSON.stringify({ type: 'stderr', data: data.toString() })));
  });

  proc.on('close', (code) => {
    clients.forEach(ws => ws.send(JSON.stringify({ type: 'close', code })));
  });

  res.send({ status: 'Command started' });
});