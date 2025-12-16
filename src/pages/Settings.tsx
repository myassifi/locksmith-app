import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { 
  User, 
  Mail, 
  Calendar, 
  Phone,
  MapPin,
  Bell,
  Building
} from 'lucide-react';
import { api } from '@/integrations/api/client';
import { toast } from '@/hooks/use-toast';

const SETTINGS_PREFS_KEY = 'settings_prefs_v1';

type SettingsPrefs = {
  invoices: boolean;
  lowInventory: boolean;
  jobReminders: boolean;
  marketing: boolean;
};

export default function Settings() {
  const { user } = useAuth();
  const [businessName, setBusinessName] = useState('');
  const [saving, setSaving] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);
  const [businessPhone, setBusinessPhone] = useState('');
  const [businessAddress, setBusinessAddress] = useState('');
  const [prefs, setPrefs] = useState<SettingsPrefs>({
    invoices: true,
    lowInventory: true,
    jobReminders: true,
    marketing: false,
  });

  useEffect(() => {
    if (user?.businessName) {
      setBusinessName(user.businessName);
    }
    if (user?.phone) {
      setBusinessPhone(user.phone);
    }
    if (user?.address) {
      setBusinessAddress(user.address);
    }
  }, [user]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(SETTINGS_PREFS_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<SettingsPrefs>;
        setPrefs((prev) => ({ ...prev, ...parsed }));
      }
    } catch {
      // ignore
    }
  }, []);

  const handleSaveBusinessName = async () => {
    if (!businessName) return;
    try {
      setSaving(true);
      await api.updateProfile({ businessName });
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
      await api.updateProfile({
        businessName,
        phone: businessPhone,
        address: businessAddress,
      });
      toast({ title: 'Saved', description: 'Business profile updated successfully.' });
      window.location.reload();
    } catch (error: any) {
      toast({ title: 'Error', description: error?.message || 'Failed to update profile', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleSavePreferences = async () => {
    try {
      localStorage.setItem(SETTINGS_PREFS_KEY, JSON.stringify(prefs));
      toast({ title: 'Saved', description: 'Preferences updated.' });
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
      await api.updateProfile({ password: newPassword });

      toast({ title: 'Success', description: 'Password updated successfully' });
      setNewPassword('');
      setConfirmPassword('');
    } catch (error: any) {
      toast({ title: 'Error', description: error?.message || 'Failed to update password', variant: 'destructive' });
    } finally {
      setChangingPassword(false);
    }
  };

  return (
    <div className="space-y-8 p-4 sm:p-6 max-w-6xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Settings</h1>
        <p className="text-muted-foreground mt-2">Manage your account</p>
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
                  {user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A'}
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

          {/* Business Profile */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building className="h-5 w-5" />
                Business Profile
              </CardTitle>
              <CardDescription>Contact details for your business</CardDescription>
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
      </div>

      {/* Preferences Section */}
      <div className="space-y-4">
        <div className="border-b pb-2">
          <h2 className="text-xl font-semibold text-foreground">Preferences</h2>
          <p className="text-sm text-muted-foreground">Saved locally on this device</p>
        </div>

      {/* Notifications */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Notifications
          </CardTitle>
          <CardDescription>Choose what you want reminders for</CardDescription>
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
                checked={prefs.invoices}
                onCheckedChange={(checked) => setPrefs((p) => ({ ...p, invoices: checked }))}
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
                checked={prefs.lowInventory}
                onCheckedChange={(checked) => setPrefs((p) => ({ ...p, lowInventory: checked }))}
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
                checked={prefs.jobReminders}
                onCheckedChange={(checked) => setPrefs((p) => ({ ...p, jobReminders: checked }))}
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
                checked={prefs.marketing}
                onCheckedChange={(checked) => setPrefs((p) => ({ ...p, marketing: checked }))}
              />
            </div>
          </div>
          <div className="flex justify-end">
            <Button onClick={handleSavePreferences}>
              Save
            </Button>
          </div>
        </CardContent>
      </Card>
      </div>
    </div>
  );
}