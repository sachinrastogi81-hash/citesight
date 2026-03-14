import { useState } from 'react';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Switch } from '../components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { useAuth } from '../contexts/AuthContext';
import { Save, Bell, Lock, CreditCard, Users } from 'lucide-react';

export function SettingsPage() {
  const { user } = useAuth();
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Settings</h1>
        <p className="text-gray-600">Manage your account and preferences</p>
      </div>

      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList>
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
          <TabsTrigger value="billing">Billing</TabsTrigger>
          <TabsTrigger value="team">Team</TabsTrigger>
        </TabsList>

        <TabsContent value="profile">
          <Card className="p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">Profile Information</h2>
            <div className="space-y-6 max-w-2xl">
              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="company">Company</Label>
                <Input id="company" placeholder="Your company name" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="role">Role</Label>
                <Input id="role" placeholder="Your role" />
              </div>

              <Button className="bg-indigo-600 hover:bg-indigo-700">
                <Save className="size-4 mr-2" />
                Save Changes
              </Button>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="notifications">
          <Card className="p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
              <Bell className="size-5 mr-2" />
              Notification Preferences
            </h2>
            <div className="space-y-6 max-w-2xl">
              <div className="flex items-center justify-between py-3 border-b">
                <div>
                  <p className="font-medium text-gray-900">Workflow Alerts</p>
                  <p className="text-sm text-gray-600">Get notified when workflows fail</p>
                </div>
                <Switch defaultChecked />
              </div>

              <div className="flex items-center justify-between py-3 border-b">
                <div>
                  <p className="font-medium text-gray-900">Email Notifications</p>
                  <p className="text-sm text-gray-600">Receive email updates</p>
                </div>
                <Switch defaultChecked />
              </div>

              <div className="flex items-center justify-between py-3 border-b">
                <div>
                  <p className="font-medium text-gray-900">Weekly Reports</p>
                  <p className="text-sm text-gray-600">Get weekly performance summaries</p>
                </div>
                <Switch defaultChecked />
              </div>

              <div className="flex items-center justify-between py-3 border-b">
                <div>
                  <p className="font-medium text-gray-900">Marketing Updates</p>
                  <p className="text-sm text-gray-600">Product updates and tips</p>
                </div>
                <Switch />
              </div>

              <Button className="bg-indigo-600 hover:bg-indigo-700">
                <Save className="size-4 mr-2" />
                Save Preferences
              </Button>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="security">
          <Card className="p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
              <Lock className="size-5 mr-2" />
              Security Settings
            </h2>
            <div className="space-y-6 max-w-2xl">
              <div className="space-y-2">
                <Label htmlFor="current-password">Current Password</Label>
                <Input id="current-password" type="password" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="new-password">New Password</Label>
                <Input id="new-password" type="password" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirm-password">Confirm New Password</Label>
                <Input id="confirm-password" type="password" />
              </div>

              <Button className="bg-indigo-600 hover:bg-indigo-700">
                Update Password
              </Button>

              <div className="pt-6 border-t">
                <h3 className="font-semibold text-gray-900 mb-4">Two-Factor Authentication</h3>
                <p className="text-sm text-gray-600 mb-4">
                  Add an extra layer of security to your account
                </p>
                <Button variant="outline">Enable 2FA</Button>
              </div>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="billing">
          <Card className="p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
              <CreditCard className="size-5 mr-2" />
              Billing Information
            </h2>
            <div className="space-y-6 max-w-2xl">
              <div className="p-4 bg-indigo-50 rounded-lg">
                <p className="text-sm font-medium text-indigo-900 mb-1">Current Plan</p>
                <p className="text-2xl font-bold text-indigo-600">Pro Plan</p>
                <p className="text-sm text-indigo-700 mt-1">$49/month • Renews on April 7, 2026</p>
              </div>

              <div className="space-y-4">
                <h3 className="font-semibold text-gray-900">Usage This Month</h3>
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">API Calls</span>
                    <span className="font-medium">3,427 / 10,000</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Workflows</span>
                    <span className="font-medium">12 / 50</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">AI Apps</span>
                    <span className="font-medium">8 / 20</span>
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <Button variant="outline">Change Plan</Button>
                <Button variant="outline">Update Payment Method</Button>
              </div>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="team">
          <Card className="p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
              <Users className="size-5 mr-2" />
              Team Members
            </h2>
            <div className="space-y-6 max-w-2xl">
              <div className="flex gap-3 mb-6">
                <Input placeholder="Enter email address" className="flex-1" />
                <Button className="bg-indigo-600 hover:bg-indigo-700">Invite Member</Button>
              </div>

              <div className="space-y-3">
                {[
                  { name: user?.name || 'You', email: user?.email || '', role: 'Owner' },
                  { name: 'Sarah Johnson', email: 'sarah@example.com', role: 'Admin' },
                  { name: 'Mike Chen', email: 'mike@example.com', role: 'Member' },
                ].map((member, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="size-10 bg-indigo-100 rounded-full flex items-center justify-center">
                        <span className="text-sm font-medium text-indigo-600">
                          {member.name.charAt(0)}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{member.name}</p>
                        <p className="text-sm text-gray-600">{member.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <span className="text-sm font-medium text-gray-700">{member.role}</span>
                      {member.role !== 'Owner' && (
                        <Button variant="ghost" size="sm">Remove</Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
