import { useEffect, useState, useCallback } from "react";
import {
  Tabs,
  Typography,
  List,
  Divider,
  Card,
  Tag,
  Input,
  Button,
  message,
  Avatar,
} from "antd";
import {
  ClockCircleOutlined,
  PlayCircleOutlined,
  SendOutlined,
  UserOutlined,
} from "@ant-design/icons";
import { useTranslation } from "react-i18next";
import axios from "axios";
import "./CourseDetail.css";

const { Title, Paragraph } = Typography;
const { TextArea } = Input;

export default function CourseDetail({ course }) {
  const { t } = useTranslation();
  const [videos, setVideos] = useState([]);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState("");
  const token = localStorage.getItem("token");
  const [studentCount, setStudentCount] = useState(0);

  const fetchVideos = useCallback(async () => {
    if (!course?.id) return;
    try {
      const res = await axios.get(`https://learning-mini-be.onrender.com/videos/${course.id}`);
      setVideos(res.data);
    } catch {
      message.error(t('courseDetail.messages.videosLoadError'));
    }
  }, [course?.id, t]);

  const fetchComments = useCallback(async () => {
    if (!course?.id) return;
    try {
      const res = await axios.get(
        `https://learning-mini-be.onrender.com/comments/${course.id}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setComments(res.data);
    } catch {
      message.error(t('courseDetail.messages.commentsLoadError'));
    }
  }, [course?.id, token, t]);

  const fetchStudentCount = useCallback(async () => {
    if (!course?.id) return;
    try {
        const res = await axios.get(`https://learning-mini-be.onrender.com/courses/${course.id}/students-count`);
        setStudentCount(res.data.total_students);
    } catch {
        message.error(t('courseDetail.messages.studentCountError'));
    }
  }, [course?.id, t]);

  const handleAddComment = async () => {
    if (!newComment.trim()) return message.warning(t('courseDetail.messages.commentRequired'));
    try {
      await axios.post(
        "https://learning-mini-be.onrender.com/comments/add",
        { course_id: course.id, content: newComment },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      message.success(t('courseDetail.messages.commentSuccess'));
      setNewComment("");
      fetchComments();
    } catch {
      message.error(t('courseDetail.messages.commentError'));
    }
  };

  useEffect(() => {
    fetchVideos();
    fetchComments();
    fetchStudentCount();
  }, [fetchVideos, fetchComments, fetchStudentCount]);

  return (
    <div className="course-detail-container">
      <Card className="course-detail-preview-card">
        <div style={{ position: "relative" }}>
          {videos.length > 0 ? (
            <video
              controls
              className="course-detail-video-player"
            >
              <source src={videos[0].url} type="video/mp4" />
            </video>
          ) : (
            <img
              src="https://cdn.dribbble.com/userupload/12056349/file/original-bf68cfef9a9e7edb23b157a4f6e71856.png"
              alt="preview"
              className="course-detail-preview-image"
            />
          )}
        </div>
      </Card>

      <div className="course-detail-content">
        <Title level={3} className="course-detail-title">{course.title}</Title>
        <Paragraph className="course-detail-meta" type="secondary">
          {t('courseDetail.teacher')}: <b>{course.teacher_name}</b> | {videos.length} {t('courseDetail.videos')} | {studentCount} {t('courseDetail.students')}
        </Paragraph>

        <Tabs
          className="course-detail-tabs"
          defaultActiveKey="1"
          items={[
            {
              key: "1",
              label: t('courseDetail.tabs.overview'),
              children: (
                <>
                  <Title level={5} className="course-detail-section-title">{t('courseDetail.courseDescription')}</Title>
                  <Paragraph className="course-detail-description">{course.description || t('courseDetail.noDescription')}</Paragraph>
                </>
              ),
            },
            {
              key: "2",
              label: t('courseDetail.tabs.content'),
              children: (
                <div className="course-detail-list-container">
                  <Divider className="course-detail-divider" orientation="left">{t('courseDetail.lessonList')}</Divider>
                  {videos.length > 0 ? (
                    <List
                      className="course-detail-videos-list"
                      dataSource={videos}
                      renderItem={(video) => (
                        <List.Item>
                          <PlayCircleOutlined className="course-detail-video-icon" />
                          <span className="course-detail-video-title">{video.title}</span>
                          <Tag
                            className="course-detail-video-duration-tag"
                            icon={<ClockCircleOutlined />}
                          >
                            {video.duration || t('courseDetail.notAvailable')}
                          </Tag>
                        </List.Item>
                      )}
                    />
                  ) : (
                    <Paragraph className="course-detail-empty-state">{t('courseDetail.noVideos')}</Paragraph>
                  )}
                </div>
              ),
            },
            {
              key: "3",
              label: t('courseDetail.tabs.comments'),
              children: (
                <div className="course-detail-comments-section">
                  <Title level={5} className="course-detail-section-title">{t('courseDetail.studentComments')}</Title>

                  <List
                    className="course-detail-comments-list"
                    dataSource={comments}
                    locale={{ emptyText: t('courseDetail.noComments') }}
                    renderItem={(cmt) => (
                      <List.Item>
                        <List.Item.Meta
                          avatar={<Avatar className="course-detail-comment-avatar" icon={<UserOutlined />} />}
                          title={
                            <div className="course-detail-comment-header">
                              <span className="course-detail-comment-author">{cmt.user_name || t('courseDetail.user')}</span>
                              <span className="course-detail-comment-time">
                                {new Date(cmt.created_at).toLocaleString()}
                              </span>
                            </div>
                          }
                          description={<p className="course-detail-comment-content">{cmt.content}</p>}
                        />
                      </List.Item>
                    )}
                  />

                  <Divider className="course-detail-comment-divider" />
                  <TextArea
                    className="course-detail-comment-textarea"
                    rows={3}
                    placeholder={t('courseDetail.placeholder.writeComment')}
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                  />
                  <div className="course-detail-comment-actions">
                    <Button
                      className="course-detail-send-comment-btn"
                      type="primary"
                      icon={<SendOutlined />}
                      onClick={handleAddComment}
                    >
                      {t('courseDetail.send')}
                    </Button>
                  </div>
                </div>
              ),
            },
          ]}
        />
      </div>
    </div>
  );
}