import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

const prisma = new PrismaClient();
const app = express();
const server = http.createServer(app);

// Configure multer for file uploads
const uploadDir = path.join(__dirname, '..', 'uploads');
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    if (mimetype && extname) {
      return cb(null, true);
    }
    cb(new Error('Only image files are allowed'));
  }
});

const CORS_ORIGIN = process.env.CORS_ORIGIN || '*';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

const OWNER_EMAIL = 'm.yassifi@gmail.com';
const DEFAULT_OWNER_PASSWORD = 'demo1234';

// Ensure there is at least one user so the app can work without manual signup
async function ensureDefaultUser() {
  try {
    const existing = await prisma.user.findUnique({ where: { email: OWNER_EMAIL } });
    if (!existing) {
      const hashedPassword = await bcrypt.hash(DEFAULT_OWNER_PASSWORD, 10);
      await prisma.user.create({
        data: {
          email: OWNER_EMAIL,
          password: hashedPassword,
          businessName: 'Heat Wave Locksmith',
        },
      });
      console.log(`Created default owner user ${OWNER_EMAIL} (password: ${DEFAULT_OWNER_PASSWORD})`);
    }
  } catch (error) {
    console.error('Failed to ensure default user:', error);
  }
}

void ensureDefaultUser();

const io = new SocketIOServer(server, {
  cors: {
    origin: CORS_ORIGIN === '*' ? true : CORS_ORIGIN.split(',').map((s) => s.trim()),
  },
});

// In development, allow all origins. We rely on Bearer tokens, not cookies.
app.use(
  cors({
    origin: CORS_ORIGIN === '*' ? true : CORS_ORIGIN.split(',').map((s) => s.trim()),
  })
);
app.use(express.json());
// Serve static files from uploads directory
app.use('/uploads', express.static(uploadDir));

// Socket.IO connection
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// Emit helpers for realtime updates
function emitChange(channel: string) {
  io.emit(channel);
}

// Auth middleware
interface AuthRequest extends Request {
  userId?: string;
}

async function authMiddleware(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing token' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };
    req.userId = decoded.userId;
    return next();
  } catch {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

// ============ ROUTES ============

// Health check
app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    time: new Date().toISOString(),
    commit: process.env.RENDER_GIT_COMMIT || process.env.GIT_COMMIT || null,
    node: process.version,
    env: process.env.NODE_ENV || null,
  });
});

// File upload endpoint
app.post('/api/upload', authMiddleware, upload.single('image'), (req: AuthRequest, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }
  const fileUrl = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;
  res.json({ url: fileUrl });
});

// ============ AUTH ============

app.post('/auth/signup', async (req, res) => {
  try {
    const { email, password, businessName } = req.body;

    if (String(email || '').toLowerCase() !== OWNER_EMAIL) {
      return res.status(403).json({ error: 'Signup disabled' });
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return res.status(400).json({ error: 'Email already registered' });
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        businessName,
        subscription: {
          create: {
            plan: 'free_trial',
            status: 'trialing',
            trialEndsAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
          },
        },
      },
    });
    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ user: { id: user.id, email: user.email, businessName: user.businessName }, token });
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ error: 'Signup failed' });
  }
});

app.post('/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (String(email || '').toLowerCase() !== OWNER_EMAIL) {
      return res.status(403).json({ error: 'Not allowed' });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ user: { id: user.id, email: user.email, businessName: user.businessName }, token });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

app.get('/auth/me', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      include: { subscription: true },
    });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json({
      id: user.id,
      email: user.email,
      businessName: user.businessName,
      phone: user.phone,
      address: user.address,
      createdAt: user.createdAt,
      subscription: user.subscription,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

app.put('/auth/profile', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { businessName, phone, address, password } = req.body;

    let nextPassword: string | undefined;
    if (typeof password === 'string' && password.length > 0) {
      nextPassword = await bcrypt.hash(password, 10);
    }

    const user = await prisma.user.update({
      where: { id: req.userId },
      data: {
        businessName,
        phone,
        address,
        ...(nextPassword ? { password: nextPassword } : {}),
      },
    });
    res.json({ id: user.id, email: user.email, businessName: user.businessName, phone: user.phone, address: user.address });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// ============ INVENTORY ============

app.get('/api/inventory', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const items = await prisma.inventoryItem.findMany({
      where: { userId: req.userId },
      orderBy: { createdAt: 'desc' },
    });
    res.json(items);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch inventory' });
  }
});

app.post('/api/inventory', authMiddleware, async (req: AuthRequest, res) => {
  try {
    console.log('Creating inventory item with data:', req.body);
    const item = await prisma.inventoryItem.create({
      data: { ...req.body, userId: req.userId },
    });
    emitChange('inventory:changed');
    res.json(item);
  } catch (error) {
    console.error('Failed to create inventory item:', error);
    res.status(500).json({ error: 'Failed to create inventory item', details: error instanceof Error ? error.message : 'Unknown error' });
  }
});

app.put('/api/inventory/:id', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const item = await prisma.inventoryItem.update({
      where: { id: req.params.id },
      data: req.body,
    });
    emitChange('inventory:changed');
    res.json(item);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update inventory item' });
  }
});

