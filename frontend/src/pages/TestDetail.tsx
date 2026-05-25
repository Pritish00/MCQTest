import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '@/lib/api';
import { Test, AnswerDetail, TestAttempt } from '@/types';
import {
  ArrowLeft, Copy, Clock, Hash, Users, FileText, Download,
  CheckCircle2, XCircle, User, Mail, Eye, X, Link,
} from 'lucide-react';
import toast from 'react-hot-toast';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export default function TestDetail() {
  const { testId } = useParams<{ testId: string }>();
  const [test, setTest] = useState<Test | null>(null);
  const [loading, setLoading] = useState(true);
  const [answerReport, setAnswerReport] = useState<AnswerDetail[] | null>(null);
  const [reportCandidate, setReportCandidate] = useState<TestAttempt | null>(null);
  const [loadingReport, setLoadingReport] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    (async () => {
      try {
        const res = await api.get(`/tests/${testId}`);
        setTest(res.data);
      } catch {
        toast.error('Failed to load test');
        navigate('/dashboard');
      } finally {
        setLoading(false);
      }
    })();
  }, [testId]);

  const viewAnswers = async (attempt: TestAttempt) => {
    setLoadingReport(true);
    setReportCandidate(attempt);
    try {
      const res = await api.get(`/attempt/${attempt.id}/answers`);
      setAnswerReport(res.data);
    } catch {
      toast.error('Failed to load answer report');
      setReportCandidate(null);
    } finally {
      setLoadingReport(false);
    }
  };

  const closeReport = () => {
    setAnswerReport(null);
    setReportCandidate(null);
  };

  const getOptionText = (ans: AnswerDetail, letter: string) => {
    const map: Record<string, string> = { A: ans.option_a, B: ans.option_b, C: ans.option_c, D: ans.option_d };
    return map[letter] || '—';
  };

  const addPdfHeader = (doc: any) => {
    doc.setFillColor(37, 99, 235);
    doc.rect(0, 0, 210, 18, 'F');
    doc.setFontSize(14);
    doc.setTextColor(255, 255, 255);
    doc.text('MCQ Test Platform', 14, 12);
    doc.setFontSize(8);
    doc.text(new Date().toLocaleDateString(), 196, 12, { align: 'right' });
    doc.setTextColor(0);
  };

  const downloadIndividualReport = () => {
    if (!answerReport || !reportCandidate || !test) return;
    const doc = new jsPDF();
    addPdfHeader(doc);
    const pct = reportCandidate.total_questions > 0
      ? Math.round((reportCandidate.score / reportCandidate.total_questions) * 100)
      : 0;

    doc.setFontSize(18);
    doc.text('Individual Answer Report', 14, 32);
    doc.setFontSize(11);
    doc.setTextColor(100);
    doc.text(`Test: ${test.title} | Topic: ${test.topic}`, 14, 40);
    doc.text(`Candidate: ${reportCandidate.candidate_name} (${reportCandidate.candidate_email})`, 14, 46);
    doc.text(`Score: ${reportCandidate.score}/${reportCandidate.total_questions} (${pct}%)`, 14, 52);

    const tableData = answerReport.map((ans, i) => [
      `${i + 1}`,
      ans.question_text,
      ans.selected_option ? `${ans.selected_option}) ${getOptionText(ans, ans.selected_option)}` : 'No answer',
      `${ans.correct_answer}) ${getOptionText(ans, ans.correct_answer)}`,
      ans.is_correct ? 'Correct' : 'Wrong',
    ]);

    autoTable(doc, {
      startY: 60,
      head: [['#', 'Question', 'Candidate Answer', 'Correct Answer', 'Result']],
      body: tableData,
      columnStyles: {
        0: { cellWidth: 10 },
        1: { cellWidth: 60 },
        2: { cellWidth: 45 },
        3: { cellWidth: 45 },
        4: { cellWidth: 18 },
      },
      styles: { fontSize: 8, cellPadding: 3 },
      headStyles: { fillColor: [37, 99, 235] },
      bodyStyles: { valign: 'top' },
      didParseCell: (data: any) => {
        if (data.column.index === 4 && data.section === 'body') {
          if (data.cell.raw === 'Correct') {
            data.cell.styles.textColor = [22, 163, 74];
            data.cell.styles.fontStyle = 'bold';
          } else {
            data.cell.styles.textColor = [220, 38, 38];
            data.cell.styles.fontStyle = 'bold';
          }
        }
      },
    });

    const fileName = `${reportCandidate.candidate_name.replace(/\s+/g, '_')}_${test.title.replace(/\s+/g, '_')}_Report.pdf`;
    doc.save(fileName);
    toast.success('Report PDF downloaded!');
  };

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

  const copyLinkOnly = () => {
    if (!test) return;
    copyToClipboard(`${window.location.origin}/test/${test.id}`);
    toast.success('Link copied!');
  };

  const copyPinOnly = () => {
    if (!test) return;
    copyToClipboard(test.pin);
    toast.success('PIN copied!');
  };

  const downloadPDF = () => {
    if (!test) return;
    const doc = new jsPDF();
    addPdfHeader(doc);

    doc.setFontSize(18);
    doc.text(test.title, 14, 32);
    doc.setFontSize(11);
    doc.setTextColor(100);
    doc.text(`Topic: ${test.topic} | Questions: ${test.num_questions} | Time: ${test.time_limit_minutes} min`, 14, 40);

    doc.setFontSize(13);
    doc.setTextColor(0);
    doc.text('Questions & Answers', 14, 52);

    const tableData = test.questions
      .sort((a, b) => a.order_num - b.order_num)
      .map((q, i) => [
        `${i + 1}`,
        q.question_text,
        `A) ${q.option_a}\nB) ${q.option_b}\nC) ${q.option_c}\nD) ${q.option_d}`,
        q.correct_answer,
      ]);

    autoTable(doc, {
      startY: 58,
      head: [['#', 'Question', 'Options', 'Answer']],
      body: tableData,
      columnStyles: {
        0: { cellWidth: 10 },
        1: { cellWidth: 70 },
        2: { cellWidth: 80 },
        3: { cellWidth: 18 },
      },
      styles: { fontSize: 8, cellPadding: 3 },
      headStyles: { fillColor: [37, 99, 235] },
    });

    if (test.attempts.length > 0) {
      doc.addPage();
      doc.setFontSize(13);
      doc.text('Results', 14, 22);

      const resultsData = test.attempts.map((a, i) => [
        `${i + 1}`,
        a.candidate_name,
        a.candidate_email,
        `${a.score}/${a.total_questions}`,
        a.total_questions > 0 ? `${Math.round((a.score / a.total_questions) * 100)}%` : '0%',
        a.is_completed ? 'Completed' : 'In Progress',
      ]);

      autoTable(doc, {
        startY: 28,
        head: [['#', 'Name', 'Email', 'Score', '%', 'Status']],
        body: resultsData,
        styles: { fontSize: 8, cellPadding: 3 },
        headStyles: { fillColor: [37, 99, 235] },
      });
    }

    doc.save(`${test.title.replace(/\s+/g, '_')}_Report.pdf`);
    toast.success('PDF downloaded!');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-3 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
      </div>
    );
  }

  if (!test) return null;

  return (
    <div>
      <button
        onClick={() => navigate('/dashboard')}
        className="inline-flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-8 text-base font-medium"
      >
        <ArrowLeft className="w-4 h-4" /> Back to Dashboard
      </button>

      {/* Header */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm p-8 mb-8">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3 mb-3">
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{test.title}</h1>
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${test.is_active ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-gray-100 text-gray-500 dark:bg-slate-800 dark:text-gray-400'}`}>
                {test.is_active ? 'Active' : 'Inactive'}
              </span>
            </div>
            <p className="text-gray-600 dark:text-gray-400 text-base mb-5">Topic: {test.topic}</p>
            <div className="flex items-center gap-6 text-sm text-gray-700 dark:text-gray-300">
              <span className="flex items-center gap-1.5"><Hash className="w-4 h-4 text-gray-500 dark:text-gray-400" /> PIN: <strong className="text-gray-900 dark:text-white">{test.pin}</strong></span>
              <span className="flex items-center gap-1.5"><FileText className="w-4 h-4 text-gray-500 dark:text-gray-400" /> {test.num_questions} questions</span>
              <span className="flex items-center gap-1.5"><Clock className="w-4 h-4 text-gray-500 dark:text-gray-400" /> {test.time_limit_minutes} min</span>
              <span className="flex items-center gap-1.5"><Users className="w-4 h-4 text-gray-500 dark:text-gray-400" /> {test.attempts.length} attempts</span>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={copyLinkOnly} title="Copy test link" className="inline-flex items-center gap-2 bg-primary-50 dark:bg-primary-900/20 hover:bg-primary-100 dark:hover:bg-primary-900/40 text-primary-700 dark:text-primary-400 px-4 py-3 rounded-xl text-sm font-medium transition-colors">
              <Link className="w-4 h-4" /> Copy Link
            </button>
            <button onClick={copyPinOnly} title="Copy PIN code" className="inline-flex items-center gap-2 bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 text-gray-700 dark:text-gray-300 px-4 py-3 rounded-xl text-sm font-medium transition-colors">
              <Copy className="w-4 h-4" /> Copy PIN
            </button>
            <button onClick={downloadPDF} title="Download questions, answers and results as PDF" className="inline-flex items-center gap-2 bg-green-50 hover:bg-green-100 text-green-700 px-5 py-3 rounded-xl text-base font-medium transition-colors">
              <Download className="w-5 h-5" /> Download PDF
            </button>
          </div>
        </div>
      </div>

      {/* Questions */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm p-8 mb-8">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-5">Questions</h2>
        <div className="space-y-4">
          {test.questions.sort((a, b) => a.order_num - b.order_num).map((q, i) => (
            <div key={q.id} className="border border-gray-100 dark:border-slate-700 rounded-xl p-5">
              <p className="font-medium text-gray-900 dark:text-white text-base mb-4">
                <span className="text-primary-600 mr-2">Q{i + 1}.</span>
                {q.question_text}
              </p>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: 'A', text: q.option_a },
                  { label: 'B', text: q.option_b },
                  { label: 'C', text: q.option_c },
                  { label: 'D', text: q.option_d },
                ].map((opt) => (
                  <div
                    key={opt.label}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm ${
                      q.correct_answer === opt.label
                        ? 'bg-green-50 text-green-700 border border-green-200'
                        : 'bg-gray-50 text-gray-600'
                    }`}
                  >
                    <span className="font-semibold">{opt.label})</span> {opt.text}
                    {q.correct_answer === opt.label && <CheckCircle2 className="w-4 h-4 ml-auto text-green-600" />}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Results */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm p-8">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-5">Results ({test.attempts.length})</h2>
        {test.attempts.length === 0 ? (
          <p className="text-gray-400 dark:text-gray-500 text-center py-8">No attempts yet</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100 dark:border-slate-700">
                  <th className="text-left py-3.5 px-4 text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase">#</th>
                  <th className="text-left py-3.5 px-4 text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase">Candidate</th>
                  <th className="text-left py-3.5 px-4 text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase">Email</th>
                  <th className="text-left py-3.5 px-4 text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase">Score</th>
                  <th className="text-left py-3.5 px-4 text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase">Percentage</th>
                  <th className="text-left py-3.5 px-4 text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase">Status</th>
                  <th className="text-left py-3.5 px-4 text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase">Report</th>
                </tr>
              </thead>
              <tbody>
                {test.attempts.map((a, i) => {
                  const pct = a.total_questions > 0 ? Math.round((a.score / a.total_questions) * 100) : 0;
                  return (
                    <tr key={a.id} className="border-b border-gray-50 dark:border-slate-800 hover:bg-gray-50 dark:hover:bg-slate-800/50 align-middle">
                      <td className="py-3.5 px-4 text-sm text-gray-600 dark:text-gray-400">{i + 1}</td>
                      <td className="py-3.5 px-4 text-sm font-medium text-gray-900 dark:text-white">
                        <span className="inline-flex items-center gap-2"><User className="w-4 h-4 text-gray-500 dark:text-gray-400" />{a.candidate_name}</span>
                      </td>
                      <td className="py-3.5 px-4 text-sm text-gray-700 dark:text-gray-300">
                        <span className="inline-flex items-center gap-2"><Mail className="w-4 h-4 text-gray-500 dark:text-gray-400" />{a.candidate_email}</span>
                      </td>
                      <td className="py-3.5 px-4 text-sm font-semibold text-gray-900 dark:text-white">{a.score}/{a.total_questions}</td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          <div className="w-24 bg-gray-100 dark:bg-slate-700 rounded-full h-2">
                            <div
                              className={`h-2 rounded-full ${pct >= 70 ? 'bg-green-500' : pct >= 40 ? 'bg-yellow-500' : 'bg-red-500'}`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{pct}%</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        {a.is_completed ? (
                          <span className="inline-flex items-center gap-1 text-green-600 text-xs font-medium" title="Candidate has submitted the test">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Submitted
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-yellow-600 text-xs font-medium" title="Candidate started but hasn't submitted yet">
                            <Clock className="w-3.5 h-3.5" /> Not Submitted
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        {a.is_completed && (
                          <button
                            onClick={() => viewAnswers(a)}
                            className="inline-flex items-center gap-1.5 text-primary-600 hover:text-primary-800 text-sm font-medium"
                          >
                            <Eye className="w-4 h-4" /> View Answers
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {/* Answer Report Modal */}
      {reportCandidate && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-3xl w-full max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between p-6 border-b border-gray-100 dark:border-slate-800">
              <div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">Answer Report</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  {reportCandidate.candidate_name} ({reportCandidate.candidate_email}) — Score: {reportCandidate.score}/{reportCandidate.total_questions}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {answerReport && (
                  <button
                    onClick={downloadIndividualReport}
                    className="inline-flex items-center gap-2 bg-green-50 hover:bg-green-100 text-green-700 px-4 py-2 rounded-xl text-sm font-medium transition-colors"
                    title="Download this candidate's answer report as PDF"
                  >
                    <Download className="w-4 h-4" /> Download PDF
                  </button>
                )}
                <button onClick={closeReport} className="p-2 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-xl transition-colors">
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>
            </div>
            <div className="overflow-y-auto flex-1 p-6">
              {loadingReport ? (
                <div className="flex items-center justify-center py-12">
                  <div className="w-8 h-8 border-3 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
                </div>
              ) : answerReport ? (
                <div className="space-y-4">
                  {answerReport.map((ans, i) => (
                    <div key={i} className={`border rounded-xl p-5 ${ans.is_correct ? 'border-green-200 bg-green-50/30' : 'border-red-200 bg-red-50/30'}`}>
                      <div className="flex items-start justify-between mb-3">
                        <p className="font-medium text-gray-900 text-base flex-1">
                          <span className="text-primary-600 mr-2">Q{i + 1}.</span>
                          {ans.question_text}
                        </p>
                        {ans.is_correct ? (
                          <span className="inline-flex items-center gap-1 text-green-700 text-xs font-semibold bg-green-100 px-2.5 py-1 rounded-full shrink-0 ml-3">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Correct
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-red-700 text-xs font-semibold bg-red-100 px-2.5 py-1 rounded-full shrink-0 ml-3">
                            <XCircle className="w-3.5 h-3.5" /> Wrong
                          </span>
                        )}
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        {['A', 'B', 'C', 'D'].map((letter) => {
                          const isCorrect = ans.correct_answer === letter;
                          const isSelected = ans.selected_option === letter;
                          let cls = 'bg-gray-50 text-gray-600';
                          if (isCorrect) cls = 'bg-green-100 text-green-800 border border-green-300';
                          else if (isSelected && !isCorrect) cls = 'bg-red-100 text-red-800 border border-red-300';
                          return (
                            <div key={letter} className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm ${cls}`}>
                              <span className="font-semibold">{letter})</span> {getOptionText(ans, letter)}
                              {isCorrect && <CheckCircle2 className="w-4 h-4 ml-auto text-green-600" />}
                              {isSelected && !isCorrect && <XCircle className="w-4 h-4 ml-auto text-red-500" />}
                            </div>
                          );
                        })}
                      </div>
                      {!ans.selected_option && (
                        <p className="text-xs text-gray-500 mt-2 italic">No answer selected</p>
                      )}
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
