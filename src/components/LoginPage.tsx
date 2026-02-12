import { useState } from 'react';
import { Lock, Eye, EyeOff, AlertCircle, Shield, Users, Mail } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

type UserRole = 'admin' | 'team';

const ROLE_EMAILS: Record<UserRole, string> = {
  admin: 'admin@dashboard.local',
  team: 'team@dashboard.local',
};

export default function LoginPage() {
  const { signIn } = useAuth();
  const [email, setEmail] = useState(ROLE_EMAILS.team);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [role, setRole] = useState<UserRole>('team');

  const handleRoleChange = (newRole: UserRole) => {
    setRole(newRole);
    setEmail(ROLE_EMAILS[newRole]);
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) return;

    setLoading(true);
    setError('');

    const { error: signInError } = await signIn(email, password);
    if (signInError) {
      setError(signInError);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-blue-900">
      <div className="w-full max-w-sm mx-4">
        <div className="bg-gray-800/95 border border-gray-700 rounded-2xl shadow-2xl p-8">
          {/* Logo / Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-blue-600/20 border border-blue-500/30 mb-4">
              <Lock className="w-8 h-8 text-blue-400" />
            </div>
            <h1 className="text-xl font-bold text-white">Court Street Dental</h1>
            <p className="text-sm text-gray-400 mt-1">Select your role and enter password</p>
          </div>

          {/* Role Selector */}
          <div className="flex gap-2 mb-5">
            <button
              type="button"
              onClick={() => handleRoleChange('team')}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl font-medium text-sm transition-all ${
                role === 'team'
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/25'
                  : 'bg-gray-700/50 text-gray-400 hover:bg-gray-700 hover:text-gray-300 border border-gray-600'
              }`}
            >
              <Users className="w-4 h-4" />
              CSD Team
            </button>
            <button
              type="button"
              onClick={() => handleRoleChange('admin')}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl font-medium text-sm transition-all ${
                role === 'admin'
                  ? 'bg-amber-600 text-white shadow-lg shadow-amber-600/25'
                  : 'bg-gray-700/50 text-gray-400 hover:bg-gray-700 hover:text-gray-300 border border-gray-600'
              }`}
            >
              <Shield className="w-4 h-4" />
              Admin
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setError(''); }}
                  placeholder="Email address"
                  autoFocus
                  className="w-full pl-11 pr-4 py-3 bg-gray-700/50 border border-gray-600 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                />
              </div>
            </div>
            <div>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setError(''); }}
                  placeholder={role === 'admin' ? 'Admin password' : 'Team password'}
                  className="w-full px-4 py-3 pr-12 bg-gray-700/50 border border-gray-600 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-300"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 text-red-400 text-sm bg-red-900/20 border border-red-800/50 rounded-lg px-3 py-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !email.trim() || !password.trim()}
              className={`w-full py-3 disabled:cursor-not-allowed text-white font-medium rounded-xl transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 ${
                role === 'admin'
                  ? 'bg-amber-600 hover:bg-amber-500 disabled:bg-amber-600/50 focus:ring-amber-500'
                  : 'bg-blue-600 hover:bg-blue-500 disabled:bg-blue-600/50 focus:ring-blue-500'
              }`}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Signing in...
                </span>
              ) : (
                `Sign In as ${role === 'admin' ? 'Admin' : 'CSD Team'}`
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
