import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Switch } from '@/components/ui/switch';
import { 
  CreditCard, 
  User, 
  Mail, 
  Calendar, 
  CheckCircle2, 
  AlertCircle,
  Crown,
  Clock,
  Phone,
  MapPin,
  Bell,
  Download,
  HelpCircle,
  MessageCircle,
  BookOpen,
  Building
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface Subscription {
  id: string;
  plan_name: string;
  status: 'trial' | 'active' | 'canceled' | 'expired';
  trial_ends_at: string | null;
  current_period_end: string;
  cancel_at_period_end: boolean;
  created_at: string;
}

export default function Settings() {
  const { user } = useAuth();
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [businessName, setBusinessName] = useState('');
  const [saving, setSaving] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);
  const [businessPhone, setBusinessPhone] = useState('');
  const [businessAddress, setBusinessAddress] = useState('');
  const [emailNotifications, setEmailNotifications] = useState({
    invoices: true,
    trialExpiration: true,
    lowInventory: true,
    jobReminders: true,
    marketing: false,
  });
  const [paymentMethod, setPaymentMethod] = useState<any>(null);
  const [billingHistory, setBillingHistory] = useState<any[]>([]);

  const handleUpgrade = () => {
    const STRIPE_PAYMENT_LINK = 'https://buy.stripe.com/test_3cI28q8e98UK1Cn4oA9Zm00';
    const paymentUrl = `${STRIPE_PAYMENT_LINK}?prefilled_email=${encodeURIComponent(user?.email || '')}`;
    window.location.href = paymentUrl;
  };

  useEffect(() => {
    fetchSubscription();
  }, [user]);

  useEffect(() => {
    if (user?.user_metadata?.business_name) {
      setBusinessName(user.user_metadata.business_name as string);
    }
    if (user?.user_metadata?.business_phone) {
      setBusinessPhone(user.user_metadata.business_phone as string);
    }
    if (user?.user_metadata?.business_address) {
      setBusinessAddress(user.user_metadata.business_address as string);
    }
  }, [user]);

  // Handle Stripe payment success/cancel
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('success')) {
      toast({
        title: "Payment Successful!",
        description: "Your subscription is now active. Thank you!",
      });
      window.history.replaceState({}, '', '/settings');
    }
    if (urlParams.get('canceled')) {
      toast({
        title: "Payment Canceled",
        description: "You can upgrade anytime from this page.",
        variant: "destructive",
      });
      window.history.replaceState({}, '', '/settings');
    }
  }, []);

  // Check for trial expiration and auto-redirect
  useEffect(() => {
    if (subscription?.status === 'trial' && subscription.trial_ends_at) {
      const trialEnd = new Date(subscription.trial_ends_at);
      const now = new Date();
      
      if (trialEnd <= now) {
        toast({
          title: "Trial Expired",
          description: "Your free trial has ended. Upgrade now to continue using all features.",
          variant: "destructive",
        });
        setTimeout(() => {
          handleUpgrade();
        }, 3000);
      }
    }
  }, [subscription]);

  const fetchSubscription = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error) {
        console.error('Error fetching subscription:', error);
      } else {
        setSubscription(data);
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = () => {
    if (!subscription) return null;

    const statusConfig = {
      trial: { label: 'Free Trial', className: 'bg-blue-500' },
      active: { label: 'Active', className: 'bg-green-500' },
      canceled: { label: 'Canceled', className: 'bg-orange-500' },
      expired: { label: 'Expired', className: 'bg-red-500' },
    };

    const config = statusConfig[subscription.status];
    return <Badge className={config.className}>{config.label}</Badge>;
  };

  const getTrialDaysRemaining = () => {
    if (!subscription?.trial_ends_at) return 0;
    
    const trialEnd = new Date(subscription.trial_ends_at);
    const now = new Date();
    const diffTime = trialEnd.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return Math.max(0, diffDays);
  };

  const handleSaveBusinessName = async () => {
    if (!businessName) return;
    try {
      setSaving(true);
      const { error } = await supabase.auth.updateUser({
        data: { business_name: businessName }
      });
      if (error) {
        throw error;
      }
      toast({ title: 'Saved', description: 'Business name updated.' });
      window.location.reload();
    } catch (error: any) {
      toast({ title: 'Error', description: error?.message || 'Failed to update business name', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleSaveBusinessProfile = async () => {
    try {
      setSaving(true);
      const { error } = await supabase.auth.updateUser({
        data: { 
          business_name: businessName,
          business_phone: businessPhone,
          business_address: businessAddress,
        }
      });
      if (error) throw error;
      toast({ title: 'Saved', description: 'Business profile updated successfully.' });
      window.location.reload();
    } catch (error: any) {
      toast({ title: 'Error', description: error?.message || 'Failed to update profile', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleSaveEmailPreferences = async () => {
    try {
      const { error } = await supabase.auth.updateUser({
        data: { email_notifications: emailNotifications }
      });
      if (error) throw error;
      toast({ title: 'Saved', description: 'Email preferences updated.' });
    } catch (error: any) {
      toast({ title: 'Error', description: 'Failed to save preferences', variant: 'destructive' });
    }
  };

  const handleChangePassword = async () => {
    if (!newPassword || !confirmPassword) {
      toast({ title: 'Error', description: 'Please fill in all password fields', variant: 'destructive' });
      return;
    }

    if (newPassword !== confirmPassword) {
      toast({ title: 'Error', description: 'Passwords do not match', variant: 'destructive' });
      return;
    }

    if (newPassword.length < 6) {
      toast({ title: 'Error', description: 'Password must be at least 6 characters', variant: 'destructive' });
      return;
    }

    try {
      setChangingPassword(true);
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });
      
      if (error) throw error;

      toast({ title: 'Success', description: 'Password updated successfully' });
      setNewPassword('');
      setConfirmPassword('');
    } catch (error: any) {
      toast({ title: 'Error', description: error?.message || 'Failed to update password', variant: 'destructive' });
    } finally {
      setChangingPassword(false);
    }
  };

  const handleCancelSubscription = async () => {
    if (!subscription) return;

    const confirmed = window.confirm(
      'Are you sure you want to cancel your subscription? You\'ll retain access until the end of your billing period.'
    );

    if (confirmed) {
      try {
        const { error } = await supabase
          .from('subscriptions')
          .update({ cancel_at_period_end: true })
          .eq('id', subscription.id);

        if (error) throw error;

        toast({
          title: "Subscription canceled",
          description: "You'll have access until the end of your billing period.",
        });
        
        fetchSubscription();
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to cancel subscription. Please try again.",
          variant: "destructive",
        });
      }
    }
  };

  const trialDaysRemaining = getTrialDaysRemaining();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8 p-4 sm:p-6 max-w-6xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Settings</h1>
        <p className="text-muted-foreground mt-2">Manage your account and subscription</p>
      </div>

      {/* Profile & Security Section */}
      <div className="space-y-4">
        <div className="border-b pb-2">
          <h2 className="text-xl font-semibold text-foreground">Profile & Security</h2>
          <p className="text-sm text-muted-foreground">Manage your personal information and security settings</p>
        </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Account Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Account Information
            </CardTitle>
            <CardDescription>Your account details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="email">Email</Label>
              <div className="flex items-center gap-2 mt-1">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  value={user?.email || ''}
                  disabled
                  className="flex-1"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="businessName">Business Name</Label>
              <Input
                id="businessName"
                type="text"
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                placeholder="Your Locksmith Business"
                className="mt-1"
              />
              <div className="flex justify-end">
                <Button onClick={handleSaveBusinessName} disabled={saving || !businessName} className="mt-2">
                  {saving ? 'Saving...' : 'Save'}
                </Button>
              </div>
            </div>
            <div>
              <Label>Account Created</Label>
              <div className="flex items-center gap-2 mt-1">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">
                  {user?.created_at ? new Date(user.created_at).toLocaleDateString() : 'N/A'}
                </span>
              </div>
            </div>

            <Separator className="my-4" />

            <div className="space-y-4">
              <h3 className="text-sm font-semibold">Change Password</h3>
              <div>
                <Label htmlFor="newPassword">New Password</Label>
                <Input
                  id="newPassword"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password"
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm new password"
                  className="mt-1"
                />
              </div>
              <div className="flex justify-end">
                <Button 
                  onClick={handleChangePassword} 
                  disabled={changingPassword || !newPassword || !confirmPassword}
                  variant="outline"
                >
                  {changingPassword ? 'Updating...' : 'Update Password'}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Subscription Status */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Crown className="h-5 w-5 text-accent" />
              Subscription
            </CardTitle>
            <CardDescription>Your plan and billing</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Status</span>
              {getStatusBadge()}
            </div>
            
            <Separator />
            
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Plan</span>
                <span className="text-sm text-muted-foreground">Professional</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Price</span>
                <span className="text-2xl font-bold text-primary">$9.99<span className="text-sm font-normal text-muted-foreground">/month</span></span>
              </div>
            </div>

            {subscription?.status === 'trial' && (
              <Alert className="bg-blue-500/10 border-blue-500">
                <Clock className="h-4 w-4 text-blue-500" />
                <AlertDescription className="text-sm">
                  <strong>{trialDaysRemaining} days</strong> remaining in your free trial
                </AlertDescription>
              </Alert>
            )}

            {subscription?.cancel_at_period_end && (
              <Alert className="bg-orange-500/10 border-orange-500">
                <AlertCircle className="h-4 w-4 text-orange-500" />
                <AlertDescription className="text-sm">
                  Your subscription will end on {new Date(subscription.current_period_end).toLocaleDateString()}
                </AlertDescription>
              </Alert>
            )}

            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Calendar className="h-3 w-3" />
              <span>
                {subscription?.status === 'trial' 
                  ? `Trial ends ${subscription.trial_ends_at ? new Date(subscription.trial_ends_at).toLocaleDateString() : 'soon'}`
                  : `Next billing ${subscription?.current_period_end ? new Date(subscription.current_period_end).toLocaleDateString() : ''}`
                }
              </span>
            </div>

            {/* Upgrade Button */}
            {(!subscription || subscription.status === 'trial' || subscription.status === 'expired' || subscription.status === 'canceled') && (
              <div className="pt-2">
                <Button 
                  onClick={handleUpgrade}
                  className="w-full bg-accent hover:bg-accent/90"
                  size="lg"
                >
                  Upgrade to Premium - $9.99/month
                </Button>
              </div>
            )}

            {subscription?.status === 'active' && !subscription.cancel_at_period_end && (
              <div className="pt-2">
                <Button 
                  onClick={handleCancelSubscription}
                  variant="outline"
                  className="w-full border-destructive text-destructive hover:bg-destructive/10"
                >
                  Cancel Subscription
                </Button>
              </div>
            )}

            {subscription?.cancel_at_period_end && (
              <div className="pt-2">
                <Button 
                  onClick={() => {
                    toast({
                      title: "Renew Subscription",
                      description: "Redirecting to payment...",
                    });
                    handleUpgrade();
                  }}
                  className="w-full bg-accent hover:bg-accent/90"
                >
                  Renew Subscription
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
        </div>
      </div>

      {/* Subscription & Billing Section */}
      <div className="space-y-4">
        <div className="border-b pb-2">
          <h2 className="text-xl font-semibold text-foreground">Subscription & Billing</h2>
          <p className="text-sm text-muted-foreground">Manage your subscription plan and payment information</p>
        </div>

      {/* Billing Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Billing & Payments
          </CardTitle>
          <CardDescription>
            Manage your subscription and payment method
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-muted/50 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="h-5 w-5 text-primary mt-0.5" />
              <div className="flex-1">
                <h4 className="font-semibold mb-1">What's Included</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>✓ Unlimited customers & jobs</li>
                  <li>✓ Inventory management with alerts</li>
                  <li>✓ Financial analytics & reports</li>
                  <li>✓ Mobile-optimized interface</li>
                  <li>✓ Real-time data sync</li>
                  <li>✓ Email support</li>
                </ul>
              </div>
            </div>
          </div>


          <p className="text-xs text-muted-foreground">
            {subscription?.status === 'trial' 
              ? 'No credit card required for trial. Cancel anytime.'
              : 'You can cancel your subscription at any time. You\'ll retain access until the end of your billing period.'
            }
          </p>
        </CardContent>
      </Card>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Payment Method */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Payment Method
              </CardTitle>
              <CardDescription>Manage your payment information</CardDescription>
            </CardHeader>
            <CardContent>
              {subscription?.status === 'active' ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-3 p-3 border rounded-lg">
                    <CreditCard className="h-8 w-8 text-primary" />
                    <div className="flex-1">
                      <p className="font-medium">Visa ending in 4242</p>
                      <p className="text-sm text-muted-foreground">Expires 12/2025</p>
                    </div>
                    <Button variant="outline" size="sm" onClick={handleUpgrade}>
                      Update
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Your payment method is securely stored by Stripe
                  </p>
                </div>
              ) : (
                <div className="text-center py-6">
                  <CreditCard className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                  <p className="text-sm text-muted-foreground mb-3">No payment method on file</p>
                  <Button onClick={handleUpgrade} variant="outline">
                    Add Payment Method
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Billing History */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Download className="h-5 w-5" />
                Billing History
              </CardTitle>
              <CardDescription>Download past invoices</CardDescription>
            </CardHeader>
            <CardContent>
              {subscription?.status === 'active' ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between py-2 border-b">
                    <div>
                      <p className="font-medium text-sm">Oct 24, 2025</p>
                      <p className="text-xs text-muted-foreground">Professional Plan</p>
                    </div>
                    <div className="text-right flex items-center gap-2">
                      <span className="font-medium">$9.99</span>
                      <Button variant="ghost" size="sm">
                        <Download className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <div className="flex items-center justify-between py-2 border-b">
                    <div>
                      <p className="font-medium text-sm">Sep 24, 2025</p>
                      <p className="text-xs text-muted-foreground">Professional Plan</p>
                    </div>
                    <div className="text-right flex items-center gap-2">
                      <span className="font-medium">$9.99</span>
                      <Button variant="ghost" size="sm">
                        <Download className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground pt-2">
                    Invoices are emailed to {user?.email}
                  </p>
                </div>
              ) : (
                <div className="text-center py-6">
                  <Download className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                  <p className="text-sm text-muted-foreground">No billing history yet</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Business Information Section */}
      <div className="space-y-4">
        <div className="border-b pb-2">
          <h2 className="text-xl font-semibold text-foreground">Business Information</h2>
          <p className="text-sm text-muted-foreground">Complete your business details</p>
        </div>

      {/* Business Profile */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building className="h-5 w-5" />
            Business Profile
          </CardTitle>
          <CardDescription>Complete your business information</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="businessPhone">Business Phone</Label>
              <div className="flex items-center gap-2 mt-1">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <Input
                  id="businessPhone"
                  type="tel"
                  value={businessPhone}
                  onChange={(e) => setBusinessPhone(e.target.value)}
                  placeholder="(555) 123-4567"
                  className="flex-1"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="businessAddress">Business Address</Label>
              <div className="flex items-center gap-2 mt-1">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <Input
                  id="businessAddress"
                  type="text"
                  value={businessAddress}
                  onChange={(e) => setBusinessAddress(e.target.value)}
                  placeholder="123 Main St, City, State"
                  className="flex-1"
                />
              </div>
            </div>
          </div>
          <div className="flex justify-end">
            <Button onClick={handleSaveBusinessProfile} disabled={saving}>
              {saving ? 'Saving...' : 'Save Profile'}
            </Button>
          </div>
        </CardContent>
      </Card>
      </div>

      {/* Preferences Section */}
      <div className="space-y-4">
        <div className="border-b pb-2">
          <h2 className="text-xl font-semibold text-foreground">Preferences</h2>
          <p className="text-sm text-muted-foreground">Customize your notification settings</p>
        </div>

      {/* Email Notifications */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Email Notifications
          </CardTitle>
          <CardDescription>Manage your email preferences</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="invoices">Invoice Receipts</Label>
                <p className="text-sm text-muted-foreground">Receive email copies of your invoices</p>
              </div>
              <Switch
                id="invoices"
                checked={emailNotifications.invoices}
                onCheckedChange={(checked) => setEmailNotifications({...emailNotifications, invoices: checked})}
              />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="trialExpiration">Trial Expiration</Label>
                <p className="text-sm text-muted-foreground">Get notified when your trial is ending</p>
              </div>
              <Switch
                id="trialExpiration"
                checked={emailNotifications.trialExpiration}
                onCheckedChange={(checked) => setEmailNotifications({...emailNotifications, trialExpiration: checked})}
              />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="lowInventory">Low Inventory Alerts</Label>
                <p className="text-sm text-muted-foreground">Alert when items are running low</p>
              </div>
              <Switch
                id="lowInventory"
                checked={emailNotifications.lowInventory}
                onCheckedChange={(checked) => setEmailNotifications({...emailNotifications, lowInventory: checked})}
              />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="jobReminders">Job Reminders</Label>
                <p className="text-sm text-muted-foreground">Reminders for upcoming scheduled jobs</p>
              </div>
              <Switch
                id="jobReminders"
                checked={emailNotifications.jobReminders}
                onCheckedChange={(checked) => setEmailNotifications({...emailNotifications, jobReminders: checked})}
              />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="marketing">Marketing Emails</Label>
                <p className="text-sm text-muted-foreground">Product updates and tips</p>
              </div>
              <Switch
                id="marketing"
                checked={emailNotifications.marketing}
                onCheckedChange={(checked) => setEmailNotifications({...emailNotifications, marketing: checked})}
              />
            </div>
          </div>
          <div className="flex justify-end">
            <Button onClick={handleSaveEmailPreferences}>
              Save Preferences
            </Button>
          </div>
        </CardContent>
      </Card>
      </div>

      {/* Support Section */}
      <div className="space-y-4">
        <div className="border-b pb-2">
          <h2 className="text-xl font-semibold text-foreground">Support</h2>
          <p className="text-sm text-muted-foreground">Get help and access resources</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <HelpCircle className="h-5 w-5" />
              Need Help?
            </CardTitle>
            <CardDescription>Contact support or browse our documentation</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-3">
              <Button variant="outline" className="w-full justify-start" onClick={() => window.open('mailto:support@heatwavelocksmith.com')}>
                <Mail className="mr-2 h-4 w-4" />
                Email Support
              </Button>
              <Button variant="outline" className="w-full justify-start" onClick={() => window.location.href = '/documentation'}>
                <BookOpen className="mr-2 h-4 w-4" />
                View Documentation
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}