import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../components/common/Button';
import { Input } from '../components/common/Input';
import { authApi } from '../services/api';
import toast from 'react-hot-toast';

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await authApi.forgotPassword(email);
      setSent(true);
      toast.success('Reset link sent to your email');
    } catch { toast.error('Something went wrong'); }
    setLoading(false);
  };

  if (sent) {
    return (
      <div className="text-center space-y-4">
        <h2 className="text-xl font-semibold">Check your email</h2>
        <p className="text-sm text-gray-500">We sent a password reset link to {email}</p>
        <Link to="/login" className="text-primary-600 hover:text-primary-700 text-sm font-medium">Back to sign in</Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <h2 className="text-xl font-semibold text-center">Reset your password</h2>
      <p className="text-sm text-gray-500 text-center">Enter your email and we'll send you a reset link</p>
      <Input label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
      <Button type="submit" className="w-full" loading={loading}>Send reset link</Button>
      <p className="text-center text-sm">
        <Link to="/login" className="text-primary-600 hover:text-primary-700 font-medium">Back to sign in</Link>
      </p>
    </form>
  );
}
