import { useState } from 'react';
import {
  LayoutDashboard, FileText, DollarSign, Users,
  Shield, List, Award
} from 'lucide-react';

const CourtStreetRCM = () => {
  const [currentView, setCurrentView] = useState('dashboard');

  const csdGold = '#B8985F';

  const navigation = [
    { id: 'dashboard', name: 'Dashboard', icon: LayoutDashboard },
    { id: 'claims', name: 'Claims', icon: FileText },
    { id: 'payments', name: 'Payments', icon: DollarSign },
    { id: 'patients', name: 'Patients', icon: Users },
    { id: 'preauths', name: 'Pre-Auths', icon: FileText },
    { id: 'insurance', name: 'Insurance', icon: Shield },
    { id: 'scorecard', name: 'Scorecard', icon: Award },
    { id: 'checklist', name: 'Checklist', icon: List }
  ];

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold" style={{ color: csdGold }}>
                Court Street Dental RCM Dashboard
              </h1>
              <p className="text-sm text-gray-600 mt-1">
                Powered by Stellar Consults - Revenue Cycle Management Solutions
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-500">A Collaborative Solution</p>
              <p className="text-xs font-medium text-gray-700">Court Street Dental × Stellar Consults</p>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="bg-white shadow mb-6">
        <div className="max-w-7xl mx-auto px-4">
          <nav className="flex space-x-8 overflow-x-auto">
            {navigation.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => setCurrentView(item.id)}
                  className={`flex items-center space-x-2 py-4 px-2 border-b-2 font-medium text-sm transition-colors whitespace-nowrap ${
                    currentView === item.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span>{item.name}</span>
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">
            {currentView.charAt(0).toUpperCase() + currentView.slice(1)} View
          </h2>
          <div className="space-y-4">
            <p className="text-gray-600">
              Welcome to the Court Street Dental RCM Dashboard.
            </p>
            <p className="text-gray-600">
              This comprehensive Revenue Cycle Management application includes:
            </p>
            <ul className="list-disc list-inside text-gray-600 space-y-2 ml-4">
              <li>Claims Management & Tracking</li>
              <li>Payment Processing & Reconciliation</li>
              <li>Patient Accounts Receivable</li>
              <li>Pre-Authorization Management</li>
              <li>Insurance Portal Integration</li>
              <li>Practice Scorecard Metrics</li>
              <li>Daily, Weekly & Monthly Checklists</li>
            </ul>
            <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-800">
                <strong>Current view:</strong> <span className="font-semibold capitalize">{currentView}</span>
              </p>
              <p className="text-sm text-blue-700 mt-2">
                Full implementation with data management, forms, and reporting features coming soon.
              </p>
            </div>
          </div>
        </div>

        {/* Feature Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
          <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg p-6 text-white shadow-lg">
            <LayoutDashboard className="w-8 h-8 mb-2" />
            <h3 className="font-semibold mb-1">Dashboard</h3>
            <p className="text-sm text-blue-100">KPIs & Analytics</p>
          </div>

          <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-lg p-6 text-white shadow-lg">
            <FileText className="w-8 h-8 mb-2" />
            <h3 className="font-semibold mb-1">Claims</h3>
            <p className="text-sm text-green-100">Track & Manage</p>
          </div>

          <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg p-6 text-white shadow-lg">
            <DollarSign className="w-8 h-8 mb-2" />
            <h3 className="font-semibold mb-1">Payments</h3>
            <p className="text-sm text-purple-100">Process & Record</p>
          </div>

          <div className="bg-gradient-to-br from-amber-500 to-amber-600 rounded-lg p-6 text-white shadow-lg">
            <Users className="w-8 h-8 mb-2" />
            <h3 className="font-semibold mb-1">Patients</h3>
            <p className="text-sm text-amber-100">A/R Management</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CourtStreetRCM;
