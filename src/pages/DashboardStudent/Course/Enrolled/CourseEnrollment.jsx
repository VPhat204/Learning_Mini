import { useEffect, useState, useCallback } from "react";
import axios from "axios";
import { message, Modal, Input, Button, Pagination, Select } from "antd";
import { useTranslation } from "react-i18next";
import "./EnrolledCourses.css";

const { Option } = Select;

function EnrolledCourses() {
  const { t } = useTranslation();
  const [courses, setCourses] = useState([]);
  const [email, setEmail] = useState("");
  const [filteredCourses, setFilteredCourses] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [sortOrder, setSortOrder] = useState("a-z");
  const [currentPage, setCurrentPage] = useState(1);
  const user = JSON.parse(localStorage.getItem("user"));
  const token = localStorage.getItem("token");
  const [messageApi, contextHolder] = message.useMessage();

  const coursesPerPage = 8;

  const fetchCourses = useCallback(async () => {
    try {
      const res = await axios.get(
        `https://learning-mini-be.onrender.com/enrolled-courses/${user.id}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setCourses(res.data);
    } catch (err) {
      messageApi.error(t('enrolledCourses.messages.loadError'));
    }
  }, [user, token, messageApi, t]);

  useEffect(() => {
    fetchCourses();
  }, [fetchCourses]);

  useEffect(() => {
    let sorted = [...courses];
    if (sortOrder === "a-z") {
      sorted.sort((a, b) => a.title.localeCompare(b.title));
    } else {
      sorted.sort((a, b) => b.title.localeCompare(a.title));
    }
    setFilteredCourses(sorted);
    setCurrentPage(1); 
  }, [courses, sortOrder]);

  const handleConfirmAll = async () => {
    if (!email) {
      messageApi.warning(t('enrolledCourses.messages.emailRequired'));
      return;
    }

    try {
      await axios.post(
        "https://learning-mini-be.onrender.com/courses/confirm-all",
        { userId: user.id, email },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      messageApi.success(t('enrolledCourses.messages.confirmAllSuccess'));

      setCourses(prev => prev.map(c => ({ ...c, status: "confirmed" })));
      setModalOpen(false);
      setEmail("");
    } catch (err) {
      messageApi.error(t('enrolledCourses.messages.confirmAllError'));
    }
  };

  const handleCancel = async (course_id) => {
    try {
      await axios.delete(
        `https://learning-mini-be.onrender.com/courses/${course_id}/unenroll`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      messageApi.success(t('enrolledCourses.messages.cancelSuccess'));
      setCourses(prev => prev.filter(c => c.course_id !== course_id));
    } catch (err) {
      messageApi.error(t('enrolledCourses.messages.cancelError'));
    }
  };

  const indexOfLastCourse = currentPage * coursesPerPage;
  const indexOfFirstCourse = indexOfLastCourse - coursesPerPage;
  const currentCourses = filteredCourses.slice(indexOfFirstCourse, indexOfLastCourse);

  return (
    <div className="enrolled-container">
      {contextHolder}
      <h1>{t('enrolledCourses.title')}</h1>

      {courses.length === 0 ? (
        <p>{t('enrolledCourses.noCourses')}</p>
      ) : (
        <>
          <div className="enrolled-controls">
            <Select
              value={sortOrder}
              onChange={value => setSortOrder(value)}
              style={{ width: 150 }}
            >
              <Option value="a-z">{t('enrolledCourses.sort.aToZ')}</Option>
              <Option value="z-a">{t('enrolledCourses.sort.zToA')}</Option>
            </Select>
          </div>
          <div className="enrolled-grid">
            {currentCourses.map((c) => (
              <div className="enrolled-card" key={c.course_id}>
                <div className="card-enrolled-header">
                  <div className="course-avatar">{c.title.charAt(0)}</div>
                  <h2 className="course-title">{c.title}</h2>
                </div>
                <p>{c.description}</p>
                <p><strong>{t('enrolledCourses.teacher')}:</strong> {c.teacher_name}</p>
                <p><strong>{t('enrolledCourses.teacherEmail')}:</strong> {c.teacher_email}</p>
                <p><strong>{t('enrolledCourses.lessons')}:</strong> {c.lessons}</p>
                <p><strong>{t('enrolledCourses.hours')}:</strong> {c.hours}</p>

                <div className="enrolled-actions">
                  <div className={`status-badge ${c.status === "confirmed" ? "status-confirmed" : "status-pending"}`}>
                    {c.status === "confirmed" ? t('enrolledCourses.status.confirmed') : t('enrolledCourses.status.pending')}
                  </div>
                  <div><Button danger onClick={() => handleCancel(c.course_id)}>{t('enrolledCourses.actions.cancel')}</Button></div>
                </div>
              </div>
            ))}
          </div>
          <div className="confirm-all-wrapper">
            <Button
              type="primary"
              onClick={() => setModalOpen(true)}
              className="confirm-all-btn"
            >
              {t('enrolledCourses.actions.confirmAll')}
            </Button>
          </div>
          <div className="pagination-wrapper">
            <Pagination
              current={currentPage}
              pageSize={coursesPerPage}
              total={filteredCourses.length}
              onChange={page => setCurrentPage(page)}
            />
          </div>
        </>
      )}

      <Modal
        title={t('enrolledCourses.modal.title')}
        open={modalOpen}
        onOk={handleConfirmAll}
        onCancel={() => setModalOpen(false)}
        okText={t('enrolledCourses.modal.confirm')}
        cancelText={t('enrolledCourses.modal.cancel')}
      >
        <p>{t('enrolledCourses.modal.description')}</p>
        <Input
          placeholder={t('enrolledCourses.modal.placeholder')}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </Modal>
    </div>
  );
}

export default EnrolledCourses;