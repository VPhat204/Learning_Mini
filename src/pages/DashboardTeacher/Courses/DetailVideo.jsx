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
  Dropdown,
  Menu,
  Modal,
} from "antd";
import {
  ClockCircleOutlined,
  PlayCircleOutlined,
  SendOutlined,
  UserOutlined,
  MoreOutlined,
  EditOutlined,
  DeleteOutlined,
  MessageOutlined,
  CloseOutlined,
  CaretRightOutlined,
} from "@ant-design/icons";
import { useTranslation } from "react-i18next";
import axios from "axios";
import "./CourseDetail.css";

const { Title, Paragraph } = Typography;
const { TextArea } = Input;

export default function CourseDetail({ course }) {
  const { t } = useTranslation();
  const [videos, setVideos] = useState([]);
  const [commentsTree, setCommentsTree] = useState([]);
  const [newComment, setNewComment] = useState("");
  const [replyTo, setReplyTo] = useState(null);
  const [replyContent, setReplyContent] = useState("");
  const [replyingToId, setReplyingToId] = useState(null);
  const [editingComment, setEditingComment] = useState(null);
  const [editContent, setEditContent] = useState("");
  const [studentCount, setStudentCount] = useState(0);
  const [isTeacher, setIsTeacher] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [commentToDelete, setCommentToDelete] = useState(null);
  
  const token = localStorage.getItem("token");
  const user = JSON.parse(localStorage.getItem("user"));

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
      buildCommentsTree(res.data);
    } catch {
      message.error(t('courseDetail.messages.commentsLoadError'));
    }
  }, [course?.id, token, t]);

  const buildCommentsTree = (commentsList) => {
    const commentMap = {};
    const rootComments = [];
    
    commentsList.forEach(comment => {
      commentMap[comment.id] = { ...comment, replies: [] };
    });
    
    commentsList.forEach(comment => {
      if (comment.parent_id) {
        if (commentMap[comment.parent_id]) {
          commentMap[comment.parent_id].replies.push(commentMap[comment.id]);
        }
      } else {
        rootComments.push(commentMap[comment.id]);
      }
    });
    
    setCommentsTree(rootComments);
  };

  const fetchStudentCount = useCallback(async () => {
    if (!course?.id) return;
    try {
      const res = await axios.get(`https://learning-mini-be.onrender.com/courses/${course.id}/students-count`);
      setStudentCount(res.data.total_students);
    } catch {
      message.error(t('courseDetail.messages.studentCountError'));
    }
  }, [course?.id, t]);

  const checkIfTeacher = useCallback(() => {
    if (user && course) {
      const isUserTeacher = user.role === 'teacher' || user.id === course.teacher_id;
      setIsTeacher(isUserTeacher);
    }
  }, [user, course]);

  const handleAddComment = async () => {
    if (!newComment.trim()) return message.warning(t('courseDetail.messages.commentRequired'));
    
    try {
      const commentData = {
        course_id: course.id,
        content: newComment,
        parent_id: replyTo?.id || null
      };

      await axios.post(
        "https://learning-mini-be.onrender.com/comments/add",
        commentData,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      message.success(t('courseDetail.messages.commentSuccess'));
      setNewComment("");
      setReplyTo(null);
      fetchComments();
    } catch {
      message.error(t('courseDetail.messages.commentError'));
    }
  };

  const handleReply = (comment) => {
    setReplyTo(comment);
    setReplyingToId(comment.id);
  };

  const handleCancelReply = () => {
    setReplyTo(null);
    setReplyingToId(null);
    setReplyContent("");
  };

  const handleSubmitReply = async (parentComment) => {
    if (!replyContent.trim()) return message.warning(t('courseDetail.messages.replyRequired'));
    
    try {
      await axios.post(
        "https://learning-mini-be.onrender.com/comments/add",
        {
          course_id: course.id,
          content: replyContent,
          parent_id: parentComment.id
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      message.success(t('courseDetail.messages.replySuccess'));
      setReplyContent("");
      setReplyingToId(null);
      fetchComments();
    } catch {
      message.error(t('courseDetail.messages.replyError'));
    }
  };

  const handleEditComment = (comment) => {
    setEditingComment(comment);
    setEditContent(comment.content);
  };

  const handleUpdateComment = async () => {
    if (!editContent.trim()) return message.warning(t('courseDetail.messages.editRequired'));
    
    try {
      await axios.put(
        `https://learning-mini-be.onrender.com/comments/${editingComment.id}`,
        { content: editContent },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      message.success(t('courseDetail.messages.editSuccess'));
      setEditingComment(null);
      setEditContent("");
      fetchComments();
    } catch {
      message.error(t('courseDetail.messages.editError'));
    }
  };

  const handleDeleteComment = async () => {
    if (!commentToDelete) return;
    
    try {
      await axios.delete(
        `https://learning-mini-be.onrender.com/comments/${commentToDelete.id}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      message.success(t('courseDetail.messages.deleteSuccess'));
      setIsDeleteModalOpen(false);
      setCommentToDelete(null);
      fetchComments();
    } catch {
      message.error(t('courseDetail.messages.deleteError'));
    }
  };

  const showDeleteConfirm = (comment) => {
    setCommentToDelete(comment);
    setIsDeleteModalOpen(true);
  };

  const canEditDeleteComment = (comment) => {
    return isTeacher || (user && comment.user_id === user.id);
  };

  const getCommentMenu = (comment) => (
    <Menu>
      {canEditDeleteComment(comment) && (
        <>
          <Menu.Item 
            key="edit" 
            icon={<EditOutlined />}
            onClick={() => handleEditComment(comment)}
          >
            {t('courseDetail.actions.edit')}
          </Menu.Item>
          <Menu.Item 
            key="delete" 
            icon={<DeleteOutlined />}
            danger
            onClick={() => showDeleteConfirm(comment)}
          >
            {t('courseDetail.actions.delete')}
          </Menu.Item>
        </>
      )}
      <Menu.Item 
        key="reply" 
        icon={<MessageOutlined />}
        onClick={() => handleReply(comment)}
      >
        {t('courseDetail.actions.reply')}
      </Menu.Item>
    </Menu>
  );

  const renderCommentItem = (comment, depth = 0) => {
    const isReply = depth > 0;
    
    return (
      <div key={comment.id} className={`course-detail-teacher-comment-item ${isReply ? 'course-detail-teacher-reply-comment' : 'course-detail-teacher-parent-comment'}`}>
        <div className="course-detail-teacher-comment-wrapper" style={{ marginLeft: `${depth * 32}px` }}>
          <List.Item>
            <List.Item.Meta
              avatar={
                <Avatar className="course-detail-teacher-comment-avatar" icon={<UserOutlined />} />
              }
              title={
                <div className="course-detail-teacher-comment-header">
                  <div className="course-detail-teacher-comment-author-info">
                    <span className="course-detail-teacher-comment-author">
                      {isReply && <CaretRightOutlined style={{ marginRight: 8, color: '#999' }} />}
                      {comment.user_name || t('courseDetail.user')}
                      {comment.user_id === course.teacher_id && (
                        <Tag color="blue" className="course-detail-teacher-tag">
                          {t('courseDetail.teacher')}
                        </Tag>
                      )}
                    </span>
                    <span className="course-detail-teacher-comment-time">
                      {new Date(comment.created_at).toLocaleString()}
                    </span>
                  </div>
                  <Dropdown overlay={getCommentMenu(comment)} trigger={['click']}>
                    <Button type="text" icon={<MoreOutlined />} size="small" />
                  </Dropdown>
                </div>
              }
              description={
                <div className="course-detail-teacher-comment-content-wrapper">
                  {editingComment?.id === comment.id ? (
                    <div className="course-detail-teacher-edit-form">
                      <TextArea
                        rows={2}
                        value={editContent}
                        onChange={(e) => setEditContent(e.target.value)}
                      />
                      <div className="course-detail-teacher-edit-actions">
                        <Button size="small" onClick={() => handleUpdateComment()}>
                          {t('courseDetail.actions.save')}
                        </Button>
                        <Button size="small" onClick={() => setEditingComment(null)}>
                          {t('courseDetail.actions.cancel')}
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <p className="course-detail-teacher-comment-content">{comment.content}</p>
                  )}
                  
                  {replyingToId === comment.id && (
                    <div className="course-detail-teacher-reply-form">
                      <TextArea
                        rows={2}
                        placeholder={t('courseDetail.placeholder.writeReply')}
                        value={replyContent}
                        onChange={(e) => setReplyContent(e.target.value)}
                      />
                      <div className="course-detail-teacher-reply-actions">
                        <Button size="small" type="primary" onClick={() => handleSubmitReply(comment)}>
                          {t('courseDetail.actions.sendReply')}
                        </Button>
                        <Button size="small" onClick={handleCancelReply}>
                          {t('courseDetail.actions.cancel')}
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              }
            />
          </List.Item>
          
          {comment.replies && comment.replies.length > 0 && (
            <div className="course-detail-teacher-replies-section">
              {comment.replies.map(reply => renderCommentItem(reply, depth + 1))}
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderAllComments = () => {
    return commentsTree.map(comment => renderCommentItem(comment, 0));
  };

  useEffect(() => {
    fetchVideos();
    fetchComments();
    fetchStudentCount();
    checkIfTeacher();
  }, [fetchVideos, fetchComments, fetchStudentCount, checkIfTeacher]);

  return (
    <div className="course-detail-teacher-container">
      <Card className="course-detail-teacher-preview-card">
        <div style={{ position: "relative" }}>
          {videos.length > 0 ? (
            <video
              controls
              className="course-detail-teacher-video-player"
            >
              <source src={videos[0].url} type="video/mp4" />
            </video>
          ) : (
            <img
              src="https://cdn.dribbble.com/userupload/12056349/file/original-bf68cfef9a9e7edb23b157a4f6e71856.png"
              alt="preview"
              className="course-detail-teacher-preview-image"
            />
          )}
        </div>
      </Card>

      <div className="course-detail-teacher-content">
        <Title level={3} className="course-detail-teacher-title">{course.title}</Title>
        <Paragraph className="course-detail-teacher-meta" type="secondary">
          {t('courseDetail.teacher')}: <b>{course.teacher_name}</b> | {videos.length} {t('courseDetail.videos')} | {studentCount} {t('courseDetail.students')}
        </Paragraph>

        <Tabs
          className="course-detail-teacher-tabs"
          defaultActiveKey="1"
          items={[
            {
              key: "1",
              label: t('courseDetail.tabs.overview'),
              children: (
                <>
                  <Title level={5} className="course-detail-teacher-section-title">{t('courseDetail.courseDescription')}</Title>
                  <Paragraph className="course-detail-teacher-description">{course.description || t('courseDetail.noDescription')}</Paragraph>
                </>
              ),
            },
            {
              key: "2",
              label: t('courseDetail.tabs.content'),
              children: (
                <div className="course-detail-teacher-list-container">
                  <Divider className="course-detail-teacher-divider" orientation="left">{t('courseDetail.lessonList')}</Divider>
                  {videos.length > 0 ? (
                    <List
                      className="course-detail-teacher-videos-list"
                      dataSource={videos}
                      renderItem={(video) => (
                        <List.Item>
                          <PlayCircleOutlined className="course-detail-teacher-video-icon" />
                          <span className="course-detail-teacher-video-title">{video.title}</span>
                          <Tag
                            className="course-detail-teacher-video-duration-tag"
                            icon={<ClockCircleOutlined />}
                          >
                            {video.duration || t('courseDetail.notAvailable')}
                          </Tag>
                        </List.Item>
                      )}
                    />
                  ) : (
                    <Paragraph className="course-detail-teacher-empty-state">{t('courseDetail.noVideos')}</Paragraph>
                  )}
                </div>
              ),
            },
            {
              key: "3",
              label: t('courseDetail.tabs.comments'),
              children: (
                <div className="course-detail-teacher-comments-section">
                  <Title level={5} className="course-detail-teacher-section-title">
                    {t('courseDetail.studentComments')}
                    {isTeacher && (
                      <Tag color="green" style={{ marginLeft: '10px' }}>
                        {t('courseDetail.teacherMode')}
                      </Tag>
                    )}
                  </Title>

                  <div className="course-detail-teacher-comments-tree">
                    {commentsTree.length > 0 ? (
                      renderAllComments()
                    ) : (
                      <Paragraph className="course-detail-teacher-empty-state">{t('courseDetail.noComments')}</Paragraph>
                    )}
                  </div>

                  <Divider className="course-detail-teacher-comment-divider" />
                  {replyTo && (
                    <div className="course-detail-teacher-reply-indicator">
                      <span>
                        {t('courseDetail.replyingTo')}: <strong>{replyTo.user_name}</strong>
                      </span>
                      <Button 
                        type="text" 
                        size="small" 
                        icon={<CloseOutlined />}
                        onClick={handleCancelReply}
                      />
                    </div>
                  )}
                  <TextArea
                    className="course-detail-teacher-comment-textarea"
                    rows={3}
                    placeholder={
                      replyTo 
                        ? t('courseDetail.placeholder.writeReplyTo', { name: replyTo.user_name })
                        : t('courseDetail.placeholder.writeComment')
                    }
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                  />
                  <div className="course-detail-teacher-comment-actions">
                    <Button
                      className="course-detail-teacher-send-comment-btn"
                      type="primary"
                      icon={<SendOutlined />}
                      onClick={handleAddComment}
                    >
                      {replyTo ? t('courseDetail.sendReply') : t('courseDetail.send')}
                    </Button>
                    {replyTo && (
                      <Button onClick={handleCancelReply}>
                        {t('courseDetail.cancel')}
                      </Button>
                    )}
                  </div>
                </div>
              ),
            },
          ]}
        />
      </div>

      <Modal
        title={t('courseDetail.confirmDeleteTitle')}
        open={isDeleteModalOpen}
        onOk={handleDeleteComment}
        onCancel={() => {
          setIsDeleteModalOpen(false);
          setCommentToDelete(null);
        }}
        okText={t('courseDetail.actions.delete')}
        cancelText={t('courseDetail.actions.cancel')}
        okButtonProps={{ danger: true }}
      >
        <p>{t('courseDetail.confirmDeleteMessage')}</p>
      </Modal>
    </div>
  );
}