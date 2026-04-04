import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Textarea } from '../components/ui/textarea';
import { Badge } from '../components/ui/badge';
import { ScrollArea } from '../components/ui/scroll-area';
import { toast } from 'sonner';
import { 
  Users, BookOpen, GraduationCap, LogOut, Plus, Trash2, 
  FileText, CheckCircle2, XCircle, Clock, Upload, Eye,
  Calendar, DollarSign, MessageSquare, ChevronRight
} from 'lucide-react';

const API = process.env.REACT_APP_BACKEND_URL + '/api';

export default function TeacherDashboard() {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('students');
  
  // Data states
  const [students, setStudents] = useState([]);
  const [parents, setParents] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [chapters, setChapters] = useState([]);
  const [topics, setTopics] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [selectedSubject, setSelectedSubject] = useState(null);
  const [selectedChapter, setSelectedChapter] = useState(null);
  
  // Dialog states
  const [showUserDialog, setShowUserDialog] = useState(false);
  const [showSubjectDialog, setShowSubjectDialog] = useState(false);
  const [showChapterDialog, setShowChapterDialog] = useState(false);
  const [showTopicDialog, setShowTopicDialog] = useState(false);
  const [showReviewDialog, setShowReviewDialog] = useState(false);
  const [selectedSubmission, setSelectedSubmission] = useState(null);
  
  // Form states
  const [userForm, setUserForm] = useState({ email: '', password: '', name: '', role: 'student', student_id: '' });
  const [subjectForm, setSubjectForm] = useState({ name: '', description: '' });
  const [chapterForm, setChapterForm] = useState({ name: '', description: '', order: 1 });
  const [topicForm, setTopicForm] = useState({ name: '', content: '', video_link: '', questions: '' });
  const [reviewForm, setReviewForm] = useState({ status: '', remarks: '' });

  // Fetch data
  const fetchStudents = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/users?role=student`, { withCredentials: true });
      setStudents(res.data);
    } catch (error) {
      console.error('Error fetching students:', error);
    }
  }, []);

  const fetchParents = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/users?role=parent`, { withCredentials: true });
      setParents(res.data);
    } catch (error) {
      console.error('Error fetching parents:', error);
    }
  }, []);

  const fetchSubjects = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/subjects`, { withCredentials: true });
      setSubjects(res.data);
    } catch (error) {
      console.error('Error fetching subjects:', error);
    }
  }, []);

  const fetchChapters = useCallback(async (subjectId) => {
    try {
      const res = await axios.get(`${API}/chapters?subject_id=${subjectId}`, { withCredentials: true });
      setChapters(res.data);
    } catch (error) {
      console.error('Error fetching chapters:', error);
    }
  }, []);

  const fetchTopics = useCallback(async (chapterId) => {
    try {
      const res = await axios.get(`${API}/topics?chapter_id=${chapterId}`, { withCredentials: true });
      setTopics(res.data);
    } catch (error) {
      console.error('Error fetching topics:', error);
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
    fetchStudents();
    fetchParents();
    fetchSubjects();
    fetchSubmissions();
  }, [fetchStudents, fetchParents, fetchSubjects, fetchSubmissions]);

  useEffect(() => {
    if (selectedSubject) {
      fetchChapters(selectedSubject);
    }
  }, [selectedSubject, fetchChapters]);

  useEffect(() => {
    if (selectedChapter) {
      fetchTopics(selectedChapter);
    }
  }, [selectedChapter, fetchTopics]);

  // Handlers
  const handleCreateUser = async () => {
    try {
      await axios.post(`${API}/users`, userForm, { withCredentials: true });
      toast.success(`${userForm.role === 'student' ? 'Student' : 'Parent'} created successfully`);
      setShowUserDialog(false);
      setUserForm({ email: '', password: '', name: '', role: 'student', student_id: '' });
      fetchStudents();
      fetchParents();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to create user');
    }
  };

  const handleDeleteUser = async (userId) => {
    if (!window.confirm('Are you sure you want to delete this user?')) return;
    try {
      await axios.delete(`${API}/users/${userId}`, { withCredentials: true });
      toast.success('User deleted');
      fetchStudents();
      fetchParents();
    } catch (error) {
      toast.error('Failed to delete user');
    }
  };

  const handleCreateSubject = async () => {
    try {
      await axios.post(`${API}/subjects`, subjectForm, { withCredentials: true });
      toast.success('Subject created');
      setShowSubjectDialog(false);
      setSubjectForm({ name: '', description: '' });
      fetchSubjects();
    } catch (error) {
      toast.error('Failed to create subject');
    }
  };

  const handleDeleteSubject = async (subjectId) => {
    if (!window.confirm('Delete this subject and all its chapters?')) return;
    try {
      await axios.delete(`${API}/subjects/${subjectId}`, { withCredentials: true });
      toast.success('Subject deleted');
      fetchSubjects();
      setSelectedSubject(null);
    } catch (error) {
      toast.error('Failed to delete subject');
    }
  };

  const handleCreateChapter = async () => {
    try {
      await axios.post(`${API}/chapters`, { ...chapterForm, subject_id: selectedSubject }, { withCredentials: true });
      toast.success('Chapter created');
      setShowChapterDialog(false);
      setChapterForm({ name: '', description: '', order: chapters.length + 1 });
      fetchChapters(selectedSubject);
    } catch (error) {
      toast.error('Failed to create chapter');
    }
  };

  const handleDeleteChapter = async (chapterId) => {
    if (!window.confirm('Delete this chapter and all its topics?')) return;
    try {
      await axios.delete(`${API}/chapters/${chapterId}`, { withCredentials: true });
      toast.success('Chapter deleted');
      fetchChapters(selectedSubject);
      setSelectedChapter(null);
    } catch (error) {
      toast.error('Failed to delete chapter');
    }
  };

  const handleCreateTopic = async () => {
    try {
      await axios.post(`${API}/topics`, { ...topicForm, chapter_id: selectedChapter }, { withCredentials: true });
      toast.success('Topic created');
      setShowTopicDialog(false);
      setTopicForm({ name: '', content: '', video_link: '', questions: '' });
      fetchTopics(selectedChapter);
    } catch (error) {
      toast.error('Failed to create topic');
    }
  };

  const handleDeleteTopic = async (topicId) => {
    if (!window.confirm('Delete this topic?')) return;
    try {
      await axios.delete(`${API}/topics/${topicId}`, { withCredentials: true });
      toast.success('Topic deleted');
      fetchTopics(selectedChapter);
    } catch (error) {
      toast.error('Failed to delete topic');
    }
  };

  const handleUploadMaterial = async (topicId, file, type) => {
    const formData = new FormData();
    formData.append('file', file);
    try {
      const endpoint = type === 'material' ? 'material' : 'question-sheet';
      await axios.post(`${API}/upload/${endpoint}/${topicId}`, formData, { 
        withCredentials: true,
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      toast.success(`${type === 'material' ? 'Material' : 'Question sheet'} uploaded`);
      fetchTopics(selectedChapter);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Upload failed');
    }
  };

  const handleReviewSubmission = async () => {
    try {
      await axios.put(`${API}/submissions/${selectedSubmission.id}`, reviewForm, { withCredentials: true });
      toast.success('Submission reviewed');
      setShowReviewDialog(false);
      setSelectedSubmission(null);
      setReviewForm({ status: '', remarks: '' });
      fetchSubmissions();
    } catch (error) {
      toast.error('Failed to review submission');
    }
  };

  const openReviewDialog = (submission) => {
    setSelectedSubmission(submission);
    setReviewForm({ status: submission.status === 'pending' ? '' : submission.status, remarks: submission.remarks || '' });
    setShowReviewDialog(true);
  };

  const pendingSubmissions = submissions.filter(s => s.status === 'pending');

  return (
    <div className="min-h-screen bg-slate-50" data-testid="teacher-dashboard">
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
                <p className="text-xs text-slate-500">Teacher Panel</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-slate-600">Welcome, {user?.name}</span>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={logout}
                className="text-slate-600 hover:text-red-600"
                data-testid="logout-btn"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card className="border-0 shadow-sm rounded-2xl card-hover">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-sky-100 rounded-xl flex items-center justify-center">
                  <Users className="w-6 h-6 text-sky-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-900">{students.length}</p>
                  <p className="text-sm text-slate-500">Students</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm rounded-2xl card-hover">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center">
                  <BookOpen className="w-6 h-6 text-amber-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-900">{subjects.length}</p>
                  <p className="text-sm text-slate-500">Subjects</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm rounded-2xl card-hover">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                  <CheckCircle2 className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-900">{submissions.filter(s => s.status === 'approved').length}</p>
                  <p className="text-sm text-slate-500">Approved</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm rounded-2xl card-hover">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center">
                  <Clock className="w-6 h-6 text-orange-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-900">{pendingSubmissions.length}</p>
                  <p className="text-sm text-slate-500">Pending Review</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="bg-white p-1 rounded-2xl shadow-sm border border-slate-200">
            <TabsTrigger value="students" className="rounded-xl data-[state=active]:bg-sky-500 data-[state=active]:text-white" data-testid="tab-students">
              <Users className="w-4 h-4 mr-2" />
              Students & Parents
            </TabsTrigger>
            <TabsTrigger value="subjects" className="rounded-xl data-[state=active]:bg-sky-500 data-[state=active]:text-white" data-testid="tab-subjects">
              <BookOpen className="w-4 h-4 mr-2" />
              Curriculum
            </TabsTrigger>
            <TabsTrigger value="submissions" className="rounded-xl data-[state=active]:bg-sky-500 data-[state=active]:text-white" data-testid="tab-submissions">
              <FileText className="w-4 h-4 mr-2" />
              Submissions
              {pendingSubmissions.length > 0 && (
                <Badge variant="destructive" className="ml-2 rounded-full">{pendingSubmissions.length}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="management" className="rounded-xl data-[state=active]:bg-sky-500 data-[state=active]:text-white" data-testid="tab-management">
              <Calendar className="w-4 h-4 mr-2" />
              Management
            </TabsTrigger>
          </TabsList>

          {/* Students & Parents Tab */}
          <TabsContent value="students" className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-bold text-slate-900 font-['Outfit']">Students & Parents</h2>
              <Dialog open={showUserDialog} onOpenChange={setShowUserDialog}>
                <DialogTrigger asChild>
                  <Button className="bg-sky-500 hover:bg-sky-600 rounded-full btn-lift" data-testid="add-user-btn">
                    <Plus className="w-4 h-4 mr-2" />
                    Add User
                  </Button>
                </DialogTrigger>
                <DialogContent className="rounded-2xl">
                  <DialogHeader>
                    <DialogTitle className="font-['Outfit']">Create New User</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label>Role</Label>
                      <Select value={userForm.role} onValueChange={(v) => setUserForm({ ...userForm, role: v, student_id: '' })}>
                        <SelectTrigger className="rounded-xl" data-testid="user-role-select">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="student">Student</SelectItem>
                          <SelectItem value="parent">Parent</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Name</Label>
                      <Input 
                        value={userForm.name} 
                        onChange={(e) => setUserForm({ ...userForm, name: e.target.value })}
                        placeholder="Full name"
                        className="rounded-xl"
                        data-testid="user-name-input"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Email</Label>
                      <Input 
                        type="email"
                        value={userForm.email} 
                        onChange={(e) => setUserForm({ ...userForm, email: e.target.value })}
                        placeholder="user@school.com"
                        className="rounded-xl"
                        data-testid="user-email-input"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Password</Label>
                      <Input 
                        type="password"
                        value={userForm.password} 
                        onChange={(e) => setUserForm({ ...userForm, password: e.target.value })}
                        placeholder="Initial password"
                        className="rounded-xl"
                        data-testid="user-password-input"
                      />
                    </div>
                    {userForm.role === 'parent' && (
                      <div className="space-y-2">
                        <Label>Link to Student</Label>
                        <Select value={userForm.student_id} onValueChange={(v) => setUserForm({ ...userForm, student_id: v })}>
                          <SelectTrigger className="rounded-xl" data-testid="parent-student-select">
                            <SelectValue placeholder="Select student" />
                          </SelectTrigger>
                          <SelectContent>
                            {students.map(s => (
                              <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setShowUserDialog(false)} className="rounded-full">Cancel</Button>
                    <Button onClick={handleCreateUser} className="bg-sky-500 hover:bg-sky-600 rounded-full" data-testid="create-user-btn">Create User</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Students List */}
              <Card className="border border-slate-200 rounded-2xl">
                <CardHeader>
                  <CardTitle className="text-lg font-['Outfit']">Students ({students.length})</CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[400px]">
                    <div className="space-y-3">
                      {students.map((student, idx) => (
                        <div key={student.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-xl animate-fadeIn stagger-item" style={{ animationDelay: `${idx * 50}ms` }}>
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-sky-100 rounded-full flex items-center justify-center">
                              <span className="text-sky-600 font-bold">{student.name[0]}</span>
                            </div>
                            <div>
                              <p className="font-medium text-slate-900">{student.name}</p>
                              <p className="text-sm text-slate-500">{student.email}</p>
                            </div>
                          </div>
                          <Button variant="ghost" size="sm" onClick={() => handleDeleteUser(student.id)} className="text-red-500 hover:text-red-700 hover:bg-red-50">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      ))}
                      {students.length === 0 && (
                        <p className="text-center text-slate-500 py-8">No students yet</p>
                      )}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>

              {/* Parents List */}
              <Card className="border border-slate-200 rounded-2xl">
                <CardHeader>
                  <CardTitle className="text-lg font-['Outfit']">Parents ({parents.length})</CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[400px]">
                    <div className="space-y-3">
                      {parents.map((parent, idx) => (
                        <div key={parent.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-xl animate-fadeIn stagger-item" style={{ animationDelay: `${idx * 50}ms` }}>
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center">
                              <span className="text-amber-600 font-bold">{parent.name[0]}</span>
                            </div>
                            <div>
                              <p className="font-medium text-slate-900">{parent.name}</p>
                              <p className="text-sm text-slate-500">{parent.email}</p>
                              <p className="text-xs text-sky-600">
                                Linked: {students.find(s => s.id === parent.student_id)?.name || 'Unknown'}
                              </p>
                            </div>
                          </div>
                          <Button variant="ghost" size="sm" onClick={() => handleDeleteUser(parent.id)} className="text-red-500 hover:text-red-700 hover:bg-red-50">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      ))}
                      {parents.length === 0 && (
                        <p className="text-center text-slate-500 py-8">No parents yet</p>
                      )}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Curriculum Tab */}
          <TabsContent value="subjects" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Subjects Column */}
              <Card className="border border-slate-200 rounded-2xl">
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="text-lg font-['Outfit']">Subjects</CardTitle>
                  <Dialog open={showSubjectDialog} onOpenChange={setShowSubjectDialog}>
                    <DialogTrigger asChild>
                      <Button size="sm" className="bg-sky-500 hover:bg-sky-600 rounded-full" data-testid="add-subject-btn">
                        <Plus className="w-4 h-4" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="rounded-2xl">
                      <DialogHeader>
                        <DialogTitle className="font-['Outfit']">Create Subject</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <div className="space-y-2">
                          <Label>Subject Name</Label>
                          <Input 
                            value={subjectForm.name}
                            onChange={(e) => setSubjectForm({ ...subjectForm, name: e.target.value })}
                            placeholder="e.g., Mathematics"
                            className="rounded-xl"
                            data-testid="subject-name-input"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Description</Label>
                          <Textarea 
                            value={subjectForm.description}
                            onChange={(e) => setSubjectForm({ ...subjectForm, description: e.target.value })}
                            placeholder="Brief description"
                            className="rounded-xl"
                          />
                        </div>
                      </div>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setShowSubjectDialog(false)} className="rounded-full">Cancel</Button>
                        <Button onClick={handleCreateSubject} className="bg-sky-500 hover:bg-sky-600 rounded-full" data-testid="create-subject-btn">Create</Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[500px]">
                    <div className="space-y-2">
                      {subjects.map(subject => (
                        <div 
                          key={subject.id}
                          className={`p-4 rounded-xl cursor-pointer transition-all ${selectedSubject === subject.id ? 'bg-sky-100 border-2 border-sky-500' : 'bg-slate-50 hover:bg-slate-100'}`}
                          onClick={() => { setSelectedSubject(subject.id); setSelectedChapter(null); }}
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-medium text-slate-900">{subject.name}</p>
                              <p className="text-sm text-slate-500 truncate">{subject.description}</p>
                            </div>
                            <div className="flex items-center gap-2">
                              <ChevronRight className="w-4 h-4 text-slate-400" />
                              <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); handleDeleteSubject(subject.id); }} className="text-red-500 hover:text-red-700 hover:bg-red-50">
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
                      {subjects.length === 0 && (
                        <p className="text-center text-slate-500 py-8">No subjects yet</p>
                      )}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>

              {/* Chapters Column */}
              <Card className="border border-slate-200 rounded-2xl">
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="text-lg font-['Outfit']">Chapters</CardTitle>
                  {selectedSubject && (
                    <Dialog open={showChapterDialog} onOpenChange={setShowChapterDialog}>
                      <DialogTrigger asChild>
                        <Button size="sm" className="bg-sky-500 hover:bg-sky-600 rounded-full" data-testid="add-chapter-btn">
                          <Plus className="w-4 h-4" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="rounded-2xl">
                        <DialogHeader>
                          <DialogTitle className="font-['Outfit']">Create Chapter</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                          <div className="space-y-2">
                            <Label>Chapter Name</Label>
                            <Input 
                              value={chapterForm.name}
                              onChange={(e) => setChapterForm({ ...chapterForm, name: e.target.value })}
                              placeholder="e.g., Introduction to Algebra"
                              className="rounded-xl"
                              data-testid="chapter-name-input"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Order (for progression)</Label>
                            <Input 
                              type="number"
                              value={chapterForm.order}
                              onChange={(e) => setChapterForm({ ...chapterForm, order: parseInt(e.target.value) || 1 })}
                              className="rounded-xl"
                              data-testid="chapter-order-input"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Description</Label>
                            <Textarea 
                              value={chapterForm.description}
                              onChange={(e) => setChapterForm({ ...chapterForm, description: e.target.value })}
                              className="rounded-xl"
                            />
                          </div>
                        </div>
                        <DialogFooter>
                          <Button variant="outline" onClick={() => setShowChapterDialog(false)} className="rounded-full">Cancel</Button>
                          <Button onClick={handleCreateChapter} className="bg-sky-500 hover:bg-sky-600 rounded-full" data-testid="create-chapter-btn">Create</Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  )}
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[500px]">
                    {selectedSubject ? (
                      <div className="space-y-2">
                        {chapters.map(chapter => (
                          <div 
                            key={chapter.id}
                            className={`p-4 rounded-xl cursor-pointer transition-all ${selectedChapter === chapter.id ? 'bg-sky-100 border-2 border-sky-500' : 'bg-slate-50 hover:bg-slate-100'}`}
                            onClick={() => setSelectedChapter(chapter.id)}
                          >
                            <div className="flex items-center justify-between">
                              <div>
                                <div className="flex items-center gap-2">
                                  <Badge variant="outline" className="rounded-full">{chapter.order}</Badge>
                                  <p className="font-medium text-slate-900">{chapter.name}</p>
                                </div>
                                <p className="text-sm text-slate-500 truncate mt-1">{chapter.description}</p>
                              </div>
                              <div className="flex items-center gap-2">
                                <ChevronRight className="w-4 h-4 text-slate-400" />
                                <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); handleDeleteChapter(chapter.id); }} className="text-red-500 hover:text-red-700 hover:bg-red-50">
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        ))}
                        {chapters.length === 0 && (
                          <p className="text-center text-slate-500 py-8">No chapters yet</p>
                        )}
                      </div>
                    ) : (
                      <p className="text-center text-slate-500 py-8">Select a subject first</p>
                    )}
                  </ScrollArea>
                </CardContent>
              </Card>

              {/* Topics Column */}
              <Card className="border border-slate-200 rounded-2xl">
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="text-lg font-['Outfit']">Topics & Materials</CardTitle>
                  {selectedChapter && (
                    <Dialog open={showTopicDialog} onOpenChange={setShowTopicDialog}>
                      <DialogTrigger asChild>
                        <Button size="sm" className="bg-sky-500 hover:bg-sky-600 rounded-full" data-testid="add-topic-btn">
                          <Plus className="w-4 h-4" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="rounded-2xl max-w-lg">
                        <DialogHeader>
                          <DialogTitle className="font-['Outfit']">Create Topic</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                          <div className="space-y-2">
                            <Label>Topic Name</Label>
                            <Input 
                              value={topicForm.name}
                              onChange={(e) => setTopicForm({ ...topicForm, name: e.target.value })}
                              placeholder="e.g., Linear Equations"
                              className="rounded-xl"
                              data-testid="topic-name-input"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Content / Notes</Label>
                            <Textarea 
                              value={topicForm.content}
                              onChange={(e) => setTopicForm({ ...topicForm, content: e.target.value })}
                              placeholder="Lesson content..."
                              className="rounded-xl"
                              rows={3}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Video Link (optional)</Label>
                            <Input 
                              value={topicForm.video_link}
                              onChange={(e) => setTopicForm({ ...topicForm, video_link: e.target.value })}
                              placeholder="https://youtube.com/..."
                              className="rounded-xl"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Questions (text format)</Label>
                            <Textarea 
                              value={topicForm.questions}
                              onChange={(e) => setTopicForm({ ...topicForm, questions: e.target.value })}
                              placeholder="Q1: Solve for x..."
                              className="rounded-xl"
                              rows={3}
                            />
                          </div>
                        </div>
                        <DialogFooter>
                          <Button variant="outline" onClick={() => setShowTopicDialog(false)} className="rounded-full">Cancel</Button>
                          <Button onClick={handleCreateTopic} className="bg-sky-500 hover:bg-sky-600 rounded-full" data-testid="create-topic-btn">Create</Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  )}
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[500px]">
                    {selectedChapter ? (
                      <div className="space-y-3">
                        {topics.map(topic => (
                          <div key={topic.id} className="p-4 bg-slate-50 rounded-xl">
                            <div className="flex items-start justify-between mb-3">
                              <p className="font-medium text-slate-900">{topic.name}</p>
                              <Button variant="ghost" size="sm" onClick={() => handleDeleteTopic(topic.id)} className="text-red-500 hover:text-red-700 hover:bg-red-50">
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                            {topic.content && <p className="text-sm text-slate-600 mb-3">{topic.content}</p>}
                            {topic.video_link && (
                              <a href={topic.video_link} target="_blank" rel="noopener noreferrer" className="text-sm text-sky-600 hover:underline flex items-center gap-1 mb-3">
                                <Eye className="w-3 h-3" /> Watch Video
                              </a>
                            )}
                            {topic.questions && (
                              <div className="bg-amber-50 p-3 rounded-lg mb-3">
                                <p className="text-xs font-semibold text-amber-700 mb-1">Questions:</p>
                                <p className="text-sm text-slate-700 whitespace-pre-wrap">{topic.questions}</p>
                              </div>
                            )}
                            <div className="flex gap-2 mt-3">
                              <label className="cursor-pointer">
                                <input 
                                  type="file" 
                                  className="hidden" 
                                  accept=".pdf,.png,.jpg,.jpeg"
                                  onChange={(e) => e.target.files[0] && handleUploadMaterial(topic.id, e.target.files[0], 'material')}
                                />
                                <div className="flex items-center gap-1 px-3 py-1.5 bg-sky-100 text-sky-700 rounded-lg text-xs font-medium hover:bg-sky-200 transition-colors">
                                  <Upload className="w-3 h-3" />
                                  {topic.material_path ? 'Replace Material' : 'Upload Material'}
                                </div>
                              </label>
                              <label className="cursor-pointer">
                                <input 
                                  type="file" 
                                  className="hidden" 
                                  accept=".pdf,.png,.jpg,.jpeg"
                                  onChange={(e) => e.target.files[0] && handleUploadMaterial(topic.id, e.target.files[0], 'question')}
                                />
                                <div className="flex items-center gap-1 px-3 py-1.5 bg-amber-100 text-amber-700 rounded-lg text-xs font-medium hover:bg-amber-200 transition-colors">
                                  <FileText className="w-3 h-3" />
                                  {topic.question_sheet_path ? 'Replace Q-Sheet' : 'Upload Q-Sheet'}
                                </div>
                              </label>
                            </div>
                            {(topic.material_path || topic.question_sheet_path) && (
                              <div className="flex gap-2 mt-2 text-xs text-green-600">
                                {topic.material_path && <span>Material uploaded</span>}
                                {topic.question_sheet_path && <span>Q-Sheet uploaded</span>}
                              </div>
                            )}
                          </div>
                        ))}
                        {topics.length === 0 && (
                          <p className="text-center text-slate-500 py-8">No topics yet</p>
                        )}
                      </div>
                    ) : (
                      <p className="text-center text-slate-500 py-8">Select a chapter first</p>
                    )}
                  </ScrollArea>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Submissions Tab */}
          <TabsContent value="submissions" className="space-y-6">
            <h2 className="text-xl font-bold text-slate-900 font-['Outfit']">Student Submissions</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {submissions.map((submission, idx) => (
                <Card key={submission.id} className={`border rounded-2xl card-hover animate-fadeIn stagger-item ${submission.status === 'pending' ? 'border-amber-300 bg-amber-50/50' : 'border-slate-200'}`} style={{ animationDelay: `${idx * 50}ms` }}>
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <p className="font-semibold text-slate-900">{submission.student_name}</p>
                        <p className="text-sm text-slate-500">{new Date(submission.created_at).toLocaleDateString()}</p>
                      </div>
                      <Badge className={`rounded-full ${submission.status === 'pending' ? 'status-pending' : submission.status === 'approved' ? 'status-approved' : 'status-rejected'}`}>
                        {submission.status === 'pending' && <Clock className="w-3 h-3 mr-1" />}
                        {submission.status === 'approved' && <CheckCircle2 className="w-3 h-3 mr-1" />}
                        {submission.status === 'rejected' && <XCircle className="w-3 h-3 mr-1" />}
                        {submission.status}
                      </Badge>
                    </div>
                    <p className="text-sm text-slate-600 mb-3">File: {submission.original_filename}</p>
                    {submission.remarks && (
                      <div className="bg-slate-100 p-2 rounded-lg mb-3">
                        <p className="text-xs text-slate-600">Remarks: {submission.remarks}</p>
                      </div>
                    )}
                    <div className="flex gap-2">
                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="rounded-full flex-1"
                        onClick={() => window.open(`${process.env.REACT_APP_BACKEND_URL}/api/files/${submission.file_path}`, '_blank')}
                      >
                        <Eye className="w-4 h-4 mr-1" />
                        View
                      </Button>
                      <Button 
                        size="sm" 
                        className="rounded-full flex-1 bg-sky-500 hover:bg-sky-600"
                        onClick={() => openReviewDialog(submission)}
                        data-testid={`review-submission-${submission.id}`}
                      >
                        Review
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
              {submissions.length === 0 && (
                <p className="text-center text-slate-500 py-8 col-span-full">No submissions yet</p>
              )}
            </div>
          </TabsContent>

          {/* Management Tab */}
          <TabsContent value="management" className="space-y-6">
            <ManagementSection students={students} />
          </TabsContent>
        </Tabs>

        {/* Review Dialog */}
        <Dialog open={showReviewDialog} onOpenChange={setShowReviewDialog}>
          <DialogContent className="rounded-2xl">
            <DialogHeader>
              <DialogTitle className="font-['Outfit']">Review Submission</DialogTitle>
            </DialogHeader>
            {selectedSubmission && (
              <div className="space-y-4 py-4">
                <div className="bg-slate-50 p-4 rounded-xl">
                  <p className="text-sm"><strong>Student:</strong> {selectedSubmission.student_name}</p>
                  <p className="text-sm"><strong>File:</strong> {selectedSubmission.original_filename}</p>
                  <p className="text-sm"><strong>Submitted:</strong> {new Date(selectedSubmission.created_at).toLocaleString()}</p>
                </div>
                <div className="space-y-2">
                  <Label>Decision</Label>
                  <Select value={reviewForm.status} onValueChange={(v) => setReviewForm({ ...reviewForm, status: v })}>
                    <SelectTrigger className="rounded-xl" data-testid="review-status-select">
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="approved">
                        <span className="flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-green-600" />
                          Approve
                        </span>
                      </SelectItem>
                      <SelectItem value="rejected">
                        <span className="flex items-center gap-2">
                          <XCircle className="w-4 h-4 text-red-600" />
                          Reject
                        </span>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Remarks</Label>
                  <Textarea 
                    value={reviewForm.remarks}
                    onChange={(e) => setReviewForm({ ...reviewForm, remarks: e.target.value })}
                    placeholder="Add feedback for the student..."
                    className="rounded-xl"
                    data-testid="review-remarks-input"
                  />
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowReviewDialog(false)} className="rounded-full">Cancel</Button>
              <Button 
                onClick={handleReviewSubmission} 
                disabled={!reviewForm.status}
                className="bg-sky-500 hover:bg-sky-600 rounded-full"
                data-testid="submit-review-btn"
              >
                Submit Review
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}

// Management Section Component
function ManagementSection({ students }) {
  const [selectedStudent, setSelectedStudent] = useState('');
  const [attendanceDate, setAttendanceDate] = useState(new Date().toISOString().split('T')[0]);
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [feeRecords, setFeeRecords] = useState([]);
  const [remarkRecords, setRemarkRecords] = useState([]);
  const [feeForm, setFeeForm] = useState({ amount: '', description: '', due_date: '', paid: false });
  const [remarkText, setRemarkText] = useState('');

  useEffect(() => {
    if (selectedStudent) {
      fetchStudentData();
    }
  }, [selectedStudent]);

  const fetchStudentData = async () => {
    try {
      const [attendance, fees, remarks] = await Promise.all([
        axios.get(`${API}/attendance?student_id=${selectedStudent}`, { withCredentials: true }),
        axios.get(`${API}/fees?student_id=${selectedStudent}`, { withCredentials: true }),
        axios.get(`${API}/remarks?student_id=${selectedStudent}`, { withCredentials: true })
      ]);
      setAttendanceRecords(attendance.data);
      setFeeRecords(fees.data);
      setRemarkRecords(remarks.data);
    } catch (error) {
      console.error('Error fetching student data:', error);
    }
  };

  const handleMarkAttendance = async (present) => {
    try {
      await axios.post(`${API}/attendance`, {
        student_id: selectedStudent,
        date: attendanceDate,
        present
      }, { withCredentials: true });
      toast.success(`Marked ${present ? 'present' : 'absent'}`);
      fetchStudentData();
    } catch (error) {
      toast.error('Failed to mark attendance');
    }
  };

  const handleAddFee = async () => {
    try {
      await axios.post(`${API}/fees`, {
        student_id: selectedStudent,
        ...feeForm,
        amount: parseFloat(feeForm.amount)
      }, { withCredentials: true });
      toast.success('Fee record added');
      setFeeForm({ amount: '', description: '', due_date: '', paid: false });
      fetchStudentData();
    } catch (error) {
      toast.error('Failed to add fee');
    }
  };

  const handleTogglePaid = async (feeId, currentPaid) => {
    try {
      await axios.put(`${API}/fees/${feeId}?paid=${!currentPaid}`, {}, { withCredentials: true });
      toast.success('Fee status updated');
      fetchStudentData();
    } catch (error) {
      toast.error('Failed to update fee');
    }
  };

  const handleAddRemark = async () => {
    try {
      await axios.post(`${API}/remarks`, {
        student_id: selectedStudent,
        content: remarkText
      }, { withCredentials: true });
      toast.success('Remark added');
      setRemarkText('');
      fetchStudentData();
    } catch (error) {
      toast.error('Failed to add remark');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Label className="text-lg font-['Outfit']">Select Student:</Label>
        <Select value={selectedStudent} onValueChange={setSelectedStudent}>
          <SelectTrigger className="w-64 rounded-xl" data-testid="management-student-select">
            <SelectValue placeholder="Choose a student" />
          </SelectTrigger>
          <SelectContent>
            {students.map(s => (
              <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {selectedStudent && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Attendance */}
          <Card className="border border-slate-200 rounded-2xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 font-['Outfit']">
                <Calendar className="w-5 h-5 text-sky-600" />
                Attendance
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Date</Label>
                <Input 
                  type="date" 
                  value={attendanceDate}
                  onChange={(e) => setAttendanceDate(e.target.value)}
                  className="rounded-xl"
                  data-testid="attendance-date-input"
                />
              </div>
              <div className="flex gap-2">
                <Button onClick={() => handleMarkAttendance(true)} className="flex-1 bg-green-500 hover:bg-green-600 rounded-full" data-testid="mark-present-btn">
                  <CheckCircle2 className="w-4 h-4 mr-1" /> Present
                </Button>
                <Button onClick={() => handleMarkAttendance(false)} variant="destructive" className="flex-1 rounded-full" data-testid="mark-absent-btn">
                  <XCircle className="w-4 h-4 mr-1" /> Absent
                </Button>
              </div>
              <ScrollArea className="h-48">
                <div className="space-y-2">
                  {attendanceRecords.slice(0, 10).map(record => (
                    <div key={record.id} className="flex items-center justify-between p-2 bg-slate-50 rounded-lg text-sm">
                      <span>{record.date}</span>
                      <Badge className={record.present ? 'status-approved' : 'status-rejected'}>
                        {record.present ? 'Present' : 'Absent'}
                      </Badge>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Fees */}
          <Card className="border border-slate-200 rounded-2xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 font-['Outfit']">
                <DollarSign className="w-5 h-5 text-amber-600" />
                Fees
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-2">
                <Input 
                  type="number"
                  placeholder="Amount"
                  value={feeForm.amount}
                  onChange={(e) => setFeeForm({ ...feeForm, amount: e.target.value })}
                  className="rounded-xl"
                  data-testid="fee-amount-input"
                />
                <Input 
                  type="date"
                  value={feeForm.due_date}
                  onChange={(e) => setFeeForm({ ...feeForm, due_date: e.target.value })}
                  className="rounded-xl"
                  data-testid="fee-date-input"
                />
              </div>
              <Input 
                placeholder="Description"
                value={feeForm.description}
                onChange={(e) => setFeeForm({ ...feeForm, description: e.target.value })}
                className="rounded-xl"
                data-testid="fee-description-input"
              />
              <Button onClick={handleAddFee} className="w-full bg-amber-500 hover:bg-amber-600 rounded-full" data-testid="add-fee-btn">
                <Plus className="w-4 h-4 mr-1" /> Add Fee
              </Button>
              <ScrollArea className="h-40">
                <div className="space-y-2">
                  {feeRecords.map(fee => (
                    <div key={fee.id} className="flex items-center justify-between p-2 bg-slate-50 rounded-lg text-sm">
                      <div>
                        <p className="font-medium">${fee.amount}</p>
                        <p className="text-xs text-slate-500">{fee.description}</p>
                      </div>
                      <Button 
                        size="sm" 
                        variant={fee.paid ? 'default' : 'outline'}
                        onClick={() => handleTogglePaid(fee.id, fee.paid)}
                        className={`rounded-full ${fee.paid ? 'bg-green-500' : ''}`}
                      >
                        {fee.paid ? 'Paid' : 'Unpaid'}
                      </Button>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Remarks */}
          <Card className="border border-slate-200 rounded-2xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 font-['Outfit']">
                <MessageSquare className="w-5 h-5 text-sky-600" />
                Remarks
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea 
                placeholder="Add a remark for this student..."
                value={remarkText}
                onChange={(e) => setRemarkText(e.target.value)}
                className="rounded-xl"
                rows={3}
                data-testid="remark-input"
              />
              <Button onClick={handleAddRemark} disabled={!remarkText} className="w-full bg-sky-500 hover:bg-sky-600 rounded-full" data-testid="add-remark-btn">
                <Plus className="w-4 h-4 mr-1" /> Add Remark
              </Button>
              <ScrollArea className="h-40">
                <div className="space-y-2">
                  {remarkRecords.map(remark => (
                    <div key={remark.id} className="p-3 bg-slate-50 rounded-lg">
                      <p className="text-sm">{remark.content}</p>
                      <p className="text-xs text-slate-500 mt-1">{new Date(remark.created_at).toLocaleDateString()}</p>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
