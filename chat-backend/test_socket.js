const { io } = require('socket.io-client');
const http = require('http');

// Helper to make API requests for registration/login
const request = (method, path, body = null) => {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : '';
    const headers = { 'Content-Type': 'application/json' };
    if (data) headers['Content-Length'] = data.length;

    const req = http.request({ hostname: 'localhost', port: 3000, path, method, headers }, (res) => {
      let resBody = '';
      res.on('data', chunk => resBody += chunk);
      res.on('end', () => resolve(JSON.parse(resBody || '{}')));
    });
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
};

async function testSockets() {
  console.log('--- STARTING SOCKET.IO & REDIS PUB/SUB TEST ---\n');
  const suffix = Math.floor(Math.random() * 10000);
  
  // 1. Create two users
  console.log('1. Registering User A (Alice) and User B (Bob)...');
  const aliceCreds = { email: `alice_sock${suffix}@test.com`, username: `alice_sock${suffix}`, password: 'password123' };
  const bobCreds = { email: `bob_sock${suffix}@test.com`, username: `bob_sock${suffix}`, password: 'password123' };
  
  await request('POST', '/api/auth/register', { ...aliceCreds, fullName: 'Alice' });
  await request('POST', '/api/auth/register', { ...bobCreds, fullName: 'Bob' });

  // 2. Login to get tokens
  const loginA = await request('POST', '/api/auth/login', aliceCreds);
  const loginB = await request('POST', '/api/auth/login', bobCreds);
  
  const tokenA = loginA.accessToken;
  const tokenB = loginB.accessToken;
  const idB = loginB.user.id;

  console.log('✅ Users registered and logged in.\n');

  // 3. Connect Alice's Socket
  console.log('2. Connecting Alice to WebSocket Server...');
  const socketA = io('http://localhost:3000', {
    auth: { token: tokenA },
    transports: ['websocket']
  });

  socketA.on('connect', () => {
    console.log(`✅ Alice connected to Socket.IO! (Socket ID: ${socketA.id})`);
    
    // 4. Setup listener on Alice's socket to listen for Bob's online status
    socketA.on('user_status_changed', (data) => {
      if (data.userId === idB && data.status === 'ONLINE') {
        console.log(`\n🎉 SUCCESS! Alice's socket received broadcast: Bob (User ${data.userId}) went ONLINE!`);
        console.log('✅ This proves Redis Pub/Sub and Socket.IO are working perfectly together!');
        
        // Clean up and exit
        socketA.disconnect();
        process.exit(0);
      }
    });

    // 5. Connect Bob slightly after Alice connects
    console.log('\n3. Connecting Bob to WebSocket Server (This should trigger a broadcast)...');
    setTimeout(() => {
      const socketB = io('http://localhost:3000', {
        auth: { token: tokenB },
        transports: ['websocket']
      });
      
      socketB.on('connect', () => {
        console.log(`✅ Bob connected to Socket.IO! (Socket ID: ${socketB.id})`);
      });
    }, 1000);
  });

  socketA.on('connect_error', (err) => {
    console.error('❌ Socket Connection Error:', err.message);
    process.exit(1);
  });
}

testSockets();
