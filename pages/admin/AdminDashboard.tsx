import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Layout from '../../components/Layout';
import { db } from '../../services/mockDb';
import { 
  Users, 
  GraduationCap, 
  CreditCard, 
  MoreHorizontal, 
  UserPlus,
  BookOpen,
  Settings,
  Bell,
  Eye,
  Edit,
  X,
  Save,
  User as UserIcon,
  ArrowUpRight,
  Calendar,
  BarChart2,
  Trophy,
  RefreshCw,
  AlertOctagon
} from 'lucide-react';
import { Notice, Student } from '../../types';
import { CLASSES_LIST, calculateGrade, getGradeColor, CURRENT_TERM } from '../../constants';

const AdminDashboard = () => {
  const navigate = useNavigate();

  const [stats, setStats] = useState({
    students: 0,
    teachers: 0,
    classes: CLASSES_LIST.length,
    maleStudents: 0,
    femaleStudents: 0,
    classAttendance: [] as { className: string, percentage: number, id: string }[]
  });

  const [notices, setNotices] = useState<Notice[]>([]);
  const [recentStudents, setRecentStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  // Configuration State
  const [schoolConfig, setSchoolConfig] = useState({
      academicYear: '...',
      currentTerm: '...'
  });

  // Performance Stats
  const [gradeDistribution, setGradeDistribution] = useState<Record<string, number>>({ A:0, B:0, C:0, D:0, F:0 });
  const [topStudents, setTopStudents] = useState<{name: string, class: string, avg: number}[]>([]);

  // --- Modal States ---
  const [viewStudent, setViewStudent] = useState<Student | null>(null);
  const [performanceData, setPerformanceData] = useState<any>(null);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [editFormData, setEditFormData] = useState<Partial<Student>>({});

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
        const dashboardStats = await db.getDashboardStats();
        const students = await db.getStudents();
        const fetchedNotices = await db.getNotices();
        const config = await db.getSchoolConfig();

        setSchoolConfig({
            academicYear: config.academicYear,
            currentTerm: config.currentTerm
        });
        
        // Parse term number safely
        let dynamicTerm = CURRENT_TERM;
        if (config.currentTerm) {
            const match = config.currentTerm.match(/\d+/);
            if (match) dynamicTerm = parseInt(match[0]);
        }

        const allAssessments = await db.getAllAssessments();

        // Map Student IDs
        const studentMap = new Map(students.map(s => [s.id, s]));
        const studentScores: Record<string, { total: number, count: number, name: string, classId: string }> = {};

        allAssessments.forEach(a => {
    let assessmentTermNumber = 0;

    // Convert term to string safely before regex
    const termString = String(a.term);
    const match = termString.match(/\d+/);
    if (match) assessmentTermNumber = parseInt(match[0]);

    if (assessmentTermNumber === dynamicTerm && studentMap.has(a.studentId)) {
        if (!studentScores[a.studentId]) {
            const s = studentMap.get(a.studentId)!;
            studentScores[a.studentId] = { total: 0, count: 0, name: s.name, classId: s.classId };
        }
        const score = a.total ?? ((a.testScore||0) + (a.homeworkScore||0) + (a.projectScore||0) + (a.examScore||0));
        studentScores[a.studentId].total += score;
        studentScores[a.studentId].count += 1;
    }
});


        // Calculate averages & grade distribution
        const counts = { A: 0, B: 0, C: 0, D: 0, F: 0 };
        const averagesList: {name: string, class: string, avg: number}[] = [];

        Object.values(studentScores).forEach(s => {
            const avg = s.count > 0 ? s.total / s.count : 0;
            const { grade } = calculateGrade(avg);
            if (counts[grade as keyof typeof counts] !== undefined) {
                counts[grade as keyof typeof counts]++;
            }
            averagesList.push({
                name: s.name,
                class: CLASSES_LIST.find(c => c.id === s.classId)?.name || 'N/A',
                avg: parseFloat(avg.toFixed(1))
            });
        });

        averagesList.sort((a, b) => b.avg - a.avg);

        setStats({
          students: dashboardStats.studentsCount,
          teachers: dashboardStats.teachersCount,
          classes: CLASSES_LIST.length,
          maleStudents: dashboardStats.gender.male,
          femaleStudents: dashboardStats.gender.female,
          classAttendance: dashboardStats.classAttendance
        });

        setNotices(fetchedNotices);
        setRecentStudents(students.slice(-5).reverse());
        setGradeDistribution(counts);
        setTopStudents(averagesList.slice(0, 5));

    } catch (err: any) {
        console.error("Dashboard fetch error:", err);
        setError("Failed to load dashboard data. Please check your internet connection or database permissions.");
    } finally {
        setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  useEffect(() => {
    const handleClickOutside = () => setOpenMenuId(null);
    if (openMenuId) window.addEventListener('click', handleClickOutside);
    return () => window.removeEventListener('click', handleClickOutside);
  }, [openMenuId]);

  const handleMenuClick = (e: React.MouseEvent, id: string) => {
      e.stopPropagation();
      setOpenMenuId(openMenuId === id ? null : id);
  };

  const handleViewDetails = async (student: Student) => {
      setOpenMenuId(null);
      setViewStudent(student);
      setPerformanceData(null);
      try {
          const data = await db.getStudentPerformance(student.id, student.classId);
          setPerformanceData(data);
      } catch (e) {
          console.error(e);
      }
  };

  const handleEditStudent = (student: Student) => {
      setOpenMenuId(null);
      setEditingStudent(student);
      setEditFormData({ ...student });
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!editingStudent || !editFormData.name) return;

      try {
          const updated = { ...editingStudent, ...editFormData } as Student;
          await db.updateStudent(updated);
          fetchData();
          setEditingStudent(null);
      } catch(e) {
          alert("Failed to update student");
      }
  };

  // --- Components (StatCard, AttendanceChart, GenderDonut, PerformanceSection) ---
  // Use your previous implementations; they remain unchanged and functional.

  if (loading) {
      return (
          <Layout title="Dashboard">
              <div className="flex flex-col items-center justify-center h-[calc(100vh-8rem)]">
                  <div className="relative">
                      <div className="absolute inset-0 bg-amber-100 rounded-full blur-xl opacity-50 animate-pulse"></div>
                      <div className="relative w-16 h-16 border-4 border-slate-100 border-t-red-900 rounded-full animate-spin shadow-sm"></div>
                      <div className="absolute inset-0 flex items-center justify-center">
                         <div className="w-2 h-2 bg-red-900 rounded-full"></div>
                      </div>
                  </div>
                  <div className="mt-8 text-center space-y-2">
                      <h3 className="text-lg font-bold text-slate-800">Noble Care Academy</h3>
                      <div className="flex items-center justify-center space-x-1">
                          <div className="w-2 h-2 bg-amber-400 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                          <div className="w-2 h-2 bg-amber-500 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                          <div className="w-2 h-2 bg-red-800 rounded-full animate-bounce"></div>
                      </div>
                  </div>
              </div>
          </Layout>
      )
  }

  if (error) {
      return (
          <Layout title="Dashboard">
              <div className="flex items-center justify-center h-96 flex-col p-8">
                  <AlertOctagon size={48} className="text-red-400 mb-4"/>
                  <h3 className="text-lg font-bold text-slate-700">Unable to load dashboard</h3>
                  <p className="text-slate-500 text-center max-w-md mb-6">{error}</p>
                  <button onClick={fetchData} className="flex items-center px-4 py-2 bg-red-800 text-white rounded-lg hover:bg-red-900 transition-colors">
                      <RefreshCw size={16} className="mr-2"/> Retry
                  </button>
              </div>
          </Layout>
      )
  }

  return (
      <Layout title="Dashboard">
        {/* Your full dashboard JSX here (same as your previous version) */}
      </Layout>
  )
};

export default AdminDashboard;
