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
import { useTheme } from '../../../context/themeContext';
import './CourseManagement.css';

const { TextArea } = Input;
const { TabPane } = Tabs;
const { Paragraph } = Typography;

const CourseManagement = () => {
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
        console.error('Error parsing token:', error);
      }
    };
    
    if (token) {
      getUserInfo();
    }
  }, [token]);

  const fetchAllCourses = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch('http://localhost:5001/courses', {
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
      console.error('Error fetching courses:', error);
      messageApi.error('Lỗi khi tải danh sách khóa học');
    } finally {
      setLoading(false);
    }
  }, [token, messageApi, userRole, userId]);

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
      const response = await fetch(`http://localhost:5001/course-students?courseId=${courseId}`);
      const data = await response.json();
      setStudents(data.students || []);
    } catch (error) {
      messageApi.error('Lỗi khi tải danh sách học viên');
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
      const response = await fetch(`http://localhost:5001/courses/${courseId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        messageApi.success('Xóa khóa học thành công');
        refreshData();
      } else {
        const errorData = await response.json();
        messageApi.error(errorData.message || 'Lỗi khi xóa khóa học');
      }
    } catch (error) {
      messageApi.error('Lỗi kết nối đến server');
    }
  };

  const handleViewStudents = async (course) => {
    setSelectedCourse(course);
    try {
      await fetchCourseStudents(course.id);
      setStudentsModalVisible(true);
    } catch (error) {
      messageApi.error('Lỗi khi tải danh sách học viên');
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
      const response = await fetch(`http://localhost:5001/courses/${courseForApproval.id}/approve`, {
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
            ? 'Đã duyệt khóa học thành công' 
            : 'Đã từ chối khóa học thành công'
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
        messageApi.error(errorData.message || 'Lỗi khi xử lý khóa học');
      }
    } catch (error) {
      messageApi.error('Lỗi kết nối đến server');
    }
  };

  const handleSubmit = async (values) => {
    try {
      const url = editingCourse 
        ? `http://localhost:5001/courses/${editingCourse.id}`
        : 'http://localhost:5001/courses';
      
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
        messageApi.success(editingCourse ? 'Cập nhật thành công' : 'Thêm khóa học thành công');
        setModalVisible(false);
        refreshData();
      } else {
        const errorData = await response.json();
        messageApi.error(errorData.message || 'Lỗi khi lưu khóa học');
      }
    } catch (error) {
      messageApi.error('Lỗi kết nối đến server');
    }
  };

  const renderStatusTag = (isApproved) => {
    if (isApproved === 1) {
      return <Tag color="success" icon={<CheckCircleOutlined />}>Đã duyệt</Tag>;
    } else if (isApproved === 0) {
      return <Tag color="warning" icon={<ClockCircleOutlined />}>Chờ duyệt</Tag>;
    } else if (isApproved === 2) {
      return <Tag color="error" icon={<CloseCircleOutlined />}>Từ chối</Tag>;
    } else {
      return <Tag color="default">Không xác định</Tag>;
    }
  };

  const baseColumns = [
    {
      title: 'Tên khóa học',
      dataIndex: 'title',
      key: 'title',
      width: 200,
      render: (text, record) => (
        <div className="course-title-cell">
          <span className="table-text course-title">{text}</span>
          <div className="course-status">
            {renderStatusTag(record.is_approved)}
          </div>
        </div>
      )
    },
    {
      title: 'Mô tả',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
      render: (text) => (
        <Paragraph 
          ellipsis={{ 
            rows: 2, 
            expandable: true, 
            symbol: 'Xem thêm' 
          }}
          className="table-text"
        >
          {text || 'Không có mô tả'}
        </Paragraph>
      )
    },
    {
      title: 'Giảng viên',
      dataIndex: 'teacher_name',
      key: 'teacher_name',
      render: (teacherName, record) => (
        <div className="teacher-info">
          <UserOutlined className="teacher-icon" />
          <div>
            <span className="teacher-course-name">{teacherName || 'Chưa xác định'}</span>
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
      title: 'Thời lượng',
      key: 'duration',
      width: 150,
      render: (_, record) => (
        <div className="duration-info">
          <Tag color="blue" className="duration-tag">
            {record.lessons || 0} buổi
          </Tag>
          <Tag color="green" className="duration-tag">
            {record.hours || 0} giờ
          </Tag>
        </div>
      )
    },
    {
      title: 'Ngày tạo',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 120,
      render: (date) => (
        <span className="table-text date-text">
          {date ? new Date(date).toLocaleDateString('vi-VN') : 'N/A'}
        </span>
      )
    }
  ];

  const actionColumns = {
    approved: (_, record) => (
      <Space className="action-buttons">
        <Tooltip title="Xem học viên">
          <Button 
            size="small"
            icon={<TeamOutlined />} 
            onClick={() => handleViewStudents(record)}
          />
        </Tooltip>
        {(userRole === 'admin' || (userRole === 'teacher' && record.teacher_id === parseInt(userId))) && (
          <>
            <Tooltip title="Chỉnh sửa">
              <Button 
                size="small"
                icon={<EditOutlined />} 
                onClick={() => handleEdit(record)}
              />
            </Tooltip>
            <Popconfirm
              title="Xóa khóa học"
              description="Bạn có chắc chắn muốn xóa khóa học này?"
              onConfirm={() => handleDelete(record.id)}
              okText="Xóa"
              cancelText="Hủy"
            >
              <Tooltip title="Xóa">
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
            <Tooltip title="Duyệt khóa học">
              <Button 
                type="primary"
                size="small"
                icon={<CheckOutlined />} 
                onClick={() => handleApproveCourse(record)}
              />
            </Tooltip>
            <Tooltip title="Từ chối">
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
            title="Xóa khóa học"
            description="Bạn có chắc chắn muốn xóa khóa học này?"
            onConfirm={() => handleDelete(record.id)}
            okText="Xóa"
            cancelText="Hủy"
          >
            <Tooltip title="Xóa">
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
            <Tooltip title="Duyệt lại">
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
            title="Xóa khóa học"
            description="Bạn có chắc chắn muốn xóa khóa học này?"
            onConfirm={() => handleDelete(record.id)}
            okText="Xóa"
            cancelText="Hủy"
          >
            <Tooltip title="Xóa">
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
      title: 'Thao tác',
      key: 'actions',
      width: tabKey === 'pending' ? 150 : 120,
      render: actionColumns[tabKey]
    });
    return columns;
  };

  const studentColumns = [
    {
      title: 'Họ tên',
      dataIndex: 'student_name',
      key: 'student_name',
      render: (text) => <span className="table-text">{text}</span>
    },
    {
      title: 'Email',
      dataIndex: 'email',
      key: 'email',
      render: (text) => <span className="table-text">{text}</span>
    },
    {
      title: 'Số điện thoại',
      dataIndex: 'phone',
      key: 'phone',
      render: (phone) => (
        <span className="table-text">
          {phone || 'Chưa cập nhật'}
        </span>
      )
    },
    {
      title: 'Giới tính',
      dataIndex: 'gender',
      key: 'gender',
      render: (gender) => {
        const genderMap = {
          'male': 'Nam',
          'female': 'Nữ'
        };
        return (
          <span className="table-text">
            {genderMap[gender] || 'Khác'}
          </span>
        );
      }
    },
    {
      title: 'Ngày đăng ký',
      dataIndex: 'enrolled_at',
      key: 'enrolled_at',
      render: (date) => (
        <span className="table-text">
          {new Date(date).toLocaleDateString('vi-VN')}
        </span>
      )
    }
  ];

  return (
    <ConfigProvider theme={themeConfig}>
      <div className={`course-management ${darkMode ? 'dark-mode' : 'light-mode'}`}>
        {contextHolder}
        <Card className="course-management-card">
          <div className="card-header">
            <div>
              <h2 className="course-management-header">Quản lý Khóa học</h2>
              <p className="course-management-subheader">
                {userRole === 'admin' 
                  ? 'Quản lý và duyệt các khóa học' 
                  : userRole === 'teacher'
                  ? 'Quản lý khóa học của bạn'
                  : 'Xem danh sách khóa học'}
              </p>
            </div>
          </div>

          <Row gutter={16} className="stats-row">
            <Col span={6}>
              <Card className="statistic-card">
                <Statistic 
                  title="Tổng số khóa học" 
                  value={courses.length + pendingCourses.length + rejectedCourses.length}
                  className="statistic-value"
                />
              </Card>
            </Col>
            <Col span={6}>
              <Card className="statistic-card">
                <Statistic 
                  title="Đã duyệt" 
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
                    title="Chờ duyệt" 
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
                  title="Từ chối" 
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
                  Đã duyệt
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
                locale={{ emptyText: 'Không có khóa học nào đã duyệt' }}
                loading={loading}
              />
            </TabPane>
            {userRole !== 'student' && (
              <TabPane 
                tab={
                  <span className="tab-title">
                    <ClockCircleOutlined className="tab-icon" style={{ color: '#faad14' }} />
                    Chờ duyệt
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
                  locale={{ emptyText: 'Không có khóa học nào chờ duyệt' }}
                  loading={loading}
                />
              </TabPane>
            )}

            <TabPane 
              tab={
                <span className="tab-title">
                  <CloseCircleOutlined className="tab-icon" style={{ color: '#ff4d4f' }} />
                  Từ chối
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
                locale={{ emptyText: 'Không có khóa học nào bị từ chối' }}
                loading={loading}
              />
            </TabPane>
          </Tabs>
        </Card>
        <Modal
          title={editingCourse ? 'Chỉnh sửa Khóa học' : 'Thêm Khóa học Mới'}
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
              label="Tên khóa học"
              rules={[{ required: true, message: 'Vui lòng nhập tên khóa học' }]}
            >
              <Input className="form-input" placeholder="Nhập tên khóa học" />
            </Form.Item>
            <Form.Item
              name="description"
              label="Mô tả"
              rules={[{ required: true, message: 'Vui lòng nhập mô tả' }]}
            >
              <TextArea 
                rows={4} 
                className="form-textarea" 
                placeholder="Nhập mô tả chi tiết về khóa học"
              />
            </Form.Item>
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  name="lessons"
                  label="Số buổi học"
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
                  label="Tổng số giờ"
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
                  Hủy
                </Button>
                <Button type="primary" htmlType="submit" loading={loading}>
                  {editingCourse ? 'Cập nhật' : 'Thêm'}
                </Button>
              </div>
            </Form.Item>
          </Form>
        </Modal>
        <Modal
          title={courseForApproval ? `Xét duyệt khóa học: ${courseForApproval.title}` : 'Xét duyệt khóa học'}
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
                <strong>Giảng viên:</strong> {courseForApproval.teacher_name}
              </div>
              <div className="info-item">
                <strong>Email giảng viên:</strong> {courseForApproval.teacher_email}
              </div>
              <div className="info-item">
                <strong>Mô tả:</strong> 
                <div className="description-text">{courseForApproval.description}</div>
              </div>
              <div className="info-item">
                <strong>Ngày tạo:</strong> {new Date(courseForApproval.created_at).toLocaleString('vi-VN')}
              </div>
              <div className="info-item">
                <strong>Trạng thái hiện tại:</strong> {renderStatusTag(courseForApproval.is_approved)}
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
              label="Hành động"
              rules={[{ required: true, message: 'Vui lòng chọn hành động' }]}
            >
              <Radio.Group 
                value={approvalAction} 
                onChange={(e) => setApprovalAction(e.target.value)}
                className="approval-radio-group"
              >
                <Radio value="approve" style={{ display: 'block', marginBottom: 8 }}>
                  <CheckCircleOutlined style={{ color: '#52c41a', marginRight: 8 }} />
                  <strong>Duyệt khóa học</strong>
                  <div className="radio-description">Khóa học sẽ được hiển thị cho học viên</div>
                </Radio>
                <Radio value="reject" style={{ display: 'block' }}>
                  <CloseCircleOutlined style={{ color: '#ff4d4f', marginRight: 8 }} />
                  <strong>Từ chối khóa học</strong>
                  <div className="radio-description">Khóa học sẽ không được hiển thị</div>
                </Radio>
              </Radio.Group>
            </Form.Item>
            <Form.Item
              name="reason"
              label="Lý do"
              rules={[{ required: true, message: 'Vui lòng nhập lý do' }]}
            >
              <TextArea 
                rows={3} 
                className="form-textarea" 
                placeholder="Nhập lý do duyệt/từ chối..."
              />
            </Form.Item>
            <Form.Item>
              <div className="form-actions">
                <Button onClick={() => {
                  setApprovalModalVisible(false);
                  setCourseForApproval(null);
                }}>
                  Hủy
                </Button>
                <Button 
                  type="primary" 
                  htmlType="submit" 
                  loading={loading}
                  danger={approvalAction === 'reject'}
                >
                  {approvalAction === 'approve' ? 'Duyệt' : 'Từ chối'}
                </Button>
              </div>
            </Form.Item>
          </Form>
        </Modal>
        <Modal
          title={`Danh sách Học viên - ${selectedCourse?.title}`}
          open={studentsModalVisible}
          onCancel={() => setStudentsModalVisible(false)}
          footer={[
            <Button key="close" onClick={() => setStudentsModalVisible(false)}>
              Đóng
            </Button>
          ]}
          width={800}
          className={`course-modal ${darkMode ? 'dark-modal' : ''}`}
        >
          <div className="student-modal-info">
            <div className="info-item">
              <strong>Giảng viên:</strong> {selectedCourse?.teacher_name}
            </div>
            <div className="info-item">
              <strong>Tổng số học viên:</strong> {students.length}
            </div>
          </div>
          <Table 
            columns={studentColumns} 
            dataSource={students} 
            rowKey="student_id"
            pagination={{ pageSize: 5 }}
            locale={{ emptyText: 'Chưa có học viên đăng ký khóa học này' }}
            className="student-table"
          />
        </Modal>
      </div>
    </ConfigProvider>
  );
};

export default CourseManagement;