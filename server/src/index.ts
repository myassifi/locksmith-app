import { randomUUID } from 'crypto';
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
import { Operations } from './operations';
import { ApiError, object, text, fields } from './validation';
import { createInvoiceRoutes } from './routes/invoice';

const prisma = new PrismaClient();
const operations = new Operations(prisma);
const app = express();
const server = http.createServer(app);
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET || Buffer.byteLength(JWT_SECRET) < 32 || JWT_SECRET === 'your-secret-key-change-in-production') {
  throw new Error('Set JWT_SECRET to a unique random secret of at least 32 bytes before starting the server.');
}
const secret: string = JWT_SECRET;
const origins = process.env.CORS_ORIGIN?.split(',').map(value => value.trim()).filter(Boolean);
app.set('trust proxy', 1);
app.use(cors({ origin: origins?.length ? origins : false }));
app.use(express.json({ limit: '1mb' }));
const io = new SocketIOServer(server, { cors: { origin: origins?.length ? origins : false } });
const emitChange = (userId: string, ...channels: string[]) => channels.forEach(channel => io.to(`user:${userId}`).emit(channel));
interface AuthRequest extends Request { userId?: string }
const asyncRoute = (fn: (req: AuthRequest, res: Response) => Promise<unknown>) => (req: AuthRequest, res: Response, next: NextFunction) => { Promise.resolve(fn(req, res)).catch(next); };
async function verifyToken(token: string) {
  let decoded: jwt.JwtPayload;
  try {
    const value = jwt.verify(token, secret, { algorithms: ['HS256'] });
    if (typeof value === 'string' || typeof value.userId !== 'string') throw new Error();
    decoded = value;
  } catch { throw new ApiError(401, 'Your session expired. Please sign in again.'); }
  const user = await prisma.user.findUnique({ where: { id: decoded.userId } });
  if (!user || (decoded.authVersion ?? 0) !== user.authVersion) throw new ApiError(401, 'Your session expired. Please sign in again.');
  return { user, expiresAt: decoded.exp };
}
function authMiddleware(req: AuthRequest, res: Response, next: NextFunction) {
  const token = req.headers.authorization?.match(/^Bearer (.+)$/)?.[1];
  if (!token) return next(new ApiError(401, 'Please sign in'));
  verifyToken(token).then(({ user }) => { req.userId = user.id; next(); }).catch(next);
}
io.use((socket, next) => {
  verifyToken(String(socket.handshake.auth.token || '')).then(({ user, expiresAt }) => {
    socket.data.userId = user.id;
    socket.data.expiresAt = expiresAt;
    next();
  }).catch(() => next(new Error('Unauthorized')));
});
io.on('connection', socket => {
  socket.join(`user:${socket.data.userId}`);
  const remaining = Math.max(0, (socket.data.expiresAt || 0) * 1000 - Date.now());
  const timer = setTimeout(() => socket.disconnect(true), remaining);
  socket.on('disconnect', () => clearTimeout(timer));
});
const publicUser = (user: { id: string; email: string; businessName: string | null; phone: string | null; address: string | null; createdAt: Date }) => ({ id: user.id, email: user.email, businessName: user.businessName, phone: user.phone, address: user.address, createdAt: user.createdAt });

