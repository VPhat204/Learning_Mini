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
import { useTranslation } from 'react-i18next';
import './VideoManagement.css';
import DetailVideo from './Detail/DetailVideo';

const { Option } = Select;

const VideoManagement = () => {
  const { t } = useTranslation();
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
      messageApi.error(t('teacherCourses.fetchCoursesFailed'));
    }
  }, [token, messageApi, t]);

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
      messageApi.error(t('teacherCourses.fetchVideosFailed'));
    }
  }, [token, messageApi, t]);

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
        messageApi.success(t('teacherCourses.deleteVideoSuccess'));
        fetchVideos(selectedCourse);
      } else {
        const errorData = await response.json();
        messageApi.error(errorData.message || t('teacherCourses.deleteVideoFailed'));
      }
    } catch (error) {
      messageApi.error(t('teacherCourses.deleteVideoFailed'));
    }
  };

  const handleCourseChange = (courseId) => {
    setSelectedCourse(courseId);
    fetchVideos(courseId);
  };

  const handleSubmit = async (values) => {
    try {

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
        console.error('Non-JSON response:', text); 
        throw new Error(`Server returned non-JSON: ${response.status} ${response.statusText}`);
      }

      if (response.ok) {
        messageApi.success(editingVideo ? t('teacherCourses.updateVideoSuccess') : t('teacherCourses.addVideoSuccess'));
        setModalVisible(false);
        fetchVideos(selectedCourse);
      } else {
        messageApi.error(result.message || `${t('commonAdmin.update')} ${response.status}`);
      }
    } catch (error) {
      if (error.message.includes('non-JSON')) {
        messageApi.error(t('teacherCourses.saveVideoFailed'));
      } else {
        messageApi.error(t('teacherCourses.saveVideoFailed'));
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
    return course ? course.title : t('courseDetail.notAvailable');
  };

  const getVideoCourse = (videoId) => {
    const video = videos.find(v => v.id === videoId);
    return video ? courses.find(c => c.id === video.course_id) : null;
  };

  const columns = [
    {
      title: t('teacherCourses.videoTitle'),
      dataIndex: 'title',
      key: 'title',
      width: 200
    },
    {
      title: t('teachercourses'),
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
      title: t('teacherCourses.videoDuration'),
      dataIndex: 'duration',
      key: 'duration',
      render: (duration) => <Tag color="green" className="video-tag">{formatDuration(duration)}</Tag>
    },
    {
      title: t('courseadminManagement.columns.createdAt'),
      dataIndex: 'created_at',
      key: 'created_at',
      render: (date) => date ? new Date(date).toLocaleDateString() : t('courseadminManagement.text.notUpdated')
    },
    {
      title: t('courseadminManagement.columns.actions'),
      key: 'actions',
      render: (_, record) => (
        <Space>
          <Button 
            icon={<PlayCircleOutlined />} 
            onClick={() => handleViewDetail(record)}
            className="video-action-btn"
            title={t('teacherCourses.viewDetails')}
          />
          <Button 
            icon={<EditOutlined />} 
            onClick={() => handleEdit(record)}
            className="video-action-btn"
            title={t('commons.edit')}
          />
          <Popconfirm
            title={t('courseadminManagement.confirm.deleteTitle')}
            description={t('courseadminManagement.confirm.deleteDescription')}
            onConfirm={() => handleDelete(record.id)}
            okText={t('commons.yes')}
            cancelText={t('commons.no')}
          >
            <Button 
              icon={<DeleteOutlined />} 
              danger 
              className="video-action-btn" 
              title={t('commons.delete')}
            />
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
            <h2 className="video-title">{t('videoManagement')}</h2>
            <p className="video-subtitle">{t('teacherCourses.manageVideos')}</p>
          </div>
          <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd} className="add-video-btn">
            {t('teacherCourses.addVideo')}
          </Button>
        </div>

        <div className="course-selector">
          <Select
            placeholder={t('studentlist.chooseCourse')}
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
              <Statistic 
                title={t('courseadminManagement.stats.totalCourses')} 
                value={videos.length} 
                className="video-statistic" 
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card className="stat-card">
              <Statistic 
                title={t('studentlist.chooseCourse')} 
                value={selectedCourse ? getCourseName(parseInt(selectedCourse)) : t('courseDetail.notAvailable')} 
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
              t('courseDetail.noVideos') : 
              t('teacherCourses.noVideos')
          }}
        />
      </Card>
      )}
      <Modal
        title={editingVideo ? t('courseadminManagement.modals.editTitle') : t('courseadminManagement.modals.addTitle')}
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
            label={t('assign.course')}
            rules={[{ required: true, message: t('studentlist.chooseCourse') }]}
          >
            <Select 
              placeholder={t('studentlist.chooseCourse')} 
              className="form-select"
            >
              {courses.map(course => (
                <Option key={course.id} value={course.id}>
                  {course.title}
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="title"
            label={t('teacherCourses.videoTitle')}
            rules={[{ required: true, message: t('teacherCourses.videoTitleRequired') }]}
          >
            <Input 
              className="form-input" 
              placeholder={t('teacherCourses.videoTitlePlaceholder')}
            />
          </Form.Item>

          <Form.Item
            name="url"
            label={t('teacherCourses.videoUrl')}
            rules={[{ required: true, message: t('teacherCourses.videoUrlRequired') }]}
          >
            <Input 
              placeholder={t('teacherCourses.videoUrlPlaceholder')} 
              className="form-input" 
            />
          </Form.Item>

          <Form.Item
            name="duration"
            label={t('teacherCourses.videoDuration')}
          >
            <InputNumber 
              min={1} 
              className="duration-input" 
              placeholder={t('teacherCourses.videoDurationPlaceholder')}
            />
          </Form.Item>

          <Form.Item>
            <div className="form-actions">
              <Button onClick={() => setModalVisible(false)} className="cancel-btn">
                {t('commons.cancel')}
              </Button>
              <Button type="primary" htmlType="submit" className="submit-btn">
                {editingVideo ? t('commonAdmin.update') : t('commonAdmin.add')}
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