import { useState } from 'react';
import {
  LayoutDashboard, FileText, DollarSign, Users,
  Shield, List, Award, Search, AlertCircle, Clock, XCircle, CheckCircle,
  TrendingUp, Activity, CreditCard, ArrowDownCircle, ArrowUpCircle, UserCheck, ClipboardCheck
} from 'lucide-react';

const CourtStreetRCM = () => {
  const [currentView, setCurrentView] = useState('dashboard');
  const [searchQuery, setSearchQuery] = useState('');

  const csdGold = '#B8985F';

  // Dashboard data
  const dashboardData = {
    monthlyRevenue: 0,
    monthlyTarget: 50000,
    collectionRate: 0,
    activePatients: 0,
    activeClaims: 0,
    pendingPayments: 0,
    outstandingAR: 0
  };

  // Payments data
  const paymentsData = {
    todaysPayments: 0,
    weeklyPayments: 0,
    monthlyPayments: 0,
    pendingDeposits: 0,
    insurancePayments: 0,
    patientPayments: 0,
    unappliedCredits: 0,
    refundsPending: 0
  };

  // Patients data
  const patientsData = {
    totalPatients: 0,
    activePatients: 0,
    patientsWithBalance: 0,
    totalPatientAR: 0,
    patientARAging: {
      zeroToThirty: 0,
      thirtyOneToSixty: 0,
      sixtyOneToNinety: 0,
      ninetyPlus: 0
    },
    paymentPlans: 0,
    pastDueAccounts: 0
  };

  // Pre-Auths data
  const preAuthsData = {
    totalPreAuths: 0,
    pending: 0,
    approved: 0,
    denied: 0,
    expiringSoon: 0,
    expiringThisMonth: 0
  };

  // Claims data
  const claimsData = {
    totalActive: 0,
    pending: 0,
    denied: 0,
    overSixtyDays: 0,
    arAging: {
      zeroToThirty: { amount: 0, count: 0 },
      thirtyOneToSixty: { amount: 0, count: 0 },
      sixtyOneToNinety: { amount: 0, count: 0 },
      ninetyPlus: { amount: 0, count: 0 }
    }
  };

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
          <div className="space-y-6">
            {/* Dashboard Header */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-2xl font-bold mb-2" style={{ color: csdGold }}>
                Practice Overview Dashboard
              </h2>
              <p className="text-gray-600 text-sm">
                Real-time insights into your revenue cycle performance
              </p>
            </div>

            {/* Key Performance Indicators */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Monthly Revenue */}
              <div className="bg-gradient-to-br from-green-50 to-green-100 border-2 border-green-300 rounded-lg p-5 hover:shadow-lg transition-all">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-medium text-green-700 mb-1">Monthly Revenue</p>
                    <p className="text-3xl font-bold text-green-900">
                      ${dashboardData.monthlyRevenue.toLocaleString()}
                    </p>
                    <p className="text-xs text-green-600 mt-2">
                      Target: ${dashboardData.monthlyTarget.toLocaleString()}
                    </p>
                  </div>
                  <TrendingUp className="w-8 h-8 text-green-500" />
                </div>
              </div>

              {/* Collection Rate */}
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 border-2 border-blue-300 rounded-lg p-5 hover:shadow-lg transition-all">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-medium text-blue-700 mb-1">Collection Rate</p>
                    <p className="text-3xl font-bold text-blue-900">
                      {dashboardData.collectionRate}%
                    </p>
                    <p className="text-xs text-blue-600 mt-2">Industry avg: 95%</p>
                  </div>
                  <Activity className="w-8 h-8 text-blue-500" />
                </div>
              </div>

              {/* Active Patients */}
              <div className="bg-gradient-to-br from-purple-50 to-purple-100 border-2 border-purple-300 rounded-lg p-5 hover:shadow-lg transition-all">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-medium text-purple-700 mb-1">Active Patients</p>
                    <p className="text-3xl font-bold text-purple-900">
                      {dashboardData.activePatients}
                    </p>
                    <p className="text-xs text-purple-600 mt-2">This month</p>
                  </div>
                  <Users className="w-8 h-8 text-purple-500" />
                </div>
              </div>

              {/* Outstanding A/R */}
              <div className="bg-gradient-to-br from-amber-50 to-amber-100 border-2 border-amber-300 rounded-lg p-5 hover:shadow-lg transition-all">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-medium text-amber-700 mb-1">Outstanding A/R</p>
                    <p className="text-3xl font-bold text-amber-900">
                      ${dashboardData.outstandingAR.toLocaleString()}
                    </p>
                    <p className="text-xs text-amber-600 mt-2">Total receivables</p>
                  </div>
                  <DollarSign className="w-8 h-8 text-amber-500" />
                </div>
              </div>
            </div>

            {/* Claims & Payments Overview */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Claims Status */}
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-bold mb-4" style={{ color: csdGold }}>
                  Claims Status
                </h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <CheckCircle className="w-5 h-5 text-blue-600" />
                      <span className="text-sm font-medium text-gray-700">Active Claims</span>
                    </div>
                    <span className="text-lg font-bold text-blue-900">
                      {dashboardData.activeClaims}
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <Clock className="w-5 h-5 text-yellow-600" />
                      <span className="text-sm font-medium text-gray-700">Pending Claims</span>
                    </div>
                    <span className="text-lg font-bold text-yellow-900">
                      {claimsData.pending}
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <XCircle className="w-5 h-5 text-red-600" />
                      <span className="text-sm font-medium text-gray-700">Denied Claims</span>
                    </div>
                    <span className="text-lg font-bold text-red-900">
                      {claimsData.denied}
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-orange-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <AlertCircle className="w-5 h-5 text-orange-600" />
                      <span className="text-sm font-medium text-gray-700">Claims &gt;60 Days</span>
                    </div>
                    <span className="text-lg font-bold text-orange-900">
                      {claimsData.overSixtyDays}
                    </span>
                  </div>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-bold mb-4" style={{ color: csdGold }}>
                  Quick Actions
                </h3>
                <div className="space-y-3">
                  <button
                    onClick={() => setCurrentView('claims')}
                    className="w-full flex items-center justify-between p-3 bg-gradient-to-r from-blue-50 to-blue-100 hover:from-blue-100 hover:to-blue-200 rounded-lg transition-all"
                  >
                    <div className="flex items-center space-x-3">
                      <FileText className="w-5 h-5 text-blue-600" />
                      <span className="text-sm font-medium text-gray-700">Review Claims</span>
                    </div>
                    <span className="text-xs text-blue-600">→</span>
                  </button>
                  <button
                    onClick={() => setCurrentView('payments')}
                    className="w-full flex items-center justify-between p-3 bg-gradient-to-r from-green-50 to-green-100 hover:from-green-100 hover:to-green-200 rounded-lg transition-all"
                  >
                    <div className="flex items-center space-x-3">
                      <DollarSign className="w-5 h-5 text-green-600" />
                      <span className="text-sm font-medium text-gray-700">Process Payments</span>
                    </div>
                    <span className="text-xs text-green-600">→</span>
                  </button>
                  <button
                    onClick={() => setCurrentView('patients')}
                    className="w-full flex items-center justify-between p-3 bg-gradient-to-r from-purple-50 to-purple-100 hover:from-purple-100 hover:to-purple-200 rounded-lg transition-all"
                  >
                    <div className="flex items-center space-x-3">
                      <Users className="w-5 h-5 text-purple-600" />
                      <span className="text-sm font-medium text-gray-700">Manage Patients</span>
                    </div>
                    <span className="text-xs text-purple-600">→</span>
                  </button>
                  <button
                    onClick={() => setCurrentView('scorecard')}
                    className="w-full flex items-center justify-between p-3 bg-gradient-to-r from-amber-50 to-amber-100 hover:from-amber-100 hover:to-amber-200 rounded-lg transition-all"
                  >
                    <div className="flex items-center space-x-3">
                      <Award className="w-5 h-5 text-amber-600" />
                      <span className="text-sm font-medium text-gray-700">View Scorecard</span>
                    </div>
                    <span className="text-xs text-amber-600">→</span>
                  </button>
                </div>
              </div>
            </div>

            {/* A/R Aging Summary */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-bold mb-4" style={{ color: csdGold }}>
                A/R Aging Summary
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-4 bg-green-50 rounded-lg border border-green-200">
                  <p className="text-sm font-medium text-green-700 mb-1">0-30 Days</p>
                  <p className="text-2xl font-bold text-green-900">
                    ${claimsData.arAging.zeroToThirty.amount.toLocaleString()}
                  </p>
                </div>
                <div className="text-center p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                  <p className="text-sm font-medium text-yellow-700 mb-1">31-60 Days</p>
                  <p className="text-2xl font-bold text-yellow-900">
                    ${claimsData.arAging.thirtyOneToSixty.amount.toLocaleString()}
                  </p>
                </div>
                <div className="text-center p-4 bg-orange-50 rounded-lg border border-orange-200">
                  <p className="text-sm font-medium text-orange-700 mb-1">61-90 Days</p>
                  <p className="text-2xl font-bold text-orange-900">
                    ${claimsData.arAging.sixtyOneToNinety.amount.toLocaleString()}
                  </p>
                </div>
                <div className="text-center p-4 bg-red-50 rounded-lg border border-red-200">
                  <p className="text-sm font-medium text-red-700 mb-1">90+ Days</p>
                  <p className="text-2xl font-bold text-red-900">
                    ${claimsData.arAging.ninetyPlus.amount.toLocaleString()}
                  </p>
                </div>
              </div>
            </div>
          </div>
        ) : currentView === 'claims' ? (
          <div className="space-y-6">
            {/* Claims Header */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-2xl font-bold mb-6" style={{ color: csdGold }}>
                Claims Management
              </h2>

              {/* Search Bar */}
              <div className="mb-6">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="text"
                    placeholder="Search by Patient, ID, or Insurance Plan..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              {/* Claims Statistics Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                {/* Total Active Claims */}
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 border-2 border-blue-200 rounded-lg p-5 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-medium text-blue-700 mb-1">Total Active Claims</p>
                      <p className="text-3xl font-bold text-blue-900">{claimsData.totalActive}</p>
                      <p className="text-xs text-blue-600 mt-2">In process</p>
                    </div>
                    <CheckCircle className="w-8 h-8 text-blue-500" />
                  </div>
                </div>

                {/* Pending Claims */}
                <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 border-2 border-yellow-200 rounded-lg p-5 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-medium text-yellow-700 mb-1">Pending Claims</p>
                      <p className="text-3xl font-bold text-yellow-900">{claimsData.pending}</p>
                      <p className="text-xs text-yellow-600 mt-2">Awaiting response</p>
                    </div>
                    <Clock className="w-8 h-8 text-yellow-500" />
                  </div>
                </div>

                {/* Denied Claims */}
                <div className="bg-gradient-to-br from-red-50 to-red-100 border-2 border-red-200 rounded-lg p-5 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-medium text-red-700 mb-1">Denied Claims</p>
                      <p className="text-3xl font-bold text-red-900">{claimsData.denied}</p>
                      <p className="text-xs text-red-600 mt-2">Need attention</p>
                    </div>
                    <XCircle className="w-8 h-8 text-red-500" />
                  </div>
                </div>

                {/* Claims >60 Days */}
                <div className="bg-gradient-to-br from-orange-50 to-orange-100 border-2 border-orange-200 rounded-lg p-5 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-medium text-orange-700 mb-1">Claims &gt;60 Days</p>
                      <p className="text-3xl font-bold text-orange-900">{claimsData.overSixtyDays}</p>
                      <p className="text-xs text-orange-600 mt-2">Priority follow-up</p>
                    </div>
                    <AlertCircle className="w-8 h-8 text-orange-500" />
                  </div>
                </div>
              </div>
            </div>

            {/* AR Aging Analysis */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-xl font-bold mb-6" style={{ color: csdGold }}>
                Insurance A/R Aging Analysis
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* 0-30 Days */}
                <div className="bg-gradient-to-br from-green-50 to-green-100 border-2 border-green-300 rounded-lg p-5 hover:shadow-lg transition-all">
                  <div className="text-center">
                    <p className="text-sm font-semibold text-green-800 mb-2">0-30 Days</p>
                    <p className="text-2xl font-bold text-green-900 mb-1">
                      ${claimsData.arAging.zeroToThirty.amount.toLocaleString()}
                    </p>
                    <p className="text-lg font-medium text-green-700">
                      {claimsData.arAging.zeroToThirty.count}
                    </p>
                    <p className="text-xs text-green-600 mt-1">Claims</p>
                  </div>
                </div>

                {/* 31-60 Days */}
                <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 border-2 border-yellow-300 rounded-lg p-5 hover:shadow-lg transition-all">
                  <div className="text-center">
                    <p className="text-sm font-semibold text-yellow-800 mb-2">31-60 Days</p>
                    <p className="text-2xl font-bold text-yellow-900 mb-1">
                      ${claimsData.arAging.thirtyOneToSixty.amount.toLocaleString()}
                    </p>
                    <p className="text-lg font-medium text-yellow-700">
                      {claimsData.arAging.thirtyOneToSixty.count}
                    </p>
                    <p className="text-xs text-yellow-600 mt-1">Claims</p>
                  </div>
                </div>

                {/* 61-90 Days */}
                <div className="bg-gradient-to-br from-orange-50 to-orange-100 border-2 border-orange-300 rounded-lg p-5 hover:shadow-lg transition-all">
                  <div className="text-center">
                    <p className="text-sm font-semibold text-orange-800 mb-2">61-90 Days</p>
                    <p className="text-2xl font-bold text-orange-900 mb-1">
                      ${claimsData.arAging.sixtyOneToNinety.amount.toLocaleString()}
                    </p>
                    <p className="text-lg font-medium text-orange-700">
                      {claimsData.arAging.sixtyOneToNinety.count}
                    </p>
                    <p className="text-xs text-orange-600 mt-1">Claims</p>
                  </div>
                </div>

                {/* 90+ Days */}
                <div className="bg-gradient-to-br from-red-50 to-red-100 border-2 border-red-300 rounded-lg p-5 hover:shadow-lg transition-all">
                  <div className="text-center">
                    <p className="text-sm font-semibold text-red-800 mb-2">90+ Days</p>
                    <p className="text-2xl font-bold text-red-900 mb-1">
                      ${claimsData.arAging.ninetyPlus.amount.toLocaleString()}
                    </p>
                    <p className="text-lg font-medium text-red-700">
                      {claimsData.arAging.ninetyPlus.count}
                    </p>
                    <p className="text-xs text-red-600 mt-1">Claims</p>
                  </div>
                </div>
              </div>

              {/* Summary Bar */}
              <div className="mt-6 p-4 bg-gray-50 border border-gray-200 rounded-lg">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-700">Total Outstanding A/R:</span>
                  <span className="text-xl font-bold" style={{ color: csdGold }}>
                    ${(
                      claimsData.arAging.zeroToThirty.amount +
                      claimsData.arAging.thirtyOneToSixty.amount +
                      claimsData.arAging.sixtyOneToNinety.amount +
                      claimsData.arAging.ninetyPlus.amount
                    ).toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          </div>
        ) : currentView === 'payments' ? (
          <div className="space-y-6">
            {/* Payments Header */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-2xl font-bold mb-6" style={{ color: csdGold }}>
                Payment Processing & Reconciliation
              </h2>

              {/* Payment Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Today's Payments */}
                <div className="bg-gradient-to-br from-green-50 to-green-100 border-2 border-green-300 rounded-lg p-5 hover:shadow-lg transition-all">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-medium text-green-700 mb-1">Today's Payments</p>
                      <p className="text-3xl font-bold text-green-900">
                        ${paymentsData.todaysPayments.toLocaleString()}
                      </p>
                      <p className="text-xs text-green-600 mt-2">Posted today</p>
                    </div>
                    <DollarSign className="w-8 h-8 text-green-500" />
                  </div>
                </div>

                {/* Weekly Payments */}
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 border-2 border-blue-300 rounded-lg p-5 hover:shadow-lg transition-all">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-medium text-blue-700 mb-1">Weekly Payments</p>
                      <p className="text-3xl font-bold text-blue-900">
                        ${paymentsData.weeklyPayments.toLocaleString()}
                      </p>
                      <p className="text-xs text-blue-600 mt-2">Last 7 days</p>
                    </div>
                    <TrendingUp className="w-8 h-8 text-blue-500" />
                  </div>
                </div>

                {/* Monthly Payments */}
                <div className="bg-gradient-to-br from-purple-50 to-purple-100 border-2 border-purple-300 rounded-lg p-5 hover:shadow-lg transition-all">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-medium text-purple-700 mb-1">Monthly Payments</p>
                      <p className="text-3xl font-bold text-purple-900">
                        ${paymentsData.monthlyPayments.toLocaleString()}
                      </p>
                      <p className="text-xs text-purple-600 mt-2">This month</p>
                    </div>
                    <Activity className="w-8 h-8 text-purple-500" />
                  </div>
                </div>

                {/* Pending Deposits */}
                <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 border-2 border-yellow-300 rounded-lg p-5 hover:shadow-lg transition-all">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-medium text-yellow-700 mb-1">Pending Deposits</p>
                      <p className="text-3xl font-bold text-yellow-900">
                        ${paymentsData.pendingDeposits.toLocaleString()}
                      </p>
                      <p className="text-xs text-yellow-600 mt-2">Awaiting deposit</p>
                    </div>
                    <Clock className="w-8 h-8 text-yellow-500" />
                  </div>
                </div>
              </div>
            </div>

            {/* Payment Breakdown */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Payment Sources */}
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-bold mb-4" style={{ color: csdGold }}>
                  Payment Sources
                </h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <div className="flex items-center space-x-3">
                      <Shield className="w-6 h-6 text-blue-600" />
                      <div>
                        <p className="text-sm font-medium text-gray-700">Insurance Payments</p>
                        <p className="text-xs text-gray-500">EOB reconciliation</p>
                      </div>
                    </div>
                    <p className="text-xl font-bold text-blue-900">
                      ${paymentsData.insurancePayments.toLocaleString()}
                    </p>
                  </div>
                  <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg border border-green-200">
                    <div className="flex items-center space-x-3">
                      <Users className="w-6 h-6 text-green-600" />
                      <div>
                        <p className="text-sm font-medium text-gray-700">Patient Payments</p>
                        <p className="text-xs text-gray-500">Direct patient collections</p>
                      </div>
                    </div>
                    <p className="text-xl font-bold text-green-900">
                      ${paymentsData.patientPayments.toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>

              {/* Payment Actions */}
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-bold mb-4" style={{ color: csdGold }}>
                  Action Items
                </h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-orange-50 rounded-lg border border-orange-200">
                    <div className="flex items-center space-x-3">
                      <CreditCard className="w-5 h-5 text-orange-600" />
                      <span className="text-sm font-medium text-gray-700">Unapplied Credits</span>
                    </div>
                    <span className="text-lg font-bold text-orange-900">
                      ${paymentsData.unappliedCredits.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg border border-red-200">
                    <div className="flex items-center space-x-3">
                      <ArrowUpCircle className="w-5 h-5 text-red-600" />
                      <span className="text-sm font-medium text-gray-700">Refunds Pending</span>
                    </div>
                    <span className="text-lg font-bold text-red-900">
                      ${paymentsData.refundsPending.toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Recent Payment Activity */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-bold mb-4" style={{ color: csdGold }}>
                Recent Payment Activity
              </h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 border-b border-gray-200">
                  <div className="flex items-center space-x-3">
                    <ArrowDownCircle className="w-5 h-5 text-green-600" />
                    <div>
                      <p className="text-sm font-medium text-gray-700">No recent payments</p>
                      <p className="text-xs text-gray-500">Awaiting payment data</p>
                    </div>
                  </div>
                  <span className="text-sm text-gray-500">--</span>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg text-center">
                  <p className="text-sm text-gray-600">
                    Payment activity will appear here as transactions are processed
                  </p>
                </div>
              </div>
            </div>
          </div>
        ) : currentView === 'patients' ? (
          <div className="space-y-6">
            {/* Patients Header */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-2xl font-bold mb-6" style={{ color: csdGold }}>
                Patient Accounts Receivable Management
              </h2>

              {/* Search Bar */}
              <div className="mb-6">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="text"
                    placeholder="Search patients by name, ID, or phone number..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              {/* Patient Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Total Patients */}
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 border-2 border-blue-300 rounded-lg p-5 hover:shadow-lg transition-all">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-medium text-blue-700 mb-1">Total Patients</p>
                      <p className="text-3xl font-bold text-blue-900">
                        {patientsData.totalPatients}
                      </p>
                      <p className="text-xs text-blue-600 mt-2">In practice</p>
                    </div>
                    <Users className="w-8 h-8 text-blue-500" />
                  </div>
                </div>

                {/* Active Patients */}
                <div className="bg-gradient-to-br from-green-50 to-green-100 border-2 border-green-300 rounded-lg p-5 hover:shadow-lg transition-all">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-medium text-green-700 mb-1">Active Patients</p>
                      <p className="text-3xl font-bold text-green-900">
                        {patientsData.activePatients}
                      </p>
                      <p className="text-xs text-green-600 mt-2">Last 12 months</p>
                    </div>
                    <UserCheck className="w-8 h-8 text-green-500" />
                  </div>
                </div>

                {/* Patients with Balance */}
                <div className="bg-gradient-to-br from-orange-50 to-orange-100 border-2 border-orange-300 rounded-lg p-5 hover:shadow-lg transition-all">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-medium text-orange-700 mb-1">Patients w/ Balance</p>
                      <p className="text-3xl font-bold text-orange-900">
                        {patientsData.patientsWithBalance}
                      </p>
                      <p className="text-xs text-orange-600 mt-2">Require follow-up</p>
                    </div>
                    <AlertCircle className="w-8 h-8 text-orange-500" />
                  </div>
                </div>

                {/* Total Patient A/R */}
                <div className="bg-gradient-to-br from-purple-50 to-purple-100 border-2 border-purple-300 rounded-lg p-5 hover:shadow-lg transition-all">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-medium text-purple-700 mb-1">Total Patient A/R</p>
                      <p className="text-3xl font-bold text-purple-900">
                        ${patientsData.totalPatientAR.toLocaleString()}
                      </p>
                      <p className="text-xs text-purple-600 mt-2">Outstanding balance</p>
                    </div>
                    <DollarSign className="w-8 h-8 text-purple-500" />
                  </div>
                </div>
              </div>
            </div>

            {/* Patient A/R Aging */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-bold mb-4" style={{ color: csdGold }}>
                Patient A/R Aging Analysis
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-gradient-to-br from-green-50 to-green-100 border-2 border-green-300 rounded-lg p-5 hover:shadow-lg transition-all">
                  <div className="text-center">
                    <p className="text-sm font-semibold text-green-800 mb-2">0-30 Days</p>
                    <p className="text-2xl font-bold text-green-900">
                      ${patientsData.patientARAging.zeroToThirty.toLocaleString()}
                    </p>
                    <p className="text-xs text-green-600 mt-1">Current</p>
                  </div>
                </div>
                <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 border-2 border-yellow-300 rounded-lg p-5 hover:shadow-lg transition-all">
                  <div className="text-center">
                    <p className="text-sm font-semibold text-yellow-800 mb-2">31-60 Days</p>
                    <p className="text-2xl font-bold text-yellow-900">
                      ${patientsData.patientARAging.thirtyOneToSixty.toLocaleString()}
                    </p>
                    <p className="text-xs text-yellow-600 mt-1">Follow-up needed</p>
                  </div>
                </div>
                <div className="bg-gradient-to-br from-orange-50 to-orange-100 border-2 border-orange-300 rounded-lg p-5 hover:shadow-lg transition-all">
                  <div className="text-center">
                    <p className="text-sm font-semibold text-orange-800 mb-2">61-90 Days</p>
                    <p className="text-2xl font-bold text-orange-900">
                      ${patientsData.patientARAging.sixtyOneToNinety.toLocaleString()}
                    </p>
                    <p className="text-xs text-orange-600 mt-1">Action required</p>
                  </div>
                </div>
                <div className="bg-gradient-to-br from-red-50 to-red-100 border-2 border-red-300 rounded-lg p-5 hover:shadow-lg transition-all">
                  <div className="text-center">
                    <p className="text-sm font-semibold text-red-800 mb-2">90+ Days</p>
                    <p className="text-2xl font-bold text-red-900">
                      ${patientsData.patientARAging.ninetyPlus.toLocaleString()}
                    </p>
                    <p className="text-xs text-red-600 mt-1">Collections</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Payment Plans & Collections */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Payment Plans */}
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-bold mb-4" style={{ color: csdGold }}>
                  Payment Plans
                </h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <div className="flex items-center space-x-3">
                      <CheckCircle className="w-6 h-6 text-blue-600" />
                      <div>
                        <p className="text-sm font-medium text-gray-700">Active Payment Plans</p>
                        <p className="text-xs text-gray-500">Patients on scheduled payments</p>
                      </div>
                    </div>
                    <p className="text-2xl font-bold text-blue-900">
                      {patientsData.paymentPlans}
                    </p>
                  </div>
                </div>
              </div>

              {/* Past Due Accounts */}
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-bold mb-4" style={{ color: csdGold }}>
                  Collections Status
                </h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-4 bg-red-50 rounded-lg border border-red-200">
                    <div className="flex items-center space-x-3">
                      <XCircle className="w-6 h-6 text-red-600" />
                      <div>
                        <p className="text-sm font-medium text-gray-700">Past Due Accounts</p>
                        <p className="text-xs text-gray-500">Require immediate attention</p>
                      </div>
                    </div>
                    <p className="text-2xl font-bold text-red-900">
                      {patientsData.pastDueAccounts}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Recent Patient Activity */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-bold mb-4" style={{ color: csdGold }}>
                Recent Patient Activity
              </h3>
              <div className="p-4 bg-gray-50 rounded-lg text-center">
                <p className="text-sm text-gray-600">
                  Patient activity and recent transactions will appear here
                </p>
              </div>
            </div>
          </div>
        ) : currentView === 'preauths' ? (
          <div className="space-y-6">
            {/* Pre-Auths Header */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-2xl font-bold mb-6" style={{ color: csdGold }}>
                Pre-Authorization Management
              </h2>

              {/* Search Bar */}
              <div className="mb-6">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="text"
                    placeholder="Search pre-auths by patient, procedure, or auth number..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              {/* Pre-Auth Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Total Pre-Auths */}
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 border-2 border-blue-300 rounded-lg p-5 hover:shadow-lg transition-all">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-medium text-blue-700 mb-1">Total Pre-Auths</p>
                      <p className="text-3xl font-bold text-blue-900">
                        {preAuthsData.totalPreAuths}
                      </p>
                      <p className="text-xs text-blue-600 mt-2">Active requests</p>
                    </div>
                    <ClipboardCheck className="w-8 h-8 text-blue-500" />
                  </div>
                </div>

                {/* Pending Pre-Auths */}
                <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 border-2 border-yellow-300 rounded-lg p-5 hover:shadow-lg transition-all">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-medium text-yellow-700 mb-1">Pending</p>
                      <p className="text-3xl font-bold text-yellow-900">
                        {preAuthsData.pending}
                      </p>
                      <p className="text-xs text-yellow-600 mt-2">Awaiting decision</p>
                    </div>
                    <Clock className="w-8 h-8 text-yellow-500" />
                  </div>
                </div>

                {/* Approved Pre-Auths */}
                <div className="bg-gradient-to-br from-green-50 to-green-100 border-2 border-green-300 rounded-lg p-5 hover:shadow-lg transition-all">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-medium text-green-700 mb-1">Approved</p>
                      <p className="text-3xl font-bold text-green-900">
                        {preAuthsData.approved}
                      </p>
                      <p className="text-xs text-green-600 mt-2">Ready for treatment</p>
                    </div>
                    <CheckCircle className="w-8 h-8 text-green-500" />
                  </div>
                </div>

                {/* Denied Pre-Auths */}
                <div className="bg-gradient-to-br from-red-50 to-red-100 border-2 border-red-300 rounded-lg p-5 hover:shadow-lg transition-all">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-medium text-red-700 mb-1">Denied</p>
                      <p className="text-3xl font-bold text-red-900">
                        {preAuthsData.denied}
                      </p>
                      <p className="text-xs text-red-600 mt-2">Require appeal</p>
                    </div>
                    <XCircle className="w-8 h-8 text-red-500" />
                  </div>
                </div>
              </div>
            </div>

            {/* Expiration Tracking */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Expiring Soon */}
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-bold mb-4" style={{ color: csdGold }}>
                  Expiration Alerts
                </h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-4 bg-orange-50 rounded-lg border border-orange-200">
                    <div className="flex items-center space-x-3">
                      <AlertCircle className="w-6 h-6 text-orange-600" />
                      <div>
                        <p className="text-sm font-medium text-gray-700">Expiring in 7 Days</p>
                        <p className="text-xs text-gray-500">Urgent action required</p>
                      </div>
                    </div>
                    <p className="text-2xl font-bold text-orange-900">
                      {preAuthsData.expiringSoon}
                    </p>
                  </div>
                  <div className="flex items-center justify-between p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                    <div className="flex items-center space-x-3">
                      <Clock className="w-6 h-6 text-yellow-600" />
                      <div>
                        <p className="text-sm font-medium text-gray-700">Expiring This Month</p>
                        <p className="text-xs text-gray-500">Monitor closely</p>
                      </div>
                    </div>
                    <p className="text-2xl font-bold text-yellow-900">
                      {preAuthsData.expiringThisMonth}
                    </p>
                  </div>
                </div>
              </div>

              {/* Pre-Auth Status by Insurance */}
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-bold mb-4" style={{ color: csdGold }}>
                  Status by Insurance
                </h3>
                <div className="p-4 bg-gray-50 rounded-lg text-center">
                  <p className="text-sm text-gray-600">
                    Insurance breakdown will appear here when pre-auths are submitted
                  </p>
                </div>
              </div>
            </div>

            {/* Recent Pre-Auth Activity */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-bold mb-4" style={{ color: csdGold }}>
                Recent Pre-Authorization Activity
              </h3>
              <div className="p-4 bg-gray-50 rounded-lg text-center">
                <p className="text-sm text-gray-600">
                  Recent pre-auth submissions and decisions will appear here
                </p>
              </div>
            </div>
          </div>
        ) : (
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
        )}

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
