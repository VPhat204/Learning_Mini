import React, { useState, useEffect, useCallback } from 'react';
import {
  Table,
  Card,
  Button,
  Modal,
  Form,
  Input,
  InputNumber,
  message,
  Tag,
  Space,
  Popconfirm,
  Statistic,
  Row,
  Col,
  ConfigProvider,
  theme,
  Tabs,
  Badge,
  Tooltip,
  Typography,
  Radio
} from 'antd';
import {
  EditOutlined,
  DeleteOutlined,
  TeamOutlined,
  UserOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  CloseCircleOutlined,
  CheckOutlined,
  StopOutlined
} from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../../context/themeContext';
import './CourseManagement.css';

const { TextArea } = Input;
const { TabPane } = Tabs;
const { Paragraph } = Typography;

const CourseManagement = () => {
  const { t } = useTranslation();
  const [courses, setCourses] = useState([]);
  const [pendingCourses, setPendingCourses] = useState([]);
  const [rejectedCourses, setRejectedCourses] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [studentsModalVisible, setStudentsModalVisible] = useState(false);
  const [approvalModalVisible, setApprovalModalVisible] = useState(false);
  const [editingCourse, setEditingCourse] = useState(null);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [courseForApproval, setCourseForApproval] = useState(null);
  const [students, setStudents] = useState([]);
  const [form] = Form.useForm();
  const [approvalForm] = Form.useForm();
  const [messageApi, contextHolder] = message.useMessage();
  const [activeTab, setActiveTab] = useState('approved');
  const [userRole, setUserRole] = useState('');
  const [userId, setUserId] = useState('');
  const [loading, setLoading] = useState(false);
  const [approvalAction, setApprovalAction] = useState('approve');
  
  const { darkMode } = useTheme();

  const themeConfig = {
    algorithm: darkMode ? theme.darkAlgorithm : theme.defaultAlgorithm,
    token: {
      colorBgBase: darkMode ? '#000000' : '#ffffff',
      colorTextBase: darkMode ? '#ffffff' : '#000000',
      colorPrimary: darkMode ? '#177ddc' : '#1890ff',
      colorBgContainer: darkMode ? '#000000' : '#ffffff',
      colorBorder: darkMode ? '#333333' : '#d9d9d9',
    },
  };

  const token = localStorage.getItem('token');

  useEffect(() => {
    const getUserInfo = () => {
      try {
        const tokenData = JSON.parse(atob(token.split('.')[1]));
        setUserRole(tokenData.roles);
        setUserId(tokenData.id);
      } catch (error) {
        console.error(t('courseadminManagement.errors.parseToken'), error);
      }
    };
    
    if (token) {
      getUserInfo();
    }
  }, [token, t]);

  const fetchAllCourses = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch('https://learning-mini-be.onrender.com/courses', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();
      
      const approved = data.filter(course => course.is_approved === 1);
      const pending = data.filter(course => course.is_approved === 0);
      const rejected = data.filter(course => course.is_approved === 2 || course.status === 'rejected');
      
      if (userRole === 'teacher') {
        const teacherApproved = approved.filter(course => course.teacher_id === parseInt(userId));
        const teacherPending = pending.filter(course => course.teacher_id === parseInt(userId));
        const teacherRejected = rejected.filter(course => course.teacher_id === parseInt(userId));
        
        setCourses(teacherApproved);
        setPendingCourses(teacherPending);
        setRejectedCourses(teacherRejected);
      } else if (userRole === 'admin') {
        setCourses(approved);
        setPendingCourses(pending);
        setRejectedCourses(rejected);
      } else {
        setCourses(approved);
        setPendingCourses([]);
        setRejectedCourses([]);
      }
    } catch (error) {
      console.error(t('courseadminManagement.errors.fetchCourses'), error);
      messageApi.error(t('courseadminManagement.errors.loadCoursesFailed'));
    } finally {
      setLoading(false);
    }
  }, [token, messageApi, userRole, userId, t]);

  useEffect(() => {
    if (userRole) {
      fetchAllCourses();
    }
  }, [userRole, fetchAllCourses]);

  const refreshData = useCallback(() => {
    fetchAllCourses();
  }, [fetchAllCourses]);

  const fetchCourseStudents = async (courseId) => {
    try {
      const response = await fetch(`https://learning-mini-be.onrender.com/course-students?courseId=${courseId}`);
      const data = await response.json();
      setStudents(data.students || []);
    } catch (error) {
      messageApi.error(t('courseadminManagement.errors.loadStudentsFailed'));
    }
  };

  const handleEdit = (course) => {
    setEditingCourse(course);
    form.setFieldsValue({
      title: course.title,
      description: course.description,
      lessons: course.lessons,
      hours: course.hours
    });
    setModalVisible(true);
  };

  const handleDelete = async (courseId) => {
    try {
      const response = await fetch(`https://learning-mini-be.onrender.com/courses/${courseId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        messageApi.success(t('courseadminManagement.messages.deleteSuccess'));
        refreshData();
      } else {
        const errorData = await response.json();
        messageApi.error(errorData.message || t('courseadminManagement.errors.deleteFailed'));
      }
    } catch (error) {
      messageApi.error(t('courseadminManagement.errors.connectionError'));
    }
  };

  const handleViewStudents = async (course) => {
    setSelectedCourse(course);
    try {
      await fetchCourseStudents(course.id);
      setStudentsModalVisible(true);
    } catch (error) {
      messageApi.error(t('courseadminManagement.errors.loadStudentsFailed'));
    }
  };

  const handleApproveCourse = (course) => {
    setCourseForApproval(course);
    setApprovalAction('approve');
    setApprovalModalVisible(true);
    approvalForm.setFieldsValue({
      reason: ''
    });
  };

  const handleRejectCourse = (course) => {
    setCourseForApproval(course);
    setApprovalAction('reject');
    setApprovalModalVisible(true);
    approvalForm.setFieldsValue({
      reason: ''
    });
  };

  const handleApproveSubmit = async (values) => {
    try {
      const response = await fetch(`https://learning-mini-be.onrender.com/courses/${courseForApproval.id}/approve`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          approve: approvalAction === 'approve'
        })
      });

      if (response.ok) {
        messageApi.success(
          approvalAction === 'approve' 
            ? t('courseadminManagement.messages.approveSuccess')
            : t('courseadminManagement.messages.rejectSuccess')
        );
        setApprovalModalVisible(false);
        setCourseForApproval(null);
        refreshData();
        if (approvalAction === 'approve' && activeTab === 'pending') {
          setActiveTab('approved');
        } else if (approvalAction === 'reject' && activeTab === 'pending') {
          setActiveTab('rejected');
        }
      } else {
        const errorData = await response.json();
        messageApi.error(errorData.message || t('courseadminManagement.errors.processFailed'));
      }
    } catch (error) {
      messageApi.error(t('courseadminManagement.errors.connectionError'));
    }
  };

  const handleSubmit = async (values) => {
    try {
      const url = editingCourse 
        ? `https://learning-mini-be.onrender.com/courses/${editingCourse.id}`
        : 'https://learning-mini-be.onrender.com/courses';
      
      const method = editingCourse ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(values)
      });

      if (response.ok) {
        messageApi.success(editingCourse ? t('courseadminManagement.messages.updateSuccess') : t('courseadminManagement.messages.addSuccess'));
        setModalVisible(false);
        refreshData();
      } else {
        const errorData = await response.json();
        messageApi.error(errorData.message || t('courseadminManagement.errors.saveFailed'));
      }
    } catch (error) {
      messageApi.error(t('courseadminManagement.errors.connectionError'));
    }
  };

  const renderStatusTag = (isApproved) => {
    if (isApproved === 1) {
      return <Tag color="success" icon={<CheckCircleOutlined />}>{t('courseadminManagement.status.approved')}</Tag>;
    } else if (isApproved === 0) {
      return <Tag color="warning" icon={<ClockCircleOutlined />}>{t('courseadminManagement.status.pending')}</Tag>;
    } else if (isApproved === 2) {
      return <Tag color="error" icon={<CloseCircleOutlined />}>{t('courseadminManagement.status.rejected')}</Tag>;
    } else {
      return <Tag color="default">{t('courseadminManagement.status.unknown')}</Tag>;
    }
  };

  const baseColumns = [
    {
      title: t('courseadminManagement.columns.title'),
      dataIndex: 'title',
      key: 'title',
      width: 200,
      render: (text, record) => (
        <div className="course-admin-title-cell">
          <span className="table-text course-title">{text}</span>
          <div className="course-status">
            {renderStatusTag(record.is_approved)}
          </div>
        </div>
      )
    },
    {
      title: t('courseadminManagement.columns.description'),
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
      render: (text) => (
        <Paragraph 
          ellipsis={{ 
            rows: 2, 
            expandable: true, 
            symbol: t('courseadminManagement.actions.viewMore') 
          }}
          className="table-text"
        >
          {text || t('courseadminManagement.text.noDescription')}
        </Paragraph>
      )
    },
    {
      title: t('courseadminManagement.columns.teacher'),
      dataIndex: 'teacher_name',
      key: 'teacher_name',
      render: (teacherName, record) => (
        <div className="teacher-info">
          <UserOutlined className="teacher-icon" />
          <div>
            <span className="teacher-course-name">{teacherName || t('courseadminManagement.text.unknown')}</span>
            {userRole === 'admin' && record.teacher_email && (
              <div className="teacher-email">
                <small>{record.teacher_email}</small>
              </div>
            )}
          </div>
        </div>
      )
    },
    {
      title: t('courseadminManagement.columns.duration'),
      key: 'duration',
      width: 150,
      render: (_, record) => (
        <div className="duration-info">
          <Tag color="blue" className="duration-tag">
            {record.lessons || 0} {t('courseadminManagement.text.lessons')}
          </Tag>
          <Tag color="green" className="duration-tag">
            {record.hours || 0} {t('courseadminManagement.text.hours')}
          </Tag>
        </div>
      )
    },
    {
      title: t('courseadminManagement.columns.createdAt'),
      dataIndex: 'created_at',
      key: 'created_at',
      width: 120,
      render: (date) => (
        <span className="table-text date-text">
          {date ? new Date(date).toLocaleDateString('vi-VN') : t('courseadminManagement.text.notAvailable')}
        </span>
      )
    }
  ];

  const actionColumns = {
    approved: (_, record) => (
      <Space className="action-admin-buttons">
        <Tooltip title={t('courseadminManagement.tooltips.viewStudents')}>
          <Button 
            size="small"
            icon={<TeamOutlined />} 
            onClick={() => handleViewStudents(record)}
          />
        </Tooltip>
        {(userRole === 'admin' || (userRole === 'teacher' && record.teacher_id === parseInt(userId))) && (
          <>
            <Tooltip title={t('courseadminManagement.tooltips.edit')}>
              <Button 
                size="small"
                icon={<EditOutlined />} 
                onClick={() => handleEdit(record)}
              />
            </Tooltip>
            <Popconfirm
              title={t('courseadminManagement.confirm.deleteTitle')}
              description={t('courseadminManagement.confirm.deleteDescription')}
              onConfirm={() => handleDelete(record.id)}
              okText={t('commonAdmin.delete')}
              cancelText={t('commonAdmin.cancel')}
            >
              <Tooltip title={t('courseadminManagement.tooltips.delete')}>
                <Button size="small" icon={<DeleteOutlined />} danger />
              </Tooltip>
            </Popconfirm>
          </>
        )}
      </Space>
    ),
    pending: (_, record) => (
      <Space className="action-buttons">
        {userRole === 'admin' && (
          <>
            <Tooltip title={t('courseadminManagement.tooltips.approve')}>
              <Button 
                type="primary"
                size="small"
                icon={<CheckOutlined />} 
                onClick={() => handleApproveCourse(record)}
              />
            </Tooltip>
            <Tooltip title={t('courseadminManagement.tooltips.reject')}>
              <Button 
                danger
                size="small"
                icon={<StopOutlined />} 
                onClick={() => handleRejectCourse(record)}
              />
            </Tooltip>
          </>
        )}
        {(userRole === 'admin' || (userRole === 'teacher' && record.teacher_id === parseInt(userId))) && (
          <Popconfirm
            title={t('courseadminManagement.confirm.deleteTitle')}
            description={t('courseadminManagement.confirm.deleteDescription')}
            onConfirm={() => handleDelete(record.id)}
            okText={t('commonAdmin.delete')}
            cancelText={t('commonAdmin.cancel')}
          >
            <Tooltip title={t('courseadminManagement.tooltips.delete')}>
              <Button size="small" icon={<DeleteOutlined />} danger />
            </Tooltip>
          </Popconfirm>
        )}
      </Space>
    ),
    rejected: (_, record) => (
      <Space className="action-buttons">
        {userRole === 'admin' && (
          <>
            <Tooltip title={t('courseadminManagement.tooltips.reApprove')}>
              <Button 
                type="primary"
                size="small"
                icon={<CheckOutlined />} 
                onClick={() => handleApproveCourse(record)}
              />
            </Tooltip>
          </>
        )}
        {(userRole === 'admin' || (userRole === 'teacher' && record.teacher_id === parseInt(userId))) && (
          <Popconfirm
            title={t('courseadminManagement.confirm.deleteTitle')}
            description={t('courseadminManagement.confirm.deleteDescription')}
            onConfirm={() => handleDelete(record.id)}
            okText={t('commonAdmin.delete')}
            cancelText={t('commonAdmin.cancel')}
          >
            <Tooltip title={t('courseadminManagement.tooltips.delete')}>
              <Button size="small" icon={<DeleteOutlined />} danger />
            </Tooltip>
          </Popconfirm>
        )}
      </Space>
    )
  };

  const getColumns = (tabKey) => {
    const columns = [...baseColumns];
    columns.push({
      title: t('courseadminManagement.columns.actions'),
      key: 'actions',
      width: tabKey === 'pending' ? 150 : 120,
      render: actionColumns[tabKey]
    });
    return columns;
  };

  const studentColumns = [
    {
      title: t('courseadminManagement.columns.studentName'),
      dataIndex: 'student_name',
      key: 'student_name',
      render: (text) => <span className="table-text">{text}</span>
    },
    {
      title: t('courseadminManagement.columns.email'),
      dataIndex: 'email',
      key: 'email',
      render: (text) => <span className="table-text">{text}</span>
    },
    {
      title: t('courseadminManagement.columns.phone'),
      dataIndex: 'phone',
      key: 'phone',
      render: (phone) => (
        <span className="table-text">
          {phone || t('courseadminManagement.text.notUpdated')}
        </span>
      )
    },
    {
      title: t('courseadminManagement.columns.gender'),
      dataIndex: 'gender',
      key: 'gender',
      render: (gender) => {
        const genderMap = {
          'male': t('courseadminManagement.text.male'),
          'female': t('courseadminManagement.text.female')
        };
        return (
          <span className="table-text">
            {genderMap[gender] || t('courseadminManagement.text.other')}
          </span>
        );
      }
    },
    {
      title: t('courseadminManagement.columns.enrollmentDate'),
      dataIndex: 'enrolled_at',
      key: 'enrolled_at',
      render: (date) => (
        <span className="table-text">
          {new Date(date).toLocaleDateString('vi-VN')}
        </span>
      )
    }
  ];

  const getHeaderText = () => {
    if (userRole === 'admin') {
      return t('courseadminManagement.headers.management');
    } else if (userRole === 'teacher') {
      return t('courseadminManagement.headers.myCourses');
    } else {
      return t('courseadminManagement.headers.viewCourses');
    }
  };

  return (
    <ConfigProvider theme={themeConfig}>
      <div className={`course-management ${darkMode ? 'dark-mode' : 'light-mode'}`}>
        {contextHolder}
        <Card className="course-management-card">
          <div className="card-header">
            <div>
              <h2 className="course-management-header">{t('courseadminManagement.title')}</h2>
              <p className="course-management-subheader">
                {getHeaderText()}
              </p>
            </div>
          </div>

          <Row gutter={16} className="stats-row">
            <Col span={6}>
              <Card className="statistic-card">
                <Statistic 
                  title={t('courseadminManagement.stats.totalCourses')} 
                  value={courses.length + pendingCourses.length + rejectedCourses.length}
                  className="statistic-value"
                />
              </Card>
            </Col>
            <Col span={6}>
              <Card className="statistic-card">
                <Statistic 
                  title={t('courseadminManagement.stats.approved')} 
                  value={courses.length}
                  valueStyle={{ color: '#52c41a' }}
                  className="statistic-value"
                  prefix={<CheckCircleOutlined style={{ color: '#52c41a' }} />}
                />
              </Card>
            </Col>
            {userRole !== 'student' && (
              <Col span={6}>
                <Card className="statistic-card">
                  <Statistic 
                    title={t('courseadminManagement.stats.pending')} 
                    value={pendingCourses.length}
                    valueStyle={{ color: '#faad14' }}
                    className="statistic-value"
                    prefix={<ClockCircleOutlined style={{ color: '#faad14' }} />}
                  />
                </Card>
              </Col>
            )}
            <Col span={6}>
              <Card className="statistic-card">
                <Statistic 
                  title={t('courseadminManagement.stats.rejected')} 
                  value={rejectedCourses.length}
                  valueStyle={{ color: '#ff4d4f' }}
                  className="statistic-value"
                  prefix={<CloseCircleOutlined style={{ color: '#ff4d4f' }} />}
                />
              </Card>
            </Col>
          </Row>

          <Tabs 
            activeKey={activeTab} 
            onChange={setActiveTab}
            className="course-tabs"
            type="card"
          >
            <TabPane 
              tab={
                <span className="tab-title">
                  <CheckCircleOutlined className="tab-icon" style={{ color: '#52c41a' }} />
                  {t('courseadminManagement.tabs.approved')}
                  {courses.length > 0 && (
                    <Badge 
                      count={courses.length} 
                      overflowCount={99} 
                      className="tab-badge"
                      style={{ backgroundColor: '#52c41a' }}
                    />
                  )}
                </span>
              } 
              key="approved"
            >
              <Table 
                columns={getColumns('approved')} 
                dataSource={courses} 
                rowKey="id"
                pagination={{ 
                  pageSize: 10,
                  showSizeChanger: true,
                  showQuickJumper: true
                }}
                className="course-table"
                scroll={{ x: 1000 }}
                locale={{ emptyText: t('courseadminManagement.empty.noApprovedCourses') }}
                loading={loading}
              />
            </TabPane>
            {userRole !== 'student' && (
              <TabPane 
                tab={
                  <span className="tab-title">
                    <ClockCircleOutlined className="tab-icon" style={{ color: '#faad14' }} />
                    {t('courseadminManagement.tabs.pending')}
                    {pendingCourses.length > 0 && (
                      <Badge 
                        count={pendingCourses.length} 
                        overflowCount={99} 
                        className="tab-badge pending-badge"
                      />
                    )}
                  </span>
                } 
                key="pending"
              >
                <Table 
                  columns={getColumns('pending')} 
                  dataSource={pendingCourses} 
                  rowKey="id"
                  pagination={{ 
                    pageSize: 10,
                    showSizeChanger: true,
                    showQuickJumper: true
                  }}
                  className="course-table"
                  scroll={{ x: 1000 }}
                  locale={{ emptyText: t('courseadminManagement.empty.noPendingCourses') }}
                  loading={loading}
                />
              </TabPane>
            )}

            <TabPane 
              tab={
                <span className="tab-title">
                  <CloseCircleOutlined className="tab-icon" style={{ color: '#ff4d4f' }} />
                  {t('courseadminManagement.tabs.rejected')}
                  {rejectedCourses.length > 0 && (
                    <Badge 
                      count={rejectedCourses.length} 
                      overflowCount={99} 
                      className="tab-badge rejected-badge"
                    />
                  )}
                </span>
              } 
              key="rejected"
            >
              <Table 
                columns={getColumns('rejected')} 
                dataSource={rejectedCourses} 
                rowKey="id"
                pagination={{ 
                  pageSize: 10,
                  showSizeChanger: true,
                  showQuickJumper: true
                }}
                className="course-table"
                scroll={{ x: 1000 }}
                locale={{ emptyText: t('courseadminManagement.empty.noRejectedCourses') }}
                loading={loading}
              />
            </TabPane>
          </Tabs>
        </Card>
        <Modal
          title={editingCourse ? t('courseadminManagement.modals.editTitle') : t('courseadminManagement.modals.addTitle')}
          open={modalVisible}
          onCancel={() => setModalVisible(false)}
          footer={null}
          width={600}
          className={`course-modal ${darkMode ? 'dark-modal' : ''}`}
          destroyOnClose
        >
          <Form
            form={form}
            layout="vertical"
            onFinish={handleSubmit}
            className="course-form"
          >
            <Form.Item
              name="title"
              label={t('courseadminManagement.form.courseName')}
              rules={[{ required: true, message: t('courseadminManagement.validation.courseNameRequired') }]}
            >
              <Input className="form-input" placeholder={t('courseadminManagement.placeholder.courseName')} />
            </Form.Item>
            <Form.Item
              name="description"
              label={t('courseadminManagement.form.description')}
              rules={[{ required: true, message: t('courseadminManagement.validation.descriptionRequired') }]}
            >
              <TextArea 
                rows={4} 
                className="form-textarea" 
                placeholder={t('courseadminManagement.placeholder.description')}
              />
            </Form.Item>
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  name="lessons"
                  label={t('courseadminManagement.form.lessons')}
                >
                  <InputNumber 
                    min={1} 
                    className="form-input-number" 
                    placeholder="0"
                    style={{ width: '100%' }}
                  />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  name="hours"
                  label={t('courseadminManagement.form.hours')}
                >
                  <InputNumber 
                    min={1} 
                    className="form-input-number" 
                    placeholder="0"
                    style={{ width: '100%' }}
                  />
                </Form.Item>
              </Col>
            </Row>

            <Form.Item>
              <div className="form-actions">
                <Button onClick={() => setModalVisible(false)}>
                  {t('commonAdmin.cancel')}
                </Button>
                <Button type="primary" htmlType="submit" loading={loading}>
                  {editingCourse ? t('commonAdmin.update') : t('commonAdmin.add')}
                </Button>
              </div>
            </Form.Item>
          </Form>
        </Modal>
        <Modal
          title={courseForApproval ? t('courseadminManagement.modals.approveTitle', { title: courseForApproval.title }) : t('courseadminManagement.modals.approve')}
          open={approvalModalVisible}
          onCancel={() => {
            setApprovalModalVisible(false);
            setCourseForApproval(null);
          }}
          footer={null}
          width={500}
          className={`course-modal ${darkMode ? 'dark-modal' : ''}`}
          destroyOnClose
        >
          {courseForApproval && (
            <div className="approval-info">
              <div className="info-item">
                <strong>{t('courseadminManagement.modals.teacher')}:</strong> {courseForApproval.teacher_name}
              </div>
              <div className="info-item">
                <strong>{t('courseadminManagement.modals.teacherEmail')}:</strong> {courseForApproval.teacher_email}
              </div>
              <div className="info-item">
                <strong>{t('courseadminManagement.modals.description')}:</strong> 
                <div className="description-text">{courseForApproval.description}</div>
              </div>
              <div className="info-item">
                <strong>{t('courseadminManagement.modals.createdAt')}:</strong> {new Date(courseForApproval.created_at).toLocaleString('vi-VN')}
              </div>
              <div className="info-item">
                <strong>{t('courseadminManagement.modals.currentStatus')}:</strong> {renderStatusTag(courseForApproval.is_approved)}
              </div>
            </div>
          )}
          
          <Form
            form={approvalForm}
            layout="vertical"
            onFinish={handleApproveSubmit}
            className="approval-form"
          >
            <Form.Item
              name="action"
              label={t('courseadminManagement.modals.action')}
              rules={[{ required: true, message: t('courseadminManagement.validation.actionRequired') }]}
            >
              <Radio.Group 
                value={approvalAction} 
                onChange={(e) => setApprovalAction(e.target.value)}
                className="approval-radio-group"
              >
                <Radio value="approve" style={{ display: 'block', marginBottom: 8 }}>
                  <CheckCircleOutlined style={{ color: '#52c41a', marginRight: 8 }} />
                  <strong>{t('courseadminManagement.modals.approveOption')}</strong>
                  <div className="radio-description">{t('courseadminManagement.modals.approveDescription')}</div>
                </Radio>
                <Radio value="reject" style={{ display: 'block' }}>
                  <CloseCircleOutlined style={{ color: '#ff4d4f', marginRight: 8 }} />
                  <strong>{t('courseadminManagement.modals.rejectOption')}</strong>
                  <div className="radio-description">{t('courseadminManagement.modals.rejectDescription')}</div>
                </Radio>
              </Radio.Group>
            </Form.Item>
            <Form.Item
              name="reason"
              label={t('courseadminManagement.modals.reason')}
              rules={[{ required: true, message: t('courseadminManagement.validation.reasonRequired') }]}
            >
              <TextArea 
                rows={3} 
                className="form-textarea" 
                placeholder={t('courseadminManagement.placeholder.reason')}
              />
            </Form.Item>
            <Form.Item>
              <div className="form-actions">
                <Button onClick={() => {
                  setApprovalModalVisible(false);
                  setCourseForApproval(null);
                }}>
                  {t('commonAdmin.cancel')}
                </Button>
                <Button 
                  type="primary" 
                  htmlType="submit" 
                  loading={loading}
                  danger={approvalAction === 'reject'}
                >
                  {approvalAction === 'approve' ? t('courseadminManagement.buttons.approve') : t('courseadminManagement.buttons.reject')}
                </Button>
              </div>
            </Form.Item>
          </Form>
        </Modal>
        <Modal
          title={t('courseadminManagement.modals.studentsTitle', { title: selectedCourse?.title })}
          open={studentsModalVisible}
          onCancel={() => setStudentsModalVisible(false)}
          footer={[
            <Button key="close" onClick={() => setStudentsModalVisible(false)}>
              {t('commonAdmin.close')}
            </Button>
          ]}
          width={800}
          className={`course-modal ${darkMode ? 'dark-modal' : ''}`}
        >
          <div className="student-modal-info">
            <div className="info-item">
              <strong>{t('courseadminManagement.modals.teacher')}:</strong> {selectedCourse?.teacher_name}
            </div>
            <div className="info-item">
              <strong>{t('courseadminManagement.modals.totalStudents')}:</strong> {students.length}
            </div>
          </div>
          <Table 
            columns={studentColumns} 
            dataSource={students} 
            rowKey="student_id"
            pagination={{ pageSize: 5 }}
            locale={{ emptyText: t('courseadminManagement.empty.noStudents') }}
            className="student-table"
          />
        </Modal>
      </div>
    </ConfigProvider>
  );
};

export default CourseManagement;