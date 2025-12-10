import { useEffect, useState } from "react";
import axios from "axios";
import { useTranslation } from "react-i18next";
import "./StudentList.css";

function StudentList() {
  const { t } = useTranslation();
  const [courses, setCourses] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchCourses = async () => {
      try {
        const token = localStorage.getItem("token");
        const res = await axios.get("http://localhost:5001/courses/mine", {
          headers: { Authorization: `Bearer ${token}` },
        });
        setCourses(res.data);
        if (res.data.length > 0) {
          setSelectedCourse(res.data[0]);
        }
      } catch (err) {}
    };
    fetchCourses();
  }, []);

  useEffect(() => {
    const fetchStudents = async () => {
      if (!selectedCourse) return;
      setLoading(true);
      try {
        const token = localStorage.getItem("token");
        const res = await axios.get("http://localhost:5001/course-students", {
          headers: { Authorization: `Bearer ${token}` },
          params: { courseId: selectedCourse.id },
        });
        setStudents(res.data.students);
      } catch (err) {} 
      finally {
        setLoading(false);
      }
    };
    fetchStudents();
  }, [selectedCourse]);

  return (
    <div className="my-courses-container">
      <h1>{t("studentlist.myCourses")}</h1>

      <div className="course-teacher-select">
        <div className="course-select">
          <label>{t("studentlist.chooseCourse")}:</label>
          <select
            value={selectedCourse?.id || ""}
            onChange={(e) =>
              setSelectedCourse(courses.find(c => c.id === parseInt(e.target.value)))
            }
          >
            {courses.map(c => (
              <option key={c.id} value={c.id}>
                {c.title}
              </option>
            ))}
          </select>
        </div>
      </div>

      {selectedCourse && <h2 className="course-teacher-title">{selectedCourse.title}</h2>}

      <div>
        {loading ? (
          <p style={{ color: 'var(--student-list-text-primary)' }}>{t("studentlist.loading")}</p>
        ) : (
          <table className="students-table">
            <thead>
              <tr>
                <th>{t("studentlist.stt")}</th>
                <th>{t("studentlist.name")}</th>
                <th>{t("studentlist.email")}</th>
                <th>{t("studentlist.phone")}</th>
                <th>{t("studentlist.gender")}</th>
                <th>{t("studentlist.enrolledAt")}</th>
              </tr>
            </thead>

            <tbody>
              {students.length > 0 ? (
                students.map((s, idx) => (
                  <tr key={s.student_id}>
                    <td>{idx + 1}</td>
                    <td>{s.student_name}</td>
                    <td>{s.email}</td>
                    <td>{s.phone || "-"}</td>
                    <td>{s.gender}</td>
                    <td>{new Date(s.enrolled_at).toLocaleDateString()}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="6" style={{ textAlign: 'center', color: 'var(--student-list-text-secondary)' }}>
                    {t("studentlist.noStudents")}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

export default StudentList;