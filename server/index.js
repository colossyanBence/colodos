// server.js
const express = require('express');
const { spawn } = require('child_process');
const WebSocket = require('ws');

const app = express();
app.use(express.json());

// Store WebSocket clients
const wss = new WebSocket.Server({ noServer: true });
let clients = [];

// Upgrade HTTP to WebSocket
const server = app.listen(8008, () => console.log('Server running on port 8008'));

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
  const { command, args } = req.body;

  if (!command) return res.status(400).send({ error: 'No command provided' });

  // Spawn process
  const proc = spawn(command, args || []);

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