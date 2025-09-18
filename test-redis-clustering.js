const io = require('socket.io-client');

// Test Redis clustering with multiple connections
async function testRedisClustering() {
  console.log('🧪 Testing Redis clustering...');

  // Connect to different instances
  const socket1 = io('http://localhost:3002', {
    auth: { token: 'test-token-1' }
  });

  const socket2 = io('http://localhost:3005', {
    auth: { token: 'test-token-2' }
  });

  const roomId = 'test-room-' + Date.now();

  // Setup listeners
  socket1.on('new_message', (msg) => {
    console.log('✅ Socket1 received:', msg.content);
  });

  socket2.on('new_message', (msg) => {
    console.log('✅ Socket2 received:', msg.content);
  });

  // Wait for connections
  await new Promise(resolve => {
    let connected = 0;
    socket1.on('connected', () => {
      connected++;
      if (connected === 2) resolve();
    });
    socket2.on('connected', () => {
      connected++;
      if (connected === 2) resolve();
    });
  });

  // Join same room
  socket1.emit('join_room', { roomId });
  socket2.emit('join_room', { roomId });

  await new Promise(resolve => setTimeout(resolve, 1000));

  // Test cross-instance messaging
  console.log('📤 Sending from Socket1...');
  socket1.emit('send_message', {
    roomId,
    content: 'Message from instance 1'
  });

  await new Promise(resolve => setTimeout(resolve, 1000));

  console.log('📤 Sending from Socket2...');
  socket2.emit('send_message', {
    roomId,
    content: 'Message from instance 2'
  });

  await new Promise(resolve => setTimeout(resolve, 2000));

  socket1.disconnect();
  socket2.disconnect();
  console.log('🏁 Test completed');
}

testRedisClustering().catch(console.error);
