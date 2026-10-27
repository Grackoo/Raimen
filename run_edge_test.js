const http = require('http');
const { exec } = require('child_process');

const server = http.createServer((req, res) => {
  if (req.method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      console.log('RECEIVED RESULT:', body);
      res.writeHead(200, { 'Content-Type': 'text/plain', 'Access-Control-Allow-Origin': '*' });
      res.end('OK');
      setTimeout(() => process.exit(0), 500);
    });
  } else {
    res.writeHead(200, { 'Access-Control-Allow-Origin': '*' });
    res.end('OK');
  }
});

server.listen(3333, () => {
  console.log('Server listening on 3333');
  const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
  exec(`"${edgePath}" --headless --disable-gpu "file:///c:/Users/GRACKO/OneDrive/PROYECTOS/A1  RAIMEN/POS Y ERP/Raimen/test_h2c.html"`);
});