app.get('/health', (_req, res) => res.json({ status: 'ok' }));
// Account creation is an explicit administrative step, never a public bootstrap.
app.post('/auth/signup', (_req, res) => res.status(403).json({ error: 'Contact the administrator to create an account' }));
const attempts = new Map<string, { count: number; until: number }>();
const cleanup = setInterval(() => { for (const [key, item] of attempts) if (item.until < Date.now()) attempts.delete(key); }, 60000);
cleanup.unref();
app.post('/auth/login', asyncRoute(async (req, res) => {
  const ip = req.ip || 'unknown';
  const record = attempts.get(ip);
  if (record && record.until > Date.now() && record.count >= 10) throw new ApiError(429, 'Too many sign-in attempts. Try again in 15 minutes.');
  attempts.set(ip, record && record.until > Date.now() ? { ...record, count: record.count + 1 } : { count: 1, until: Date.now() + 15 * 60000 });
  const body = object(req.body);
  const email = text(body.email, 'Email', true)!.toLowerCase();
  const password = body.password;
  if (typeof password !== 'string' || Buffer.byteLength(password) > 72) throw new ApiError(400, 'Invalid password');
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !await bcrypt.compare(password, user.password)) throw new ApiError(401, 'Invalid credentials');
  attempts.delete(ip);
  const token = jwt.sign({ userId: user.id, authVersion: user.authVersion }, secret, { expiresIn: '7d', algorithm: 'HS256' });
  res.json({ user: publicUser(user), token });
}));
app.get('/auth/me', authMiddleware, asyncRoute(async (req, res) => {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: req.userId } });
  res.json(publicUser(user));
}));
app.put('/auth/profile', authMiddleware, asyncRoute(async (req, res) => {
  const body = object(req.body);
  fields(body, ['businessName', 'phone', 'address', 'password']);
  const data: { businessName?: string | null; phone?: string | null; address?: string | null; password?: string } = {};
  for (const key of ['businessName', 'phone', 'address'] as const) if (body[key] !== undefined) data[key] = text(body[key], key);
  if (body.password) {
    if (typeof body.password !== 'string' || body.password.length < 12 || Buffer.byteLength(body.password) > 72) throw new ApiError(400, 'Use a password of at least 12 characters and at most 72 bytes');
    data.password = await bcrypt.hash(body.password, 12);
  }
  const user = await prisma.user.update({ where: { id: req.userId }, data: { ...data, ...(data.password ? { authVersion: { increment: 1 } } : {}) } });
  if (data.password) io.in(`user:${user.id}`).disconnectSockets(true);
  const token = jwt.sign({ userId: user.id, authVersion: user.authVersion }, secret, { expiresIn: '7d', algorithm: 'HS256' });
  res.json({ ...publicUser(user), token });
}));

const uploadDir = process.env.UPLOAD_DIR || path.resolve(__dirname, '../../uploads');
fs.mkdirSync(uploadDir, { recursive: true });
const upload = multer({ storage: multer.diskStorage({
  destination: uploadDir,
  filename: (_req, file, cb) => cb(null, `${randomUUID()}${path.extname(file.originalname).toLowerCase()}`),
}), limits: { fileSize: 5 * 1024 * 1024 }, fileFilter: (_req, file, cb) => {
  if (!/^image\/(jpeg|png|gif|webp)$/.test(file.mimetype) || !/\.(jpe?g|png|gif|webp)$/i.test(file.originalname)) return cb(new ApiError(400, 'Only image files are allowed'));
  cb(null, true);
} });
// Historical invoice PDFs must not be served as public uploads.
app.use('/uploads/invoices', (_req, res) => { res.sendStatus(404); });
app.use('/uploads', (req, res, next) => {
  if (!/\.(jpe?g|png|gif|webp)$/i.test(req.path)) return res.sendStatus(404);
  next();
});
app.use('/uploads', express.static(uploadDir, { maxAge: '1d', setHeaders: res => res.setHeader('X-Content-Type-Options', 'nosniff') }));
app.post('/api/upload', authMiddleware, upload.single('image'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No image uploaded' });
  res.json({ url: `/uploads/${req.file.filename}` });
});
app.use('/api/invoice', authMiddleware, createInvoiceRoutes(prisma, operations, emitChange));

app.get('/api/inventory', authMiddleware, asyncRoute(async (req, res) => res.json(await prisma.inventoryItem.findMany({ where: { userId: req.userId }, orderBy: { createdAt: 'desc' } }))));
app.get('/api/customers', authMiddleware, asyncRoute(async (req, res) => res.json(await prisma.customer.findMany({ where: { userId: req.userId }, include: { jobs: true }, orderBy: { createdAt: 'desc' } }))));
app.get('/api/jobs', authMiddleware, asyncRoute(async (req, res) => res.json(await prisma.job.findMany({ where: { userId: req.userId }, include: { customer: true, inventory: { include: { inventoryItem: true } } }, orderBy: { createdAt: 'desc' } }))));
app.get('/api/subscription', authMiddleware, asyncRoute(async (req, res) => res.json(await prisma.subscription.findUnique({ where: { userId: req.userId } }))));

