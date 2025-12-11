import React, { useState, useEffect, useCallback } from 'react';
import {
  Tabs,
  Card,
  Avatar,
  List,
  Typography,
  Divider,
  Button,
  Space,
  Tag,
  Row,
  Col,
  message,
  Spin,
  Empty,
  Layout,
  Input,
  Dropdown,
  Menu,
  Modal
} from 'antd';
import {
  PlayCircleOutlined,
  UserOutlined,
  VideoCameraOutlined,
  MessageOutlined,
  TeamOutlined,
  ClockCircleOutlined,
  LinkOutlined,
  ArrowLeftOutlined,
  MoreOutlined,
  EditOutlined,
  DeleteOutlined,
  SendOutlined,
  CloseOutlined,
  CaretRightOutlined,
} from '@ant-design/icons';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import './DetailVideo.css';

const { TabPane } = Tabs;
const { Title, Paragraph, Text } = Typography;
const { Content } = Layout;
const { TextArea } = Input;

const DetailVideo = ({
  video,
  course: initialCourse = null,
  comments: initialComments = [],
  students: initialStudents = [],
  allVideos: initialAllVideos = [],
  onBack
}) => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState('info');
  const [commentsTree, setCommentsTree] = useState([]);
  const [students, setStudents] = useState(initialStudents);
  const [allVideos, setAllVideos] = useState(initialAllVideos);
  const [course, setCourse] = useState(initialCourse);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  const [newComment, setNewComment] = useState("");
  const [replyTo, setReplyTo] = useState(null);
  const [replyContent, setReplyContent] = useState("");
  const [replyingToId, setReplyingToId] = useState(null);
  const [editingComment, setEditingComment] = useState(null);
  const [editContent, setEditContent] = useState("");
  const [isTeacher, setIsTeacher] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [commentToDelete, setCommentToDelete] = useState(null);
  
  const navigate = useNavigate();
  const token = localStorage.getItem("token");
  const user = JSON.parse(localStorage.getItem("user"));

  useEffect(() => {
    const savedTheme = localStorage.getItem('detailVideoTheme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
  }, []);

  const fetchVideoDetails = useCallback(async () => {
    if (!video || !video.id) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const token = localStorage.getItem('token');
      const promises = [];
      
      if (!course && video.course_id) {
        promises.push(
          axios.get(`https://learning-mini-be.onrender.com/courses/${video.course_id}`, {
            headers: { Authorization: `Bearer ${token}` }
          }).then(res => setCourse(res.data))
          .catch(err => {
            console.error('Error fetching course:', err);
            message.warning(t('courseDetail.messages.studentCountError'));
          })
        );
      }
      
      if (video.course_id) {
        promises.push(
          axios.get(`https://learning-mini-be.onrender.com/comments/${video.course_id}/tree`, {
            headers: { Authorization: `Bearer ${token}` }
          }).then(res => setCommentsTree(Array.isArray(res.data) ? res.data : []))
          .catch(err => {
            console.error('Error fetching comments:', err);
            setCommentsTree([]);
          })
        );
      }
      
      if (students.length === 0 && video.course_id) {
        promises.push(
          axios.get(`https://learning-mini-be.onrender.com/course-students`, {
            params: { courseId: video.course_id }
          }).then(res => setStudents(res.data.students || []))
          .catch(err => {
            console.error('Error fetching students:', err);
            setStudents([]);
          })
        );
      }
      
      if (allVideos.length === 0 && video.course_id) {
        promises.push(
          axios.get(`https://learning-mini-be.onrender.com/videos/${video.course_id}`, {
            headers: { Authorization: `Bearer ${token}` }
          }).then(res => setAllVideos(Array.isArray(res.data) ? res.data : []))
          .catch(err => {
            console.error('Error fetching videos:', err);
            setAllVideos([]);
          })
        );
      }
      
      if (promises.length === 0) {
        setLoading(false);
        return;
      }
      
      await Promise.all(promises);
      
    } catch (error) {
      console.error('Error fetching video details:', error);
      setError(t('courseDetail.messages.videosLoadError'));
      message.error(t('courseDetail.messages.videosLoadError'));
    } finally {
      setLoading(false);
    }
  }, [video, course, students.length, allVideos.length, t]);

  useEffect(() => {
    if (user) {
      setIsTeacher(user.roles === 'teacher');
      setIsAdmin(user.roles === 'admin');
      
      if (course) {
        const isUserTeacher = user.roles === 'teacher' || user.id === course.teacher_id;
        setIsTeacher(isUserTeacher);
      }
    }
  }, [user, course]);

  useEffect(() => {
    if (video) {
        if (!initialCourse || commentsTree.length === 0) {
        fetchVideoDetails();
        }
    } else {
        setActiveTab('info');
        setError(null);
    }
  }, [video, initialCourse, fetchVideoDetails, commentsTree.length]);

  const handleAddComment = async () => {
    if (!newComment.trim()) return message.warning(t('courseDetail.messages.commentRequired'));
    
    try {
      const commentData = {
        course_id: video.course_id,
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
      fetchVideoDetails();
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
    if (!replyContent.trim()) return message.warning(t('courseDetail.messages.commentRequired'));
    
    try {
      await axios.post(
        "https://learning-mini-be.onrender.com/comments/add",
        {
          course_id: video.course_id,
          content: replyContent,
          parent_id: parentComment.id
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      message.success(t('courseDetail.messages.commentSuccess'));
      setReplyContent("");
      setReplyingToId(null);
      fetchVideoDetails();
    } catch {
      message.error(t('courseDetail.messages.commentError'));
    }
  };

  const handleEditComment = (comment) => {
    setEditingComment(comment);
    setEditContent(comment.content);
  };

  const handleUpdateComment = async () => {
    if (!editContent.trim()) return message.warning(t('courseDetail.messages.commentRequired'));
    
    try {
      await axios.put(
        `https://learning-mini-be.onrender.com/comments/${editingComment.id}`,
        { content: editContent },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      message.success(t('updateNameSuccess'));
      setEditingComment(null);
      setEditContent("");
      fetchVideoDetails();
    } catch {
      message.error(t('updateNameFail'));
    }
  };

  const handleDeleteComment = async () => {
    if (!commentToDelete) return;
    
    try {
      await axios.delete(
        `https://learning-mini-be.onrender.com/comments/${commentToDelete.id}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      message.success(t('userManagements.messages.deleteSuccess'));
      setIsDeleteModalOpen(false);
      setCommentToDelete(null);
      fetchVideoDetails();
    } catch {
      message.error(t('userManagements.messages.deleteError'));
    }
  };

  const showDeleteConfirm = (comment) => {
    setCommentToDelete(comment);
    setIsDeleteModalOpen(true);
  };

  const canEditDeleteComment = (comment) => {
    // Admin có quyền chỉnh sửa và xóa bất kỳ bình luận nào
    if (isAdmin) return true;
    
    // Teacher có quyền chỉnh sửa/xóa bình luận trong khóa học của mình
    if (isTeacher && course && course.teacher_id === user.id) return true;
    
    // Người dùng có quyền chỉnh sửa/xóa bình luận của chính mình
    return user && comment.user_id === user.id;
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
            {t('commons.edit')}
          </Menu.Item>
          <Menu.Item 
            key="delete" 
            icon={<DeleteOutlined />}
            danger
            onClick={() => showDeleteConfirm(comment)}
          >
            {t('commons.delete')}
          </Menu.Item>
        </>
      )}
      <Menu.Item 
        key="reply" 
        icon={<MessageOutlined />}
        onClick={() => handleReply(comment)}
      >
        {t('reply')}
      </Menu.Item>
    </Menu>
  );

  const renderCommentItem = (comment, depth = 0) => {
    const isReply = depth > 0;
    const isDeleted = comment.deleted_at;
    
    return (
      <div key={comment.id} className={`comment-item ${isReply ? 'reply-comment' : 'parent-comment'}`}>
        <div className="comment-wrapper" style={{ marginLeft: `${depth * 32}px` }}>
          <List.Item>
            <List.Item.Meta
              avatar={
                <Avatar 
                  className="comment-avatar" 
                  icon={<UserOutlined />}
                  style={isDeleted ? { opacity: 0.5 } : {}}
                />
              }
              title={
                <div className="comment-header">
                  <div className="comment-author-info">
                    <span className="comment-author" style={isDeleted ? { color: '#999' } : {}}>
                      {isReply && <CaretRightOutlined style={{ marginRight: 8, color: '#999' }} />}
                      {isDeleted ? t('courseDetail.noComments') : comment.user_name || t('anonymousUser')}
                      {!isDeleted && comment.user_role === 'teacher' && (
                        <Tag color="blue" className="teacher-tag">
                          {t('teacher')}
                        </Tag>
                      )}
                      {!isDeleted && isAdmin && (
                        <Tag color="red" className="admin-tag">
                          {t('admins')}
                        </Tag>
                      )}
                    </span>
                    {!isDeleted && (
                      <span className="comment-time">
                        {new Date(comment.created_at).toLocaleString()}
                        {comment.is_edited && (
                          <span className="edit-badge">{t('edited')}</span>
                        )}
                      </span>
                    )}
                  </div>
                  {!isDeleted && canEditDeleteComment(comment) && (
                    <Dropdown overlay={getCommentMenu(comment)} trigger={['click']}>
                      <Button type="text" icon={<MoreOutlined />} size="small" className="comment-action-button" />
                    </Dropdown>
                  )}
                </div>
              }
              description={
                <div className="comment-content-wrapper">
                  {isDeleted ? (
                    <p className="deleted-comment">
                      {t('commentDeleted')}
                    </p>
                  ) : editingComment?.id === comment.id ? (
                    <div className="edit-form">
                      <TextArea
                        rows={2}
                        value={editContent}
                        onChange={(e) => setEditContent(e.target.value)}
                      />
                      <div className="edit-actions">
                        <Button size="small" type="primary" onClick={() => handleUpdateComment()}>
                          {t('save')}
                        </Button>
                        <Button size="small" onClick={() => setEditingComment(null)}>
                          {t('commons.cancel')}
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <p className="comment-content">{comment.content}</p>
                  )}
                  
                  {replyingToId === comment.id && !isDeleted && (
                    <div className="reply-form">
                      <TextArea
                        rows={2}
                        placeholder={t('courseDetail.placeholder.writeComment')}
                        value={replyContent}
                        onChange={(e) => setReplyContent(e.target.value)}
                      />
                      <div className="reply-actions">
                        <Button size="small" type="primary" onClick={() => handleSubmitReply(comment)}>
                          {t('sendReply')}
                        </Button>
                        <Button size="small" onClick={handleCancelReply}>
                          {t('commons.cancel')}
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              }
            />
          </List.Item>
          
          {comment.replies && comment.replies.length > 0 && (
            <div className="replies-section">
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

  const formatDuration = (duration) => {
    if (!duration) return '00:00';
    if (typeof duration === 'string' && duration.includes(':')) {
      return duration;
    }
    const durationNum = parseInt(duration) || 0;
    const minutes = Math.floor(durationNum / 60);
    const seconds = durationNum % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  const handleTabChange = (key) => {
    setActiveTab(key);
  };

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      navigate(-1);
    }
  };

  const InfoTab = () => (
    <div className="info-tab-content">
      <div className="video-info-section">
        <Title level={4}>{t('videoInfo')}</Title>
        <div className="video-info-grid">
          <div className="info-item">
            <strong>{t('teacherCourses.videoDuration')}:</strong> {formatDuration(video?.duration)}
          </div>
          <div className="info-item">
            <strong>{t('date')}:</strong> {video?.created_at ? new Date(video.created_at).toLocaleDateString() : t('courseadminManagement.text.notUpdated')}
          </div>
          <div className="info-item">
            <strong>{t('status')}:</strong>
            <Tag color={video?.is_published ? 'green' : 'orange'} className="status-tag">
              {video?.is_published ? t('published') : t('draft')}
            </Tag>
          </div>
          <div className="info-item">
            <strong>URL:</strong>
            {video?.url ? (
              <a href={video.url} target="_blank" rel="noopener noreferrer" className="video-link">
                <LinkOutlined /> {t('openLink')}
              </a>
            ) : (
              <Text type="secondary">{t('noURL')}</Text>
            )}
          </div>
          <div className="info-item">
            <strong>{t('assign.course')}:</strong> {course?.title || t('courseDetail.notAvailable')}
          </div>
          <div className="info-item">
            <strong>{t('teacher')}:</strong> {course?.teacher_name || t('courseDetail.notAvailable')}
          </div>
          {video?.order && (
            <div className="info-item">
              <strong>{t('orderInCourse')}:</strong> {video.order}
            </div>
          )}
        </div>
      </div>

      {allVideos.length > 1 && (
        <div className="other-videos-section">
          <Divider orientation="left">{t('otherVideosInCourse')}</Divider>
          <List
            dataSource={allVideos.filter(v => v.id !== video?.id)}
            renderItem={otherVideo => (
              <List.Item 
                className="other-video-item"
                actions={[
                  <Button 
                    type="link" 
                    size="small"
                    onClick={() => {
                      message.info(t('featureInDevelopment'));
                    }}
                  >
                    {t('view')}
                  </Button>
                ]}
              >
                <List.Item.Meta
                  avatar={<VideoCameraOutlined style={{ fontSize: '20px' }} />}
                  title={otherVideo.title}
                  description={
                    <Space direction="vertical" size={2}>
                      <Text type="secondary">{formatDuration(otherVideo.duration)}</Text>
                      <Tag size="small" color={otherVideo.is_published ? 'green' : 'orange'}>
                        {otherVideo.is_published ? t('published') : t('draft')}
                      </Tag>
                    </Space>
                  }
                />
              </List.Item>
            )}
          />
        </div>
      )}
    </div>
  );

  const CommentsTab = () => (
    <div className="comments-tab-content">
      <Title level={5} className="comments-title">
        {t('courseDetail.tabs.comments')}
        {isTeacher && (
          <Tag color="green" style={{ marginLeft: '10px' }}>
            {t('teacherMode')}
          </Tag>
        )}
        {isAdmin && (
          <Tag color="red" style={{ marginLeft: '10px' }}>
            {t('adminMode')}
          </Tag>
        )}
      </Title>

      <div className="comments-tree-container">
        {commentsTree.length > 0 ? (
          renderAllComments()
        ) : (
          <Empty
            description={t('courseDetail.noComments')}
            image={Empty.PRESENTED_IMAGE_SIMPLE}
          />
        )}
      </div>

      <Divider className="comment-divider" />
      {replyTo && !replyTo.deleted_at && (
        <div className="reply-indicator">
          <span>
            {t('replyingTo')}: <strong>{replyTo.user_name}</strong>
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
        className="comment-textarea"
        rows={3}
        placeholder={
          replyTo && !replyTo.deleted_at
            ? `${t('writeReplyTo')} ${replyTo.user_name}...`
            : t('courseDetail.placeholder.writeComment')
        }
        value={newComment}
        onChange={(e) => setNewComment(e.target.value)}
      />
      <div className="comment-submit-actions">
        <Button
          className="send-comment-btn"
          type="primary"
          icon={<SendOutlined />}
          onClick={handleAddComment}
        >
          {replyTo ? t('sendReply') : t('sendComment')}
        </Button>
        {replyTo && !replyTo.deleted_at && (
          <Button onClick={handleCancelReply}>
            {t('commons.cancel')}
          </Button>
        )}
      </div>
    </div>
  );

  const StudentsTab = () => (
    <div className="students-tab-content">
      {students.length === 0 ? (
        <Empty
          description={t('noStudents')}
          image={Empty.PRESENTED_IMAGE_SIMPLE}
        />
      ) : (
        <List
          dataSource={students}
          renderItem={student => (
            <div className="student-item">
              <Avatar 
                icon={<UserOutlined />}
                style={{ backgroundColor: '#1890ff' }}
              />
              <div className="student-info">
                <div className="student-name">{student.student_name || student.full_name || t('student')}</div>
                <div className="student-email">{student.email || t('noEmail')}</div>
                <div className="student-meta">
                  <Tag color="blue" size="small">{t('student')}</Tag>
                  <span className="student-enrolled">
                    {t('enrolled')}: {student.enrolled_at ? new Date(student.enrolled_at).toLocaleDateString() : t('courseDetail.notAvailable')}
                  </span>
                </div>
              </div>
            </div>
          )}
        />
      )}
    </div>
  );

  const AllVideosTab = () => (
    <div className="all-videos-tab-content">
      {allVideos.length === 0 ? (
        <Empty
          description={t('noVideosInCourse')}
          image={Empty.PRESENTED_IMAGE_SIMPLE}
        />
      ) : (
        <>
          <div className="videos-summary">
            <Text type="secondary">
              {t('totalVideos')} {allVideos.length} {t('videos')} {t('inCourse')}
            </Text>
          </div>
          <Row gutter={[16, 16]}>
            {allVideos.map(v => (
              <Col xs={24} sm={12} md={8} lg={6} key={v.id}>
                <Card
                  hoverable
                  className="video-card"
                  cover={
                    <div className="video-card-cover">
                      <div className="video-card-thumbnail">
                        {v.url ? (
                          <video
                            className="video-card-preview"
                            poster={v.thumbnail || "https://cdn.dribbble.com/userupload/12056349/file/original-bf68cfef9a9e7edb23b157a4f6e71856.png"}
                          >
                            <source src={v.url} type="video/mp4" />
                          </video>
                        ) : (
                          <div className="video-card-placeholder">
                            <PlayCircleOutlined className="play-icon" />
                          </div>
                        )}
                      </div>
                      <div className="video-duration">
                        {formatDuration(v.duration)}
                      </div>
                    </div>
                  }
                  onClick={() => {
                    message.info(`${t('selectVideo')}: ${v.title}`);
                  }}
                >
                  <Card.Meta
                    title={
                      <Text ellipsis={{ tooltip: v.title }}>
                        {v.title}
                      </Text>
                    }
                    description={
                      <Space direction="vertical" size={4}>
                        <div>
                          <ClockCircleOutlined /> {formatDuration(v.duration)}
                        </div>
                        <div>
                          <Tag 
                            color={v.is_published ? 'green' : 'orange'} 
                            size="small"
                          >
                            {v.is_published ? t('published') : t('draft')}
                          </Tag>
                          {v.order && (
                            <Tag color="blue" size="small">
                              {t('lesson')} {v.order}
                            </Tag>
                          )}
                        </div>
                        {v.id === video?.id && (
                          <Tag color="red" size="small">{t('watchingNow')}</Tag>
                        )}
                      </Space>
                    }
                  />
                </Card>
              </Col>
            ))}
          </Row>
        </>
      )}
    </div>
  );

  if (loading) {
    return (
      <div className="detail-video-page loading-page">
        <div className="loading-content">
          <Spin size="large" />
          <p style={{ marginTop: '20px' }}>{t('loadingVideoDetails')}</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="detail-video-page error-page">
        <div className="error-content">
          <Empty
            description={error}
            image={Empty.PRESENTED_IMAGE_SIMPLE}
          />
          <Button 
            type="primary" 
            onClick={fetchVideoDetails}
            style={{ marginTop: '20px' }}
          >
            {t('tryAgain')}
          </Button>
          <Button 
            onClick={handleBack}
            style={{ marginTop: '10px', marginLeft: '10px' }}
          >
            {t('back')}
          </Button>
        </div>
      </div>
    );
  }

  if (!video) {
    return (
      <div className="detail-video-page no-video-page">
        <div className="no-video-content">
          <Empty
            description={t('noVideoSelected')}
            image={Empty.PRESENTED_IMAGE_SIMPLE}
          />
          <Button 
            type="primary" 
            onClick={handleBack}
            style={{ marginTop: '20px' }}
          >
            {t('back')}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="detail-video-page">
      <Layout className="detail-layout">
        <div className="back-header">
          <div className="header-content">
            <Button 
              icon={<ArrowLeftOutlined />} 
              onClick={handleBack}
              className="back-button"
            >
              {t('back')}
            </Button>
          </div>
        </div>

        <Content className="detail-content">
          <div className="video-section">
            <div className="video-player-card">
              <div className="video-player-container">
                {video && video.url ? (
                  <video
                    controls
                    className="main-video-player"
                    poster={video.thumbnail || "https://cdn.dribbble.com/userupload/12056349/file/original-bf68cfef9a9e7edb23b157a4f6e71856.png"}
                  >
                    <source src={video.url} type="video/mp4" />
                    {t('browserNotSupportVideo')}
                  </video>
                ) : (
                  <img
                    src="https://cdn.dribbble.com/userupload/12056349/file/original-bf68cfef9a9e7edb23b157a4f6e71856.png"
                    alt="preview"
                    className="main-video-preview"
                  />
                )}
              </div>
            </div>
            <Card className="video-info-card">
              <Title level={3} className="video-title-main">
                {video?.title || t('noTitleVideo')}
              </Title>
              <Paragraph className="video-description-main">
                {video?.description || t('courseDetail.noDescription')}
              </Paragraph>
              
              {course && (
                <div className="course-info-summary">
                  <Space wrap size="small">
                    <Tag color="blue" icon={<VideoCameraOutlined />}>
                      {t('assign.course')}: {course.title}
                    </Tag>
                    <Tag color="green" icon={<UserOutlined />}>
                      {t('teacher')}: {course.teacher_name}
                    </Tag>
                    <Tag color={course.is_published ? 'green' : 'orange'}>
                      {course.is_published ? t('published') : t('draft')}
                    </Tag>
                  </Space>
                </div>
              )}
            </Card>
          </div>
          <div className="tabs-section">
            <Card className="main-tabs-card">
              <Tabs
                activeKey={activeTab}
                onChange={handleTabChange}
                className="detail-video-tabs"
                size="large"
                type="line"
              >
                <TabPane
                  tab={
                    <span>
                      <VideoCameraOutlined /> {t('courseDetail.tabs.overview')}
                    </span>
                  }
                  key="info"
                >
                  <InfoTab />
                </TabPane>

                <TabPane
                  tab={
                    <span>
                      <MessageOutlined /> {t('courseDetail.tabs.comments')}
                      {commentsTree.length > 0 && (
                        <Tag className="tab-count" color="blue">{commentsTree.length}</Tag>
                      )}
                    </span>
                  }
                  key="comments"
                >
                  <CommentsTab />
                </TabPane>

                <TabPane
                  tab={
                    <span>
                      <TeamOutlined /> {t('students')}
                      {students.length > 0 && (
                        <Tag className="tab-count" color="green">{students.length}</Tag>
                      )}
                    </span>
                  }
                  key="students"
                >
                  <StudentsTab />
                </TabPane>

                <TabPane
                  tab={
                    <span>
                      <PlayCircleOutlined /> {t('allVideos')}
                      {allVideos.length > 0 && (
                        <Tag className="tab-count">{allVideos.length}</Tag>
                      )}
                    </span>
                  }
                  key="allVideos"
                >
                  <AllVideosTab />
                </TabPane>
              </Tabs>
            </Card>
          </div>
        </Content>
      </Layout>
      <Modal
        title={t('confirmDeleteComment')}
        open={isDeleteModalOpen}
        onOk={handleDeleteComment}
        onCancel={() => {
          setIsDeleteModalOpen(false);
          setCommentToDelete(null);
        }}
        okText={t('commons.delete')}
        cancelText={t('commons.cancel')}
        okButtonProps={{ danger: true }}
      >
        <p>{t('confirmDeleteCommentMessage')}</p>
        {commentToDelete && commentToDelete.replies && commentToDelete.replies.length > 0 && (
          <p style={{ color: '#ff4d4f', marginTop: '10px' }}>
            <strong>⚠️ {t('warning')}:</strong> {t('commentHasReplies')} {commentToDelete.replies.length} {t('replies')}. 
            {!isAdmin && ` ${t('cannotDeleteWithReplies')}`}
            {isAdmin && ` ${t('adminWillDeleteAllReplies')}`}
          </p>
        )}
      </Modal>
    </div>
  );
};

export default DetailVideo;