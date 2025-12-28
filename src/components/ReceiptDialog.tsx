import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Printer, Mail, MessageSquare, Copy, Share2 } from 'lucide-react';
import { formatCurrency } from '@/lib/format';
import { format } from 'date-fns';

interface Job {
  id: string;
  customer?: {
    name: string;
    phone?: string;
    email?: string;
    address?: string;
  };
  customers?: {
    name: string;
    phone?: string;
    email?: string;
    address?: string;
  };
  serviceType?: string;
  job_type?: string;
  description?: string;
  notes?: string;
  price: number;
  materialCost?: number;
  material_cost?: number;
  status?: string;
  createdAt?: string;
  created_at?: string;
  completedAt?: string;
  completed_at?: string;
}

interface ReceiptDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  jobData: Job;
}

export function ReceiptDialog({ open, onOpenChange, jobData }: ReceiptDialogProps) {
  const customer = jobData.customer || jobData.customers || { name: 'Customer' };
  const serviceType = jobData.serviceType || jobData.job_type || 'Service';
  const createdAt = jobData.createdAt || jobData.created_at || new Date().toISOString();
  const completedAt = jobData.completedAt || jobData.completed_at;
  const materialCost = jobData.materialCost ?? jobData.material_cost;
  const description = jobData.description || jobData.notes;

  const getReceiptText = () => {
    const lines: string[] = [];
    lines.push('Heat Wave Locksmith');
    lines.push('Receipt');
    lines.push('');
    lines.push(`Job ID: #${jobData.id.slice(0, 8)}`);
    lines.push(`Date: ${format(new Date(createdAt), 'MMM dd, yyyy')}`);
    if (completedAt) {
      lines.push(`Completed: ${format(new Date(completedAt), 'MMM dd, yyyy')}`);
    }
    lines.push('');
    lines.push(`Customer: ${customer.name}`);
    if (customer.phone) lines.push(`Phone: ${customer.phone}`);
    if (customer.email) lines.push(`Email: ${customer.email}`);
    if (customer.address) lines.push(`Address: ${customer.address}`);
    lines.push('');
    lines.push(`Service: ${serviceType}`);
    if (description) lines.push(`Description: ${description}`);
    if (materialCost && materialCost > 0) {
      lines.push(`Materials: ${formatCurrency(materialCost)}`);
    }
    lines.push(`Total: ${formatCurrency(jobData.price)}`);
    lines.push('');
    lines.push('Thank you for your business!');
    return lines.join('\n');
  };

  const normalizePhone = (phone: string) => phone.replace(/[^\d+]/g, '');

  const handlePrint = () => {
    window.print();
  };

  const handleEmail = () => {
    if (!customer.email) return;
    const subject = `Receipt for ${serviceType} - Heat Wave Locksmith`;
    const body = getReceiptText();
    window.location.href = `mailto:${customer.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };

  const handleSMS = () => {
    if (!customer.phone) return;
    const body = getReceiptText();
    const normalized = normalizePhone(customer.phone);
    const isIOS = /iPhone|iPad|iPod/.test(navigator.userAgent);
    window.location.href = `sms:${normalized}${isIOS ? '&' : '?'}body=${encodeURIComponent(body)}`;
  };

  const handleCopy = async () => {
    const text = getReceiptText();

    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return;
    }

    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.setAttribute('readonly', '');
    textarea.style.position = 'fixed';
    textarea.style.left = '-9999px';
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
  };

  const canShare = typeof navigator !== 'undefined' && typeof navigator.share === 'function';
  const handleShare = async () => {
    if (!canShare) return;
    await navigator.share({
      title: 'Receipt',
      text: getReceiptText(),
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Receipt</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6 p-6 bg-white text-black print:p-0">
          <div className="text-center border-b pb-4">
            <h2 className="text-2xl font-bold">Heat Wave Locksmith</h2>
            <p className="text-sm text-gray-600">Professional Locksmith Services</p>
          </div>

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <h3 className="font-semibold mb-2">Bill To:</h3>
              <p>{customer.name}</p>
              {customer.phone && <p>{customer.phone}</p>}
              {customer.email && <p>{customer.email}</p>}
              {customer.address && <p className="text-gray-600">{customer.address}</p>}
            </div>
            <div className="text-right">
              <h3 className="font-semibold mb-2">Receipt Details:</h3>
              <p>Job ID: #{jobData.id.slice(0, 8)}</p>
              <p>Date: {format(new Date(createdAt), 'MMM dd, yyyy')}</p>
              {completedAt && (
                <p>Completed: {format(new Date(completedAt), 'MMM dd, yyyy')}</p>
              )}
            </div>
          </div>

          <div className="border-t border-b py-4">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2">Service</th>
                  <th className="text-left py-2">Description</th>
                  <th className="text-right py-2">Amount</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="py-2">{serviceType}</td>
                  <td className="py-2 text-gray-600">{description || '-'}</td>
                  <td className="text-right py-2">{formatCurrency(jobData.price)}</td>
                </tr>
                {materialCost && materialCost > 0 && (
                  <tr className="text-gray-600">
                    <td className="py-2">Materials</td>
                    <td className="py-2">Parts and supplies</td>
                    <td className="text-right py-2">{formatCurrency(materialCost)}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="flex justify-between items-center text-lg font-bold">
            <span>Total:</span>
            <span>{formatCurrency(jobData.price)}</span>
          </div>

          <div className="text-center text-xs text-gray-500 pt-4 border-t">
            <p>Thank you for your business!</p>
            <p>For questions about this receipt, please contact us.</p>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:flex sm:flex-row gap-2 print:hidden">
          <Button onClick={handlePrint} className="col-span-2 sm:flex-1">
            <Printer className="h-4 w-4 mr-2" />
            Print
          </Button>
          <Button onClick={handleCopy} variant="outline" className="flex-1">
            <Copy className="h-4 w-4 mr-2" />
            Copy
          </Button>
          {canShare && (
            <Button onClick={handleShare} variant="outline" className="flex-1">
              <Share2 className="h-4 w-4 mr-2" />
              Share
            </Button>
          )}
          {customer.phone && (
            <Button onClick={handleSMS} variant="outline" className="flex-1">
              <MessageSquare className="h-4 w-4 mr-2" />
              Text
            </Button>
          )}
          {customer.email && (
            <Button onClick={handleEmail} variant="outline" className="flex-1">
              <Mail className="h-4 w-4 mr-2" />
              Email
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
