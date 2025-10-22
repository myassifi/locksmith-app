import { format } from 'date-fns';

interface ReceiptData {
  jobId: string;
  customerName: string;
  customerPhone?: string;
  customerEmail?: string;
  customerAddress?: string;
  jobType: string;
  vehicleDetails?: string;
  jobDate: string;
  price: number;
  materialCost?: number;
  notes?: string;
}

export const generateReceiptText = (data: ReceiptData): string => {
  const receiptDate = format(new Date(), 'MMM dd, yyyy hh:mm a');
  const jobDate = format(new Date(data.jobDate), 'MMM dd, yyyy');
  
  const laborCost = data.materialCost ? data.price - data.materialCost : data.price;
  
  let receipt = `
╔══════════════════════════════════════╗
║     HEAT WAVE LOCKSMITH SERVICE      ║
║          OFFICIAL RECEIPT            ║
╚══════════════════════════════════════╝

Receipt Date: ${receiptDate}
Receipt #: ${data.jobId.substring(0, 8).toUpperCase()}

──────────────────────────────────────
CUSTOMER INFORMATION
──────────────────────────────────────

Name: ${data.customerName}
`;

  if (data.customerPhone) receipt += `Phone: ${data.customerPhone}\n`;
  if (data.customerEmail) receipt += `Email: ${data.customerEmail}\n`;
  if (data.customerAddress) receipt += `Address: ${data.customerAddress}\n`;

  receipt += `
──────────────────────────────────────
SERVICE DETAILS
──────────────────────────────────────

Service Date: ${jobDate}
Service Type: ${data.jobType}
`;

  if (data.vehicleDetails) receipt += `Vehicle/Lock: ${data.vehicleDetails}\n`;
  if (data.notes) receipt += `Notes: ${data.notes}\n`;

  receipt += `
──────────────────────────────────────
CHARGES
──────────────────────────────────────

`;

  if (data.materialCost && data.materialCost > 0) {
    receipt += `Labor Cost:          $${laborCost.toFixed(2)}\n`;
    receipt += `Materials:           $${data.materialCost.toFixed(2)}\n`;
    receipt += `                     ─────────────\n`;
  }

  receipt += `TOTAL PAID:          $${data.price.toFixed(2)}\n`;

  receipt += `
──────────────────────────────────────
PAYMENT INFORMATION
──────────────────────────────────────

Payment Status: ✓ PAID IN FULL
Payment Date: ${receiptDate}

──────────────────────────────────────

Thank you for choosing Heat Wave Locksmith!
For service inquiries, please contact us.

This is an official receipt for your records.

──────────────────────────────────────
`;

  return receipt;
};

export const generateReceiptSMS = (data: ReceiptData): string => {
  const receiptDate = format(new Date(), 'MMM dd, yyyy');
  
  return `HEAT WAVE LOCKSMITH - RECEIPT

${data.customerName}
Service: ${data.jobType}
Date: ${receiptDate}
Amount: $${data.price.toFixed(2)}

✓ PAID IN FULL

Receipt #${data.jobId.substring(0, 8).toUpperCase()}

Thank you for your business!`;
};
