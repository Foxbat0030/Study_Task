import { useState } from 'react';
import { ToastProvider } from '@/components/ui/Toast';
import { Layout } from '@/components/Layout';
import { TasksPage } from '@/pages/TasksPage';
import { StudentsPage } from '@/pages/StudentsPage';
import { StudentProfilePage } from '@/pages/StudentProfilePage';
import { CoursesPage } from '@/pages/CoursesPage';
import { SubjectsPage } from '@/pages/SubjectsPage';
import type { Page } from '@/types';

function App() {
  const [page, setPage] = useState<Page>('tasks');
  const [profileStudentId, setProfileStudentId] = useState<string | null>(null);

  const navigate = (p: Page) => {
    setPage(p);
    setProfileStudentId(null);
  };

  const viewProfile = (studentId: string) => {
    setProfileStudentId(studentId);
  };

  const backFromProfile = () => {
    setProfileStudentId(null);
  };

  return (
    <ToastProvider>
      {profileStudentId ? (
        <Layout current="students" onNavigate={navigate}>
          <StudentProfilePage studentId={profileStudentId} onBack={backFromProfile} />
        </Layout>
      ) : (
        <Layout current={page} onNavigate={navigate}>
          {page === 'tasks' && <TasksPage />}
          {page === 'students' && <StudentsPage onViewProfile={viewProfile} />}
          {page === 'courses' && <CoursesPage />}
          {page === 'subjects' && <SubjectsPage />}
        </Layout>
      )}
    </ToastProvider>
  );
}

export default App;
