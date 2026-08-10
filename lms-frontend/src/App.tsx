import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './lib/auth-context';
import ProtectedRoute from './components/ProtectedRoute';
import AdminRoute from './components/AdminRoute';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Catalog from './pages/Catalog';
import AdminCourses from './pages/AdminCourses';
import AdminCourseContent from './pages/AdminCourseContent';
import AdminWorkshops from './pages/AdminWorkshops';
import AdminStudents from './pages/AdminStudents';
import AdminEvents from './pages/AdminEvents';

export default function App() {
  return (
    // basename porque la app se sirve desde /LideresVIP, no desde la raíz del sitio.
    <BrowserRouter basename="/LideresVIP">
      <AuthProvider>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/courses"
            element={
              <ProtectedRoute>
                <Catalog />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/courses"
            element={
              <AdminRoute>
                <AdminCourses />
              </AdminRoute>
            }
          />
          <Route
            path="/admin/courses/:courseId/content"
            element={
              <AdminRoute>
                <AdminCourseContent />
              </AdminRoute>
            }
          />
          <Route
            path="/admin/workshops"
            element={
              <AdminRoute>
                <AdminWorkshops />
              </AdminRoute>
            }
          />
          <Route
            path="/admin/students"
            element={
              <AdminRoute>
                <AdminStudents />
              </AdminRoute>
            }
          />
          <Route
            path="/admin/events"
            element={
              <AdminRoute>
                <AdminEvents />
              </AdminRoute>
            }
          />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
