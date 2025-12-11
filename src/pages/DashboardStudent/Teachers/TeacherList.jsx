import { useEffect, useState, useRef, useCallback } from "react";
import axios from "axios";
import { message } from "antd";
import { useTranslation } from "react-i18next";
import "./TeacherList.css";

export default function TeacherList({ onCourseEnrolled }) {
  const { t } = useTranslation();
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [enrolling, setEnrolling] = useState({});
  const [selectedTeacher, setSelectedTeacher] = useState(null);
  const [enrolledCourses, setEnrolledCourses] = useState(new Set());
  const [pendingCourses, setPendingCourses] = useState(new Set());
  const [viewMode, setViewMode] = useState("grid");

  const token = localStorage.getItem("token");
  const user = JSON.parse(localStorage.getItem("user"));
  const [messageApi, contextHolder] = message.useMessage();
  const hasFetchedEnrolled = useRef(false);

  useEffect(() => {
    const fetchTeachers = async () => {
      setLoading(true);
      try {
        const res = await axios.get("https://learning-mini-be.onrender.com/teachers-courses", {
          headers: { Authorization: `Bearer ${token}` },
        });
        
        const filteredTeachers = res.data.filter(teacher => 
          teacher.courses && teacher.courses.length > 0
        );
        
        setTeachers(filteredTeachers);
      } catch (err) {
        console.error(err);
        messageApi.error(t("teacherlist.messages.loadError"));
      } finally {
        setLoading(false);
      }
    };
    fetchTeachers();
  }, [token, messageApi, t]);

  const fetchEnrolledData = useCallback(async () => {
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
        
        const pendingRes = await axios.get(
          `https://learning-mini-be.onrender.com/users/${user.id}/pending-courses`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        const pendingIds = new Set(pendingRes.data.map(course => course.id));
        setPendingCourses(pendingIds);
        
      } catch (err) {
        console.error("Lỗi khi lấy khóa học:", err);
        messageApi.error(t("teacherlist.messages.enrolledCoursesError"));
      }
    }
  }, [token, user, t, messageApi]);

  useEffect(() => {
    if (!hasFetchedEnrolled.current) {
      fetchEnrolledData();
      hasFetchedEnrolled.current = true;
    }
  }, [fetchEnrolledData]);

  const getCourseStatus = (courseId) => {
    if (enrolledCourses.has(courseId)) {
      return "enrolled";
    }
    if (pendingCourses.has(courseId)) {
      return "pending";
    }
    return "available";
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
    try {
      setEnrolling(prev => ({ ...prev, [courseId]: true }));
      
      if (!user) {
        messageApi.error(t("teacherlist.messages.loginRequired"));
        return;
      }
      
      if (user.roles !== "student") {
        messageApi.error(t("teacherlist.messages.studentsOnly"));
        return;
      }

      const status = getCourseStatus(courseId);
      if (status === "enrolled") {
        messageApi.warning(t("teacherlist.messages.alreadyEnrolled"));
        return;
      }
      
      if (status === "pending") {
        messageApi.info(t("enrolledCourses.status.pending"));
        return;
      }

      await axios.post(
        `https://learning-mini-be.onrender.com/courses/${courseId}/enroll`,
        { status: "pending" },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      setPendingCourses(prev => new Set([...prev, courseId]));
      
      messageApi.success({
        content: t("teacherlist.messages.enrollSuccess", { courseTitle }),
        duration: 3,
      });
      
      messageApi.info({
        content: t("enrolledCourses.status.pending"),
        duration: 5,
      });
      
      if (onCourseEnrolled) {
        onCourseEnrolled();
      }
      
    } catch (error) {
      console.error("Lỗi khi đăng ký:", error);
      if (error.response?.status === 403) {
        messageApi.error(t("teacherlist.messages.noPermission"));
      } else if (error.response?.status === 409) {
        messageApi.warning(t("teacherlist.messages.alreadyEnrolled"));
        setPendingCourses(prev => new Set([...prev, courseId]));
      } else {
        messageApi.error(t("teacherlist.messages.enrollError"));
      }
    } finally {
      setEnrolling(prev => ({ ...prev, [courseId]: false }));
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
                onError={(e) => e.target.src = require("../../../assets/default.jpg")}
              />
            </div>
            <div className="teacher-details">
              <div className="detail-row">
                <span className="teacher-name">{teacher.name}</span>
                <span className="teacher-gender">{teacher.gender || t("teacherlist.notAvailable")}</span>
              </div>
              <div className="detail-row">
                <span className="teacher-date">
                  {teacher.birthdate ? new Date(teacher.birthdate).toLocaleDateString() : t("teacherlist.notUpdated")}
                </span>
                <span className="teacher-phone">{teacher.phone || t("teacherlist.notUpdated")}</span>
              </div>
              <div className="detail-row">
                <span className="teacher-email">{teacher.email}</span>
              </div>
            </div>
          </div>
          
          <div className="teacher-actions">
            <button 
              className="view-courses-btn"
              onClick={() => handleViewCourses(teacher)}
              disabled={!teacher.courses || teacher.courses.length === 0}
            >
              {teacher.courses && teacher.courses.length > 0 
                ? t("teacherlist.actions.viewAllCourses") 
                : t("teacherlist.noCourses")}
            </button>
          </div>
        </div>
      ))}
    </div>
  );

  const renderDetailView = () => (
    <div className="teacher-detail-view">
      <div className="breadcrumb">
        <span className="breadcrumb-item" onClick={handleBackToList}>
          {t("teacherlist.title")}
        </span>
        <span className="breadcrumb-separator">›</span>
        <span className="breadcrumb-current">{selectedTeacher.name}</span>
      </div>

      <div className="back-button-container">
        <button className="back-button" onClick={handleBackToList}>
          {t("teacherlist.actions.back")}
        </button>
      </div>

      <div className="teacher-detail-info">
        <div className="teacher-detail-header">
          <div className="teacher-detail-avatar">
            <img 
              src={`https://learning-mini-be.onrender.com${selectedTeacher.avatar}`} 
              alt={selectedTeacher.name}
              onError={(e) => e.target.src = "."}
            />
          </div>
          <div className="teacher-detail-main">
            <h2 className="teacher-detail-name">{selectedTeacher.name}</h2>
            <div className="teacher-detail-meta">
              <span className="teacher-detail-gender">{selectedTeacher.gender || t("teacherlist.notAvailable")}</span>
              <span className="teacher-detail-birthdate">
                {selectedTeacher.birthdate ? new Date(selectedTeacher.birthdate).toLocaleDateString() : t("teacherlist.notUpdated")}
              </span>
              <span className="teacher-detail-phone">{selectedTeacher.phone || t("teacherlist.notUpdated")}</span>
            </div>
            <div className="teacher-detail-email">{selectedTeacher.email}</div>
          </div>
        </div>
      </div>

      <div className="teacher-courses-section">
        <h3 className="courses-section-title">{t("teacherlist.teachingCourses")}</h3>
        {selectedTeacher.courses.length === 0 ? (
          <p className="no-courses">{t("teacherlist.noCourses")}</p>
        ) : (
          <div className="courses-list">
            {selectedTeacher.courses.map((course) => {
              const status = getCourseStatus(course.id);
              const isEnrolled = status === "enrolled";
              const isPending = status === "pending";
              
              return (
                <div key={course.id} className={`course-list-item ${status}`}>
                  <div className="course-list-content">
                    <div className="course-list-info">
                      <h4 className="course-list-title">{course.title}</h4>
                      <p className="course-list-description">{course.description}</p>
                      {isPending && (
                        <div className="course-status-badge pending">
                          ⏳ {t("enrolledCourses.status.pending")}
                        </div>
                      )}
                    </div>
                    <div className="course-list-actions">
                      <button 
                        className={`enroll-btn ${status} ${enrolling[course.id] ? 'enrolling' : ''}`}
                        onClick={() => handleEnroll(course.id, course.title)}
                        disabled={isEnrolled || isPending || enrolling[course.id]}
                      >
                        {enrolling[course.id] ? t("teacherlist.actions.enrolling") : 
                         isEnrolled ? t("teacherlist.actions.enrolled") : 
                         isPending ? t("enrolledCourses.status.pending") : 
                         t("teacherlist.actions.enroll")}
                      </button>
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

  return (
    <div className="teacher-list-container">
      {contextHolder}
      <h1>{t("teacherlist.title")}</h1>
      {loading ? (
        <p>{t("teacherlist.loading")}</p>
      ) : teachers.length === 0 ? (
        <p>{t("teacherlist.noTeachers")}</p>
      ) : (
        viewMode === "grid" ? renderGridView() : renderDetailView()
      )}
    </div>
  );
}