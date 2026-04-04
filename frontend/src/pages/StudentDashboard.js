import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { ScrollArea } from '../components/ui/scroll-area';
import { Progress } from '../components/ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { toast } from 'sonner';
import { 
  GraduationCap, LogOut, BookOpen, Lock, Unlock, Upload, 
  FileText, CheckCircle2, XCircle, Clock, Eye, ChevronRight,
  PlayCircle
} from 'lucide-react';

const API = process.env.REACT_APP_BACKEND_URL + '/api';

export default function StudentDashboard() {
  const { user, logout } = useAuth();
  const [progress, setProgress] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [selectedSubject, setSelectedSubject] = useState(null);
  const [selectedChapter, setSelectedChapter] = useState(null);
  const [topics, setTopics] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [selectedTopic, setSelectedTopic] = useState(null);
  const [uploading, setUploading] = useState(false);

  const fetchProgress = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/progress`, { withCredentials: true });
      setProgress(res.data);
    } catch (error) {
      console.error('Error fetching progress:', error);
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
    fetchProgress();
    fetchSubjects();
    fetchSubmissions();
  }, [fetchProgress, fetchSubjects, fetchSubmissions]);

  useEffect(() => {
    if (selectedChapter) {
      fetchTopics(selectedChapter.id);
    }
  }, [selectedChapter, fetchTopics]);

  const handleFileUpload = async (file) => {
    if (!selectedTopic) return;
    
    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    
    try {
      await axios.post(`${API}/submissions/${selectedTopic.id}`, formData, {
        withCredentials: true,
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      toast.success('Answer sheet uploaded successfully!');
      setShowUploadDialog(false);
      setSelectedTopic(null);
      fetchSubmissions();
      fetchProgress();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const getSubjectProgress = (subjectId) => {
    const subjectData = progress.find(p => p.id === subjectId);
    if (!subjectData) return { completed: 0, total: 0, percentage: 0 };
    
    const totalChapters = subjectData.chapters.length;
    const completedChapters = subjectData.chapters.filter(ch => 
      ch.submissions.some(s => s.status === 'approved')
    ).length;
    
    return {
      completed: completedChapters,
      total: totalChapters,
      percentage: totalChapters > 0 ? Math.round((completedChapters / totalChapters) * 100) : 0
    };
  };

  const getChapterStatus = (chapter) => {
    const submission = submissions.find(s => s.chapter_id === chapter.id);
    if (submission) {
      return submission.status;
    }
    return null;
  };

  const openUploadDialog = (topic) => {
    setSelectedTopic(topic);
    setShowUploadDialog(true);
  };

  const getTopicSubmission = (topicId) => {
    return submissions.find(s => s.topic_id === topicId);
  };

  // Get current subject chapters from progress data
  const getCurrentChapters = () => {
    if (!selectedSubject) return [];
    const subjectData = progress.find(p => p.id === selectedSubject.id);
    return subjectData?.chapters || [];
  };

  return (
    <div className="min-h-screen bg-slate-50" data-testid="student-dashboard">
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
                <p className="text-xs text-slate-500">Student Panel</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-sm font-medium text-slate-900">{user?.name}</p>
                <p className="text-xs text-slate-500">Student</p>
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
        {/* Hero Card */}
        <Card className="border-0 shadow-lg rounded-3xl overflow-hidden mb-8 bg-gradient-to-r from-sky-500 to-sky-600">
          <CardContent className="p-8">
            <div className="flex items-center justify-between">
              <div className="text-white">
                <h2 className="text-3xl font-bold font-['Outfit'] mb-2">Welcome back, {user?.name?.split(' ')[0]}!</h2>
                <p className="text-sky-100 text-lg">Continue your learning journey</p>
              </div>
              <img 
                src="https://images.unsplash.com/photo-1540151812223-c30b3fab58e6?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjA3MDR8MHwxfHNlYXJjaHwxfHxzY2hvb2wlMjBzdHVkZW50JTIwc3R1ZHlpbmd8ZW58MHx8fHwxNzc1Mjk5ODQyfDA&ixlib=rb-4.1.0&q=85"
                alt="Student studying"
                className="w-32 h-32 object-cover rounded-2xl hidden md:block"
              />
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Subjects List */}
          <div className="lg:col-span-1">
            <Card className="border border-slate-200 rounded-2xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 font-['Outfit']">
                  <BookOpen className="w-5 h-5 text-sky-600" />
                  My Subjects
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[500px]">
                  <div className="space-y-3">
                    {subjects.map((subject, idx) => {
                      const progressData = getSubjectProgress(subject.id);
                      return (
                        <div 
                          key={subject.id}
                          className={`p-4 rounded-xl cursor-pointer transition-all animate-fadeIn stagger-item card-hover ${
                            selectedSubject?.id === subject.id 
                              ? 'bg-sky-100 border-2 border-sky-500' 
                              : 'bg-slate-50 hover:bg-slate-100'
                          }`}
                          style={{ animationDelay: `${idx * 50}ms` }}
                          onClick={() => { setSelectedSubject(subject); setSelectedChapter(null); }}
                          data-testid={`subject-card-${subject.id}`}
                        >
                          <div className="flex items-center justify-between mb-3">
                            <p className="font-semibold text-slate-900">{subject.name}</p>
                            <ChevronRight className="w-4 h-4 text-slate-400" />
                          </div>
                          <div className="space-y-1">
                            <div className="flex justify-between text-xs text-slate-500">
                              <span>Progress</span>
                              <span>{progressData.completed}/{progressData.total} chapters</span>
                            </div>
                            <Progress value={progressData.percentage} className="h-2" />
                          </div>
                        </div>
                      );
                    })}
                    {subjects.length === 0 && (
                      <div className="text-center py-8">
                        <BookOpen className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                        <p className="text-slate-500">No subjects assigned yet</p>
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>

          {/* Chapters & Topics */}
          <div className="lg:col-span-2">
            {selectedSubject ? (
              <div className="space-y-6">
                {/* Chapters */}
                <Card className="border border-slate-200 rounded-2xl">
                  <CardHeader>
                    <CardTitle className="font-['Outfit']">{selectedSubject.name} - Chapters</CardTitle>
                    <CardDescription>Complete chapters in order to unlock the next one</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {getCurrentChapters().map((chapter, idx) => {
                        const isUnlocked = chapter.is_unlocked;
                        const hasApproved = chapter.submissions.some(s => s.status === 'approved');
                        const hasPending = chapter.submissions.some(s => s.status === 'pending');
                        
                        return (
                          <div 
                            key={chapter.id}
                            className={`relative p-5 rounded-2xl border-2 transition-all animate-fadeIn stagger-item ${
                              !isUnlocked 
                                ? 'bg-slate-100 border-slate-200 opacity-60' 
                                : selectedChapter?.id === chapter.id
                                  ? 'bg-sky-50 border-sky-500'
                                  : hasApproved
                                    ? 'bg-green-50 border-green-300 hover:border-green-400'
                                    : 'bg-white border-slate-200 hover:border-sky-300 cursor-pointer card-hover'
                            }`}
                            style={{ animationDelay: `${idx * 50}ms` }}
                            onClick={() => isUnlocked && setSelectedChapter(chapter)}
                            data-testid={`chapter-card-${chapter.id}`}
                          >
                            {!isUnlocked && (
                              <div className="absolute top-3 right-3">
                                <Lock className="w-5 h-5 text-slate-400" />
                              </div>
                            )}
                            {isUnlocked && (
                              <div className="absolute top-3 right-3">
                                {hasApproved ? (
                                  <CheckCircle2 className="w-5 h-5 text-green-500" />
                                ) : hasPending ? (
                                  <Clock className="w-5 h-5 text-amber-500" />
                                ) : (
                                  <Unlock className="w-5 h-5 text-sky-500" />
                                )}
                              </div>
                            )}
                            <div className="flex items-center gap-2 mb-2">
                              <Badge variant="outline" className="rounded-full">{chapter.order}</Badge>
                              <p className="font-semibold text-slate-900">{chapter.name}</p>
                            </div>
                            <p className="text-sm text-slate-500">
                              {!isUnlocked 
                                ? 'Complete previous chapter to unlock'
                                : hasApproved
                                  ? 'Completed!'
                                  : hasPending
                                    ? 'Submission pending review'
                                    : 'Ready to learn'
                              }
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>

                {/* Topics for selected chapter */}
                {selectedChapter && (
                  <Card className="border border-slate-200 rounded-2xl animate-fadeIn">
                    <CardHeader>
                      <CardTitle className="font-['Outfit']">{selectedChapter.name} - Topics</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {topics.map((topic, idx) => {
                          const submission = getTopicSubmission(topic.id);
                          return (
                            <div 
                              key={topic.id} 
                              className="p-5 bg-slate-50 rounded-xl animate-fadeIn stagger-item"
                              style={{ animationDelay: `${idx * 50}ms` }}
                              data-testid={`topic-card-${topic.id}`}
                            >
                              <div className="flex items-start justify-between mb-4">
                                <div>
                                  <p className="font-semibold text-slate-900 text-lg">{topic.name}</p>
                                  {topic.content && (
                                    <p className="text-sm text-slate-600 mt-1">{topic.content}</p>
                                  )}
                                </div>
                                {submission && (
                                  <Badge className={`rounded-full ${
                                    submission.status === 'pending' ? 'status-pending' :
                                    submission.status === 'approved' ? 'status-approved' :
                                    'status-rejected'
                                  }`}>
                                    {submission.status}
                                  </Badge>
                                )}
                              </div>

                              {/* Resources */}
                              <div className="flex flex-wrap gap-2 mb-4">
                                {topic.video_link && (
                                  <a 
                                    href={topic.video_link} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-1 px-3 py-1.5 bg-sky-100 text-sky-700 rounded-lg text-sm font-medium hover:bg-sky-200 transition-colors"
                                  >
                                    <PlayCircle className="w-4 h-4" />
                                    Watch Video
                                  </a>
                                )}
                                {topic.material_path && (
                                  <Button 
                                    size="sm" 
                                    variant="outline"
                                    className="rounded-lg"
                                    onClick={() => window.open(`${process.env.REACT_APP_BACKEND_URL}/api/files/${topic.material_path}`, '_blank')}
                                  >
                                    <FileText className="w-4 h-4 mr-1" />
                                    View Material
                                  </Button>
                                )}
                                {topic.question_sheet_path && (
                                  <Button 
                                    size="sm" 
                                    variant="outline"
                                    className="rounded-lg bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100"
                                    onClick={() => window.open(`${process.env.REACT_APP_BACKEND_URL}/api/files/${topic.question_sheet_path}`, '_blank')}
                                  >
                                    <FileText className="w-4 h-4 mr-1" />
                                    View Questions
                                  </Button>
                                )}
                              </div>

                              {/* Questions text */}
                              {topic.questions && (
                                <div className="bg-amber-50 p-4 rounded-xl mb-4">
                                  <p className="text-xs font-semibold text-amber-700 uppercase tracking-wider mb-2">Questions</p>
                                  <p className="text-slate-700 whitespace-pre-wrap">{topic.questions}</p>
                                </div>
                              )}

                              {/* Submission status & upload */}
                              {submission ? (
                                <div className={`p-4 rounded-xl ${
                                  submission.status === 'approved' ? 'bg-green-50' :
                                  submission.status === 'rejected' ? 'bg-red-50' :
                                  'bg-amber-50'
                                }`}>
                                  <div className="flex items-center justify-between">
                                    <div>
                                      <p className="font-medium text-slate-900">
                                        {submission.status === 'approved' ? 'Great job! Your submission was approved.' :
                                         submission.status === 'rejected' ? 'Submission needs revision.' :
                                         'Your submission is under review.'}
                                      </p>
                                      {submission.remarks && (
                                        <p className="text-sm text-slate-600 mt-1">
                                          <strong>Teacher remarks:</strong> {submission.remarks}
                                        </p>
                                      )}
                                    </div>
                                    <Button 
                                      size="sm" 
                                      variant="outline"
                                      onClick={() => window.open(`${process.env.REACT_APP_BACKEND_URL}/api/files/${submission.file_path}`, '_blank')}
                                      className="rounded-full"
                                    >
                                      <Eye className="w-4 h-4 mr-1" />
                                      View
                                    </Button>
                                  </div>
                                  {submission.status === 'rejected' && (
                                    <Button 
                                      className="mt-3 bg-sky-500 hover:bg-sky-600 rounded-full"
                                      onClick={() => openUploadDialog(topic)}
                                      data-testid={`resubmit-btn-${topic.id}`}
                                    >
                                      <Upload className="w-4 h-4 mr-2" />
                                      Resubmit Answer Sheet
                                    </Button>
                                  )}
                                </div>
                              ) : (
                                <Button 
                                  className="bg-sky-500 hover:bg-sky-600 rounded-full btn-lift"
                                  onClick={() => openUploadDialog(topic)}
                                  data-testid={`upload-btn-${topic.id}`}
                                >
                                  <Upload className="w-4 h-4 mr-2" />
                                  Upload Answer Sheet
                                </Button>
                              )}
                            </div>
                          );
                        })}
                        {topics.length === 0 && (
                          <p className="text-center text-slate-500 py-8">No topics in this chapter yet</p>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            ) : (
              <Card className="border border-slate-200 rounded-2xl h-full flex items-center justify-center">
                <CardContent className="text-center py-16">
                  <BookOpen className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                  <p className="text-xl font-semibold text-slate-500 font-['Outfit']">Select a subject to view chapters</p>
                  <p className="text-slate-400 mt-2">Choose from your assigned subjects on the left</p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* My Submissions */}
        <Card className="border border-slate-200 rounded-2xl mt-8">
          <CardHeader>
            <CardTitle className="font-['Outfit']">My Recent Submissions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {submissions.slice(0, 6).map((submission, idx) => (
                <div 
                  key={submission.id} 
                  className="p-4 bg-slate-50 rounded-xl animate-fadeIn stagger-item"
                  style={{ animationDelay: `${idx * 50}ms` }}
                >
                  <div className="flex items-start justify-between mb-2">
                    <p className="font-medium text-slate-900 text-sm truncate">{submission.original_filename}</p>
                    <Badge className={`rounded-full text-xs ${
                      submission.status === 'pending' ? 'status-pending' :
                      submission.status === 'approved' ? 'status-approved' :
                      'status-rejected'
                    }`}>
                      {submission.status}
                    </Badge>
                  </div>
                  <p className="text-xs text-slate-500">{new Date(submission.created_at).toLocaleDateString()}</p>
                  {submission.remarks && (
                    <p className="text-xs text-slate-600 mt-2 italic">"{submission.remarks}"</p>
                  )}
                </div>
              ))}
              {submissions.length === 0 && (
                <p className="text-slate-500 col-span-full text-center py-8">No submissions yet</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Upload Dialog */}
        <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
          <DialogContent className="rounded-2xl">
            <DialogHeader>
              <DialogTitle className="font-['Outfit']">Upload Answer Sheet</DialogTitle>
            </DialogHeader>
            <div className="py-6">
              <p className="text-sm text-slate-600 mb-4">
                Upload your handwritten answer sheet for: <strong>{selectedTopic?.name}</strong>
              </p>
              <label className="cursor-pointer">
                <input 
                  type="file"
                  className="hidden"
                  accept=".pdf,.png,.jpg,.jpeg"
                  onChange={(e) => e.target.files[0] && handleFileUpload(e.target.files[0])}
                  disabled={uploading}
                />
                <div className="upload-zone p-8 text-center">
                  {uploading ? (
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-10 h-10 border-4 border-sky-500 border-t-transparent rounded-full animate-spin" />
                      <p className="text-sky-600 font-medium">Uploading...</p>
                    </div>
                  ) : (
                    <>
                      <Upload className="w-12 h-12 text-sky-400 mx-auto mb-3" />
                      <p className="text-sky-600 font-medium">Click to upload or drag and drop</p>
                      <p className="text-slate-500 text-sm mt-1">PDF, PNG, JPG up to 5MB</p>
                    </>
                  )}
                </div>
              </label>
            </div>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}
