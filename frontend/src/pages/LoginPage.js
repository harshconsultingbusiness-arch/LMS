import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { toast } from 'sonner';
import { BookOpen, GraduationCap, Users } from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();

  const formatError = (detail) => {
    if (detail == null) return 'Something went wrong. Please try again.';
    if (typeof detail === 'string') return detail;
    if (Array.isArray(detail)) {
      return detail.map((e) => (e && typeof e.msg === 'string' ? e.msg : JSON.stringify(e))).filter(Boolean).join(' ');
    }
    if (detail && typeof detail.msg === 'string') return detail.msg;
    return String(detail);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      await login(email, password);
      toast.success('Welcome back!');
    } catch (error) {
      const message = formatError(error.response?.data?.detail) || error.message;
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex" data-testid="login-page">
      {/* Left side - Hero */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
        <img
          src="https://images.unsplash.com/photo-1751644332113-2004a1b143f1?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjA1NzB8MHwxfHNlYXJjaHwxfHxhYnN0cmFjdCUyMGNvbG9yZnVsJTIwc2hhcGVzJTIwM2R8ZW58MHx8fHwxNzc1Mjk5ODc0fDA&ixlib=rb-4.1.0&q=85"
          alt="Colorful abstract shapes"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-br from-sky-500/20 to-amber-500/20" />
        <div className="relative z-10 flex flex-col justify-center p-12 text-white">
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <div className="w-14 h-14 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center">
                <GraduationCap className="w-8 h-8" />
              </div>
              <h1 className="text-4xl font-bold tracking-tight font-['Outfit']">LearnHub</h1>
            </div>
            <p className="text-xl text-white/90 max-w-md leading-relaxed">
              A modern learning management system for schools. Empowering teachers, students, and parents.
            </p>
            
            <div className="flex gap-4 pt-6">
              <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm px-4 py-2 rounded-full">
                <BookOpen className="w-5 h-5" />
                <span className="text-sm font-medium">Interactive Learning</span>
              </div>
              <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm px-4 py-2 rounded-full">
                <Users className="w-5 h-5" />
                <span className="text-sm font-medium">Progress Tracking</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right side - Login Form */}
      <div className="flex-1 flex items-center justify-center p-8 bg-slate-50">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center justify-center gap-3 mb-8">
            <div className="w-12 h-12 bg-sky-500 rounded-2xl flex items-center justify-center">
              <GraduationCap className="w-7 h-7 text-white" />
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900 font-['Outfit']">LearnHub</h1>
          </div>

          <Card className="border-0 shadow-xl rounded-3xl overflow-hidden">
            <CardHeader className="space-y-1 pb-6">
              <CardTitle className="text-2xl font-bold text-center font-['Outfit']">Welcome Back</CardTitle>
              <CardDescription className="text-center text-slate-500">
                Sign in with your credentials
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-sm font-medium text-slate-700">
                    Email Address
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@school.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="h-12 rounded-xl border-slate-200 focus:border-sky-500 focus:ring-sky-500"
                    data-testid="login-email-input"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password" className="text-sm font-medium text-slate-700">
                    Password
                  </Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="h-12 rounded-xl border-slate-200 focus:border-sky-500 focus:ring-sky-500"
                    data-testid="login-password-input"
                  />
                </div>
                <Button
                  type="submit"
                  disabled={isLoading}
                  className="w-full h-12 rounded-full bg-sky-500 hover:bg-sky-600 text-white font-semibold btn-lift"
                  data-testid="login-submit-btn"
                >
                  {isLoading ? (
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Signing in...
                    </div>
                  ) : (
                    'Sign In'
                  )}
                </Button>
              </form>

              <div className="mt-8 pt-6 border-t border-slate-100">
                <p className="text-center text-sm text-slate-500">
                  Contact your teacher for login credentials
                </p>
              </div>
            </CardContent>
          </Card>

          <p className="mt-6 text-center text-xs text-slate-400">
            For Teachers, Students & Parents
          </p>
        </div>
      </div>
    </div>
  );
}
