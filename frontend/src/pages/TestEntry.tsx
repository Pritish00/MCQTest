import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '@/lib/api';
import { ClipboardCheck, User, Mail, KeyRound } from 'lucide-react';
import toast from 'react-hot-toast';

export default function TestEntry() {
  const { testId } = useParams<{ testId: string }>();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleStart = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await api.post('/attempt/start', {
        candidate_name: name,
        candidate_email: email,
        pin,
      });
      // Store attempt data in localStorage (survives tab close)
      localStorage.setItem('attempt_id', res.data.attempt_id);
      localStorage.setItem('test_data', JSON.stringify(res.data.test));
      if (res.data.resumed) {
        localStorage.setItem('attempt_resumed', 'true');
      }
      navigate(`/test/${testId}/take`);
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed to start test');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-primary-100 rounded-2xl mb-4">
            <ClipboardCheck className="w-8 h-8 text-primary-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900">MCQ Assessment</h1>
          <p className="text-gray-600 mt-2 text-base">Enter your details and PIN to begin</p>
        </div>

        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8">
          <form onSubmit={handleStart} className="space-y-6">
            <div>
              <label className="block text-base font-medium text-gray-800 mb-2">Full Name</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full pl-11 pr-4 py-3.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all text-base text-gray-900"
                  placeholder="Your full name"
                  required
                />
              </div>
            </div>
            <div>
              <label className="block text-base font-medium text-gray-800 mb-2">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-11 pr-4 py-3.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all text-base text-gray-900"
                  placeholder="your@email.com"
                  required
                />
              </div>
            </div>
            <div>
              <label className="block text-base font-medium text-gray-800 mb-2">Test PIN</label>
              <div className="relative">
                <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                  className="w-full pl-11 pr-4 py-3.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all tracking-widest text-center font-mono text-xl text-gray-900"
                  placeholder="000000"
                  maxLength={6}
                  required
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary-600 hover:bg-primary-700 text-white py-4 rounded-xl font-semibold text-base transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                'Start Test'
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
