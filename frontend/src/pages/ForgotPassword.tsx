import { useState, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '@/lib/api';
import { Mail, KeyRound, Lock, ArrowLeft, ShieldCheck } from 'lucide-react';
import toast from 'react-hot-toast';

export default function ForgotPassword() {
  const navigate = useNavigate();
  const [step, setStep] = useState<'email' | 'reset'>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [resetCode, setResetCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const captchaData = useMemo(() => {
    const chars = Array.from({ length: 6 }, () => ({
      rotate: Math.random() * 30 - 15,
      y: Math.random() * 10 - 5,
      scale: 0.85 + Math.random() * 0.3,
    }));
    const lines = Array.from({ length: 5 }, () => ({
      x1: Math.random() * 30, y1: Math.random() * 50,
      x2: 250 + Math.random() * 50, y2: Math.random() * 50,
      color: `rgba(${Math.floor(Math.random() * 150)},${Math.floor(Math.random() * 150)},${Math.floor(Math.random() * 150)},0.4)`,
    }));
    const dots = Array.from({ length: 40 }, () => ({
      cx: Math.random() * 300, cy: Math.random() * 56,
      r: Math.random() * 2 + 0.5,
      color: `rgba(0,0,0,${(Math.random() * 0.3).toFixed(2)})`,
    }));
    return { chars, lines, dots };
  }, [resetCode]);

  const handleRequestCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await api.post('/auth/forgot-password', { email });
      setResetCode(res.data.code);
      setStep('reset');
      toast.success('Reset code generated!');
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed to generate reset code');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    if (newPassword.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    setLoading(true);
    try {
      await api.post('/auth/reset-password', { email, code, new_password: newPassword });
      toast.success('Password reset successfully!');
      navigate('/login');
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed to reset password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-800 via-slate-900 to-slate-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-white/10 backdrop-blur-sm rounded-2xl mb-4">
            <ShieldCheck className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white">Reset Password</h1>
          <p className="text-slate-400 mt-2">
            {step === 'email' ? 'Enter your email to get a reset code' : 'Enter the code and your new password'}
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl p-8">
          {step === 'email' ? (
            <form onSubmit={handleRequestCode} className="space-y-6">
              <div>
                <label className="block text-base font-medium text-gray-800 mb-2">Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-11 pr-4 py-3.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all text-base text-gray-900"
                    placeholder="admin@company.com"
                    required
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-primary-600 hover:bg-primary-700 text-white py-3.5 rounded-xl font-semibold transition-colors flex items-center justify-center gap-2 disabled:opacity-50 text-base"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  'Get Reset Code'
                )}
              </button>
            </form>
          ) : (
            <>
              {resetCode && (
                <div className="mb-6 text-center">
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-3">Enter this code below</p>
                  <div className="inline-block rounded-lg overflow-hidden border border-gray-300 shadow-inner">
                    <svg width="280" height="56" viewBox="0 0 280 56" className="select-none" style={{ background: 'linear-gradient(135deg, #f1f5f9, #e8ecf0, #f3f4f6)' }}>
                      {/* Noise dots */}
                      {captchaData.dots.map((d, i) => (
                        <circle key={`d${i}`} cx={d.cx} cy={d.cy} r={d.r} fill={d.color} />
                      ))}
                      {/* Crossing lines */}
                      {captchaData.lines.map((l, i) => (
                        <line key={`l${i}`} x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2} stroke={l.color} strokeWidth={1.5} />
                      ))}
                      {/* Characters */}
                      {resetCode.split('').map((digit, i) => {
                        const s = captchaData.chars[i];
                        const x = 28 + i * 40;
                        const y = 34 + s.y;
                        const color = ['#1e40af', '#7c3aed', '#0f766e', '#c2410c', '#be123c', '#4338ca'][i % 6];
                        return (
                          <text
                            key={i}
                            x={x}
                            y={y}
                            textAnchor="middle"
                            fontSize={28 * s.scale}
                            fontWeight="800"
                            fontFamily="'Courier New', monospace"
                            fill={color}
                            transform={`rotate(${s.rotate}, ${x}, ${y})`}
                            style={{ userSelect: 'none' }}
                          >
                            {digit}
                          </text>
                        );
                      })}
                    </svg>
                  </div>
                  <p className="text-xs text-gray-400 mt-2">Expires in 10 minutes</p>
                </div>
              )}
              <form onSubmit={handleReset} className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-gray-800 mb-1.5">Reset Code</label>
                  <div className="relative">
                    <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="text"
                      value={code}
                      onChange={(e) => setCode(e.target.value)}
                      className="w-full pl-11 pr-4 py-3.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all text-base text-gray-900 tracking-widest text-center font-mono"
                      placeholder="000000"
                      maxLength={6}
                      required
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-800 mb-1.5">New Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full pl-11 pr-4 py-3.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all text-base text-gray-900"
                      placeholder="••••••••"
                      required
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-800 mb-1.5">Confirm Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full pl-11 pr-4 py-3.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all text-base text-gray-900"
                      placeholder="••••••••"
                      required
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-primary-600 hover:bg-primary-700 text-white py-3.5 rounded-xl font-semibold transition-colors flex items-center justify-center gap-2 disabled:opacity-50 text-base"
                >
                  {loading ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    'Reset Password'
                  )}
                </button>
              </form>
            </>
          )}

          <div className="mt-6 text-center">
            <Link to="/login" className="inline-flex items-center gap-1.5 text-sm text-primary-600 hover:text-primary-700 font-medium">
              <ArrowLeft className="w-4 h-4" /> Back to Sign In
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
