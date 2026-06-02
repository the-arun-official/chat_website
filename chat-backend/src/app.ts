import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import path from 'path';

const app = express();


app.use(cors());
app.use(express.json());

// Serve uploaded files directly from the hard drive
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Note: helmet needs crossOriginResourcePolicy set to false if you want frontend to load these images
app.use(helmet({ crossOriginResourcePolicy: false }));

import authRoutes from './routes/auth.routes';

app.use('/api/auth', authRoutes);
import userRoutes from './routes/user.routes';
import chatRoutes from './routes/chat.routes';
import messageRoutes from './routes/message.routes';
import contactRoutes from './routes/contact.routes';
import featuresRoutes from './routes/features.routes';

app.use('/api/users', userRoutes);
app.use('/api/chats', chatRoutes);
app.use('/api/contacts', contactRoutes);
app.use('/api', featuresRoutes);
// Mount message routes on /api (handles both /api/chats/:id/messages and /api/messages/:id)
app.use('/api', messageRoutes);


export default app;
