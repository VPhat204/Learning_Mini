import { useEffect, useState } from "react";
import axios from "axios";
import { message } from "antd";
import "./TeacherList.css";

export default function TeacherList({ onCourseEnrolled }) {
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

  useEffect(() => {
    const fetchTeachers = async () => {
      setLoading(true);
      try {
        const res = await axios.get("http://localhost:5001/teachers-courses", {
          headers: { Authorization: `Bearer ${token}` },
        });
        setTeachers(res.data);
      } catch (err) {
        console.error(err);
        messageApi.error("Lỗi khi tải danh sách giảng viên");
      } finally {
        setLoading(false);
      }
    };
    fetchTeachers();
  }, [token, messageApi]);

  useEffect(() => {
    const fetchEnrolledCourses = async () => {
      if (user && user.roles === "student") {
        try {
          const enrolledRes = await axios.get(
            `http://localhost:5001/users/${user.id}/courses`,
            {
              headers: { Authorization: `Bearer ${token}` },
            }
          );
          const enrolledIds = new Set(enrolledRes.data.map(course => course.id));
          setEnrolledCourses(enrolledIds);
          
          const pendingRes = await axios.get(
            `http://localhost:5001/users/${user.id}/pending-courses`,
            {
              headers: { Authorization: `Bearer ${token}` },
            }
          );
          const pendingIds = new Set(pendingRes.data.map(course => course.id));
          setPendingCourses(pendingIds);
          
        } catch (err) {
          console.error("Lỗi khi lấy khóa học:", err);
        }
      }
    };
    fetchEnrolledCourses();
  }, [token, user]);

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
      
      if (user.roles !== "student") {
        messageApi.error("Chỉ sinh viên mới có thể đăng ký khóa học");
        return;
      }

      const status = getCourseStatus(courseId);
      if (status === "enrolled") {
        messageApi.warning("Bạn đã đăng ký khóa học này rồi");
        return;
      }
      
      if (status === "pending") {
        messageApi.info("Khóa học này đang chờ xác nhận. Vui lòng kiên nhẫn!");
        return;
      }

      await axios.post(
        `http://localhost:5001/courses/${courseId}/enroll`,
        { status: "pending" },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      setPendingCourses(prev => new Set([...prev, courseId]));
      
      messageApi.success({
        content: `Đã gửi yêu cầu đăng ký khóa học: ${courseTitle}`,
        duration: 3,
      });
      
      messageApi.info({
        content: "Khóa học của bạn đang chờ xác nhận.",
        duration: 5,
      });
      
      if (onCourseEnrolled) {
        onCourseEnrolled();
      }
      
    } catch (error) {
      console.error("Lỗi khi đăng ký:", error);
      if (error.response?.status === 403) {
        messageApi.error("Bạn không có quyền đăng ký khóa học");
      } else if (error.response?.status === 409) {
        messageApi.warning("Bạn đã gửi yêu cầu đăng ký cho khóa học này rồi");
        setPendingCourses(prev => new Set([...prev, courseId]));
      } else {
        messageApi.error("Có lỗi xảy ra khi gửi yêu cầu đăng ký khóa học");
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
                src={`http://localhost:5001${teacher.avatar}`} 
                alt={teacher.name}
                onError={(e) => e.target.src = require("../../../assets/default.jpg")}
              />
            </div>
            <div className="teacher-details">
              <div className="detail-row">
                <span className="teacher-name">{teacher.name}</span>
                <span className="teacher-gender">{teacher.gender || "-"}</span>
              </div>
              <div className="detail-row">
                <span className="teacher-date">
                  {teacher.birthdate ? new Date(teacher.birthdate).toLocaleDateString() : "Chưa cập nhật"}
                </span>
                <span className="teacher-phone">{teacher.phone || "Chưa cập nhật"}</span>
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
            >
              Xem tất cả khóa học
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
          Thông tin giảng viên
        </span>
        <span className="breadcrumb-separator">›</span>
        <span className="breadcrumb-current">{selectedTeacher.name}</span>
      </div>

      <div className="back-button-container">
        <button className="back-button" onClick={handleBackToList}>
          Quay lại danh sách
        </button>
      </div>

      <div className="teacher-detail-info">
        <div className="teacher-detail-header">
          <div className="teacher-detail-avatar">
            <img 
              src={`http://localhost:5001${selectedTeacher.avatar}`} 
              alt={selectedTeacher.name}
              onError={(e) => e.target.src = "."}
            />
          </div>
          <div className="teacher-detail-main">
            <h2 className="teacher-detail-name">{selectedTeacher.name}</h2>
            <div className="teacher-detail-meta">
              <span className="teacher-detail-gender">{selectedTeacher.gender || "Chưa cập nhật"}</span>
              <span className="teacher-detail-birthdate">
                {selectedTeacher.birthdate ? new Date(selectedTeacher.birthdate).toLocaleDateString() : "Chưa cập nhật"}
              </span>
              <span className="teacher-detail-phone">{selectedTeacher.phone || "Chưa cập nhật"}</span>
            </div>
            <div className="teacher-detail-email">{selectedTeacher.email}</div>
          </div>
        </div>
      </div>

      <div className="teacher-courses-section">
        <h3 className="courses-section-title">Khóa học giảng dạy</h3>
        {selectedTeacher.courses.length === 0 ? (
          <p className="no-courses">Giảng viên chưa có khóa học nào</p>
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
                          ⏳ Đang chờ xác nhận
                        </div>
                      )}
                    </div>
                    <div className="course-list-actions">
                      <button 
                        className={`enroll-btn ${status} ${enrolling[course.id] ? 'enrolling' : ''}`}
                        onClick={() => handleEnroll(course.id, course.title)}
                        disabled={isEnrolled || isPending || enrolling[course.id]}
                      >
                        {enrolling[course.id] ? "Đang xử lý..." : 
                         isEnrolled ? "Đã đăng ký" : 
                         isPending ? "Chờ xác nhận" : 
                         "Đăng ký học"}
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
      <h1>Danh sách giảng viên</h1>
      {loading ? (
        <p>Đang tải danh sách giảng viên...</p>
      ) : (
        viewMode === "grid" ? renderGridView() : renderDetailView()
      )}
    </div>
  );
}