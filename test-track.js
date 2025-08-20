#!/usr/bin/env node

// Test the evolution tracking API
const http = require('http');

const data = JSON.stringify({
  projectId: "mech-evolve",
  machineId: "test-machine",
  filePath: "test-evolution.js",
  changeType: "file-create",
  improvements: [
    {type: "format", tool: "prettier"},
    {type: "lint", tool: "eslint"}
  ],
  metadata: {
    tool: "Write",
    timestamp: new Date().toISOString()
  }
});

const options = {
  hostname: 'localhost',
  port: 3011,
  path: '/api/evolution/track',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length
  }
};

const req = http.request(options, (res) => {
  let responseData = '';
  
  res.on('data', (chunk) => {
    responseData += chunk;
  });
  
  res.on('end', () => {
    console.log('Response:', JSON.parse(responseData));
  });
});

req.on('error', (error) => {
  console.error('Error:', error);
});

req.write(data);
req.end();

console.log('Sending evolution track request...');