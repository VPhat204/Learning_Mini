import { Navigate } from "react-router-dom";
import DashboardAdmin from "./pages/DashboardAdmin";
import DashboardTeacher from "./pages/DashboardTeacher";
import DashboardStudent from "./pages/DashboardStudent";

export const privateRoutes = [
  { path: "/admin", element: <DashboardAdmin />, role: "admin" },
  { path: "/teacher", element: <DashboardTeacher />, role: "teacher" },
  { path: "/student", element: <DashboardStudent />, role: "student" },
];
function PrivateRoute({ element, role }) {
  const userRole = localStorage.getItem("role");
  return userRole === role ? element : <Navigate to="/login" />;
}
export default PrivateRoute;