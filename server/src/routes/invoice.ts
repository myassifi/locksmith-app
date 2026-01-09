import express, { Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { PrismaClient } from '@prisma/client';
import { parseInvoice, mapToInventoryItem } from '../utils/invoiceParser';
import type { ParsedInventoryItem } from '../utils/invoiceParser';

// pdf-parse v2 exports a PDFParse class; instantiate it and call getText().
// eslint-disable-next-line @typescript-eslint/no-var-requires
const pdfParseModule = require('pdf-parse');
const PDFParse = pdfParseModule?.PDFParse;

const router = express.Router();
const prisma = new PrismaClient();

// Configure multer for invoice PDF uploads
const isProduction = process.env.NODE_ENV === 'production';
const rootDir = isProduction ? path.join(__dirname, '../../..') : path.join(__dirname, '../..');
const invoiceUploadDir = path.join(rootDir, 'uploads/invoices');

// Ensure the invoices directory exists
if (!fs.existsSync(invoiceUploadDir)) {
  fs.mkdirSync(invoiceUploadDir, { recursive: true });
  console.log(`Created invoice upload directory at ${invoiceUploadDir}`);
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, invoiceUploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files allowed') as any, false);
    }
  }
});

// Auth request interface (matches the one in index.ts)
interface AuthRequest extends Request {
  userId?: string;
}

// POST route for invoice upload and parsing
router.post('/import-invoice', upload.single('invoice'), async (req: AuthRequest, res: Response) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const pdfPath = req.file.path;
    const dataBuffer = fs.readFileSync(pdfPath);
    
    // Parse PDF with enhanced error handling
    console.log(`Attempting to parse PDF from path: ${pdfPath}`);
    console.log(`PDF file size: ${dataBuffer.length} bytes`);
    
    let supplier: string = 'unknown';
    let items: ParsedInventoryItem[] = [];
    
    try {
      if (!PDFParse) {
        throw new Error('PDFParse class not available from pdf-parse');
      }

      const parser = new PDFParse({ data: dataBuffer });
      const pdfData = await parser.getText();
      await parser.destroy();

      const text = pdfData?.text || '';
      console.log(`PDF parsed successfully, extracted ${text.length} characters`);
      
      // Debug: Log first 500 chars of extracted text
      console.log(`PDF text preview: ${text.substring(0, 500)}...`);
      
      // Parse invoice based on supplier
      const result = parseInvoice(text);
      supplier = result.supplier;
      items = result.items;
      
      console.log(`Detected supplier: ${supplier}, found ${items.length} items`);
    } catch (parseError: any) {
      console.error('PDF parsing internal error:', parseError);
      throw new Error(`PDF parsing failed: ${parseError.message || 'Unknown error'}`);
    }
    
    // Clean up uploaded file (optional - comment out if you want to keep PDFs)
    // fs.unlinkSync(pdfPath);
    
    res.json({
      success: true,
      supplier: supplier,
      items: items,
      totalItems: items.length,
      totalValue: items.reduce((sum: number, item: ParsedInventoryItem) => sum + item.price * item.quantity, 0),
    });
    
  } catch (error) {
    console.error('Invoice parsing error:', error);
    
    // More detailed error response
    let errorMessage = 'Failed to parse invoice';
    let errorDetails = error instanceof Error ? error.message : 'Unknown error';
    
    if (error instanceof Error && error.message.includes('Failed to load PDF file')) {
      errorMessage = 'Invalid or corrupted PDF file';
    } else if (error instanceof Error && error.message.includes('PDF parsing failed')) {
      errorMessage = 'Could not extract text from PDF';
    }
    
    res.status(500).json({ 
      error: errorMessage, 
      details: errorDetails
    });
  }
});

// POST route for bulk adding items from invoice
router.post('/bulk-add', async (req: AuthRequest, res: Response) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { items } = req.body;
    
    if (!items || items.length === 0) {
      return res.status(400).json({ error: 'No items provided' });
    }
    
    // Process each item
    const results = [];
    const invoiceNumber = `INV-${Date.now()}`;
    
    for (const item of items) {
      // Check if item already exists
      const existing = await prisma.inventoryItem.findFirst({
        where: { 
          userId: req.userId,
          sku: item.sku
        }
      });
      
      if (existing) {
        // Update quantity
        await prisma.inventoryItem.update({
          where: { id: existing.id },
          data: {
            quantity: existing.quantity + item.quantity,
            updatedAt: new Date()
          }
        });
        results.push({ 
          sku: item.sku, 
          action: 'updated', 
          quantity: item.quantity,
          newTotal: existing.quantity + item.quantity
        });
      } else {
        // Insert new item
        const inventoryItem = mapToInventoryItem(item, req.userId);
        
        await prisma.inventoryItem.create({
          data: inventoryItem as any
        });
        results.push({ 
          sku: item.sku, 
          action: 'added', 
          quantity: item.quantity 
        });
      }
    }
    
    // Emit inventory changed event
    // This would need access to the emitChange function from index.ts
    // For now, we'll rely on the client refreshing

    res.json({
      success: true,
      message: `${items.length} items processed`,
      results: results
    });
    
  } catch (error) {
    console.error('Bulk add error:', error);
    res.status(500).json({ 
      error: 'Failed to add items to inventory',
      details: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
});

export default router;
