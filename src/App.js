import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Header from "./components/Header/Header";
import Footer from "./components/Footer/Footer";
import HomePage from "./pages/HomePage/Dashboard/HomePage";
import Courses from "./pages/DashboardStudent/Course/Courses"
import LoginPage from "./pages/LoginPage/Login";
import RegisterPage from "./pages/RegisterPage/Register";
import DashboardAdmin from "./pages/DashboardAdmin/Dashboard/DashboardAdmin";
import DashboardTeacher from "./pages/DashboardTeacher/Dashboard/DashBoardTeacher";
import DashboardStudent from "./pages/DashboardStudent/Dashboard/DashBoardStudent";
import ForgotPasswordPage from "./pages/ForgotPage/ForgotPage";

function App() {
  return (
    <Router>
      <Header />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/my-courses" element={<Courses />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/admin-dashboard" element={<DashboardAdmin />} />
        <Route path="/teacher-dashboard" element={<DashboardTeacher />} />
        <Route path="/student-dashboard" element={<DashboardStudent />} />
      </Routes>
      <Footer />
    </Router>
  );
}

export default App;
