import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Card, 
  Row, 
  Col, 
  Input, 
  Button, 
  Avatar, 
  List, 
  Badge, 
  Typography, 
  message,
  Empty,
  Tabs
} from 'antd';
import { 
  SendOutlined, 
  MessageOutlined, 
  UserOutlined,
  CustomerServiceOutlined,
  TeamOutlined,
  SolutionOutlined
} from '@ant-design/icons';
import axios from 'axios';
import './StudentChatInterface.css';

const { Text } = Typography;
const { TextArea } = Input;
const { TabPane } = Tabs;

const StudentChatInterface = () => {
  const [admins, setAdmins] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [unreadCounts, setUnreadCounts] = useState({});
  const [activeTab, setActiveTab] = useState('admins');
  const messagesEndRef = useRef(null);
  
  const token = localStorage.getItem('token');
  const userStr = localStorage.getItem('user');
  const user = userStr ? JSON.parse(userStr) : null;

  const fetchAdmins = useCallback(async () => {
    if (!token || !user) return;
    
    try {
      const response = await axios.get('https://learning-mini-be.onrender.com/chat/admins', {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.data.success) {
        const adminList = response.data.data;
        setAdmins(adminList);
        
        const counts = { ...unreadCounts };
        for (const admin of adminList) {
          try {
            const unreadResponse = await axios.get(`https://learning-mini-be.onrender.com/chat/unread/count/${admin.id}`, {
              headers: { Authorization: `Bearer ${token}` }
            });
            
            if (unreadResponse.data.success) {
              counts[admin.id] = unreadResponse.data.unread_count || 0;
            }
          } catch (error) {
            console.error(`Lỗi khi lấy unread count cho admin ${admin.id}:`, error);
            counts[admin.id] = 0;
          }
        }
        setUnreadCounts(counts);
      }
    } catch (error) {
      console.error('Lỗi khi lấy danh sách admin:', error);
      message.error('Không thể tải danh sách admin');
    }
  }, [token, user, unreadCounts]);

  const fetchTeachers = useCallback(async () => {
    if (!token || !user) return;
    
    try {
      const response = await axios.get('https://learning-mini-be.onrender.com/chat/student/teachers', {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.data.success) {
        const teacherList = response.data.data;
        setTeachers(teacherList);
        
        const counts = { ...unreadCounts };
        for (const teacher of teacherList) {
          try {
            const unreadResponse = await axios.get(`https://learning-mini-be.onrender.com/chat/unread/teacher/${teacher.id}`, {
              headers: { Authorization: `Bearer ${token}` }
            });
            
            if (unreadResponse.data.success) {
              counts[teacher.id] = unreadResponse.data.unread_count || 0;
            }
          } catch (error) {
            console.error(`Lỗi khi lấy unread count cho giảng viên ${teacher.id}:`, error);
            counts[teacher.id] = 0;
          }
        }
        setUnreadCounts(counts);
      }
    } catch (error) {
      console.error('Lỗi khi lấy danh sách giảng viên:', error);
      message.error('Không thể tải danh sách giảng viên');
    }
  }, [token, user, unreadCounts]);

  const getTotalUnread = useCallback((type) => {
    const users = type === 'admins' ? admins : teachers;
    return users.reduce((total, user) => total + (unreadCounts[user.id] || 0), 0);
  }, [admins, teachers, unreadCounts]);

  const fetchMessages = useCallback(async (userId) => {
    if (!userId) return;
    
    setLoading(true);
    try {
      const response = await axios.get(`https://learning-mini-be.onrender.com/chat/${userId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.data.success) {
        setMessages(response.data.messages);
        setSelectedUser(response.data.user);
        
        fetchAdmins();
        fetchTeachers();
      }
    } catch (error) {
      console.error('Lỗi khi lấy tin nhắn:', error);
      message.error('Không thể tải tin nhắn');
    } finally {
      setLoading(false);
    }
  }, [token, fetchAdmins, fetchTeachers]);

  const sendMessage = useCallback(async () => {
    if (!newMessage.trim() || !selectedUser) return;
    
    try {
      const response = await axios.post('https://learning-mini-be.onrender.com/chat/send', {
        receiver_id: selectedUser.id,
        message: newMessage
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.data.success) {
        setMessages(prev => [...prev, response.data.chat]);
        setNewMessage('');
        scrollToBottom();
        fetchAdmins();
        fetchTeachers();
      } else {
        message.error(response.data.message || 'Không thể gửi tin nhắn');
      }
    } catch (error) {
      console.error('Lỗi khi gửi tin nhắn:', error);
      message.error('Không thể gửi tin nhắn');
    }
  }, [selectedUser, newMessage, token, fetchAdmins, fetchTeachers]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleKeyPress = useCallback((e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }, [sendMessage]);

  const formatTime = useCallback((dateString) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  }, []);

  const formatRecentTime = useCallback((dateString) => {
    if (!dateString) return '';
    
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMins < 1) return 'Vừa xong';
    if (diffMins < 60) return `${diffMins} phút`;
    if (diffHours < 24) return `${diffHours} giờ`;
    if (diffDays === 1) return 'Hôm qua';
    if (diffDays < 7) return `${diffDays} ngày`;
    
    return date.toLocaleDateString();
  }, []);

  const formatDate = useCallback((dateString) => {
    if (!dateString) return '';
    
    const date = new Date(dateString);
    const today = new Date();
    
    if (date.toDateString() === today.toDateString()) {
      return 'Hôm nay';
    }
    
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    if (date.toDateString() === yesterday.toDateString()) {
      return 'Hôm qua';
    }
    
    return date.toLocaleDateString();
  }, []);

  useEffect(() => {
    if (token && user && user.roles === 'student') {
      fetchAdmins();
      fetchTeachers();
    }
  }, [token, user, fetchAdmins, fetchTeachers]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (selectedUser) {
        fetchMessages(selectedUser.id);
      } else {
        fetchAdmins();
        fetchTeachers();
      }
    }, 10000);

    return () => clearInterval(interval);
  }, [selectedUser, fetchMessages, fetchAdmins, fetchTeachers]);

  useEffect(() => {
    setSelectedUser(null);
    setMessages([]);
  }, [activeTab]);

  if (!user || user.roles !== 'student') {
    return (
      <Card className="student-chat-not-authorized">
        <div className="not-authorized-content">
          <CustomerServiceOutlined />
          <Text type="danger" strong>
            Bạn không có quyền truy cập tính năng chat
          </Text>
          <Text type="secondary">
            Chỉ học viên mới có thể sử dụng tính năng này
          </Text>
        </div>
      </Card>
    );
  }

  const currentUsers = activeTab === 'admins' ? admins : teachers;

  return (
    <div className="student-chat-container">
      <Row gutter={16} className="student-chat-layout">
        <Col xs={24} sm={24} md={8} lg={6}>
          <Card 
            className="student-chat-admins-card"
            title={
              <div className="student-chat-header">
                <Tabs 
                  activeKey={activeTab} 
                  onChange={setActiveTab}
                  className="student-chat-tabs"
                  size="small"
                >
                  <TabPane 
                    tab={
                      <span>
                        <TeamOutlined /> Hỗ trợ
                        {getTotalUnread('admins') > 0 && (
                          <Badge count={getTotalUnread('admins')} style={{ marginLeft: 8 }} />
                        )}
                      </span>
                    } 
                    key="admins" 
                  />
                  <TabPane 
                    tab={
                      <span>
                        <SolutionOutlined /> Giảng viên
                        {getTotalUnread('teachers') > 0 && (
                          <Badge count={getTotalUnread('teachers')} style={{ marginLeft: 8 }} />
                        )}
                      </span>
                    } 
                    key="teachers" 
                  />
                </Tabs>
              </div>
            }
          >
            <div className="student-chat-info">
              <Text type="secondary">
                {activeTab === 'admins' 
                  ? 'Chọn quản trị viên để liên hệ hỗ trợ' 
                  : 'Chọn giảng viên để liên hệ học tập'}
              </Text>
            </div>
            
            <List
              className="student-users-list"
              dataSource={currentUsers}
              loading={loading}
              renderItem={(person) => (
                <List.Item
                  className={`student-user-item ${selectedUser?.id === person.id ? 'active' : ''}`}
                  onClick={() => fetchMessages(person.id)}
                  style={{ padding: '12px', cursor: 'pointer' }}
                >
                  <List.Item.Meta
                    avatar={
                      <Badge count={unreadCounts[person.id] || 0} offset={[-5, 0]}>
                        <Avatar 
                          src={person.avatar} 
                          icon={<UserOutlined />}
                          size="large"
                          style={{ 
                            backgroundColor: activeTab === 'admins' ? '#1890ff' : '#52c41a'
                          }}
                        />
                      </Badge>
                    }
                    title={
                      <div className="student-user-info">
                        <Text strong ellipsis style={{ flex: 1 }}>
                          {person.name}
                        </Text>
                        <Text type="secondary" className="user-last-time">
                          {person.last_message_time && formatRecentTime(person.last_message_time)}
                        </Text>
                      </div>
                    }
                    description={
                      <div className="student-user-details">
                        <Text type="secondary" ellipsis style={{ flex: 1 }}>
                          {person.email}
                        </Text>
                        <Badge 
                          status={activeTab === 'admins' ? 'processing' : 'success'}
                          text={activeTab === 'admins' ? 'Quản trị viên' : 'Giảng viên'}
                          className="user-role-badge"
                        />
                      </div>
                    }
                  />
                </List.Item>
              )}
              locale={{ 
                emptyText: (
                  <Empty
                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                    description={
                      activeTab === 'admins' 
                        ? 'Không có quản trị viên nào online' 
                        : 'Bạn chưa đăng ký khóa học nào'
                    }
                  />
                )
              }}
            />
          </Card>
        </Col>

        <Col xs={24} sm={24} md={16} lg={18}>
          <Card 
            className="student-chat-messages-card"
            title={
              selectedUser ? (
                <div className="student-chat-messages-header">
                  <Avatar 
                    src={selectedUser.avatar} 
                    icon={<UserOutlined />}
                    size="default"
                    style={{ 
                      backgroundColor: selectedUser.roles === 'admin' ? '#1890ff' : '#52c41a'
                    }}
                  />
                  <div className="student-chat-header-info">
                    <Text strong>{selectedUser.name}</Text>
                    <div className="student-chat-user-details">
                      <Text type="secondary" ellipsis style={{ maxWidth: '200px' }}>
                        {selectedUser.email}
                      </Text>
                      <Badge 
                        status={selectedUser.roles === 'admin' ? 'processing' : 'success'}
                        text={selectedUser.roles === 'admin' ? 'Quản trị viên' : 'Giảng viên'}
                        className="user-role-badge"
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="student-empty-chat-header">
                  <MessageOutlined />
                  <Text strong>
                    {activeTab === 'admins' 
                      ? 'Chọn quản trị viên để liên hệ hỗ trợ' 
                      : 'Chọn giảng viên để liên hệ học tập'}
                  </Text>
                </div>
              )
            }
          >
            {selectedUser ? (
              <>
                <div className="student-chat-messages-container">
                  {messages.length === 0 ? (
                    <div className="student-chat-empty-state">
                      <MessageOutlined />
                      <Text type="secondary">
                        Chưa có tin nhắn nào
                      </Text>
                      <Text type="secondary">
                        Hãy bắt đầu cuộc trò chuyện với {selectedUser.name}!
                      </Text>
                    </div>
                  ) : (
                    <div className="student-messages-list">
                      {messages.map((msg, index) => {
                        const showDate = index === 0 || 
                          new Date(msg.created_at).toDateString() !== 
                          new Date(messages[index - 1].created_at).toDateString();
                        
                        return (
                          <React.Fragment key={msg.id}>
                            {showDate && (
                              <div className="student-message-date-divider">
                                <Text type="secondary">
                                  {formatDate(msg.created_at)}
                                </Text>
                              </div>
                            )}
                            <div 
                              className={`student-message-item ${msg.sender_id === user.id ? 'sent' : 'received'}`}
                            >
                              <div className="student-message-content">
                                {msg.sender_id !== user.id && (
                                  <Avatar 
                                    src={msg.sender_avatar} 
                                    icon={<UserOutlined />}
                                    size="small"
                                    className="student-message-avatar"
                                    style={{ 
                                      backgroundColor: selectedUser.roles === 'admin' ? '#1890ff' : '#52c41a'
                                    }}
                                  />
                                )}
                                <div className="student-message-bubble">
                                  <div className="student-message-text">{msg.message}</div>
                                  <div className="student-message-time">
                                    {formatTime(msg.created_at)}
                                    {msg.sender_id === user.id && msg.is_read === 1 && (
                                      <span className="read-status">✓ Đã đọc</span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          </React.Fragment>
                        );
                      })}
                      <div ref={messagesEndRef} />
                    </div>
                  )}
                </div>

                <div className="student-chat-input-container">
                  <TextArea
                    placeholder={`Nhắn tin cho ${selectedUser.name}...`}
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyPress={handleKeyPress}
                    autoSize={{ minRows: 1, maxRows: 4 }}
                    className="student-chat-input"
                  />
                  <Button
                    type="primary"
                    icon={<SendOutlined />}
                    onClick={sendMessage}
                    disabled={!newMessage.trim()}
                    className="student-chat-send-button"
                    size="large"
                  >
                    Gửi
                  </Button>
                </div>
              </>
            ) : (
              <div className="student-no-chat-selected">
                {activeTab === 'admins' ? (
                  <CustomerServiceOutlined />
                ) : (
                  <SolutionOutlined />
                )}
                <Text type="secondary">
                  {activeTab === 'admins' 
                    ? 'Chọn một quản trị viên từ danh sách để liên hệ hỗ trợ' 
                    : 'Chọn một giảng viên từ danh sách để liên hệ học tập'}
                </Text>
                <Text type="secondary">
                  {activeTab === 'admins' 
                    ? 'Chúng tôi luôn sẵn sàng hỗ trợ bạn!' 
                    : 'Giảng viên sẽ hỗ trợ bạn trong quá trình học tập'}
                </Text>
              </div>
            )}
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default StudentChatInterface;