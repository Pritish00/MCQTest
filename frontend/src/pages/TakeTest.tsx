import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '@/lib/api';
import { TestPublic, ResultResponse } from '@/types';
import {
  ChevronLeft, ChevronRight, Clock, Send, AlertTriangle,
  CheckCircle2, XCircle, Trophy, RotateCcw, Maximize, ShieldAlert, ClipboardCheck,
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function TakeTest() {
  const { testId } = useParams<{ testId: string }>();
  const navigate = useNavigate();
  const [test, setTest] = useState<TestPublic | null>(null);
  const [attemptId, setAttemptId] = useState<string>('');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [timeLeft, setTimeLeft] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<ResultResponse | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [fullscreenWarning, setFullscreenWarning] = useState(false);
  const [tabWarnings, setTabWarnings] = useState(0);
  const [showTabWarning, setShowTabWarning] = useState(false);
  const initDone = useRef(false);

  const enterFullscreen = useCallback(() => {
    const el = document.documentElement;
    if (el.requestFullscreen) el.requestFullscreen().catch(() => {});
    else if ((el as any).webkitRequestFullscreen) (el as any).webkitRequestFullscreen();
    else if ((el as any).msRequestFullscreen) (el as any).msRequestFullscreen();
  }, []);

  // Init: load from localStorage, handle resume
  useEffect(() => {
    if (initDone.current) return;
    initDone.current = true;

    const savedAttemptId = localStorage.getItem('attempt_id');
    const savedTest = localStorage.getItem('test_data');
    const resumed = localStorage.getItem('attempt_resumed');

    if (!savedAttemptId || !savedTest) {
      navigate(`/test/${testId}`);
      return;
    }

    const parsed = JSON.parse(savedTest) as TestPublic;
    setTest(parsed);
    setAttemptId(savedAttemptId);

    if (resumed) {
      // Fetch saved answers and remaining time from server
      localStorage.removeItem('attempt_resumed');
      api.get(`/attempt/${savedAttemptId}/resume`).then((res) => {
        const { saved_answers, elapsed_seconds } = res.data;
        setAnswers(saved_answers || {});
        const remaining = Math.max(0, parsed.time_limit_minutes * 60 - elapsed_seconds);
        setTimeLeft(remaining);
      }).catch(() => {
        setTimeLeft(parsed.time_limit_minutes * 60);
      });
    } else {
      // Restore answers from localStorage if available
      const savedAnswers = localStorage.getItem(`answers_${savedAttemptId}`);
      if (savedAnswers) {
        try { setAnswers(JSON.parse(savedAnswers)); } catch {}
      }
      const savedTime = localStorage.getItem(`timeLeft_${savedAttemptId}`);
      if (savedTime) {
        setTimeLeft(parseInt(savedTime) || parsed.time_limit_minutes * 60);
      } else {
        setTimeLeft(parsed.time_limit_minutes * 60);
      }
    }
    enterFullscreen();
  }, [testId, navigate, enterFullscreen]);

  // Persist answers and timeLeft to localStorage
  useEffect(() => {
    if (attemptId && Object.keys(answers).length > 0) {
      localStorage.setItem(`answers_${attemptId}`, JSON.stringify(answers));
    }
  }, [answers, attemptId]);

  useEffect(() => {
    if (attemptId && timeLeft > 0) {
      localStorage.setItem(`timeLeft_${attemptId}`, String(timeLeft));
    }
  }, [timeLeft, attemptId]);

  // Detect fullscreen exit
  useEffect(() => {
    if (result) return;
    const handleFsChange = () => {
      if (!document.fullscreenElement && !result) {
        setFullscreenWarning(true);
      } else {
        setFullscreenWarning(false);
      }
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    document.addEventListener('webkitfullscreenchange', handleFsChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFsChange);
      document.removeEventListener('webkitfullscreenchange', handleFsChange);
    };
  }, [result]);

  // Block keyboard shortcuts: F12, Ctrl+Shift+I/J/C, Ctrl+U
  useEffect(() => {
    if (result) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F12') { e.preventDefault(); return; }
      if (e.ctrlKey && e.shiftKey && ['I', 'J', 'C'].includes(e.key.toUpperCase())) { e.preventDefault(); return; }
      if (e.ctrlKey && e.key.toUpperCase() === 'U') { e.preventDefault(); return; }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [result]);

  // Block right-click
  useEffect(() => {
    if (result) return;
    const handleContextMenu = (e: MouseEvent) => e.preventDefault();
    document.addEventListener('contextmenu', handleContextMenu);
    return () => document.removeEventListener('contextmenu', handleContextMenu);
  }, [result]);

  // Detect tab switch / visibility change
  useEffect(() => {
    if (result) return;
    const handleVisChange = () => {
      if (document.hidden) {
        setTabWarnings((prev) => {
          const next = prev + 1;
          if (next >= 3) {
            toast.error('Too many tab switches! Submitting test...');
            // Auto-submit after 3 tab switches
            setTimeout(() => submitTestRef.current?.(), 500);
          } else {
            setShowTabWarning(true);
          }
          return next;
        });
      }
    };
    document.addEventListener('visibilitychange', handleVisChange);
    return () => document.removeEventListener('visibilitychange', handleVisChange);
  }, [result]);

  // Exit fullscreen on result
  useEffect(() => {
    if (result && document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    }
    if (result) {
      // Clean up localStorage
      localStorage.removeItem('attempt_id');
      localStorage.removeItem('test_data');
      localStorage.removeItem(`answers_${attemptId}`);
      localStorage.removeItem(`timeLeft_${attemptId}`);
    }
  }, [result, attemptId]);

  const submitTest = useCallback(async () => {
    if (!test || !attemptId || submitting) return;
    setSubmitting(true);
    try {
      const answersList = test.questions.map((q) => ({
        question_id: q.id,
        selected_option: answers[q.id] || null,
      }));
      const res = await api.post(`/attempt/${attemptId}/submit`, { answers: answersList });
      setResult(res.data);
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed to submit test');
    } finally {
      setSubmitting(false);
    }
  }, [test, attemptId, answers, submitting]);

  const submitTestRef = useRef(submitTest);
  useEffect(() => { submitTestRef.current = submitTest; }, [submitTest]);

  // Auto-save answer to server
  const saveAnswerToServer = useCallback((questionId: string, option: string) => {
    if (!attemptId) return;
    api.post(`/attempt/${attemptId}/save-answer`, {
      question_id: questionId,
      selected_option: option,
    }).catch(() => {});
  }, [attemptId]);

  // Timer
  useEffect(() => {
    if (!test || result) return;
    if (timeLeft <= 0) {
      toast.error('Time is up! Submitting your test...');
      submitTest();
      return;
    }
    const timer = setInterval(() => setTimeLeft((t) => t - 1), 1000);
    return () => clearInterval(timer);
  }, [timeLeft, test, result, submitTest]);

  if (result) {
    const isPassed = result.percentage >= 40;
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
        <div className="w-full max-w-md">
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8 text-center">
            <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 ${isPassed ? 'bg-green-100' : 'bg-red-100'}`}>
              {isPassed ? (
                <Trophy className="w-10 h-10 text-green-600" />
              ) : (
                <XCircle className="w-10 h-10 text-red-500" />
              )}
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-1">
              {isPassed ? 'Congratulations!' : 'Test Completed'}
            </h2>
            <p className="text-gray-600 mb-6">{result.candidate_name} — {result.test_title}</p>

            <div className="bg-gray-50 rounded-xl p-6 mb-6">
              <div className="text-5xl font-bold mb-2" style={{ color: isPassed ? '#16a34a' : '#dc2626' }}>
                {result.percentage}%
              </div>
              <p className="text-gray-600 text-base">
                You scored <strong>{result.score}</strong> out of <strong>{result.total_questions}</strong>
              </p>
            </div>

            <div className="grid grid-cols-3 gap-3 mb-6">
              <div className="bg-green-50 rounded-xl p-3">
                <CheckCircle2 className="w-5 h-5 text-green-600 mx-auto mb-1" />
                <p className="text-lg font-bold text-green-700">{result.score}</p>
                <p className="text-xs text-green-600">Correct</p>
              </div>
              <div className="bg-red-50 rounded-xl p-3">
                <XCircle className="w-5 h-5 text-red-500 mx-auto mb-1" />
                <p className="text-lg font-bold text-red-600">{result.total_questions - result.score}</p>
                <p className="text-xs text-red-500">Wrong</p>
              </div>
              <div className="bg-primary-50 rounded-xl p-3">
                <RotateCcw className="w-5 h-5 text-primary-600 mx-auto mb-1" />
                <p className="text-lg font-bold text-primary-700">{result.total_questions}</p>
                <p className="text-xs text-primary-600">Total</p>
              </div>
            </div>

            <p className="text-base text-gray-500">You may close this window now.</p>
          </div>
        </div>
        </div>
      </div>
    );
  }

  if (!test) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-3 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
      </div>
    );
  }

  const questions = test.questions.sort((a, b) => a.order_num - b.order_num);
  const currentQ = questions[currentIndex];
  const totalQ = questions.length;
  const answeredCount = Object.keys(answers).length;

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
  };

  const isUrgent = timeLeft < 60;

  const selectAnswer = (option: string) => {
    setAnswers((prev) => ({ ...prev, [currentQ.id]: option }));
    saveAnswerToServer(currentQ.id, option);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top bar */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 pr-4 border-r border-gray-200">
              <ClipboardCheck className="w-5 h-5 text-primary-600" />
              <span className="text-sm font-bold text-gray-900">SnapIQ</span>
            </div>
            <div>
              <h1 className="font-semibold text-gray-900 text-base">{test.title}</h1>
              <p className="text-sm text-gray-500">{test.topic}</p>
            </div>
          </div>
          <div className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-base font-mono font-bold ${isUrgent ? 'bg-red-100 text-red-700 animate-pulse' : 'bg-gray-100 text-gray-800'}`}>
            <Clock className="w-4 h-4" />
            {formatTime(timeLeft)}
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex gap-6">
          {/* Question panel */}
          <div className="flex-1">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8">
              <div className="flex items-center justify-between mb-6">
                <span className="text-sm font-medium text-primary-600 bg-primary-50 px-3 py-1 rounded-full">
                  Question {currentIndex + 1} of {totalQ}
                </span>
                {answers[currentQ.id] && (
                  <span className="text-xs text-green-600 bg-green-50 px-2.5 py-1 rounded-full flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> Answered
                  </span>
                )}
              </div>

              <h2 className="text-xl font-semibold text-gray-900 mb-8 leading-relaxed">
                {currentQ.question_text}
              </h2>

              <div className="space-y-3">
                {[
                  { key: 'A', text: currentQ.option_a },
                  { key: 'B', text: currentQ.option_b },
                  { key: 'C', text: currentQ.option_c },
                  { key: 'D', text: currentQ.option_d },
                ].map((opt) => {
                  const isSelected = answers[currentQ.id] === opt.key;
                  return (
                    <button
                      key={opt.key}
                      onClick={() => selectAnswer(opt.key)}
                      className={`w-full text-left px-5 py-4 rounded-xl border-2 transition-all flex items-center gap-4 ${
                        isSelected
                          ? 'border-primary-500 bg-primary-50 text-primary-800'
                          : 'border-gray-100 hover:border-gray-200 hover:bg-gray-50 text-gray-700'
                      }`}
                    >
                      <span className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold shrink-0 ${
                        isSelected ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-500'
                      }`}>
                        {opt.key}
                      </span>
                      <span className="text-base">{opt.text}</span>
                    </button>
                  );
                })}
              </div>

              {/* Navigation */}
              <div className="flex items-center justify-between mt-8 pt-6 border-t border-gray-100">
                <button
                  onClick={() => setCurrentIndex((i) => Math.max(0, i - 1))}
                  disabled={currentIndex === 0}
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-base font-medium bg-gray-100 hover:bg-gray-200 text-gray-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  title="Go to previous question"
                >
                  <ChevronLeft className="w-5 h-5" /> Previous
                </button>

                {currentIndex === totalQ - 1 ? (
                  <button
                    onClick={() => setShowConfirm(true)}
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-base font-medium bg-green-600 hover:bg-green-700 text-white transition-colors"
                    title="Submit your test for grading"
                  >
                    <Send className="w-5 h-5" /> Submit Test
                  </button>
                ) : (
                  <button
                    onClick={() => setCurrentIndex((i) => Math.min(totalQ - 1, i + 1))}
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-base font-medium bg-primary-600 hover:bg-primary-700 text-white transition-colors"
                    title="Go to next question"
                  >
                    Next <ChevronRight className="w-5 h-5" />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Question navigator sidebar */}
          <div className="w-56 shrink-0">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 sticky top-20">
              <h3 className="text-base font-semibold text-gray-800 mb-3">Questions</h3>
              <div className="grid grid-cols-5 gap-2 mb-4">
                {questions.map((q, i) => {
                  const isAnswered = !!answers[q.id];
                  const isCurrent = i === currentIndex;
                  return (
                    <button
                      key={q.id}
                      onClick={() => setCurrentIndex(i)}
                      className={`w-9 h-9 rounded-lg text-xs font-bold transition-all ${
                        isCurrent
                          ? 'bg-primary-600 text-white ring-2 ring-primary-300'
                          : isAnswered
                          ? 'bg-green-100 text-green-700'
                          : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                      }`}
                    >
                      {i + 1}
                    </button>
                  );
                })}
              </div>
              <div className="space-y-2 text-sm text-gray-600">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-green-100 rounded" />
                  Answered ({answeredCount})
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-gray-100 rounded" />
                  Unanswered ({totalQ - answeredCount})
                </div>
              </div>
              <button
                onClick={() => setShowConfirm(true)}
                className="w-full mt-4 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium bg-green-600 hover:bg-green-700 text-white transition-colors"
              >
                <Send className="w-4 h-4" /> Submit
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Fullscreen warning overlay */}
      {fullscreenWarning && !result && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-sm w-full text-center">
            <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-7 h-7 text-red-600" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">Fullscreen Required</h3>
            <p className="text-sm text-gray-600 mb-6">
              You must stay in fullscreen mode during the test. Exiting fullscreen is not allowed.
            </p>
            <button
              onClick={() => { enterFullscreen(); setFullscreenWarning(false); }}
              className="w-full inline-flex items-center justify-center gap-2 bg-primary-600 hover:bg-primary-700 text-white px-6 py-3 rounded-xl font-semibold transition-colors text-sm"
            >
              <Maximize className="w-4 h-4" /> Return to Fullscreen
            </button>
          </div>
        </div>
      )}

      {/* Tab switch warning */}
      {showTabWarning && !result && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-sm w-full text-center">
            <div className="w-14 h-14 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <ShieldAlert className="w-7 h-7 text-orange-600" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">Tab Switch Detected!</h3>
            <p className="text-sm text-gray-600 mb-2">
              Switching tabs during the test is not allowed.
            </p>
            <p className="text-xs text-red-600 font-medium mb-6">
              Warning {tabWarnings} of 3 — your test will be auto-submitted after 3 violations.
            </p>
            <button
              onClick={() => { setShowTabWarning(false); enterFullscreen(); }}
              className="w-full inline-flex items-center justify-center gap-2 bg-primary-600 hover:bg-primary-700 text-white px-6 py-3 rounded-xl font-semibold transition-colors text-sm"
            >
              Continue Test
            </button>
          </div>
        </div>
      )}

      {/* Confirm modal */}
      {showConfirm && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-sm w-full">
            <div className="w-14 h-14 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-7 h-7 text-yellow-600" />
            </div>
            <h3 className="text-lg font-bold text-gray-800 text-center mb-2">Submit Test?</h3>
            <p className="text-sm text-gray-500 text-center mb-2">
              You've answered <strong>{answeredCount}</strong> of <strong>{totalQ}</strong> questions.
            </p>
            {answeredCount < totalQ && (
              <p className="text-xs text-red-500 text-center mb-4">
                {totalQ - answeredCount} question(s) are unanswered and will be marked incorrect.
              </p>
            )}
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowConfirm(false)}
                className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium bg-gray-100 hover:bg-gray-200 text-gray-700 transition-colors"
              >
                Review
              </button>
              <button
                onClick={() => { setShowConfirm(false); submitTest(); }}
                disabled={submitting}
                className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium bg-green-600 hover:bg-green-700 text-white transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {submitting ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <Send className="w-4 h-4" /> Confirm
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