const mutation = (fn: (tx: Parameters<Parameters<Operations['mutate']>[4]>[0], userId: string, req: AuthRequest) => Promise<unknown>, channels: string[]) => asyncRoute(async (req, res) => {
  const userId = req.userId!;
  const result = await operations.mutate(userId, req.get('Idempotency-Key'), `${req.method} ${req.path}`, req.body ?? {}, tx => fn(tx, userId, req));
  emitChange(userId, ...channels);
  res.json(result);
});
app.post('/api/inventory/bulk', authMiddleware, mutation((tx, uid, req) => operations.bulkInventory(tx, uid, req.body), ['inventory:changed']));
app.post('/api/inventory', authMiddleware, mutation((tx, uid, req) => operations.saveInventory(tx, uid, req.body), ['inventory:changed']));
app.put('/api/inventory/:id', authMiddleware, mutation((tx, uid, req) => operations.saveInventory(tx, uid, req.body, String(req.params.id)), ['inventory:changed']));
app.delete('/api/inventory/:id', authMiddleware, mutation(async (tx, uid, req) => {
  const id = String(req.params.id);
  const item = await tx.inventoryItem.findFirst({ where: { id, userId: uid } });
  if (!item) throw new ApiError(404, 'Item not found');
  if (await tx.jobInventory.count({ where: { inventoryItemId: id } })) throw new ApiError(409, 'This item is used by a job. Keep it with a zero count to preserve job history.');
  await tx.inventoryItem.delete({ where: { id, userId: uid } });
  return { success: true };
}, ['inventory:changed']));
app.post('/api/customers', authMiddleware, mutation((tx, uid, req) => operations.saveCustomer(tx, uid, req.body), ['customers:changed']));
app.put('/api/customers/:id', authMiddleware, mutation((tx, uid, req) => operations.saveCustomer(tx, uid, req.body, String(req.params.id)), ['customers:changed']));
app.delete('/api/customers/:id', authMiddleware, mutation(async (tx, uid, req) => { await tx.customer.delete({ where: { id: String(req.params.id), userId: uid } }); return { success: true }; }, ['customers:changed', 'jobs:changed']));
app.post('/api/jobs', authMiddleware, mutation((tx, uid, req) => operations.saveJob(tx, uid, req.body), ['jobs:changed', 'inventory:changed', 'customers:changed']));
app.put('/api/jobs/:id', authMiddleware, mutation((tx, uid, req) => operations.saveJob(tx, uid, req.body, String(req.params.id)), ['jobs:changed', 'inventory:changed', 'customers:changed']));
app.delete('/api/jobs/:id', authMiddleware, mutation((tx, uid, req) => operations.deleteJob(tx, uid, String(req.params.id)), ['jobs:changed', 'inventory:changed', 'customers:changed']));

const clientDist = path.resolve(__dirname, '../../dist');
if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.get(/.*/, (req, res, next) => /^\/(api|auth|uploads)(\/|$)/.test(req.path) ? next() : res.sendFile(path.join(clientDist, 'index.html')));
}
app.use((error: unknown, _req: Request, res: Response, _next: NextFunction) => {
  if (error instanceof ApiError) return res.status(error.status).json({ error: error.message });
  const code = (error as { code?: string }).code;
  if (code === 'P2025') return res.status(404).json({ error: 'Record not found or changed. Refresh and try again.' });
  if (['P2034', 'P2002', 'P1008', 'P2028'].includes(code || '')) return res.status(409).json({ error: 'Another update is in progress. Please retry.' });
  if (error instanceof multer.MulterError || error instanceof SyntaxError) return res.status(400).json({ error: 'Invalid upload or request body' });
  console.error('Request failed:', error instanceof Error ? error.name : 'Unknown error');
  res.status(500).json({ error: 'Unable to save changes. Please retry.' });
});
const PORT = Number(process.env.PORT || 4000);
server.listen(PORT, process.env.HOST || '0.0.0.0', () => console.log(`API listening on port ${PORT}`));
async function shutdown() { clearInterval(cleanup); io.close(); server.close(); await prisma.$disconnect(); }
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
