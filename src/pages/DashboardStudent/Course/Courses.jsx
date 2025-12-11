import { useEffect, useState, useCallback } from "react";
import axios from "axios";
import { Button, Progress } from "antd";
import { useTranslation } from "react-i18next";
import CourseDetail from "./Detail/CourseDetail";
import StudentAssignments from "./Assignment/AssignmentPage";
import "./Course.css";

export default function Courses({ refreshTrigger }) {
  const { t } = useTranslation();
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [progressData, setProgressData] = useState({});
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [selectedAssignmentsCourse, setSelectedAssignmentsCourse] = useState(null);

  const getInitial = (title) => title ? title.charAt(0).toUpperCase() : "C";

  const fetchMyCourses = useCallback(async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const user = JSON.parse(localStorage.getItem("user"));
      const res = await axios.get(
        `https://learning-mini-be.onrender.com/users/${user.id}/courses`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setCourses(res.data);

      const progressPromises = res.data.map(async (course) => {
        try {
          const progressRes = await axios.get(
            `https://learning-mini-be.onrender.com/courses/${course.id}/progress`,
            {
              headers: { Authorization: `Bearer ${token}` },
              params: { studentId: user.id }
            }
          );
          return { courseId: course.id, progress: progressRes.data.progress || 0 };
        } catch {
          return { courseId: course.id, progress: 0 };
        }
      });

      const progressResults = await Promise.all(progressPromises);
      const progressMap = {};
      progressResults.forEach((r) => (progressMap[r.courseId] = r.progress));
      setProgressData(progressMap);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleViewDetail = (course) => {
    setSelectedAssignmentsCourse(null);
    setSelectedCourse(course);
  };

  const handleViewAssignments = (courseId) => {
    setSelectedCourse(null);
    setSelectedAssignmentsCourse(courseId);
  };

  const handleBack = () => {
    setSelectedCourse(null);
    setSelectedAssignmentsCourse(null);
  };

  useEffect(() => {
    fetchMyCourses();
  }, [refreshTrigger, fetchMyCourses]);

  return (
    <div className="courses-container">
      <h1 className="student-courses-title">{t("mycourses.title")}</h1>

      {(selectedCourse || selectedAssignmentsCourse) && (
        <div className="btn-course-back" onClick={handleBack}>&lt; {t("mycourses.actions.back")}</div>
      )}

      {selectedCourse && <CourseDetail course={selectedCourse} />}

      {selectedAssignmentsCourse && (
        <StudentAssignments courseId={selectedAssignmentsCourse} />
      )}

      {!selectedCourse && !selectedAssignmentsCourse && !loading && (
        <>
          {courses.length === 0 ? (
            <div className="student-no-courses">
              <p>{t("mycourses.noCourses")}</p>
            </div>
          ) : (
            <div className="student-courses-grid">
              {courses.map((course) => {
                const progress = progressData[course.id] || 0;
                return (
                  <div key={course.id} className="student-course-card">
                    <div className="student-course-header">
                      <div className="student-course-avatar">
                        {getInitial(course.title)}
                      </div>
                      <div className="student-course-title-section">
                        <h3 className="student-course-title">{course.title}</h3>
                        <span className="student-course-teacher">
                          {t("mycourses.teacher")}: {course.teacher_name}
                        </span>
                      </div>
                    </div>

                    <p className="student-course-description">
                      {course.description}
                    </p>

                    <div className="student-progress-section">
                      <div className="student-progress-info">
                        <span className="student-progress-label">
                          {t("mycourses.progress")}:
                        </span>
                        <span className="student-progress-value">
                          {progress}%
                        </span>
                      </div>

                      <Progress
                        percent={progress}
                        size="small"
                        strokeColor={{
                          "0%": "var(--primary-color, #4096ff)",
                          "100%": "var(--primary-light, #70b6ff)"
                        }}
                        showInfo={false}
                        style={{ width: "100%" }}
                      />
                    </div>

                    <div className="student-course-meta">
                      <span className="student-enrolled-date">
                        {t("mycourses.enrolledDate")}:{" "}
                        {new Date(course.enrolled_at).toLocaleDateString()}
                      </span>
                    </div>

                    <div className="student-course-footer">
                      <Button
                        type="primary"
                        onClick={() => handleViewAssignments(course.id)}
                        className="student-view-detail-btn"
                      >
                        {t("assignments.title")}
                      </Button>

                      <Button
                        onClick={() => handleViewDetail(course)}
                        className="student-view-detail-btn"
                      >
                        {t("mycourses.actions.viewDetail")}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {loading && <p>{t("mycourses.loading")}</p>}
    </div>
  );
}
