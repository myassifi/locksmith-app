import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import { MessageSquare, Mail, Copy, Check } from 'lucide-react';
import { generateReceiptText, generateReceiptSMS } from '@/lib/receiptGenerator';

interface ReceiptDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  jobData: {
    id: string;
    customer_id: string;
    job_type: string;
    vehicle_lock_details?: string;
    price: number;
    material_cost?: number;
    job_date: string;
    notes?: string;
    customers?: {
      name: string;
      phone?: string;
      email?: string;
      address?: string;
    };
  };
}

export function ReceiptDialog({ open, onOpenChange, jobData }: ReceiptDialogProps) {
  const [copied, setCopied] = useState(false);
  const [receiptFormat, setReceiptFormat] = useState<'full' | 'sms'>('sms');

  const receiptData = {
    jobId: jobData.id,
    customerName: jobData.customers?.name || 'Customer',
    customerPhone: jobData.customers?.phone,
    customerEmail: jobData.customers?.email,
    customerAddress: jobData.customers?.address,
    jobType: formatJobType(jobData.job_type),
    vehicleDetails: jobData.vehicle_lock_details,
    jobDate: jobData.job_date,
    price: Number(jobData.price),
    materialCost: jobData.material_cost ? Number(jobData.material_cost) : undefined,
    notes: jobData.notes,
  };

  const receipt = receiptFormat === 'sms' 
    ? generateReceiptSMS(receiptData)
    : generateReceiptText(receiptData);

  function formatJobType(type: string): string {
    return type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  }

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(receipt);
      setCopied(true);
      toast({
        title: "Copied!",
        description: "Receipt copied to clipboard",
      });
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to copy receipt",
        variant: "destructive"
      });
    }
  };

  const handleSendSMS = () => {
    if (!jobData.customers?.phone) {
      toast({
        title: "No Phone Number",
        description: "Customer doesn't have a phone number",
        variant: "destructive"
      });
      return;
    }

    const smsLink = `sms:${jobData.customers.phone}${/iPhone|iPad|iPod/.test(navigator.userAgent) ? '&' : '?'}body=${encodeURIComponent(receipt)}`;
    window.location.href = smsLink;

    toast({
      title: "Opening SMS App",
      description: "SMS app opened with receipt",
    });
  };

  const handleSendEmail = () => {
    if (!jobData.customers?.email) {
      toast({
        title: "No Email Address",
        description: "Customer doesn't have an email address",
        variant: "destructive"
      });
      return;
    }

    const subject = `Receipt - Heat Wave Locksmith Service`;
    const body = receipt;
    const mailtoLink = `mailto:${jobData.customers.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    
    window.location.href = mailtoLink;

    toast({
      title: "Opening Email App",
      description: "Email app opened with receipt",
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-10 w-10 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center">
                <span className="text-white text-xl">📝</span>
              </div>
              <span className="text-xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">Send Receipt</span>
            </div>
            <div className="flex gap-2">
              <Badge
                variant={receiptFormat === 'sms' ? 'default' : 'outline'}
                className="cursor-pointer transition-all hover:scale-105 active:scale-95"
                onClick={() => setReceiptFormat('sms')}
              >
                📱 SMS
              </Badge>
              <Badge
                variant={receiptFormat === 'full' ? 'default' : 'outline'}
                className="cursor-pointer transition-all hover:scale-105 active:scale-95"
                onClick={() => setReceiptFormat('full')}
              >
                📄 Full
              </Badge>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="relative overflow-hidden flex items-center justify-between p-4 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20 rounded-xl border-2 border-green-200 dark:border-green-800">
            <div className="absolute top-0 right-0 w-32 h-32 bg-green-200/30 dark:bg-green-800/30 rounded-full blur-3xl"></div>
            <div className="relative z-10">
              <p className="font-bold text-lg">{jobData.customers?.name}</p>
              <div className="flex items-center gap-2 mt-1">
                {jobData.customers?.phone && (
                  <span className="text-sm text-muted-foreground flex items-center gap-1">
                    <MessageSquare className="h-3 w-3" />
                    {jobData.customers.phone}
                  </span>
                )}
                {jobData.customers?.email && (
                  <span className="text-sm text-muted-foreground flex items-center gap-1">
                    <Mail className="h-3 w-3" />
                    {jobData.customers.email}
                  </span>
                )}
              </div>
            </div>
            <div className="relative z-10">
              <Badge className="bg-gradient-to-r from-green-600 to-emerald-600 text-white px-4 py-2 text-lg font-bold shadow-lg">
                ✓ ${jobData.price}
              </Badge>
            </div>
          </div>

          <div>
            <label className="text-sm font-semibold mb-2 block flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-gradient-to-r from-blue-500 to-purple-500"></span>
              Receipt Preview
            </label>
            <Textarea
              value={receipt}
              readOnly
              className="font-mono text-xs h-96 resize-none bg-gradient-to-br from-slate-50 to-gray-50 dark:from-slate-900 dark:to-gray-900 border-2 focus:ring-2 focus:ring-blue-500/20 transition-all"
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <Button
              onClick={handleSendSMS}
              disabled={!jobData.customers?.phone}
              className="gap-2 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
            >
              <MessageSquare className="h-4 w-4" />
              Send SMS
            </Button>
            <Button
              onClick={handleSendEmail}
              disabled={!jobData.customers?.email}
              className="gap-2 bg-gradient-to-r from-blue-500 to-cyan-600 hover:from-blue-600 hover:to-cyan-700 text-white shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
            >
              <Mail className="h-4 w-4" />
              Send Email
            </Button>
            <Button
              onClick={handleCopy}
              className="gap-2 bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 text-white shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105 active:scale-95"
            >
              {copied ? (
                <>
                  <Check className="h-4 w-4 animate-bounce" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4" />
                  Copy
                </>
              )}
            </Button>
          </div>
        </div>

        <DialogFooter>
          <Button 
            variant="outline" 
            onClick={() => onOpenChange(false)}
            className="hover:bg-red-50 hover:text-red-600 hover:border-red-300 dark:hover:bg-red-950/20 transition-all"
          >
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}