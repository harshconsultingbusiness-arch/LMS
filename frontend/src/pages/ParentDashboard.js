import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { ScrollArea } from '../components/ui/scroll-area';
import { Progress } from '../components/ui/progress';
import { toast } from 'sonner';
import { 
  GraduationCap, LogOut, BookOpen, Calendar, DollarSign,
  MessageSquare, CheckCircle2, XCircle, Clock, TrendingUp,
  User
} from 'lucide-react';

const API = process.env.REACT_APP_BACKEND_URL + '/api';

export default function ParentDashboard() {
  const { user, logout } = useAuth();
  const [studentInfo, setStudentInfo] = useState(null);
  const [progress, setProgress] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [fees, setFees] = useState([]);
  const [remarks, setRemarks] = useState([]);
  const [submissions, setSubmissions] = useState([]);

  const fetchStudentInfo = useCallback(async () => {
    if (!user?.student_id) return;
    try {
      const res = await axios.get(`${API}/users/${user.student_id}`, { withCredentials: true });
      setStudentInfo(res.data);
    } catch (error) {
      console.error('Error fetching student info:', error);
    }
  }, [user?.student_id]);

  const fetchProgress = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/progress`, { withCredentials: true });
      setProgress(res.data);
    } catch (error) {
      console.error('Error fetching progress:', error);
    }
  }, []);

  const fetchAttendance = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/attendance`, { withCredentials: true });
      setAttendance(res.data);
    } catch (error) {
      console.error('Error fetching attendance:', error);
    }
  }, []);

  const fetchFees = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/fees`, { withCredentials: true });
      setFees(res.data);
    } catch (error) {
      console.error('Error fetching fees:', error);
    }
  }, []);

  const fetchRemarks = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/remarks`, { withCredentials: true });
      setRemarks(res.data);
    } catch (error) {
      console.error('Error fetching remarks:', error);
    }
  }, []);

  const fetchSubmissions = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/submissions`, { withCredentials: true });
      setSubmissions(res.data);
    } catch (error) {
      console.error('Error fetching submissions:', error);
    }
  }, []);

  useEffect(() => {
    fetchStudentInfo();
    fetchProgress();
    fetchAttendance();
    fetchFees();
    fetchRemarks();
    fetchSubmissions();
  }, [fetchStudentInfo, fetchProgress, fetchAttendance, fetchFees, fetchRemarks, fetchSubmissions]);

  // Calculate overall progress
  const getOverallProgress = () => {
    let totalChapters = 0;
    let completedChapters = 0;
    
    progress.forEach(subject => {
      totalChapters += subject.chapters.length;
      completedChapters += subject.chapters.filter(ch => 
        ch.submissions.some(s => s.status === 'approved')
      ).length;
    });
    
    return {
      total: totalChapters,
      completed: completedChapters,
      percentage: totalChapters > 0 ? Math.round((completedChapters / totalChapters) * 100) : 0
    };
  };

  // Calculate attendance stats
  const getAttendanceStats = () => {
    const total = attendance.length;
    const present = attendance.filter(a => a.present).length;
    const percentage = total > 0 ? Math.round((present / total) * 100) : 0;
    return { total, present, percentage };
  };

  // Calculate fees stats
  const getFeesStats = () => {
    const totalFees = fees.reduce((sum, f) => sum + f.amount, 0);
    const paidFees = fees.filter(f => f.paid).reduce((sum, f) => sum + f.amount, 0);
    const pendingFees = totalFees - paidFees;
    return { total: totalFees, paid: paidFees, pending: pendingFees };
  };

  const overallProgress = getOverallProgress();
  const attendanceStats = getAttendanceStats();
  const feesStats = getFeesStats();

  return (
    <div className="min-h-screen bg-slate-50" data-testid="parent-dashboard">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-sky-500 rounded-xl flex items-center justify-center">
                <GraduationCap className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-slate-900 font-['Outfit']">LearnHub</h1>
                <p className="text-xs text-slate-500">Parent Panel</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-sm font-medium text-slate-900">{user?.name}</p>
                <p className="text-xs text-slate-500">Parent of {studentInfo?.name || 'Student'}</p>
              </div>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={logout}
                className="text-slate-600 hover:text-red-600"
                data-testid="logout-btn"
              >
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Hero Banner */}
        <Card className="border-0 shadow-lg rounded-3xl overflow-hidden mb-8">
          <div className="relative">
            <img 
              src="https://images.unsplash.com/photo-1633379204542-430941769df3?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjY2NzF8MHwxfHNlYXJjaHwyfHxwYXJlbnQlMjBzbWlsaW5nJTIwY2hpbGR8ZW58MHx8fHwxNzc1Mjk5ODQyfDA&ixlib=rb-4.1.0&q=85"
              alt="Parent and child"
              className="w-full h-48 object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-sky-600/90 to-sky-500/70" />
            <div className="absolute inset-0 flex items-center p-8">
              <div className="text-white">
                <p className="text-sky-100 text-sm font-medium mb-1">Your child's progress</p>
                <h2 className="text-3xl font-bold font-['Outfit'] mb-2">{studentInfo?.name || 'Loading...'}</h2>
                <p className="text-sky-100">Track academic performance, attendance, and more</p>
              </div>
            </div>
          </div>
        </Card>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {/* Progress Card */}
          <Card className="border border-slate-200 rounded-2xl card-hover">
            <CardContent className="p-6">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 bg-sky-100 rounded-xl flex items-center justify-center">
                  <TrendingUp className="w-6 h-6 text-sky-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-900">{overallProgress.percentage}%</p>
                  <p className="text-sm text-slate-500">Overall Progress</p>
                </div>
              </div>
              <Progress value={overallProgress.percentage} className="h-2" />
              <p className="text-xs text-slate-500 mt-2">{overallProgress.completed}/{overallProgress.total} chapters completed</p>
            </CardContent>
          </Card>

          {/* Attendance Card */}
          <Card className="border border-slate-200 rounded-2xl card-hover">
            <CardContent className="p-6">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                  <Calendar className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-900">{attendanceStats.percentage}%</p>
                  <p className="text-sm text-slate-500">Attendance</p>
                </div>
              </div>
              <Progress value={attendanceStats.percentage} className="h-2 [&>div]:bg-green-500" />
              <p className="text-xs text-slate-500 mt-2">{attendanceStats.present}/{attendanceStats.total} days present</p>
            </CardContent>
          </Card>

          {/* Fees Card */}
          <Card className="border border-slate-200 rounded-2xl card-hover">
            <CardContent className="p-6">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center">
                  <DollarSign className="w-6 h-6 text-amber-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-900">${feesStats.pending}</p>
                  <p className="text-sm text-slate-500">Fees Pending</p>
                </div>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-green-600">Paid: ${feesStats.paid}</span>
                <span className="text-slate-500">Total: ${feesStats.total}</span>
              </div>
            </CardContent>
          </Card>

          {/* Submissions Card */}
          <Card className="border border-slate-200 rounded-2xl card-hover">
            <CardContent className="p-6">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                  <BookOpen className="w-6 h-6 text-purple-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-900">{submissions.length}</p>
                  <p className="text-sm text-slate-500">Submissions</p>
                </div>
              </div>
              <div className="flex gap-2">
                <Badge className="status-approved rounded-full text-xs">
                  {submissions.filter(s => s.status === 'approved').length} approved
                </Badge>
                <Badge className="status-pending rounded-full text-xs">
                  {submissions.filter(s => s.status === 'pending').length} pending
                </Badge>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Subject Progress */}
          <div className="lg:col-span-2">
            <Card className="border border-slate-200 rounded-2xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 font-['Outfit']">
                  <BookOpen className="w-5 h-5 text-sky-600" />
                  Subject-wise Progress
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {progress.map((subject, idx) => {
                    const totalChapters = subject.chapters.length;
                    const completedChapters = subject.chapters.filter(ch => 
                      ch.submissions.some(s => s.status === 'approved')
                    ).length;
                    const percentage = totalChapters > 0 ? Math.round((completedChapters / totalChapters) * 100) : 0;
                    
                    return (
                      <div 
                        key={subject.id} 
                        className="p-5 bg-slate-50 rounded-xl animate-fadeIn stagger-item"
                        style={{ animationDelay: `${idx * 50}ms` }}
                      >
                        <div className="flex items-center justify-between mb-3">
                          <p className="font-semibold text-slate-900">{subject.name}</p>
                          <span className="text-sm font-medium text-sky-600">{percentage}%</span>
                        </div>
                        <Progress value={percentage} className="h-3 mb-3" />
                        <div className="flex flex-wrap gap-2">
                          {subject.chapters.map(chapter => {
                            const hasApproved = chapter.submissions.some(s => s.status === 'approved');
                            const hasPending = chapter.submissions.some(s => s.status === 'pending');
                            const hasRejected = chapter.submissions.some(s => s.status === 'rejected');
                            
                            return (
                              <Badge 
                                key={chapter.id}
                                variant="outline"
                                className={`rounded-full ${
                                  hasApproved ? 'bg-green-50 border-green-300 text-green-700' :
                                  hasPending ? 'bg-amber-50 border-amber-300 text-amber-700' :
                                  hasRejected ? 'bg-red-50 border-red-300 text-red-700' :
                                  chapter.is_unlocked ? 'bg-sky-50 border-sky-300 text-sky-700' :
                                  'bg-slate-100 border-slate-300 text-slate-500'
                                }`}
                              >
                                {hasApproved && <CheckCircle2 className="w-3 h-3 mr-1" />}
                                {hasPending && <Clock className="w-3 h-3 mr-1" />}
                                {hasRejected && <XCircle className="w-3 h-3 mr-1" />}
                                Ch {chapter.order}
                              </Badge>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                  {progress.length === 0 && (
                    <p className="text-center text-slate-500 py-8">No subjects assigned yet</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            {/* Teacher Remarks */}
            <Card className="border border-slate-200 rounded-2xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 font-['Outfit']">
                  <MessageSquare className="w-5 h-5 text-sky-600" />
                  Teacher Remarks
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-64">
                  <div className="space-y-3">
                    {remarks.map((remark, idx) => (
                      <div 
                        key={remark.id} 
                        className="p-4 bg-sky-50 rounded-xl border-l-4 border-sky-500 animate-fadeIn stagger-item"
                        style={{ animationDelay: `${idx * 50}ms` }}
                      >
                        <p className="text-slate-700">{remark.content}</p>
                        <div className="flex items-center justify-between mt-2 text-xs text-slate-500">
                          <span>By: {remark.teacher_name}</span>
                          <span>{new Date(remark.created_at).toLocaleDateString()}</span>
                        </div>
                      </div>
                    ))}
                    {remarks.length === 0 && (
                      <p className="text-center text-slate-500 py-4">No remarks yet</p>
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>

            {/* Recent Attendance */}
            <Card className="border border-slate-200 rounded-2xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 font-['Outfit']">
                  <Calendar className="w-5 h-5 text-green-600" />
                  Recent Attendance
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-48">
                  <div className="space-y-2">
                    {attendance.slice(0, 10).map((record, idx) => (
                      <div 
                        key={record.id} 
                        className="flex items-center justify-between p-3 bg-slate-50 rounded-lg animate-fadeIn stagger-item"
                        style={{ animationDelay: `${idx * 50}ms` }}
                      >
                        <span className="text-sm text-slate-700">{record.date}</span>
                        <Badge className={record.present ? 'status-approved' : 'status-rejected'}>
                          {record.present ? 'Present' : 'Absent'}
                        </Badge>
                      </div>
                    ))}
                    {attendance.length === 0 && (
                      <p className="text-center text-slate-500 py-4">No attendance records</p>
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Fees Section */}
        <Card className="border border-slate-200 rounded-2xl mt-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-['Outfit']">
              <DollarSign className="w-5 h-5 text-amber-600" />
              Fee Details
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Description</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Amount</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Due Date</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {fees.map((fee, idx) => (
                    <tr 
                      key={fee.id} 
                      className="border-b border-slate-100 animate-fadeIn stagger-item"
                      style={{ animationDelay: `${idx * 50}ms` }}
                    >
                      <td className="py-4 px-4 text-slate-900">{fee.description}</td>
                      <td className="py-4 px-4 font-semibold text-slate-900">${fee.amount}</td>
                      <td className="py-4 px-4 text-slate-600">{fee.due_date}</td>
                      <td className="py-4 px-4">
                        <Badge className={fee.paid ? 'status-approved' : 'status-rejected'}>
                          {fee.paid ? 'Paid' : 'Unpaid'}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                  {fees.length === 0 && (
                    <tr>
                      <td colSpan={4} className="text-center py-8 text-slate-500">No fee records</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
