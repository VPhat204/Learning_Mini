import { useEffect, useState } from "react";
import axios from "axios";
import { message } from "antd";
import { useTranslation } from "react-i18next";
import "./TeacherHomePage.css";

export default function TeacherList({ onCourseEnrolled }) {
  const { t } = useTranslation();
  const [messageApi, contextHolder] = message.useMessage();
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [enrolling, setEnrolling] = useState({});
  const [selectedTeacher, setSelectedTeacher] = useState(null);
  const [enrolledCourses, setEnrolledCourses] = useState(new Set());
  const [viewMode, setViewMode] = useState("grid");

  const token = localStorage.getItem("token");
  const user = JSON.parse(localStorage.getItem("user"));

  useEffect(() => {
    const fetchTeachers = async () => {
      setLoading(true);
      try {
        const res = await axios.get("https://learning-mini-be.onrender.com/teachers-courses", {
          headers: { Authorization: `Bearer ${token}` },
        });
        setTeachers(res.data);
      } catch (err) {
        console.error("Error fetching teachers:", err);
        messageApi.error(t("teacherHomeList.messages.loadError"));
      } finally {
        setLoading(false);
      }
    };
    fetchTeachers();
  }, [token, t, messageApi]);

  useEffect(() => {
    const fetchEnrolledCourses = async () => {
      if (user && user.roles === "student") {
        try {
          const enrolledRes = await axios.get(
            `https://learning-mini-be.onrender.com/users/${user.id}/courses`,
            {
              headers: { Authorization: `Bearer ${token}` },
            }
          );
          const enrolledIds = new Set(enrolledRes.data.map(course => course.id));
          setEnrolledCourses(enrolledIds);
        } catch (err) {
          console.error("Error fetching enrolled courses:", err);
          messageApi.error(t("teacherHomeList.messages.enrolledCoursesError"));
        }
      }
    };
    fetchEnrolledCourses();
  }, [token, user, t, messageApi]);

  const isCourseEnrolled = (courseId) => {
    return enrolledCourses.has(courseId);
  };

  const handleViewCourses = (teacher) => {
    setSelectedTeacher(teacher);
    setViewMode("detail");
  };

  const handleBackToList = () => {
    setSelectedTeacher(null);
    setViewMode("grid");
  };

  const handleEnroll = async (courseId, courseTitle) => {
    if (!user) {
      messageApi.error(t("teacherHomeList.messages.loginRequired"));
      return;
    }

    if (user.roles !== "student") {
      messageApi.error(t("teacherHomeList.messages.studentsOnly"));
      return;
    }

    try {
      setEnrolling(prev => ({ ...prev, [courseId]: true }));

      if (isCourseEnrolled(courseId)) {
        messageApi.warning(t("teacherHomeList.messages.alreadyEnrolled"));
        return;
      }

      await axios.post(
        `https://learning-mini-be.onrender.com/courses/${courseId}/enroll`,
        {},
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      setEnrolledCourses(prev => new Set([...prev, courseId]));
      
      messageApi.success(t("teacherHomeList.messages.enrollSuccess", { courseTitle }));
      
      if (onCourseEnrolled) {
        onCourseEnrolled();
      }
      
    } catch (error) {
      console.error("Enrollment error:", error);
      if (error.response?.status === 403) {
        messageApi.error(t("teacherHomeList.messages.noPermission"));
      } else if (error.response?.status === 409) {
        messageApi.warning(t("teacherHomeList.messages.alreadyEnrolled"));
        setEnrolledCourses(prev => new Set([...prev, courseId]));
      } else {
        messageApi.error(t("teacherHomeList.messages.enrollError"));
      }
    } finally {
      setEnrolling(prev => ({ ...prev, [courseId]: false }));
    }
  };

  const formatBirthdate = (birthdate) => {
    if (!birthdate) return t("teacherHomeList.notUpdated");
    
    try {
      const date = new Date(birthdate);
      if (isNaN(date.getTime())) return t("teacherHomeList.notUpdated");
      
      return date.toLocaleDateString('vi-VN');
    } catch (error) {
      return t("teacherHomeList.notUpdated");
    }
  };

  const renderGridView = () => (
    <div className="teachers-grid">
      {teachers.map((teacher) => (
        <div key={teacher.id} className="teacher-card">
          <div className="teacher-main-info">
            <div className="teacher-avatar">
              <img 
                src={`https://learning-mini-be.onrender.com${teacher.avatar}`} 
                alt={teacher.name}
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.src = require("../../../assets/default.jpg");
                }}
              />
            </div>
            <div className="teacher-details">
              <div className="detail-row">
                <span className="teacher-name">{teacher.name || t("teacherHomeList.notAvailable")}</span>
                <span className="teacher-gender">{teacher.gender || "-"}</span>
              </div>
              <div className="detail-row">
                <span className="teacher-date">
                  {formatBirthdate(teacher.birthdate)}
                </span>
                <span className="teacher-phone">{teacher.phone || t("teacherHomeList.notUpdated")}</span>
              </div>
              <div className="detail-row">
                <span className="teacher-email">{teacher.email || t("teacherHomeList.notAvailable")}</span>
              </div>
            </div>
          </div>
          
          <div className="teacher-actions">
            <button 
              className="view-courses-btn"
              onClick={() => handleViewCourses(teacher)}
            >
              {t("teacherHomeList.actions.viewAllCourses")} ({teacher.courses ? teacher.courses.length : 0})
            </button>
          </div>
        </div>
      ))}
    </div>
  );

  const renderDetailView = () => {
    if (!selectedTeacher) return null;

    const allCourses = selectedTeacher.courses || [];
    
    return (
      <div className="teacher-detail-view">
        <div className="breadcrumb">
          <span className="breadcrumb-item" onClick={handleBackToList}>
            {t("teacherHomeList.title")}
          </span>
          <span className="breadcrumb-separator">›</span>
          <span className="breadcrumb-current">{selectedTeacher.name}</span>
        </div>

        <div className="back-button-container">
          <button className="back-button" onClick={handleBackToList}>
            ← {t("teacherHomeList.actions.back")}
          </button>
        </div>

        <div className="teacher-detail-info">
          <div className="teacher-detail-header">
            <div className="teacher-detail-avatar">
              <img 
                src={`https://learning-mini-be.onrender.com${selectedTeacher.avatar}`} 
                alt={selectedTeacher.name}
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.src = require("../../../assets/default.jpg");
                }}
              />
            </div>
            <div className="teacher-detail-main">
              <h2 className="teacher-detail-name">{selectedTeacher.name || t("teacherHomeList.notAvailable")}</h2>
              <div className="teacher-detail-meta">
                <span className="teacher-detail-gender">{selectedTeacher.gender || t("teacherHomeList.notUpdated")}</span>
                <span className="teacher-detail-birthdate">
                  {formatBirthdate(selectedTeacher.birthdate)}
                </span>
                <span className="teacher-detail-phone">{selectedTeacher.phone || t("teacherHomeList.notUpdated")}</span>
              </div>
              <div className="teacher-detail-email">{selectedTeacher.email || t("teacherHomeList.notAvailable")}</div>
            </div>
          </div>
        </div>

        <div className="teacher-courses-section">
          <h3 className="courses-section-title">
            {t("teacherHomeList.teachingCourses")} ({allCourses.length})
          </h3>
          {allCourses.length === 0 ? (
            <p className="no-courses">{t("teacherHomeList.noCourses")}</p>
          ) : (
            <div className="courses-list">
              {allCourses.map((course) => {
                const isEnrolled = isCourseEnrolled(course.id);
                
                const isApproved = course.is_approved !== undefined ? course.is_approved : 
                                 course.isApproved !== undefined ? course.isApproved : 
                                 course.status === 'approved' ? 1 : 0;

                return (
                  <div key={course.id} className={`course-list-item ${isEnrolled ? 'enrolled' : ''}`}>
                    <div className="course-list-content">
                      <div className="course-list-info">
                        <h4 className="course-list-title">{course.title || t("courseHomeDetail.notAvailable")}</h4>
                        <p className="course-list-description">{course.description || t("courseHomeDetail.noDescription")}</p>
                        <div className="course-list-details">
                          {course.lessons && (
                            <span className="course-lessons">
                              {t("enrolledCoursesHome.lessons")}: {course.lessons}
                            </span>
                          )}
                          {course.hours && (
                            <span className="course-hours">
                              {t("enrolledCoursesHome.hours")}: {course.hours}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="course-list-actions">
                        {isEnrolled ? (
                          <div className="enrollment-status">
                            <span className="enrolled-badge"> {t("teacherHomeList.actions.enrolled")}</span>
                            <span className="enrolled-date">
                              {t("mycoursesHome.enrolledDate")}: {new Date().toLocaleDateString('vi-VN')}
                            </span>
                          </div>
                        ) : (
                          <button 
                            className={`enroll-btn ${enrolling[course.id] ? 'enrolling' : ''}`}
                            onClick={() => handleEnroll(course.id, course.title || t("courseHomeDetail.notAvailable"))}
                            disabled={enrolling[course.id] || isApproved !== 1}
                          >
                            {enrolling[course.id] ? t("teacherHomeList.actions.enrolling") : 
                             isApproved !== 1 ? t("teacherHomeList.actions.cannotEnroll") : t("teacherHomeList.actions.enroll")}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="teacher-list-container">
      {contextHolder}
      <h1 className="page-title">{t("teacherHomeList.title")}</h1>
      {!user && (
        <div className="login-notice">
          <p>⚠️ {t("teacherHomeList.messages.loginPrompt")} <a href="/login">{t("loginHome")}</a></p>
        </div>
      )}
      
      {loading ? (
        <div className="loading-container">
          <p>{t("teacherHomeList.loading")}</p>
        </div>
      ) : teachers.length === 0 ? (
        <div className="no-teachers">
          <p>{t("teacherHomeList.noTeachers")}</p>
        </div>
      ) : (
        viewMode === "grid" ? renderGridView() : renderDetailView()
      )}
    </div>
  );
}