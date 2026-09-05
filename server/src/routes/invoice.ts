import express, { Request } from 'express';
import multer from 'multer';
import { PrismaClient } from '@prisma/client';
import { parseInvoice } from '../utils/invoiceParser';
import { Operations } from '../operations';
import { ApiError } from '../validation';

export function createInvoiceRoutes(_prisma: PrismaClient, operations: Operations, emit: (userId: string, ...channels: string[]) => void) {
  const router = express.Router();
  const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 }, fileFilter: (_req, file, cb) => {
    if (file.mimetype !== 'application/pdf') return cb(new ApiError(400, 'Only PDF files are allowed'));
    cb(null, true);
  } });
  router.post('/import-invoice', upload.single('invoice'), async (req, res, next) => {
    let parser: { getText: () => Promise<{ text: string }>; destroy: () => Promise<void> } | undefined;
    try {
      if (!req.file) throw new ApiError(400, 'No invoice uploaded');
      const { PDFParse } = await import('pdf-parse');
      parser = new PDFParse({ data: req.file.buffer });
      const result = await parser!.getText();
      const parsed = parseInvoice(result.text || '');
      res.json({ success: true, ...parsed, totalItems: parsed.items.length, totalValue: parsed.items.reduce((sum, item) => sum + item.price * item.quantity, 0) });
    } catch (error) { next(error instanceof ApiError ? error : new ApiError(400, 'Could not read this PDF. Try a text-based invoice.')); }
    finally { await parser?.destroy().catch(() => {}); }
  });
  router.post('/bulk-add', async (req: Request & { userId?: string }, res, next) => {
    try {
      const uid = req.userId!;
      const result = await operations.mutate(uid, req.get('Idempotency-Key'), 'invoice-import', req.body, tx => operations.importItems(tx, uid, req.body));
      emit(uid, 'inventory:changed');
      res.json(result);
    } catch (error) { next(error); }
  });
  return router;
}
