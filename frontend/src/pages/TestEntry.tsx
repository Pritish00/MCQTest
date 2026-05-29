import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '@/lib/api';
import {
  ClipboardCheck, User, Mail, KeyRound, ArrowRight,
  Timer, AlertTriangle, Monitor, CheckCircle2, ShieldCheck,
} from 'lucide-react';
import toast from 'react-hot-toast';

interface TestMeta {
  title: string;
  topic: string;
  num_questions: number;
  time_limit_minutes: number;
}

export default function TestEntry() {
  const { testId } = useParams<{ testId: string }>();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<'creds' | 'instructions'>('creds');
  const [testMeta, setTestMeta] = useState<TestMeta | null>(null);
  const navigate = useNavigate();

  const handleVerify = async (e: React.FormEvent) => {
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
      setTestMeta({
        title: res.data.test.title,
        topic: res.data.test.topic,
        num_questions: res.data.test.num_questions,
        time_limit_minutes: res.data.test.time_limit_minutes,
      });
      setStep('instructions');
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed to verify');
    } finally {
      setLoading(false);
    }
  };

  const handleBeginTest = () => {
    navigate(`/test/${testId}/take`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-3xl mx-auto flex items-center gap-3">
          <ClipboardCheck className="w-6 h-6 text-primary-600" />
          <span className="text-lg font-bold text-gray-900">SnapIQ</span>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center p-4">
        {step === 'creds' ? (
          <div className="w-full max-w-md">
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-primary-100 rounded-2xl mb-4">
                <ClipboardCheck className="w-8 h-8 text-primary-600" />
              </div>
              <h1 className="text-3xl font-bold text-gray-900">MCQ Assessment</h1>
              <p className="text-gray-600 mt-2 text-base">Enter your details and PIN to continue</p>
            </div>

            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8">
              <form onSubmit={handleVerify} className="space-y-6">
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
                    <>Continue <ArrowRight className="w-5 h-5" /></>
                  )}
                </button>
              </form>
            </div>
          </div>
        ) : (
          <div className="w-full max-w-2xl">
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
              {/* Test info header */}
              <div className="bg-primary-600 px-8 py-6 text-white">
                <h1 className="text-2xl font-bold">{testMeta?.title}</h1>
                <p className="text-primary-100 mt-1">Topic: {testMeta?.topic}</p>
                <div className="flex items-center gap-6 mt-4 text-sm text-primary-100">
                  <span className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4" /> {testMeta?.num_questions} Questions
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Timer className="w-4 h-4" /> {testMeta?.time_limit_minutes} Minutes
                  </span>
                </div>
              </div>

              {/* Instructions */}
              <div className="p-8">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Instructions</h2>
                <div className="space-y-3 text-gray-700 text-[15px]">
                  <div className="flex items-start gap-3">
                    <Timer className="w-5 h-5 text-primary-500 mt-0.5 shrink-0" />
                    <p>The test has a time limit of <strong>{testMeta?.time_limit_minutes} minutes</strong>. It will auto-submit when time runs out.</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-primary-500 mt-0.5 shrink-0" />
                    <p>There are <strong>{testMeta?.num_questions} multiple-choice questions</strong>. Each question has exactly one correct answer.</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <Monitor className="w-5 h-5 text-primary-500 mt-0.5 shrink-0" />
                    <p>The test will enter <strong>fullscreen mode</strong>. Please do not exit fullscreen during the test.</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-amber-500 mt-0.5 shrink-0" />
                    <p><strong>Do not switch tabs</strong> or open developer tools. Violations are tracked and may result in auto-submission.</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <ShieldCheck className="w-5 h-5 text-primary-500 mt-0.5 shrink-0" />
                    <p>Your answers are <strong>auto-saved</strong>. If you lose connection, you can resume from where you left off with the same email.</p>
                  </div>
                </div>

                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mt-6">
                  <p className="text-sm text-amber-800">
                    <strong>Important:</strong> Once you click "Start Test", the timer will begin immediately. Make sure you are ready before proceeding.
                  </p>
                </div>

                <button
                  onClick={handleBeginTest}
                  className="w-full mt-6 bg-green-600 hover:bg-green-700 text-white py-4 rounded-xl font-semibold text-base transition-colors flex items-center justify-center gap-2"
                >
                  Start Test <ArrowRight className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
