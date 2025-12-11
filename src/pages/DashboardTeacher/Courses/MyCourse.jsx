import React, { useState, useEffect, useCallback } from "react";
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
  Tabs,
  Tag,
  Space,
  Popconfirm,
} from "antd";
import axios from "axios";
import {
  PlusOutlined,
  DeleteOutlined,
  EditOutlined,
  EyeOutlined,
  FileTextOutlined,
  PlayCircleOutlined,
} from "@ant-design/icons";
import { useTranslation } from "react-i18next";
import CourseDetail from "./Video/DetailVideo";
import Assignment from "./Assignments/MyAssignments";
import "./MyCourse.css";

const { TextArea } = Input;

function getAvatarColor(id) {
  const mod = (id || 0) % 4;
  if (mod === 0) return "avatar-orange";
  if (mod === 1) return "avatar-blue";
  if (mod === 2) return "avatar-green";
  return "avatar-purple";
}

function tagClassByStatus(status) {
  if (status === "approved") return "tag-approved";
  if (status === "pending") return "tag-pending";
  return "tag-rejected";
}

function MyCourse() {
  const { t } = useTranslation();
  const token = localStorage.getItem("token");

  const [courses, setCourses] = useState([]);
  const [videosByCourse, setVideosByCourse] = useState({});

  const [loading, setLoading] = useState(false);
  const [pageSize] = useState(6);
  const [currentPage, setCurrentPage] = useState(1);

  const [selectedTab, setSelectedTab] = useState("approved");

  const [isCourseModalOpen, setIsCourseModalOpen] = useState(false);
  const [courseForm] = Form.useForm();
  const [editingCourse, setEditingCourse] = useState(null);

  const [isVideoModalOpen, setIsVideoModalOpen] = useState(false);
  const [videoForm] = Form.useForm();
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [editingVideo, setEditingVideo] = useState(null);

  const [selectedDetailCourse, setSelectedDetailCourse] = useState(null);
  const [selectedAssignmentCourse, setSelectedAssignmentCourse] = useState(null);

  const fetchCourses = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await axios.get("https://learning-mini-be.onrender.com/courses", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const normalized = (res.data || []).map((c) => {
        const status =
          c.is_approved === 1 || c.status === "approved"
            ? "approved"
            : c.is_approved === 0 || c.status === "pending"
            ? "pending"
            : "rejected";
        return { ...c, status };
      });
      setCourses(normalized);
      const map = {};
      for (const c of normalized) {
        try {
          const vres = await axios.get(`https://learning-mini-be.onrender.com/videos/${c.id}`);
          map[c.id] = vres.data || [];
        } catch {
          map[c.id] = [];
        }
      }
      setVideosByCourse(map);
    } catch (err) {
      message.error(t("teacherCourses.fetchCoursesFailed") || t("fetchCoursesFailed", "Lỗi khi tải khóa học"));
    } finally {
      setLoading(false);
    }
  }, [token, t]);

  useEffect(() => {
    fetchCourses();
  }, [fetchCourses]);

  const fetchVideos = async (courseId) => {
    try {
      const res = await axios.get(`https://learning-mini-be.onrender.com/videos/${courseId}`);
      setVideosByCourse((prev) => ({ ...prev, [courseId]: res.data || [] }));
    } catch (err) {
      message.error(t("teacherCourses.fetchVideosFailed") || t("fetchVideosFailed", "Lỗi khi tải video"));
    }
  };

  const openAddCourseModal = () => {
    setEditingCourse(null);
    courseForm.resetFields();
    setIsCourseModalOpen(true);
  };

  const openEditCourseModal = (course) => {
    setEditingCourse(course);
    courseForm.setFieldsValue({
      title: course.title,
      description: course.description,
      lessons: course.lessons,
      hours: course.hours,
    });
    setIsCourseModalOpen(true);
  };

  const handleCourseSubmit = async (values) => {
    if (!token) return;
    try {
      if (editingCourse) {
        await axios.put(
          `https://learning-mini-be.onrender.com/courses/${editingCourse.id}`,
          values,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        message.success(t("teacherCourses.updateCourseSuccess") || t("updateCourseSuccess", "Cập nhật khóa học thành công"));
      } else {
        await axios.post("https://learning-mini-be.onrender.com/courses", values, {
          headers: { Authorization: `Bearer ${token}` },
        });
        message.success(t("teacherCourses.addCourseSuccess") || t("addCourseSuccess", "Thêm khóa học thành công"));
      }
      setIsCourseModalOpen(false);
      courseForm.resetFields();
      fetchCourses();
    } catch (err) {
      message.error(t("teacherCourses.saveCourseFailed") || t("saveCourseFailed", "Lỗi khi lưu khóa học"));
    }
  };

  const handleDeleteCourse = async (courseId) => {
    if (!token) return;
    try {
      await axios.delete(`https://learning-mini-be.onrender.com/courses/${courseId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      message.success(t("teacherCourses.deleteCourseSuccess") || t("deleteCourseSuccess", "Xóa khóa học thành công"));
      fetchCourses();
    } catch {
      message.error(t("teacherCourses.deleteCourseFailed") || t("deleteCourseFailed", "Lỗi khi xóa khóa học"));
    }
  };

  const openVideoModal = (course) => {
    setSelectedCourse(course);
    setEditingVideo(null);
    videoForm.resetFields();
    fetchVideos(course.id);
    setIsVideoModalOpen(true);
  };

  const handleVideoSubmit = async (values) => {
    if (!token || !selectedCourse) return;
    try {
      if (editingVideo) {
        await axios.put(
          `https://learning-mini-be.onrender.com/videos/${editingVideo.id}`,
          values,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        message.success(t("teacherCourses.updateVideoSuccess") || t("updateVideoSuccess", "Cập nhật video thành công"));
      } else {
        await axios.post(
          "https://learning-mini-be.onrender.com/videos/add",
          { course_id: selectedCourse.id, ...values },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        message.success(t("teacherCourses.addVideoSuccess") || t("addVideoSuccess", "Thêm video thành công"));
      }
      setEditingVideo(null);
      videoForm.resetFields();
      fetchVideos(selectedCourse.id);
    } catch {
      message.error(t("teacherCourses.saveVideoFailed") || t("saveVideoFailed", "Lỗi khi lưu video"));
    }
  };

  const handleDeleteVideo = async (videoId) => {
    if (!token || !selectedCourse) return;
    try {
      await axios.delete(`https://learning-mini-be.onrender.com/videos/${videoId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      message.success(t("teacherCourses.deleteVideoSuccess") || t("deleteVideoSuccess", "Xóa video thành công"));
      fetchVideos(selectedCourse.id);
    } catch {
      message.error(t("teacherCourses.deleteVideoFailed") || t("deleteVideoFailed", "Lỗi khi xóa video"));
    }
  };

  const openDetailView = (course) => {
    setSelectedDetailCourse(course);
  };

  const openAssignmentView = (course) => {
    setSelectedAssignmentCourse(course);
  };

  const handleBackFromDetail = () => {
    setSelectedDetailCourse(null);
  };
  
  const handleBackFromAssignment = () => {
    setSelectedAssignmentCourse(null);
  };

  const filterMap = {
    approved: (c) => c.status === "approved",
    pending: (c) => c.status === "pending",
    rejected: (c) => c.status === "rejected",
  };

  const filtered = courses.filter(filterMap[selectedTab] || (() => true));
  const paginated = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const labelByStatus = (status) => {
    if (status === "approved") return t("courseadminManagement.status.approved", "Đã duyệt");
    if (status === "pending") return t("courseadminManagement.status.pending", "Chờ duyệt");
    return t("courseadminManagement.status.rejected", "Từ chối");
  };

  if (selectedDetailCourse) {
    return (
      <div className="courses-container-detail">
        <Button className="teacher-back-button" onClick={handleBackFromDetail}>
          &lt; {t("mycourses.actions.back")}
        </Button>
        <CourseDetail course={selectedDetailCourse} />
      </div>
    );
  }

  if (selectedAssignmentCourse) {
    return (
      <div className="courses-container-detail">
        <Button className="teacher-back-button" onClick={handleBackFromAssignment}>
          &lt; {t("mycourses.actions.back")}
        </Button>
        <Assignment course={selectedAssignmentCourse} />
      </div>
    );
  }

  return (
    <div className="course-root">
      <div className="course-top">
        <h2 className="course-title">{t("courseManagements.myCourses")}</h2>
        <Space>
          <Button type="primary" onClick={openAddCourseModal}>
            {t("teacherCourses.addCourseBtn")}
          </Button>
        </Space>
      </div>

      <Tabs
        activeKey={selectedTab}
        onChange={(key) => {
          setSelectedTab(key);
          setCurrentPage(1);
        }}
        className="course-tabs"
      >
        <Tabs.TabPane 
          tab={`${t("courseadminManagement.status.approved", "Đã duyệt")} (${courses.filter(c => c.status === "approved").length})`} 
          key="approved" 
        />
        <Tabs.TabPane 
          tab={`${t("courseadminManagement.status.pending", "Chờ duyệt")} (${courses.filter(c => c.status === "pending").length})`} 
          key="pending" 
        />
        <Tabs.TabPane 
          tab={`${t("courseadminManagement.status.rejected", "Từ chối")} (${courses.filter(c => c.status === "rejected").length})`} 
          key="rejected" 
        />
      </Tabs>

      <List
        className="mycourses-list"
        grid={{ gutter: 16, column: 1 }}
        dataSource={paginated}
        loading={loading}
        renderItem={(course) => (
          <List.Item key={course.id}>
            <Card className="course-card">
              <div className="card-left">
                <Avatar className={`course-avatar ${getAvatarColor(course.id)}`}>
                  {course.title ? course.title[0].toUpperCase() : "C"}
                </Avatar>
                <div className="course-main">
                  <div className="course-header">
                    <div className="course-title-row">
                      <div className="course-name">{course.title}</div>
                      <Tag className={`course-tag ${tagClassByStatus(course.status)}`}>
                        {labelByStatus(course.status)}
                      </Tag>
                    </div>
                    <div className="course-sub">{course.description || ""}</div>
                    <div className="course-meta">
                      <span>{course.teacher_name || ""}</span>
                      <span>{course.lessons ? `${course.lessons} ${t("enrolledCoursesHome.lessons", "buổi")}` : "-"}</span>
                      <span>{course.hours ? `${course.hours} ${t("enrolledCoursesHome.hours", "giờ")}` : "-"}</span>
                    </div>
                  </div>

                  <div className="course-bottom">
                    <div className="progress-wrap">
                      <Progress percent={course.progress || 0} showInfo={false} />
                      <div className="progress-text">{course.progress || 0}%</div>
                    </div>

                    <div className="action-buttons">
                      <Button
                        icon={<PlusOutlined />}
                        onClick={() => openVideoModal(course)}
                        disabled={course.status !== "approved"}
                      >
                        {t("videos")}
                      </Button>

                      <Button
                        icon={<FileTextOutlined />}
                        onClick={() => openAssignmentView(course)}
                        disabled={course.status !== "approved"}
                      >
                        {t("assign.assignments")}
                      </Button>

                      <Button
                        icon={<EyeOutlined />}
                        onClick={() => openDetailView(course)}
                        disabled={course.status !== "approved"}
                        type="default"
                      >
                        {t("teacherCourses.viewDetails")}
                      </Button>

                      <Button
                        icon={<EditOutlined />}
                        onClick={() => openEditCourseModal(course)}
                      >
                        {t("commons.edit")}
                      </Button>

                      <Popconfirm
                        title={t("courseadminManagement.confirm.deleteDescription")}
                        onConfirm={() => handleDeleteCourse(course.id)}
                        okText={t("commons.delete")}
                        cancelText={t("commons.cancel")}
                      >
                        <Button danger icon={<DeleteOutlined />}>
                          {t("commons.delete")}
                        </Button>
                      </Popconfirm>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          </List.Item>
        )}
      />

      <div className="pagination-area">
        <Pagination
          current={currentPage}
          pageSize={pageSize}
          total={filtered.length}
          onChange={(page) => setCurrentPage(page)}
        />
      </div>

      <Modal
        title={editingCourse ? t("courseadminManagement.modals.editTitle") : t("courseadminManagement.modals.addTitle")}
        open={isCourseModalOpen}
        onCancel={() => {
          setIsCourseModalOpen(false);
          setEditingCourse(null);
          courseForm.resetFields();
        }}
        footer={null}
        destroyOnClose
      >
        <Form form={courseForm} layout="vertical" onFinish={handleCourseSubmit}>
          <Form.Item
            name="title"
            label={t("createcourses.name")}
            rules={[{ required: true, message: t("createcourses.name_required") }]}
          >
            <Input placeholder={t("createcourses.name_placeholder")} />
          </Form.Item>

          <Form.Item 
            name="description" 
            label={t("createcourses.description")}
          >
            <TextArea 
              rows={3} 
              placeholder={t("createcourses.description_placeholder")} 
            />
          </Form.Item>

          <Form.Item 
            name="lessons" 
            label={t("teacherCourses.courseLessons")}
          >
            <Input 
              type="number" 
              min={0} 
              placeholder={t("teacherCourses.courseLessonsPlaceholder")} 
            />
          </Form.Item>

          <Form.Item 
            name="hours" 
            label={t("teacherCourses.courseHours")}
          >
            <Input 
              type="number" 
              min={0} 
              placeholder={t("teacherCourses.courseHoursPlaceholder")} 
            />
          </Form.Item>

          <Form.Item>
            <Space style={{ width: "100%", justifyContent: "flex-end" }}>
              <Button
                onClick={() => {
                  setIsCourseModalOpen(false);
                  setEditingCourse(null);
                  courseForm.resetFields();
                }}
              >
                {t("commons.cancel")}
              </Button>
              <Button type="primary" htmlType="submit">
                {t("commons.save")}
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title={`${t("teacherCourses.manageVideos")}${selectedCourse ? " - " + selectedCourse.title : ""}`}
        open={isVideoModalOpen}
        onCancel={() => {
          setIsVideoModalOpen(false);
          setSelectedCourse(null);
          setEditingVideo(null);
          videoForm.resetFields();
        }}
        footer={null}
        width={720}
        destroyOnClose
      >
        <Form
          form={videoForm}
          layout="vertical"
          onFinish={handleVideoSubmit}
          initialValues={editingVideo || {}}
        >
          <Form.Item
            name="title"
            label={t("teacherCourses.videoTitle")}
            rules={[{ required: true, message: t("teacherCourses.videoTitleRequired") }]}
          >
            <Input placeholder={t("teacherCourses.videoTitlePlaceholder")} />
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
            <Input placeholder={t("teacherCourses.videoDurationPlaceholder")} />
          </Form.Item>

          <Form.Item>
            <Space style={{ width: "100%", justifyContent: "flex-end" }}>
              <Button
                onClick={() => {
                  setEditingVideo(null);
                  videoForm.resetFields();
                }}
              >
                {t("commons.cancel")}
              </Button>
              <Button type="primary" htmlType="submit">
                {editingVideo ? t("commonAdmin.update") : t("teacherCourses.addVideo")}
              </Button>
            </Space>
          </Form.Item>
        </Form>

        <div style={{ marginTop: 12 }}>
          <List
            header={<div style={{ fontWeight: 600 }}>{t("teacherCourses.videoList")}</div>}
            dataSource={videosByCourse[selectedCourse?.id] || []}
            renderItem={(v) => (
              <List.Item
                actions={[
                  <Button
                    icon={<PlayCircleOutlined />}
                    onClick={() => {
                      if (v.url) window.open(v.url, "_blank");
                    }}
                    title={t("view")}
                  />,
                  <Button
                    icon={<EditOutlined />}
                    onClick={() => {
                      setEditingVideo(v);
                      videoForm.setFieldsValue(v);
                    }}
                    title={t("commons.edit")}
                  />,
                  <Popconfirm
                    title={t("courseadminManagement.confirm.deleteDescription")}
                    onConfirm={() => handleDeleteVideo(v.id)}
                    okText={t("commons.delete")}
                    cancelText={t("commons.cancel")}
                  >
                    <Button 
                      danger 
                      icon={<DeleteOutlined />} 
                      title={t("commons.delete")}
                    />
                  </Popconfirm>,
                ]}
              >
                <div>
                  <div style={{ fontWeight: 600 }}>{v.title}</div>
                  <div style={{ color: "#666", fontSize: 13 }}>{v.duration || ""}</div>
                </div>
              </List.Item>
            )}
          />
        </div>
      </Modal>
    </div>
  );
}

export default MyCourse;