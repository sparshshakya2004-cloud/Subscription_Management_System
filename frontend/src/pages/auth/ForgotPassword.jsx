import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, ArrowLeft, Send, CheckCircle2, Copy } from 'lucide-react';
import api from '../../services/api';
import { useToast } from '../../context/ToastContext';

export const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [devInfo, setDevInfo] = useState(null);
  const [submitted, setSubmitted] = useState(false);

  const { showToast } = useToast();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email) {
      showToast('warning', 'Please enter your registered email address.');
      return;
    }

    try {
      setLoading(true);
      const res = await api.post('/auth/forgot-password', { email });
      setSubmitted(true);
      if (res.data.dev_info) {
        setDevInfo(res.data.dev_info);
      }
      showToast('success', 'Reset instructions generated.');
    } catch (err) {
      showToast('error', err.response?.data?.detail || 'Request failed.');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    showToast('info', 'Reset link copied to clipboard!');
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col justify-center items-center p-6 text-slate-100">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-500 mx-auto flex items-center justify-center text-white font-bold text-2xl shadow-xl shadow-blue-500/25 mb-4">
            B
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">
            Reset Password
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Enter your email to receive a password reset authorization
          </p>
        </div>

        <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-8 backdrop-blur-xl shadow-2xl">
          {!submitted ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@company.com"
                    required
                    className="w-full bg-slate-900/60 border border-slate-700 rounded-xl px-10 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-500 text-white font-medium py-2.5 rounded-xl transition-all shadow-md shadow-blue-600/30 flex items-center justify-center gap-2 mt-6 cursor-pointer"
              >
                <Send className="w-4 h-4" />
                <span>{loading ? 'Processing...' : 'Send Reset Link'}</span>
              </button>
            </form>
          ) : (
            <div className="text-center py-4">
              <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto mb-3" />
              <h3 className="text-base font-semibold text-white mb-2">Instructions Dispatched</h3>
              <p className="text-xs text-slate-300 mb-4 leading-relaxed">
                If an account exists with {email}, a password reset token has been generated.
              </p>

              {devInfo && (
                <div className="mt-4 p-4 rounded-xl bg-slate-900/90 border border-blue-500/30 text-left text-xs">
                  <div className="font-semibold text-blue-400 uppercase text-[10px] tracking-wider mb-1">
                    Development Mode Preview
                  </div>
                  <p className="text-slate-400 text-[11px] mb-2">
                    SMTP server is not configured in local environment. Click below to reset directly:
                  </p>
                  <Link
                    to={`/reset-password?token=${devInfo.token}`}
                    className="inline-block px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-medium text-xs transition-colors mb-2"
                  >
                    Open Reset Password Page →
                  </Link>
                  <div className="flex items-center justify-between bg-slate-950 p-2 rounded border border-slate-800 text-[11px] font-mono text-slate-300 break-all">
                    <span>Token: {devInfo.token.slice(0, 16)}...</span>
                    <button
                      onClick={() => copyToClipboard(devInfo.token)}
                      className="text-slate-400 hover:text-white p-1"
                      title="Copy Token"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="mt-6 pt-4 border-t border-slate-700/60 text-center">
            <Link
              to="/login"
              className="inline-flex items-center gap-2 text-xs font-medium text-slate-400 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Login</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
