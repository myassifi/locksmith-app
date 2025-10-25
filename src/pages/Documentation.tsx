import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  BookOpen, 
  Users, 
  Briefcase, 
  Package, 
  BarChart3, 
  CreditCard,
  Settings as SettingsIcon,
  Mail
} from 'lucide-react';

// Documentation component ends at line 219 - everything after should be removed

export default function Documentation() {
  const navigate = useNavigate();

  const sections = [
    {
      title: 'Getting Started',
      icon: BookOpen,
      items: [
        {
          question: 'How do I get started with Heat Wave Locksmith?',
          answer: 'After signing up, you\'ll get a 7-day free trial. Start by adding your first customer in the Customers section, then create jobs, manage inventory, and track your business performance.'
        },
        {
          question: 'What\'s included in the $9.99/month subscription?',
          answer: 'You get unlimited customers & jobs, inventory management with low-stock alerts, financial analytics & reports, mobile-optimized interface, real-time data sync, and email support.'
        },
      ]
    },
    {
      title: 'Managing Customers',
      icon: Users,
      items: [
        {
          question: 'How do I add a new customer?',
          answer: 'Go to the Customers page and click "Add Customer". Fill in their name, phone, email, and address. You can also add notes about the customer.'
        },
        {
          question: 'Can I see a customer\'s job history?',
          answer: 'Yes! Click on any customer to view their complete job history, contact information, and any notes you\'ve added.'
        },
        {
          question: 'How do I contact a customer?',
          answer: 'From the customer\'s profile or job card, you can click the phone icon to call or SMS icon to send a text message directly from the app.'
        },
      ]
    },
    {
      title: 'Jobs & Scheduling',
      icon: Briefcase,
      items: [
        {
          question: 'How do I create a new job?',
          answer: 'Go to Jobs page and click "Create Job". Select the customer, service type (e.g., Lock Installation, Rekeying), add the price, material cost, and schedule a date. You can also add job notes.'
        },
        {
          question: 'What job statuses are available?',
          answer: 'Jobs can be: Scheduled (upcoming), In Progress (currently working), Completed (finished), or Canceled. Update the status as you work on jobs.'
        },
        {
          question: 'How do I track job profitability?',
          answer: 'Each job shows the price charged and material cost. Your profit is automatically calculated (Price - Material Cost). View monthly profit trends in the Dashboard.'
        },
      ]
    },
    {
      title: 'Inventory Management',
      icon: Package,
      items: [
        {
          question: 'How do I add inventory items?',
          answer: 'Go to Inventory and click "Add Item". Enter the item name, SKU, FCC ID (for locks), quantity, reorder threshold, unit cost, and supplier information.'
        },
        {
          question: 'What are low stock alerts?',
          answer: 'When an item\'s quantity falls below the reorder threshold you set, it\'ll show a red "Low Stock" badge. Enable email alerts in Settings to get notified.'
        },
        {
          question: 'Can I track inventory costs?',
          answer: 'Yes! The Dashboard shows your total inventory investment (quantity × unit cost for all items). This helps you understand how much capital is tied up in inventory.'
        },
        {
          question: 'How do I update quantities?',
          answer: 'Click on any item and use the +/- buttons to adjust quantities, or type a number directly. Changes are saved instantly.'
        },
      ]
    },
    {
      title: 'Financial Analytics',
      icon: BarChart3,
      items: [
        {
          question: 'What financial reports are available?',
          answer: 'The Dashboard shows: today\'s income, monthly income, total income, average job value, weekly income chart, monthly income trend (last 6 months), and monthly profit analysis (revenue vs material costs).'
        },
        {
          question: 'How is profit calculated?',
          answer: 'Monthly Profit = Total Revenue (job prices) - Total Material Costs. Profit Margin = (Profit / Revenue) × 100%. Only completed jobs are included in calculations.'
        },
        {
          question: 'Can I export financial data?',
          answer: 'Yes! Click the "Export" button on the Dashboard to download your financial data as a CSV file for use in accounting software or tax preparation.'
        },
      ]
    },
    {
      title: 'Subscription & Billing',
      icon: CreditCard,
      items: [
        {
          question: 'How does the free trial work?',
          answer: 'You get 7 days of full access to all features. No credit card required. After the trial, subscribe for $9.99/month to continue using the app.'
        },
        {
          question: 'How do I upgrade from trial to paid?',
          answer: 'Go to Settings > Subscription & Billing and click "Upgrade to Premium". You\'ll be redirected to our secure Stripe payment page.'
        },
        {
          question: 'Can I cancel my subscription?',
          answer: 'Yes, anytime! Go to Settings > Subscription & Billing and click "Cancel Subscription". You\'ll retain access until the end of your billing period.'
        },
        {
          question: 'How do I update my payment method?',
          answer: 'In Settings > Subscription & Billing > Payment Method, click "Update" to change your credit card information.'
        },
      ]
    },
    {
      title: 'Account Settings',
      icon: SettingsIcon,
      items: [
        {
          question: 'How do I change my password?',
          answer: 'Go to Settings > Profile & Security > Change Password. Enter your new password twice and click "Update Password".'
        },
        {
          question: 'How do I update my business information?',
          answer: 'Go to Settings > Business Information. Add your business phone and address, then click "Save Profile". This info can be used on invoices and estimates in the future.'
        },
        {
          question: 'Can I control email notifications?',
          answer: 'Yes! Go to Settings > Preferences > Email Notifications. Toggle on/off: invoice receipts, trial expiration warnings, low inventory alerts, job reminders, and marketing emails.'
        },
      ]
    },
  ];

  return (
    <div className="space-y-6 p-4 sm:p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/settings')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
            <BookOpen className="h-8 w-8" />
            Documentation
          </h1>
          <p className="text-muted-foreground mt-2">Complete guide to using Heat Wave Locksmith</p>
        </div>
      </div>

      {/* Quick Links */}
      <Card className="bg-primary/5 border-primary/20">
        <CardHeader>
          <CardTitle>Need More Help?</CardTitle>
          <CardDescription>Can\'t find what you\'re looking for?</CardDescription>
        </CardHeader>
        <CardContent>
          <Button 
            onClick={() => window.open('mailto:support@heatwavelocksmith.com')}
            className="w-full sm:w-auto"
          >
            <Mail className="mr-2 h-4 w-4" />
            Contact Support
          </Button>
        </CardContent>
      </Card>

      {/* Documentation Sections */}
      {sections.map((section, index) => (
        <Card key={index}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <section.icon className="h-5 w-5 text-primary" />
              {section.title}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {section.items.map((item, itemIndex) => (
              <div key={itemIndex} className="space-y-2">
                <h3 className="font-semibold text-foreground">{item.question}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">{item.answer}</p>
                {itemIndex < section.items.length - 1 && <div className="border-b pt-4" />}
              </div>
            ))}
          </CardContent>
        </Card>
      ))}

      {/* Footer */}
      <Card className="bg-muted/50">
        <CardContent className="pt-6 text-center">
          <p className="text-sm text-muted-foreground">
            Last updated: October 24, 2025
          </p>
          <p className="text-xs text-muted-foreground mt-2">
            Heat Wave Locksmith v1.0 • Professional Locksmith Management System
          </p>
        </CardContent>
      </Card>
    </div>
  );
}