import { useState } from 'react';
import {
  LayoutDashboard, FileText, DollarSign, Users,
  Shield, List, Award, AlertCircle, CheckCircle, Clock
} from 'lucide-react';

// Mock payment data
const mockPayments = [
  {
    id: 'PAY-001',
    patientName: 'John Doe',
    amount: 450.00,
    date: '2025-11-08',
    method: 'Insurance',
    status: 'Posted',
    claimId: 'CLM-1234'
  },
  {
    id: 'PAY-002',
    patientName: 'Jane Smith',
    amount: 275.50,
    date: '2025-11-07',
    method: 'Credit Card',
    status: 'Posted',
    claimId: 'CLM-1235'
  },
  {
    id: 'PAY-003',
    patientName: 'Robert Johnson',
    amount: 892.00,
    date: '2025-11-07',
    method: 'Insurance',
    status: 'Posted',
    claimId: 'CLM-1236'
  },
  {
    id: 'PAY-004',
    patientName: 'Emily Davis',
    amount: 325.00,
    date: '2025-11-06',
    method: 'Check',
    status: 'Posted',
    claimId: 'CLM-1237'
  },
  {
    id: 'PAY-005',
    patientName: 'Michael Brown',
    amount: 540.75,
    date: '2025-11-05',
    method: 'Insurance',
    status: 'Posted',
    claimId: 'CLM-1238'
  }
];

// Mock claims requiring attention
const mockClaimsNeedingAttention = [
  {
    id: 'CLM-2101',
    patientName: 'Sarah Williams',
    issue: 'Denied - Missing Documentation',
    amount: 680.00,
    daysOutstanding: 15,
    priority: 'High',
    lastAction: '2025-10-25'
  },
  {
    id: 'CLM-2102',
    patientName: 'David Martinez',
    issue: 'Pending Additional Info',
    amount: 425.50,
    daysOutstanding: 8,
    priority: 'Medium',
    lastAction: '2025-11-01'
  },
  {
    id: 'CLM-2103',
    patientName: 'Lisa Anderson',
    issue: 'Payment Discrepancy',
    amount: 950.00,
    daysOutstanding: 22,
    priority: 'High',
    lastAction: '2025-10-18'
  },
  {
    id: 'CLM-2104',
    patientName: 'James Taylor',
    issue: 'Pre-Auth Expired',
    amount: 1200.00,
    daysOutstanding: 5,
    priority: 'Medium',
    lastAction: '2025-11-04'
  }
];

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
        {currentView === 'dashboard' ? (
          <>
            {/* Dashboard Overview */}
            <div className="bg-white rounded-lg shadow p-6 mb-6">
              <h2 className="text-xl font-semibold mb-4">Dashboard Overview</h2>
              <p className="text-gray-600 mb-4">
                Welcome to the Court Street Dental RCM Dashboard - Your centralized hub for revenue cycle management.
              </p>
            </div>

            {/* Feature Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
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

            {/* Recent Payments and Claims Requiring Attention */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Recent Payments Box */}
              <div className="bg-white rounded-lg shadow">
                <div className="p-6 border-b border-gray-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <DollarSign className="w-6 h-6 text-purple-600" />
                      <h3 className="text-lg font-semibold">Recent Payments</h3>
                    </div>
                    <button className="text-sm text-blue-600 hover:text-blue-800 font-medium">
                      View All
                    </button>
                  </div>
                </div>
                <div className="divide-y divide-gray-100">
                  {mockPayments.map((payment) => (
                    <div key={payment.id} className="p-4 hover:bg-gray-50 transition-colors">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <p className="font-medium text-gray-900">{payment.patientName}</p>
                          <p className="text-sm text-gray-500">
                            {payment.id} • {payment.claimId}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-green-600">
                            ${payment.amount.toFixed(2)}
                          </p>
                        </div>
                      </div>
                      <div className="flex justify-between items-center text-sm">
                        <div className="flex items-center space-x-2">
                          <span className="text-gray-500">{payment.method}</span>
                          <span className="text-gray-400">•</span>
                          <span className="text-gray-500">{payment.date}</span>
                        </div>
                        <div className="flex items-center space-x-1 text-green-600">
                          <CheckCircle className="w-4 h-4" />
                          <span>{payment.status}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="p-4 bg-gray-50 border-t border-gray-200">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-600">Total Recent Payments:</span>
                    <span className="font-bold text-lg text-green-600">
                      ${mockPayments.reduce((sum, p) => sum + p.amount, 0).toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Claims Requiring Attention Box */}
              <div className="bg-white rounded-lg shadow">
                <div className="p-6 border-b border-gray-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <AlertCircle className="w-6 h-6 text-red-600" />
                      <h3 className="text-lg font-semibold">Claims Requiring Attention</h3>
                    </div>
                    <button className="text-sm text-blue-600 hover:text-blue-800 font-medium">
                      View All
                    </button>
                  </div>
                </div>
                <div className="divide-y divide-gray-100">
                  {mockClaimsNeedingAttention.map((claim) => (
                    <div key={claim.id} className="p-4 hover:bg-gray-50 transition-colors">
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-1">
                            <p className="font-medium text-gray-900">{claim.patientName}</p>
                            <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${
                              claim.priority === 'High'
                                ? 'bg-red-100 text-red-800'
                                : 'bg-yellow-100 text-yellow-800'
                            }`}>
                              {claim.priority}
                            </span>
                          </div>
                          <p className="text-sm text-gray-600 mb-1">{claim.issue}</p>
                          <p className="text-xs text-gray-500">{claim.id}</p>
                        </div>
                        <div className="text-right ml-4">
                          <p className="font-semibold text-gray-900">
                            ${claim.amount.toFixed(2)}
                          </p>
                        </div>
                      </div>
                      <div className="flex justify-between items-center text-xs text-gray-500 mt-2">
                        <div className="flex items-center space-x-1">
                          <Clock className="w-3 h-3" />
                          <span>{claim.daysOutstanding} days outstanding</span>
                        </div>
                        <span>Last action: {claim.lastAction}</span>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="p-4 bg-red-50 border-t border-red-200">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-700">Total at Risk:</span>
                    <span className="font-bold text-lg text-red-600">
                      ${mockClaimsNeedingAttention.reduce((sum, c) => sum + c.amount, 0).toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </>
        ) : (
          /* Other Views */
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">
              {currentView.charAt(0).toUpperCase() + currentView.slice(1)} View
            </h2>
            <div className="space-y-4">
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
        )}
      </div>
    </div>
  );
};

export default CourtStreetRCM;
