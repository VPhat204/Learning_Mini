import React, { useState, useEffect, useCallback } from 'react';
import {
  Table,
  Card,
  Button,
  Modal,
  Form,
  Input,
  InputNumber,
  Select,
  message,
  Tag,
  Space,
  Popconfirm,
  Statistic,
  Row,
  Col
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  PlayCircleOutlined,
  LinkOutlined
} from '@ant-design/icons';
import './VideoManagement.css';
import DetailVideo from './DetailVideo'

const { Option } = Select;

const VideoManagement = () => {
  const [videos, setVideos] = useState([]);
  const [courses, setCourses] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState('');
  const [viewDetailMode, setViewDetailMode] = useState(false);
  const [selectedVideoDetail, setSelectedVideoDetail] = useState(null);
  const [selectedVideo, setSelectedVideo] = useState(null);
  const [editingVideo, setEditingVideo] = useState(null);
  const [form] = Form.useForm();  
  const [messageApi, contextHolder] = message.useMessage();

  const token = localStorage.getItem('token');

  const fetchCourses = useCallback(async () => {
    try {
      const response = await fetch('https://learning-mini-be.onrender.com/courses', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();
      setCourses(data);
    } catch (error) {
      messageApi.error('Lỗi khi tải danh sách khóa học');
    }
  }, [token, messageApi]);

  const fetchVideos = useCallback(async (courseId = '') => {
    try {
      let url = 'https://learning-mini-be.onrender.com/videos';
      if (courseId) {
        url = `https://learning-mini-be.onrender.com/videos/${courseId}`;
      }
      
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();
      setVideos(Array.isArray(data) ? data : []);
    } catch (error) {
      messageApi.error('Lỗi khi tải danh sách video');
    }
  }, [token, messageApi]);

  useEffect(() => {
    fetchCourses();
    fetchVideos();
  }, [fetchCourses, fetchVideos]); 

  const handleAdd = () => {
    setEditingVideo(null);
    form.resetFields();
    setModalVisible(true);
  };

  const handleEdit = (video) => {
    setEditingVideo(video);
    form.setFieldsValue({
      course_id: video.course_id.toString(),
      title: video.title,
      url: video.url,
      duration: video.duration
    });
    setModalVisible(true);
  };

  const handleDelete = async (videoId) => {
    try {
      const response = await fetch(`https://learning-mini-be.onrender.com/videos/${videoId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        messageApi.success('Xóa video thành công');
        fetchVideos(selectedCourse);
      } else {
        const errorData = await response.json();
        messageApi.error(errorData.message || 'Lỗi khi xóa video');
      }
    } catch (error) {
      messageApi.error('Lỗi kết nối đến server');
    }
  };

  const handleCourseChange = (courseId) => {
    setSelectedCourse(courseId);
    fetchVideos(courseId);
  };

  const handleSubmit = async (values) => {
    try {
      const user = JSON.parse(localStorage.getItem('user'));
      console.log('User from localStorage:', user);

      let url = 'https://learning-mini-be.onrender.com/videos/add';
      let method = 'POST';
      
      if (editingVideo) {
        url = `https://learning-mini-be.onrender.com/videos/${editingVideo.id}`;
        method = 'PUT';
      }
      
      const submitData = {
        ...values,
        duration: values.duration ? values.duration.toString() : "0"
      };

      console.log('Data to submit:', submitData);

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(submitData)
      });

      const contentType = response.headers.get('content-type');
      let result;
      
      if (contentType && contentType.includes('application/json')) {
        result = await response.json();
      } else {
        const text = await response.text();
        console.log('Non-JSON response:', text);
        throw new Error(`Server returned non-JSON: ${response.status} ${response.statusText}`);
      }

      console.log('Server response status:', response.status);
      console.log('Server response data:', result);

      if (response.ok) {
        messageApi.success(editingVideo ? 'Cập nhật video thành công' : 'Thêm video thành công');
        setModalVisible(false);
        fetchVideos(selectedCourse);
      } else {
        messageApi.error(result.message || `Lỗi ${response.status} khi lưu video`);
      }
    } catch (error) {
      console.error('Lỗi kết nối:', error);
      if (error.message.includes('non-JSON')) {
        messageApi.error('Lỗi server: Phản hồi không hợp lệ');
      } else {
        messageApi.error('Lỗi kết nối đến server');
      }
    }
  };

  const handleViewDetail = (video) => {
    setSelectedVideoDetail(video);
    setViewDetailMode(true);
  };

  const handleBackToList = () => {
    setViewDetailMode(false);
    setSelectedVideoDetail(null);
  };

  const formatDuration = (duration) => {
    if (!duration) return '00:00';
    const durationNum = parseInt(duration) || 0;
    const minutes = Math.floor(durationNum / 60);
    const seconds = durationNum % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  const getCourseName = (courseId) => {
    const course = courses.find(c => c.id === courseId);
    return course ? course.title : 'Không xác định';
  };

  const getVideoCourse = (videoId) => {
    const video = videos.find(v => v.id === videoId);
    return video ? courses.find(c => c.id === video.course_id) : null;
  };

  const columns = [
    {
      title: 'Tên video',
      dataIndex: 'title',
      key: 'title',
      width: 200
    },
    {
      title: 'Khóa học',
      dataIndex: 'course_id',
      key: 'course_id',
      render: (courseId) => <Tag color="blue" className="video-tag">{getCourseName(courseId)}</Tag>
    },
    {
      title: 'URL',
      dataIndex: 'url',
      key: 'url',
      ellipsis: true,
      render: (url) => (
        <div className="video-url">
          <LinkOutlined />
          <span className="video-url-text">{url}</span>
        </div>
      )
    },
    {
      title: 'Thời lượng',
      dataIndex: 'duration',
      key: 'duration',
      render: (duration) => <Tag color="green" className="video-tag">{formatDuration(duration)}</Tag>
    },
    {
      title: 'Ngày tạo',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (date) => date ? new Date(date).toLocaleDateString('vi-VN') : 'Chưa cập nhật'
    },
    {
      title: 'Thao tác',
      key: 'actions',
      render: (_, record) => (
        <Space>
          <Button 
            icon={<PlayCircleOutlined />} 
            onClick={() => handleViewDetail(record)}
            className="video-action-btn"
          />
          <Button 
            icon={<EditOutlined />} 
            onClick={() => handleEdit(record)}
            className="video-action-btn"
          />
          <Popconfirm
            title="Xóa video"
            description="Bạn có chắc chắn muốn xóa video này?"
            onConfirm={() => handleDelete(record.id)}
            okText="Xóa"
            cancelText="Hủy"
          >
            <Button icon={<DeleteOutlined />} danger className="video-action-btn" />
          </Popconfirm>
        </Space>
      )
    }
  ];

  return (
    <div className="video-management-container">
      {contextHolder}
      {viewDetailMode && selectedVideoDetail ? (
        <DetailVideo
          video={selectedVideoDetail}
          onBack={handleBackToList}
        />
      ) : (
      <Card className="video-management-card">
        <div className="video-header">
          <div className="video-title-section">
            <h2 className="video-title">Quản lý Video</h2>
            <p className="video-subtitle">Quản lý video bài giảng cho các khóa học</p>
          </div>
          <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd} className="add-video-btn">
            Thêm Video
          </Button>
        </div>

        <div className="course-selector">
          <Select
            placeholder="Chọn khóa học"
            value={selectedCourse}
            onChange={handleCourseChange}
            className="course-select"
            allowClear
          >
            {courses.map(course => (
              <Option key={course.id} value={course.id}>
                {course.title}
              </Option>
            ))}
          </Select>
        </div>

        <Row gutter={16} className="stats-row">
          <Col span={6}>
            <Card className="stat-card">
              <Statistic title="Tổng số video" value={videos.length} className="video-statistic" />
            </Card>
          </Col>
          <Col span={6}>
            <Card className="stat-card">
              <Statistic 
                title="Khóa học đã chọn" 
                value={selectedCourse ? getCourseName(parseInt(selectedCourse)) : 'Tất cả'} 
                className="video-statistic"
              />
            </Card>
          </Col>
        </Row>

        <Table 
          columns={columns} 
          dataSource={videos} 
          rowKey="id"
          pagination={{ pageSize: 10 }}
          className="video-table"
          locale={{ 
            emptyText: selectedCourse ? 
              'Chưa có video nào cho khóa học này' : 
              'Chưa có video nào. Hãy chọn khóa học để xem video hoặc thêm video mới.'
          }}
        />
      </Card>
      )}
      <Modal
        title={editingVideo ? 'Chỉnh sửa Video' : 'Thêm Video Mới'}
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        footer={null}
        width={600}
        className="video-modal"
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          className="video-form"
        >
          <Form.Item
            name="course_id"
            label="Khóa học"
            rules={[{ required: true, message: 'Vui lòng chọn khóa học' }]}
          >
            <Select placeholder="Chọn khóa học" className="form-select">
              {courses.map(course => (
                <Option key={course.id} value={course.id}>
                  {course.title}
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="title"
            label="Tiêu đề video"
            rules={[{ required: true, message: 'Vui lòng nhập tiêu đề video' }]}
          >
            <Input className="form-input" />
          </Form.Item>

          <Form.Item
            name="url"
            label="URL video"
            rules={[{ required: true, message: 'Vui lòng nhập URL video' }]}
          >
            <Input placeholder="https://www.youtube.com/watch?v=..." className="form-input" />
          </Form.Item>

          <Form.Item
            name="duration"
            label="Thời lượng (giây)"
          >
            <InputNumber 
              min={1} 
              className="duration-input" 
              placeholder="Ví dụ: 3600 cho video 1 giờ"
            />
          </Form.Item>

          <Form.Item>
            <div className="form-actions">
              <Button onClick={() => setModalVisible(false)} className="cancel-btn">
                Hủy
              </Button>
              <Button type="primary" htmlType="submit" className="submit-btn">
                {editingVideo ? 'Cập nhật' : 'Thêm'}
              </Button>
            </div>
          </Form.Item>
        </Form>
      </Modal>

      {selectedVideo && (
        <DetailVideo
          visible={detailModalVisible}
          onClose={() => {
            setDetailModalVisible(false);
            setSelectedVideo(null);
          }}
          video={selectedVideo}
          course={getVideoCourse(selectedVideo.id)}
        />
      )}
    </div>
  );
};

export default VideoManagement;