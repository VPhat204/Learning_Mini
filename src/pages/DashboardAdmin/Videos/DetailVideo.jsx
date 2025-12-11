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
  Layout
} from 'antd';
import {
  PlayCircleOutlined,
  UserOutlined,
  VideoCameraOutlined,
  MessageOutlined,
  TeamOutlined,
  ClockCircleOutlined,
  LinkOutlined,
  ArrowLeftOutlined
} from '@ant-design/icons';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import './DetailVideo.css';

const { TabPane } = Tabs;
const { Title, Paragraph, Text } = Typography;
const { Content } = Layout;

const DetailVideo = ({
  video,
  course: initialCourse = null,
  comments: initialComments = [],
  students: initialStudents = [],
  allVideos: initialAllVideos = [],
  onBack
}) => {
  const [activeTab, setActiveTab] = useState('info');
  const [comments, setComments] = useState(initialComments);
  const [students, setStudents] = useState(initialStudents);
  const [allVideos, setAllVideos] = useState(initialAllVideos);
  const [course, setCourse] = useState(initialCourse);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

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
            message.warning('Không thể tải thông tin khóa học');
          })
        );
      }
      
      if (comments.length === 0 && video.course_id) {
        promises.push(
          axios.get(`https://learning-mini-be.onrender.com/comments/${video.course_id}`, {
            headers: { Authorization: `Bearer ${token}` }
          }).then(res => setComments(Array.isArray(res.data) ? res.data : []))
          .catch(err => {
            console.error('Error fetching comments:', err);
            setComments([]);
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
      setError('Không thể tải chi tiết video. Vui lòng thử lại sau.');
      message.error('Không thể tải chi tiết video');
    } finally {
      setLoading(false);
    }
  }, [video, course, comments.length, students.length, allVideos.length]);

  useEffect(() => {
    if (video) {
        if (!initialCourse || comments.length === 0) {
        fetchVideoDetails();
        }
    } else {
        setActiveTab('info');
        setError(null);
    }
  }, [video, initialCourse, fetchVideoDetails, comments.length]);

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
        <Title level={4}>Thông tin video</Title>
        <div className="video-info-grid">
          <div className="info-item">
            <strong>Thời lượng:</strong> {formatDuration(video?.duration)}
          </div>
          <div className="info-item">
            <strong>Ngày tạo:</strong> {video?.created_at ? new Date(video.created_at).toLocaleDateString('vi-VN') : 'Chưa cập nhật'}
          </div>
          <div className="info-item">
            <strong>Trạng thái:</strong>
            <Tag color={video?.is_published ? 'green' : 'orange'} className="status-tag">
              {video?.is_published ? 'Đã công khai' : 'Bản nháp'}
            </Tag>
          </div>
          <div className="info-item">
            <strong>URL:</strong>
            {video?.url ? (
              <a href={video.url} target="_blank" rel="noopener noreferrer" className="video-link">
                <LinkOutlined /> Mở liên kết
              </a>
            ) : (
              <Text type="secondary">Không có URL</Text>
            )}
          </div>
          <div className="info-item">
            <strong>Khóa học:</strong> {course?.title || 'Không xác định'}
          </div>
          <div className="info-item">
            <strong>Giảng viên:</strong> {course?.teacher_name || 'Không xác định'}
          </div>
          {video?.order && (
            <div className="info-item">
              <strong>Thứ tự trong khóa học:</strong> {video.order}
            </div>
          )}
        </div>
      </div>

      {allVideos.length > 1 && (
        <div className="other-videos-section">
          <Divider orientation="left">Các video khác trong khóa học</Divider>
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
                      message.info('Chức năng đang phát triển');
                    }}
                  >
                    Xem
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
                        {otherVideo.is_published ? 'Đã công khai' : 'Bản nháp'}
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
      {comments.length === 0 ? (
        <Empty
          description="Không có bình luận nào"
          image={Empty.PRESENTED_IMAGE_SIMPLE}
        />
      ) : (
        <List
          dataSource={comments}
          renderItem={comment => (
            <div className="comment-item">
              <div className="comment-header">
                <Avatar 
                  icon={<UserOutlined />} 
                  size="small"
                  style={{ backgroundColor: '#f56a00' }}
                />
                <div className="comment-info">
                  <strong>{comment.user_name || 'Người dùng ẩn danh'}</strong>
                  <span className="comment-date">
                    {new Date(comment.created_at).toLocaleString('vi-VN')}
                  </span>
                </div>
              </div>
              <div className="comment-content">{comment.content}</div>
              {comment.reply_to && (
                <div className="comment-reply">
                  <Text type="secondary">Trả lời cho bình luận #{comment.reply_to}</Text>
                </div>
              )}
            </div>
          )}
        />
      )}
    </div>
  );

  const StudentsTab = () => (
    <div className="students-tab-content">
      {students.length === 0 ? (
        <Empty
          description="Không có học viên nào"
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
                <div className="student-name">{student.student_name || student.full_name || 'Học viên'}</div>
                <div className="student-email">{student.email || 'Không có email'}</div>
                <div className="student-meta">
                  <Tag color="blue" size="small">Học viên</Tag>
                  <span className="student-enrolled">
                    Đăng ký: {student.enrolled_at ? new Date(student.enrolled_at).toLocaleDateString('vi-VN') : 'Không xác định'}
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
          description="Không có video nào trong khóa học"
          image={Empty.PRESENTED_IMAGE_SIMPLE}
        />
      ) : (
        <>
          <div className="videos-summary">
            <Text type="secondary">
              Tổng cộng {allVideos.length} video trong khóa học
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
                    message.info(`Chọn video: ${v.title}`);
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
                            {v.is_published ? 'Đã công khai' : 'Bản nháp'}
                          </Tag>
                          {v.order && (
                            <Tag color="blue" size="small">
                              Bài {v.order}
                            </Tag>
                          )}
                        </div>
                        {v.id === video?.id && (
                          <Tag color="red" size="small">Đang xem</Tag>
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
          <p style={{ marginTop: '20px' }}>Đang tải chi tiết video...</p>
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
            Thử lại
          </Button>
          <Button 
            onClick={handleBack}
            style={{ marginTop: '10px', marginLeft: '10px' }}
          >
            Quay lại
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
            description="Không có video nào được chọn"
            image={Empty.PRESENTED_IMAGE_SIMPLE}
          />
          <Button 
            type="primary" 
            onClick={handleBack}
            style={{ marginTop: '20px' }}
          >
            Quay lại
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
              Quay lại
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
                    Trình duyệt của bạn không hỗ trợ thẻ video.
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
                {video?.title || 'Video không có tiêu đề'}
              </Title>
              <Paragraph className="video-description-main">
                {video?.description || 'Không có mô tả'}
              </Paragraph>
              
              {course && (
                <div className="course-info-summary">
                  <Space wrap size="small">
                    <Tag color="blue" icon={<VideoCameraOutlined />}>
                      Khóa học: {course.title}
                    </Tag>
                    <Tag color="green" icon={<UserOutlined />}>
                      Giảng viên: {course.teacher_name}
                    </Tag>
                    <Tag color={course.is_published ? 'green' : 'orange'}>
                      {course.is_published ? 'Đã công khai' : 'Bản nháp'}
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
                      <VideoCameraOutlined /> Thông tin
                    </span>
                  }
                  key="info"
                >
                  <InfoTab />
                </TabPane>

                <TabPane
                  tab={
                    <span>
                      <MessageOutlined /> Bình luận 
                      {comments.length > 0 && (
                        <Tag className="tab-count" color="blue">{comments.length}</Tag>
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
                      <TeamOutlined /> Học viên
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
                      <PlayCircleOutlined /> Tất cả video
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
    </div>
  );
};

export default DetailVideo;