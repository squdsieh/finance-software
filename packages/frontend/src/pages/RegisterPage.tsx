import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { register as registerThunk } from '../store/slices/authSlice';
import { Button } from '../components/common/Button';
import { Input } from '../components/common/Input';
import toast from 'react-hot-toast';

export function RegisterPage() {
  const { register, isLoading, error } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '', firstName: '', lastName: '', companyName: '' });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const result = await register(form);
    if (registerThunk.fulfilled.match(result)) {
      toast.success('Account created! Please check your email to verify.');
      navigate('/login');
    }
  };

  const update = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, [field]: e.target.value });

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <h2 className="text-xl font-semibold text-center">Create your account</h2>
      {error && <div className="p-3 bg-red-50 text-red-700 rounded-lg text-sm">{error}</div>}
      <div className="grid grid-cols-2 gap-4">
        <Input label="First Name" value={form.firstName} onChange={update('firstName')} required />
        <Input label="Last Name" value={form.lastName} onChange={update('lastName')} required />
      </div>
      <Input label="Company Name" value={form.companyName} onChange={update('companyName')} required placeholder="Your company name" />
      <Input label="Email" type="email" value={form.email} onChange={update('email')} required placeholder="you@company.com" />
      <Input label="Password" type="password" value={form.password} onChange={update('password')} required placeholder="Min 8 chars, uppercase, lowercase, digit, special" helpText="Minimum 8 characters with uppercase, lowercase, digit, and special character" />
      <Button type="submit" className="w-full" loading={isLoading}>Create account</Button>
      <p className="text-center text-sm text-gray-500">
        Already have an account? <Link to="/login" className="text-primary-600 hover:text-primary-700 font-medium">Sign in</Link>
      </p>
    </form>
  );
}
