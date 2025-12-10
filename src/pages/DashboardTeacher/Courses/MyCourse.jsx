import { useState, useEffect, useCallback } from "react";
import {
  Card,
  Button,
  Form,
  Input,
  message,
  List,
  Pagination,
  Avatar,
  Progress,
  Modal,
} from "antd";
import axios from "axios";
import "./MyCourse.css";
import { PlusOutlined, PlayCircleOutlined, DeleteOutlined, EditOutlined, EyeOutlined } from "@ant-design/icons";
import { useTranslation } from "react-i18next";
import CourseDetail from "./DetailVideo";

export default function MyCourse() {
  const { t } = useTranslation();
  const [courses, setCourses] = useState([]);
  const [form] = Form.useForm();
  const [videoForm] = Form.useForm();
  const token = localStorage.getItem("token");
  const [currentPage, setCurrentPage] = useState(1);
  const [isCourseModalOpen, setIsCourseModalOpen] = useState(false);
  const [isVideoModalOpen, setIsVideoModalOpen] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [videosByCourse, setVideosByCourse] = useState({});
  const [selectedDetailCourse, setSelectedDetailCourse] = useState(null);
  const [editingVideo, setEditingVideo] = useState(null);
  
  const pageSize = 3;

  const fetchCourses = useCallback(async () => {
    if (!token) return;
    try {
      const res = await axios.get("http://localhost:5001/courses", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setCourses(res.data);

      for (const c of res.data) {
        const videosRes = await axios.get(`http://localhost:5001/videos/${c.id}`);
        setVideosByCourse((prev) => ({ ...prev, [c.id]: videosRes.data }));
      }
    } catch {
      message.error(t("teacherCourses.fetchCoursesFailed"));
    }
  }, [token, t]);

  const handleAddCourse = async (values) => {
    try {
      await axios.post(
        "http://localhost:5001/courses",
        { ...values },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      message.success(t("teacherCourses.addCourseSuccess"));
      form.resetFields();
      setIsCourseModalOpen(false);
      fetchCourses();
    } catch {
      message.error(t("teacherCourses.addCourseFailed"));
    }
  };

  const fetchVideos = async (courseId) => {
    try {
      const res = await axios.get(`http://localhost:5001/videos/${courseId}`);
      setVideosByCourse((prev) => ({ ...prev, [courseId]: res.data }));
    } catch {
      message.error(t("teacherCourses.fetchVideosFailed"));
    }
  };

  const handleAddVideo = async (values) => {
    try {
      if (editingVideo) {
        await axios.put(
          `http://localhost:5001/videos/${editingVideo.id}`,
          { ...values },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        message.success(t("teacherCourses.updateVideoSuccess"));
      } else {
        await axios.post(
          "http://localhost:5001/videos/add",
          { course_id: selectedCourse.id, ...values },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        message.success(t("teacherCourses.addVideoSuccess"));
      }
      videoForm.resetFields();
      setEditingVideo(null);
      fetchVideos(selectedCourse.id);
    } catch {
      message.error(t("teacherCourses.saveVideoFailed"));
    }
  };

  const handleDeleteVideo = async (videoId) => {
    try {
      await axios.delete(`http://localhost:5001/videos/${videoId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      message.success(t("teacherCourses.deleteVideoSuccess"));
      fetchVideos(selectedCourse.id);
    } catch {
      message.error(t("teacherCourses.deleteVideoFailed"));
    }
  };

  const handleViewDetail = (course) => setSelectedDetailCourse(course);
  const handleBack = () => setSelectedDetailCourse(null);

  useEffect(() => {
    fetchCourses();
  }, [fetchCourses]);

  const paginatedCourses = courses.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );
  if (selectedDetailCourse) {
    return (
      <div className="courses-container">
        <Button className="teacher-back-button" onClick={handleBack}>
          &lt; {t('mycourses.actions.back')}
        </Button>
        <CourseDetail course={selectedDetailCourse} />
      </div>
    );
  }

  return (
    <div className="course-container">
      <h2>{t("teacherCourses.title")}</h2>

      <div style={{ textAlign: "right", marginBottom: 20 }}>
        <Button type="primary" onClick={() => setIsCourseModalOpen(true)}>
          {t("teacherCourses.addCourseBtn")}
        </Button>
      </div>

      <Modal
        title={t("teacherCourses.addCourseModalTitle")}
        open={isCourseModalOpen}
        onCancel={() => setIsCourseModalOpen(false)}
        footer={null}
      >
        <Form form={form} layout="vertical" onFinish={handleAddCourse}>
          <Form.Item
            name="title"
            label={t("teacherCourses.courseName")}
            rules={[{ required: true, message: t("teacherCourses.courseNameRequired") }]}
          >
            <Input placeholder={t("teacherCourses.courseNamePlaceholder")} />
          </Form.Item>

          <Form.Item
            name="description"
            label={t("teacherCourses.courseDescription")}
          >
            <Input.TextArea placeholder={t("teacherCourses.courseDescriptionPlaceholder")} />
          </Form.Item>

          <Form.Item
            name="lessons"
            label={t("teacherCourses.courseLessons")}
          >
            <Input type="number" min={0} placeholder={t("teacherCourses.courseLessonsPlaceholder")} />
          </Form.Item>

          <Form.Item
            name="hours"
            label={t("teacherCourses.courseHours")}
          >
            <Input type="number" min={0} placeholder={t("teacherCourses.courseHoursPlaceholder")} />
          </Form.Item>

          <Form.Item>
            <Button type="primary" htmlType="submit" block>
              {t("teacherCourses.confirmAdd")}
            </Button>
          </Form.Item>
        </Form>
      </Modal>

      <h3>{t("teacherCourses.myCourses")}</h3>
      <List
        grid={{ gutter: 16, column: 1 }}
        dataSource={paginatedCourses}
        className="mycourses-grid list-view"
        renderItem={(course) => (
          <List.Item key={course.id} className="course-card">
            <Card
              hoverable
              style={{ width: "100%", padding: "10px 0" }}
              title={
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <Avatar className="course-icon orange">
                    {course.title ? course.title[0].toUpperCase() : "C"}
                  </Avatar>
                  <span className="course-info">{course.title}</span>
                </div>
              }
              extra={
                <div style={{ display: "flex", gap: "10px" }}>
                  <Button
                    type={
                      videosByCourse[course.id]?.length > 0
                        ? "default"
                        : "dashed"
                    }
                    icon={<PlusOutlined />}
                    onClick={() => {
                      setSelectedCourse(course);
                      fetchVideos(course.id);
                      setIsVideoModalOpen(true);
                    }}
                  >
                    {videosByCourse[course.id]?.length > 0
                      ? t("teacherCourses.videoAdded")
                      : t("teacherCourses.addVideo")}
                  </Button>
                  <Button 
                    type="primary"
                    icon={<EyeOutlined />}
                    onClick={() => handleViewDetail(course)}
                  >
                    {t("teacherCourses.viewDetails")}
                  </Button>
                </div>
              }
            >
              <div className="course-meta">
                <span>{course.teacher_name}</span>
                <span>{new Date(course.created_at).toLocaleDateString()}</span>
              </div>
              <div className="course-progress">
                <Progress percent={course.progress || 0} showInfo={false} />
                <span>{course.progress || 0}%</span>
              </div>
            </Card>
          </List.Item>
        )}
      />

      <Pagination
        current={currentPage}
        pageSize={pageSize}
        className="pagination-wrapper"
        total={courses.length}
        onChange={(page) => setCurrentPage(page)}
      />

      <Modal
        title={`${t("teacherCourses.manageVideos")} - ${selectedCourse?.title || ""}`}
        open={isVideoModalOpen}
        onCancel={() => {
          setIsVideoModalOpen(false);
          setEditingVideo(null);
          videoForm.resetFields();
        }}
        footer={null}
      >
        <Form
          form={videoForm}
          layout="vertical"
          onFinish={handleAddVideo}
          initialValues={editingVideo || {}}
        >
          <Form.Item
            name="title"
            label={t("teacherCourses.videoTitle")}
            rules={[{ required: true, message: t("teacherCourses.videoTitleRequired") }]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            name="url"
            label={t("teacherCourses.videoUrl")}
            rules={[{ required: true, message: t("teacherCourses.videoUrlRequired") }]}
          >
            <Input placeholder={t("teacherCourses.videoUrlPlaceholder")} />
          </Form.Item>
          <Form.Item
            name="duration"
            label={t("teacherCourses.videoDuration")}
          >
            <Input />
          </Form.Item>
          <Button type="primary" htmlType="submit" block>
            {editingVideo ? t("teacherCourses.updateVideo") : t("teacherCourses.saveVideo")}
          </Button>
        </Form>

        <List
          header={t("teacherCourses.videoList")}
          dataSource={videosByCourse[selectedCourse?.id] || []}
          renderItem={(v) => (
            <List.Item
              actions={[
                <Button
                  icon={<EditOutlined />}
                  onClick={() => {
                    setEditingVideo(v);
                    videoForm.setFieldsValue(v);
                  }}
                />,
                <Button
                  danger
                  icon={<DeleteOutlined />}
                  onClick={() => handleDeleteVideo(v.id)}
                />,
              ]}
            >
              <PlayCircleOutlined style={{ color: "#1677ff", marginRight: 8 }} />
              {v.title} ({v.duration})
            </List.Item>
          )}
        />
      </Modal>
    </div>
  );
}