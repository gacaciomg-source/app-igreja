const http = require('https');

http.get('https://ais-pre-ejrcrjdyz4gr7xmdtfczzs-125365002112.us-east5.run.app/api/health', (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => console.log('Response ais-pre:', res.statusCode, data));
}).on('error', err => console.error('Error:', err.message));

http.get('https://ais-dev-ejrcrjdyz4gr7xmdtfczzs-125365002112.us-east5.run.app/api/health', (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => console.log('Response ais-dev:', res.statusCode, data));
}).on('error', err => console.error('Error:', err.message));
