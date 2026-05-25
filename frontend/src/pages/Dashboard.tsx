import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '@/lib/api';
import { TestListItem } from '@/types';
import {
  PlusCircle, Users, Clock, Hash, Copy, Eye, Trash2,
  ToggleLeft, ToggleRight, FileText, AlertCircle, Link2,
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function Dashboard() {
  const [tests, setTests] = useState<TestListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const fetchTests = async () => {
    try {
      const res = await api.get('/tests/');
      setTests(res.data);
    } catch {
      toast.error('Failed to load tests');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchTests(); }, []);

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

  const copyLinkOnly = (test: TestListItem) => {
    copyToClipboard(`${window.location.origin}/test/${test.id}`);
    toast.success('Link copied!');
  };

  const copyPinOnly = (test: TestListItem) => {
    copyToClipboard(test.pin);
    toast.success('PIN copied!');
  };

  const toggleTest = async (id: string) => {
    try {
      await api.patch(`/tests/${id}/toggle`);
      fetchTests();
    } catch {
      toast.error('Failed to toggle test');
    }
  };

  const deleteTest = async (id: string) => {
    if (!confirm('Are you sure you want to delete this test?')) return;
    try {
      await api.delete(`/tests/${id}`);
      toast.success('Test deleted');
      fetchTests();
    } catch {
      toast.error('Failed to delete test');
    }
  };

  const totalAttempts = tests.reduce((sum, t) => sum + t.attempt_count, 0);
  const activeTests = tests.filter((t) => t.is_active).length;

  return (
    <div>
      <div className="flex items-center justify-between mb-10">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
          <p className="text-gray-600 dark:text-gray-400 text-base mt-1">Manage your MCQ tests and view results</p>
        </div>
        <Link
          to="/dashboard/create-test"
          className="inline-flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-white px-6 py-3 rounded-xl font-semibold transition-colors text-base"
        >
          <PlusCircle className="w-5 h-5" />
          Create Test
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-6 mb-10">
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-8 border border-gray-100 dark:border-slate-800 shadow-sm">
          <div className="flex items-center gap-5">
            <div className="w-14 h-14 bg-primary-100 dark:bg-primary-900/30 rounded-xl flex items-center justify-center">
              <FileText className="w-7 h-7 text-primary-600 dark:text-primary-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Tests</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">{tests.length}</p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-8 border border-gray-100 dark:border-slate-800 shadow-sm">
          <div className="flex items-center gap-5">
            <div className="w-14 h-14 bg-green-100 dark:bg-green-900/30 rounded-xl flex items-center justify-center">
              <ToggleRight className="w-7 h-7 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Active Tests</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">{activeTests}</p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-8 border border-gray-100 dark:border-slate-800 shadow-sm">
          <div className="flex items-center gap-5">
            <div className="w-14 h-14 bg-purple-100 dark:bg-purple-900/30 rounded-xl flex items-center justify-center">
              <Users className="w-7 h-7 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Attempts</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">{totalAttempts}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tests list */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-3 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
        </div>
      ) : tests.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 p-16 text-center">
          <AlertCircle className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-2">No tests yet</h3>
          <p className="text-gray-400 dark:text-gray-500 mb-6">Create your first test to get started</p>
          <Link
            to="/dashboard/create-test"
            className="inline-flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-white px-5 py-2.5 rounded-xl font-medium transition-colors text-sm"
          >
            <PlusCircle className="w-4 h-4" />
            Create Test
          </Link>
        </div>
      ) : (
        <div className="space-y-5">
          {tests.map((test) => (
            <div
              key={test.id}
              className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 p-7 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-white">{test.title}</h3>
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        test.is_active
                          ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                          : 'bg-gray-100 text-gray-500 dark:bg-slate-800 dark:text-gray-400'
                      }`}
                    >
                      {test.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  <p className="text-base text-gray-600 dark:text-gray-400 mb-4">Topic: {test.topic}</p>
                  <div className="flex items-center gap-6 text-sm text-gray-700 dark:text-gray-300">
                    <span className="flex items-center gap-1.5">
                      <Hash className="w-4 h-4 text-gray-500 dark:text-gray-400" /> PIN: <strong className="text-gray-900 dark:text-white">{test.pin}</strong>
                    </span>
                    <span className="flex items-center gap-1.5">
                      <FileText className="w-4 h-4" /> {test.num_questions} questions
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Clock className="w-4 h-4" /> {test.time_limit_minutes} min
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Users className="w-4 h-4" /> {test.attempt_count} attempts
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-1 ml-4">
                  <button
                    onClick={() => copyLinkOnly(test)}
                    className="group relative p-3 text-gray-500 dark:text-gray-400 hover:text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded-xl transition-all"
                  >
                    <Link2 className="w-5 h-5" />
                    <span className="absolute -bottom-9 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-xs px-2.5 py-1 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">Copy Link</span>
                  </button>
                  <button
                    onClick={() => copyPinOnly(test)}
                    className="group relative p-3 text-gray-500 dark:text-gray-400 hover:text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded-xl transition-all"
                  >
                    <Copy className="w-5 h-5" />
                    <span className="absolute -bottom-9 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-xs px-2.5 py-1 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">Copy PIN</span>
                  </button>
                  <button
                    onClick={() => navigate(`/dashboard/test/${test.id}`)}
                    className="group relative p-3 text-gray-500 dark:text-gray-400 hover:text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded-xl transition-all"
                  >
                    <Eye className="w-5 h-5" />
                    <span className="absolute -bottom-9 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-xs px-2.5 py-1 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">View Details</span>
                  </button>
                  <button
                    onClick={() => toggleTest(test.id)}
                    className="group relative p-3 text-gray-500 dark:text-gray-400 hover:text-yellow-600 hover:bg-yellow-50 dark:hover:bg-yellow-900/20 rounded-xl transition-all"
                  >
                    {test.is_active ? <ToggleRight className="w-5 h-5" /> : <ToggleLeft className="w-5 h-5" />}
                    <span className="absolute -bottom-9 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-xs px-2.5 py-1 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">{test.is_active ? 'Deactivate' : 'Activate'}</span>
                  </button>
                  <button
                    onClick={() => deleteTest(test.id)}
                    className="group relative p-3 text-gray-500 dark:text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-all"
                  >
                    <Trash2 className="w-5 h-5" />
                    <span className="absolute -bottom-9 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-xs px-2.5 py-1 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">Delete Test</span>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