app.delete('/api/inventory/:id', authMiddleware, async (req: AuthRequest, res) => {
  try {
    await prisma.inventoryItem.delete({ where: { id: req.params.id } });
    emitChange('inventory:changed');
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete inventory item' });
  }
});

// ============ CUSTOMERS ============

app.get('/api/customers', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const customers = await prisma.customer.findMany({
      where: { userId: req.userId },
      include: { jobs: true },
      orderBy: { createdAt: 'desc' },
    });
    res.json(customers);
  } catch (error) {
    console.error('Fetch customers error:', error);
    res.status(500).json({ error: 'Failed to fetch customers' });
  }
});

app.post('/api/customers', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const customer = await prisma.customer.create({
      data: { ...req.body, userId: req.userId },
    });
    emitChange('customers:changed');
    res.json(customer);
  } catch (error) {
    console.error('Create customer error:', error);
    res.status(500).json({ error: 'Failed to create customer' });
  }
});

app.put('/api/customers/:id', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const customer = await prisma.customer.update({
      where: { id: req.params.id },
      data: req.body,
    });
    emitChange('customers:changed');
    res.json(customer);
  } catch (error) {
    console.error('Update customer error:', error);
    res.status(500).json({ error: 'Failed to update customer' });
  }
});

app.delete('/api/customers/:id', authMiddleware, async (req: AuthRequest, res) => {
  try {
    await prisma.customer.delete({ where: { id: req.params.id } });
    emitChange('customers:changed');
    res.json({ success: true });
  } catch (error) {
    console.error('Delete customer error:', error);
    res.status(500).json({ error: 'Failed to delete customer' });
  }
});

// ============ JOBS ============

app.get('/api/jobs', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const jobs = await prisma.job.findMany({
      where: { userId: req.userId },
      include: { customer: true, inventory: { include: { inventoryItem: true } } },
      orderBy: { createdAt: 'desc' },
    });
    res.json(jobs);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch jobs' });
  }
});

app.post('/api/jobs', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { inventory, jobDate, ...jobData } = req.body;
    const job = await prisma.job.create({
      data: {
        ...jobData,
        userId: req.userId,
        jobDate: jobDate ? new Date(jobDate) : new Date(),
        inventory: inventory?.length
          ? {
              create: inventory.map((inv: { inventoryItemId: string; quantityUsed: number }) => ({
                inventoryItemId: inv.inventoryItemId,
                quantityUsed: inv.quantityUsed || 1,
              })),
            }
          : undefined,
      },
      include: { customer: true, inventory: { include: { inventoryItem: true } } },
    });
    emitChange('jobs:changed');
    res.json(job);
  } catch (error) {
    console.error('Create job error:', error);
    res.status(500).json({ error: 'Failed to create job' });
  }
});

app.put('/api/jobs/:id', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { inventory, jobDate, ...jobData } = req.body;
    // Delete existing job inventory relations
    await prisma.jobInventory.deleteMany({ where: { jobId: req.params.id } });
    // Update job and create new relations
    const job = await prisma.job.update({
      where: { id: req.params.id },
      data: {
        ...jobData,
        ...(jobDate ? { jobDate: new Date(jobDate) } : {}),
        inventory: inventory?.length
          ? {
              create: inventory.map((inv: { inventoryItemId: string; quantityUsed: number }) => ({
                inventoryItemId: inv.inventoryItemId,
                quantityUsed: inv.quantityUsed || 1,
              })),
            }
          : undefined,
      },
      include: { customer: true, inventory: { include: { inventoryItem: true } } },
    });
    emitChange('jobs:changed');
    res.json(job);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update job' });
  }
});

app.delete('/api/jobs/:id', authMiddleware, async (req: AuthRequest, res) => {
  try {
    await prisma.job.delete({ where: { id: req.params.id } });
    emitChange('jobs:changed');
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete job' });
  }
});

// ============ SUBSCRIPTION ============

app.get('/api/subscription', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const subscription = await prisma.subscription.findUnique({
      where: { userId: req.userId },
    });
    res.json(subscription);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch subscription' });
  }
});

const clientDistPath = path.join(__dirname, '..', '..', 'dist');

if (fs.existsSync(clientDistPath)) {
  app.use(express.static(clientDistPath));

  app.get(/.*/, (req, res, next) => {
    if (
      req.path.startsWith('/api') ||
      req.path.startsWith('/auth') ||
      req.path.startsWith('/uploads') ||
      req.path === '/health'
    ) {
      return next();
    }

    return res.sendFile(path.join(clientDistPath, 'index.html'));
  });
}

// ============ START SERVER ============

const PORT = process.env.PORT || 4000;

server.listen(PORT, () => {
  console.log(`API server running on http://localhost:${PORT}`);
});
