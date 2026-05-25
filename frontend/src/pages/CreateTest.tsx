import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '@/lib/api';
import {
  Sparkles, BookOpen, Hash, Clock, Copy, ExternalLink,
  ArrowLeft, CheckCircle2, RefreshCw, Check,
} from 'lucide-react';
import toast from 'react-hot-toast';

interface PreviewQuestion {
  question_text: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_answer: string;
}

export default function CreateTest() {
  const [title, setTitle] = useState('');
  const [topic, setTopic] = useState('');
  const [numQuestions, setNumQuestions] = useState(10);
  const [timeLimit, setTimeLimit] = useState(30);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [preview, setPreview] = useState<PreviewQuestion[] | null>(null);
  const [created, setCreated] = useState<{ id: string; pin: string; title: string } | null>(null);
  const navigate = useNavigate();

  const copyToClipboard = (text: string) => {
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(text);
    } else {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
    }
  };

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    setGenerating(true);
    try {
      const res = await api.post('/tests/preview', {
        topic,
        num_questions: numQuestions,
      });
      setPreview(res.data);
      toast.success('Questions generated! Review them below.');
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed to generate questions');
    } finally {
      setGenerating(false);
    }
  };

  const handleFinalize = async () => {
    if (!preview) return;
    setSaving(true);
    try {
      const res = await api.post('/tests/', {
        title,
        topic,
        num_questions: preview.length,
        time_limit_minutes: timeLimit,
        questions: preview,
      });
      setCreated({ id: res.data.id, pin: res.data.pin, title: res.data.title });
      toast.success('Test created successfully!');
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed to create test');
    } finally {
      setSaving(false);
    }
  };

  const handleRegenerate = async () => {
    setGenerating(true);
    try {
      const res = await api.post('/tests/preview', {
        topic,
        num_questions: numQuestions,
      });
      setPreview(res.data);
      toast.success('New questions generated!');
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed to regenerate questions');
    } finally {
      setGenerating(false);
    }
  };

  const testLink = created ? `${window.location.origin}/test/${created.id}` : '';

  const copyDetails = () => {
    copyToClipboard(`Test: ${created!.title}\nLink: ${testLink}\nPIN: ${created!.pin}`);
    toast.success('Copied to clipboard!');
  };

  // Step 3: Created
  if (created) {
    return (
      <div className="max-w-lg mx-auto mt-8">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="w-8 h-8 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Test Created!</h2>
          <p className="text-gray-600 mb-8">Share the link and PIN with candidates</p>

          <div className="bg-gray-50 rounded-xl p-6 mb-6 text-left space-y-4">
            <div>
              <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Test Link</label>
              <p className="text-sm text-primary-600 font-mono mt-1 break-all">{testLink}</p>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">PIN Code</label>
              <p className="text-3xl font-bold text-gray-900 mt-1 tracking-widest">{created.pin}</p>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={copyDetails}
              className="flex-1 inline-flex items-center justify-center gap-2 bg-primary-600 hover:bg-primary-700 text-white px-5 py-3 rounded-xl font-medium transition-colors text-base"
            >
              <Copy className="w-4 h-4" />
              Copy Link & PIN
            </button>
            <button
              onClick={() => navigate('/dashboard')}
              className="flex-1 inline-flex items-center justify-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-700 px-5 py-3 rounded-xl font-medium transition-colors text-base"
            >
              <ExternalLink className="w-4 h-4" />
              Go to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Step 2: Preview questions
  if (preview) {
    return (
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Review Questions</h1>
            <p className="text-gray-600 text-base mt-1">
              {preview.length} questions on <strong>{topic}</strong> — review before finalizing
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setPreview(null)}
              className="inline-flex items-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-700 px-5 py-3 rounded-xl font-medium transition-colors text-sm"
            >
              <ArrowLeft className="w-4 h-4" /> Go Back
            </button>
            <button
              onClick={handleRegenerate}
              disabled={generating}
              className="inline-flex items-center gap-2 bg-yellow-50 hover:bg-yellow-100 text-yellow-700 px-5 py-3 rounded-xl font-medium transition-colors text-sm disabled:opacity-50"
            >
              {generating ? (
                <div className="w-4 h-4 border-2 border-yellow-400/30 border-t-yellow-600 rounded-full animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4" />
              )}
              Regenerate
            </button>
            <button
              onClick={handleFinalize}
              disabled={saving}
              className="inline-flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-xl font-semibold transition-colors text-sm disabled:opacity-50"
            >
              {saving ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <Check className="w-4 h-4" />
              )}
              Finalize Test
            </button>
          </div>
        </div>

        <div className="space-y-4">
          {preview.map((q, i) => (
            <div key={i} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <p className="font-medium text-gray-900 text-base mb-4">
                <span className="text-primary-600 mr-2">Q{i + 1}.</span>
                {q.question_text}
              </p>
              <div className="grid grid-cols-2 gap-2">
                {(['A', 'B', 'C', 'D'] as const).map((letter) => {
                  const optionMap: Record<string, string> = { A: q.option_a, B: q.option_b, C: q.option_c, D: q.option_d };
                  const isCorrect = q.correct_answer === letter;
                  return (
                    <div
                      key={letter}
                      className={`flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm ${
                        isCorrect
                          ? 'bg-green-50 text-green-800 border border-green-200'
                          : 'bg-gray-50 text-gray-600'
                      }`}
                    >
                      <span className="font-semibold">{letter})</span> {optionMap[letter]}
                      {isCorrect && <CheckCircle2 className="w-4 h-4 ml-auto text-green-600 shrink-0" />}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        <div className="sticky bottom-4 mt-6">
          <div className="bg-white/90 backdrop-blur-sm border border-gray-200 rounded-2xl p-4 flex items-center justify-between shadow-lg">
            <p className="text-sm text-gray-600">
              {preview.length} questions ready · <strong>{title}</strong> · {timeLimit} min
            </p>
            <div className="flex items-center gap-3">
              <button
                onClick={handleRegenerate}
                disabled={generating}
                className="inline-flex items-center gap-2 text-yellow-700 hover:bg-yellow-50 px-4 py-2 rounded-xl font-medium transition-colors text-sm disabled:opacity-50"
              >
                <RefreshCw className="w-4 h-4" /> Regenerate
              </button>
              <button
                onClick={handleFinalize}
                disabled={saving}
                className="inline-flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-6 py-2.5 rounded-xl font-semibold transition-colors text-sm disabled:opacity-50"
              >
                {saving ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <Check className="w-4 h-4" />
                )}
                Finalize Test
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Step 1: Form
  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-10">
        <h1 className="text-3xl font-bold text-gray-900">Create New Test</h1>
        <p className="text-gray-600 text-base mt-1">AI-powered MCQ generation using Groq AI</p>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-10">
        <form onSubmit={handleGenerate} className="space-y-7">
          <div>
            <label className="block text-base font-medium text-gray-800 mb-2">Test Title</label>
            <div className="relative">
              <BookOpen className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full pl-11 pr-4 py-3.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all text-base text-gray-900"
                placeholder="e.g. JavaScript Fundamentals Assessment"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-base font-medium text-gray-800 mb-2">Topic</label>
            <div className="relative">
              <Sparkles className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                className="w-full pl-11 pr-4 py-3.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all text-base text-gray-900"
                placeholder="e.g. JavaScript ES6+, React Hooks, Python Data Structures"
                required
              />
            </div>
            <p className="text-sm text-gray-500 mt-2">Be specific for better quality questions</p>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="block text-base font-medium text-gray-800 mb-2">Number of Questions</label>
              <div className="relative">
                <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="number"
                  value={numQuestions}
                  onChange={(e) => setNumQuestions(Math.max(1, Math.min(50, parseInt(e.target.value) || 1)))}
                  className="w-full pl-11 pr-4 py-3.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all text-base text-gray-900"
                  min={1}
                  max={50}
                  required
                />
              </div>
            </div>
            <div>
              <label className="block text-base font-medium text-gray-800 mb-2">Time Limit (minutes)</label>
              <div className="relative">
                <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="number"
                  value={timeLimit}
                  onChange={(e) => setTimeLimit(Math.max(5, Math.min(180, parseInt(e.target.value) || 5)))}
                  className="w-full pl-11 pr-4 py-3.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all text-base text-gray-900"
                  min={5}
                  max={180}
                  required
                />
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={generating}
            className="w-full bg-primary-600 hover:bg-primary-700 text-white py-4 rounded-xl font-semibold transition-colors flex items-center justify-center gap-2 disabled:opacity-50 text-base"
          >
            {generating ? (
              <>
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Generating questions with AI...
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5" />
                Generate Test
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
