import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Printer, Mail } from 'lucide-react';
import { formatCurrency } from '@/lib/format';
import { format } from 'date-fns';

interface Job {
  id: string;
  customer: {
    name: string;
    phone?: string;
    email?: string;
    address?: string;
  };
  serviceType: string;
  description?: string;
  price: number;
  materialCost?: number;
  status: string;
  createdAt: string;
  completedAt?: string;
}

interface ReceiptDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  jobData: Job;
}

export function ReceiptDialog({ open, onOpenChange, jobData }: ReceiptDialogProps) {
  const handlePrint = () => {
    window.print();
  };

  const handleEmail = () => {
    const subject = `Receipt for ${jobData.serviceType} - Heat Wave Locksmith`;
    const body = `Receipt for job #${jobData.id}\nCustomer: ${jobData.customer.name}\nService: ${jobData.serviceType}\nTotal: ${formatCurrency(jobData.price)}`;
    window.location.href = `mailto:${jobData.customer.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
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
              <p>{jobData.customer.name}</p>
              {jobData.customer.phone && <p>{jobData.customer.phone}</p>}
              {jobData.customer.email && <p>{jobData.customer.email}</p>}
              {jobData.customer.address && <p className="text-gray-600">{jobData.customer.address}</p>}
            </div>
            <div className="text-right">
              <h3 className="font-semibold mb-2">Receipt Details:</h3>
              <p>Job ID: #{jobData.id.slice(0, 8)}</p>
              <p>Date: {format(new Date(jobData.createdAt), 'MMM dd, yyyy')}</p>
              {jobData.completedAt && (
                <p>Completed: {format(new Date(jobData.completedAt), 'MMM dd, yyyy')}</p>
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
                  <td className="py-2">{jobData.serviceType}</td>
                  <td className="py-2 text-gray-600">{jobData.description || '-'}</td>
                  <td className="text-right py-2">{formatCurrency(jobData.price)}</td>
                </tr>
                {jobData.materialCost && jobData.materialCost > 0 && (
                  <tr className="text-gray-600">
                    <td className="py-2">Materials</td>
                    <td className="py-2">Parts and supplies</td>
                    <td className="text-right py-2">{formatCurrency(jobData.materialCost)}</td>
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

        <div className="flex gap-2 print:hidden">
          <Button onClick={handlePrint} className="flex-1">
            <Printer className="h-4 w-4 mr-2" />
            Print
          </Button>
          {jobData.customer.email && (
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
