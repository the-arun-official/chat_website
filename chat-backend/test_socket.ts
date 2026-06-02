import jwt from 'jsonwebtoken';
import { io } from 'socket.io-client';
import axios from 'axios';
import { prisma } from './src/config/prisma';
import dotenv from 'dotenv';
dotenv.config();

const SECRET = process.env.JWT_ACCESS_SECRET || 'your_jwt_access_secret_here';

async function runTest() {
  // 1. Find ANY chat in the database that has at least 2 participants
  const chat = await prisma.chat.findFirst({
    where: { participants: { some: {} } },
    include: { participants: { include: { user: true } } }
  });

  if (!chat || chat.participants.length < 2) {
    console.log('❌ Test aborted: No chat found with at least 2 participants.');
    process.exit(1);
  }

  const userA = chat.participants[0].user;
  const userB = chat.participants[1].user;

  // 2. Generate authentic JWT Tokens for them
  const tokenA = jwt.sign({ userId: userA.id, email: userA.email }, SECRET, { expiresIn: '15m' });
  const tokenB = jwt.sign({ userId: userB.id, email: userB.email }, SECRET, { expiresIn: '15m' });

  if (!chat) {
    console.log('❌ Test aborted: No chat found for User A. Please create one.');
    process.exit(1);
  }

  console.log(`\n--- STARTING SOCKET TEST ---`);
  console.log(`User A (${userA.username}) & User B (${userB.username})`);
  console.log(`Chat ID: ${chat.id}\n`);

  // 4. Connect User B to Socket.IO
  const socketB = io('http://localhost:3000', {
    extraHeaders: { Authorization: `Bearer ${tokenB}` }
  });

  socketB.on('connect', () => {
    console.log('🔌 Socket B Connected! Joining room...');
    socketB.emit('join_chat', chat.id);
  });

  // 5. Listen for the new_message event!
  socketB.on('new_message', (msg) => {
    console.log('\n🎉 SUCCESS! Socket B received the new_message event in real-time!');
    console.log('Event Payload:', JSON.stringify(msg, null, 2));
    process.exit(0);
  });

  // 6. Have User A send a message via standard HTTP REST API
  setTimeout(async () => {
    console.log('✉️ User A sending REST API message...');
    try {
      await axios.post(`http://localhost:3000/api/chats/${chat.id}/messages`, {
        content: 'Automated Socket.IO Test Message!'
      }, {
        headers: { Authorization: `Bearer ${tokenA}` }
      });
    } catch (e: any) {
      console.error('❌ HTTP Request Failed:', e.response?.data || e.message);
      process.exit(1);
    }
  }, 2000);
  
  setTimeout(() => {
    console.log('❌ Timeout: Did not receive socket event within 5 seconds.');
    process.exit(1);
  }, 5000);
}

runTest();
