#!/usr/bin/env node

// Test cross-machine sync
const http = require('http');

// First, push improvements from machine 1
function pushImprovements() {
  const data = JSON.stringify({
    machineId: "machine-1",
    projectId: "mech-evolve",
    improvements: [
      {
        type: "formatting",
        filePath: "src/index.js",
        description: "Applied prettier formatting",
        timestamp: new Date().toISOString()
      },
      {
        type: "linting",
        filePath: "src/utils.js",
        description: "Fixed ESLint warnings",
        timestamp: new Date().toISOString()
      }
    ]
  });

  const options = {
    hostname: 'localhost',
    port: 3011,
    path: '/api/sync/push',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': data.length
    }
  };

  const req = http.request(options, (res) => {
    let responseData = '';
    res.on('data', (chunk) => { responseData += chunk; });
    res.on('end', () => {
      console.log('Push Response:', JSON.parse(responseData));
      
      // After push, try to pull from machine 2
      setTimeout(() => pullImprovements(), 1000);
    });
  });

  req.write(data);
  req.end();
}

// Then pull improvements to machine 2
function pullImprovements() {
  const options = {
    hostname: 'localhost',
    port: 3011,
    path: '/api/sync/pull/machine-2',
    method: 'GET'
  };

  http.get(options, (res) => {
    let responseData = '';
    res.on('data', (chunk) => { responseData += chunk; });
    res.on('end', () => {
      const result = JSON.parse(responseData);
      console.log('\nPull Response:', result);
      
      if (result.improvements && result.improvements.length > 0) {
        console.log('\n✅ Cross-machine sync working!');
        console.log('Machine 2 received improvements from Machine 1:');
        result.improvements.forEach(imp => {
          console.log(`  - ${imp.improvements?.[0]?.type}: ${imp.improvements?.[0]?.description}`);
        });
      } else {
        console.log('No improvements to sync (may need to register machines first)');
      }
    });
  });
}

console.log('Testing cross-machine sync...\n');
console.log('1. Pushing improvements from Machine 1...');
pushImprovements();