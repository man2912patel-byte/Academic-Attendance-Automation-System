import React, { useState, useContext } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

export default function ForgotPassword() {
  const { forgotPassword } = useContext(AuthContext);
  const navigate = useNavigate();

  const [username, setUsername] = useState('');
  const [securityQuestion, setSecurityQuestion] = useState('What was the name of your first pet?');
  const [securityAnswer, setSecurityAnswer] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const securityQuestions = [
    "What was the name of your first pet?",
    "What is your mother's first name?",
    "What is your favourite teacher's name?",
    "What city were you born in?",
    "What is your favourite food?"
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!username.trim() || !securityAnswer.trim() || !newPassword || !confirmPassword) {
      setError('All fields are required.');
      return;
    }

    if (newPassword.length < 6) {
      setError('New password must be at least 6 characters.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      await forgotPassword(
        username.trim(),
        securityQuestion,
        securityAnswer.trim(),
        newPassword
      );
      setSuccess('Password updated successfully! Redirecting to login...');
      setTimeout(() => {
        navigate('/login');
      }, 2000);
    } catch (err) {
      setError(err.response?.data?.message || 'Incorrect security question/answer details.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-grow flex items-center justify-center bg-bg-main px-4 py-12 relative overflow-hidden animate-fade-in">
      <div className="max-w-md w-full card-premium p-8 shadow-md relative z-10 animate-slide-up">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center p-3 bg-accent-blue/10 rounded-2xl mb-4 text-accent-blue">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25a3 3 0 0 1 3 3m3 0a6 6 0 0 1-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1 1 21.75 8.25Z" />
            </svg>
          </div>
          <h2 className="text-3xl font-extrabold text-text-primary tracking-tight">Recover Password</h2>
          <p className="text-text-secondary mt-2 text-sm">Provide security question verification details</p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-sm flex items-center gap-2 animate-fade-in">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 flex-shrink-0 text-btn-absent">
              <path fillRule="evenodd" d="M9.401 3.003c1.155-2 4.043-2 5.197 0l7.355 12.748c1.154 2-.29 4.5-2.599 4.5H4.645c-2.309 0-3.752-2.5-2.598-4.5L9.401 3.003ZM12 8.25a.75.75 0 0 1 .75.75v3.75a.75.75 0 0 1-1.5 0V9a.75.75 0 0 1 .75-.75Zm0 8.25a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Z" clipRule="evenodd" />
            </svg>
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-700 text-sm flex items-center gap-2 animate-fade-in">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 flex-shrink-0 text-btn-present">
              <path fillRule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12Zm13.36-1.814a.75.75 0 1 0-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 0 0-1.06 1.06l2.25 2.25a.75.75 0 0 0 1.14-.094l3.74-5.24Z" clipRule="evenodd" />
            </svg>
            <span>{success}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <label className="block text-text-secondary font-semibold text-xs uppercase tracking-wider" htmlFor="username">
              Username
            </label>
            <input
              id="username"
              type="text"
              required
              className="w-full input-premium"
              placeholder="Enter username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <label className="block text-text-secondary font-semibold text-xs uppercase tracking-wider" htmlFor="security-question">
              Choose Security Question
            </label>
            <select
              id="security-question"
              className="w-full input-premium bg-white cursor-pointer"
              value={securityQuestion}
              onChange={(e) => setSecurityQuestion(e.target.value)}
            >
              {securityQuestions.map((q, idx) => (
                <option key={idx} value={q} className="bg-white">
                  {q}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label className="block text-text-secondary font-semibold text-xs uppercase tracking-wider" htmlFor="security-answer">
              Security Answer
            </label>
            <input
              id="security-answer"
              type="text"
              required
              className="w-full input-premium"
              placeholder="Type security answer"
              value={securityAnswer}
              onChange={(e) => setSecurityAnswer(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <label className="block text-text-secondary font-semibold text-xs uppercase tracking-wider" htmlFor="new-password">
              New Password
            </label>
            <input
              id="new-password"
              type="password"
              required
              className="w-full input-premium"
              placeholder="Minimum 6 characters"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <label className="block text-text-secondary font-semibold text-xs uppercase tracking-wider" htmlFor="confirm-password">
              Confirm New Password
            </label>
            <input
              id="confirm-password"
              type="password"
              required
              className="w-full input-premium"
              placeholder="Re-enter new password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full btn-base btn-primary mt-2"
          >
            {loading ? (
              <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
            ) : (
              'Reset Password'
            )}
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-border-main text-center text-xs">
          <Link
            to="/login"
            className="text-accent-blue font-bold hover:text-hover-blue transition"
          >
            Back to Sign In
          </Link>
        </div>
      </div>
    </div>
  );
}
