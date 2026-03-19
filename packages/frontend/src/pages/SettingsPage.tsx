import { useState } from 'react';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { Input } from '../components/common/Input';
import { Badge } from '../components/common/Badge';
import {
  Building2, User, Bell, Shield, Palette, Globe, CreditCard,
  Mail, Plug, Database, ChevronRight, Save
} from 'lucide-react';

interface SettingsSection {
  id: string;
  title: string;
  description: string;
  icon: any;
}

const sections: SettingsSection[] = [
  { id: 'company', title: 'Company Profile', description: 'Business name, address, and logo', icon: Building2 },
  { id: 'account', title: 'Account Settings', description: 'Email, password, and profile', icon: User },
  { id: 'notifications', title: 'Notifications', description: 'Email and push notification preferences', icon: Bell },
  { id: 'security', title: 'Security', description: 'Two-factor authentication and sessions', icon: Shield },
  { id: 'appearance', title: 'Appearance', description: 'Theme, language, and display settings', icon: Palette },
  { id: 'localization', title: 'Localization', description: 'Currency, date format, and timezone', icon: Globe },
  { id: 'billing', title: 'Billing & Plan', description: 'Subscription, invoices, and payment methods', icon: CreditCard },
  { id: 'email', title: 'Email Templates', description: 'Customize invoice and reminder emails', icon: Mail },
  { id: 'integrations', title: 'Integrations', description: 'Connect third-party apps and services', icon: Plug },
  { id: 'data', title: 'Data & Export', description: 'Import, export, and backup your data', icon: Database },
];

export function SettingsPage() {
  const [activeSection, setActiveSection] = useState('company');

  const renderSectionContent = () => {
    switch (activeSection) {
      case 'company':
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">Company Profile</h3>
              <p className="text-sm text-gray-500 mt-1">This information appears on your invoices and estimates</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="w-20 h-20 bg-gray-100 dark:bg-gray-700 rounded-xl flex items-center justify-center">
                <Building2 size={32} className="text-gray-400" />
              </div>
              <div>
                <Button variant="outline" size="sm">Upload Logo</Button>
                <p className="text-xs text-gray-500 mt-1">PNG, JPG up to 2MB</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Input label="Company Name" defaultValue="CloudBooks Pro LLC" />
              <Input label="Trade License No." defaultValue="LLC-12345-2025" />
              <Input label="Tax Registration (TRN)" defaultValue="100123456789003" />
              <Input label="Phone" defaultValue="+971 4 123 4567" />
              <Input label="Email" defaultValue="info@cloudbooks.ae" />
              <Input label="Website" defaultValue="https://cloudbooks.ae" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Address</label>
              <textarea
                rows={3}
                defaultValue="Office 301, Business Bay Tower&#10;Sheikh Zayed Road&#10;Dubai, UAE"
                className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div className="flex justify-end">
              <Button><Save size={16} className="mr-1" /> Save Changes</Button>
            </div>
          </div>
        );
      case 'localization':
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">Localization</h3>
              <p className="text-sm text-gray-500 mt-1">Configure regional settings for your business</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Base Currency</label>
                <select className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg text-sm">
                  <option>AED - UAE Dirham</option>
                  <option>USD - US Dollar</option>
                  <option>EUR - Euro</option>
                  <option>GBP - British Pound</option>
                  <option>SAR - Saudi Riyal</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Fiscal Year Start</label>
                <select className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg text-sm">
                  <option>January</option>
                  <option>April</option>
                  <option>July</option>
                  <option>October</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Date Format</label>
                <select className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg text-sm">
                  <option>DD/MM/YYYY</option>
                  <option>MM/DD/YYYY</option>
                  <option>YYYY-MM-DD</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Timezone</label>
                <select className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg text-sm">
                  <option>Asia/Dubai (GMT+4)</option>
                  <option>Asia/Riyadh (GMT+3)</option>
                  <option>Europe/London (GMT+0)</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end">
              <Button><Save size={16} className="mr-1" /> Save Changes</Button>
            </div>
          </div>
        );
      case 'billing':
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">Billing & Plan</h3>
              <p className="text-sm text-gray-500 mt-1">Manage your subscription and payment details</p>
            </div>
            <div className="p-4 bg-primary-50 dark:bg-primary-900/20 rounded-xl border border-primary-200 dark:border-primary-800">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="font-medium text-gray-900 dark:text-white">Professional Plan</h4>
                    <Badge variant="success">Active</Badge>
                  </div>
                  <p className="text-sm text-gray-500 mt-1">AED 199/month &middot; Billed monthly &middot; Renews Mar 1, 2026</p>
                </div>
                <Button variant="outline">Upgrade Plan</Button>
              </div>
            </div>
            <div>
              <h4 className="font-medium text-gray-900 dark:text-white mb-3">Payment Method</h4>
              <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <CreditCard size={20} className="text-gray-400" />
                <div>
                  <p className="text-sm font-medium">Visa ending in 4242</p>
                  <p className="text-xs text-gray-500">Expires 12/2027</p>
                </div>
                <Button variant="outline" size="sm" className="ml-auto">Update</Button>
              </div>
            </div>
          </div>
        );
      default:
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">
              {sections.find(s => s.id === activeSection)?.title}
            </h3>
            <p className="text-sm text-gray-500">
              {sections.find(s => s.id === activeSection)?.description}. Configuration options coming soon.
            </p>
          </div>
        );
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Settings</h1>
        <p className="text-gray-500 mt-1">Manage your account and company preferences</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar Navigation */}
        <div className="lg:col-span-1">
          <nav className="space-y-1">
            {sections.map((section) => {
              const Icon = section.icon;
              return (
                <button
                  key={section.id}
                  onClick={() => setActiveSection(section.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors ${
                    activeSection === section.id
                      ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300'
                      : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700/50'
                  }`}
                >
                  <Icon size={18} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{section.title}</p>
                    <p className="text-xs text-gray-500 truncate">{section.description}</p>
                  </div>
                  <ChevronRight size={14} className="text-gray-400 shrink-0" />
                </button>
              );
            })}
          </nav>
        </div>

        {/* Content Area */}
        <div className="lg:col-span-3">
          <Card>{renderSectionContent()}</Card>
        </div>
      </div>
    </div>
  );
}
