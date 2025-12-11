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
  Tabs,
  Empty
} from 'antd';
import { 
  SendOutlined, 
  MessageOutlined, 
  UserOutlined,
  SearchOutlined,
  BookOutlined,
  TeamOutlined
} from '@ant-design/icons';
import axios from 'axios';
import './TeacherChatInterface.css';

const { Text } = Typography;
const { TextArea } = Input;
const { TabPane } = Tabs;

const TeacherChatInterface = () => {
  const [chatUsers, setChatUsers] = useState([]);
  const [admins, setAdmins] = useState([]);
  const [searchUsers, setSearchUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('students');
  const [totalUnread, setTotalUnread] = useState(0);
  const messagesEndRef = useRef(null);
  
  const token = localStorage.getItem('token');
  const userStr = localStorage.getItem('user');
  const user = userStr ? JSON.parse(userStr) : null;

  const fetchChatUsers = useCallback(async () => {
    if (!token || !user) return;
    
    try {
      const response = await axios.get('https://learning-mini-be.onrender.com/chat/teacher/users', {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.data.success) {
        const users = response.data.data || [];
        setChatUsers(users);
        
        let total = 0;
        users.forEach(chatUser => {
          const count = parseInt(chatUser.unread_count) || 0;
          total += count;
        });
        setTotalUnread(total);
      }
    } catch (error) {
      console.error('Lỗi khi lấy danh sách học viên:', error);
      message.error('Không thể tải danh sách học viên');
    }
  }, [token, user]);

  const fetchAdmins = useCallback(async () => {
    if (!token || !user) return;
    
    try {
      const response = await axios.get('https://learning-mini-be.onrender.com/chat/admins', {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.data.success) {
        setAdmins(response.data.data || []);
      }
    } catch (error) {
      console.error('Lỗi khi lấy danh sách admin:', error);
      message.error('Không thể tải danh sách admin');
    }
  }, [token, user]);

  const searchStudents = useCallback(async () => {
    if (!searchTerm.trim() || searchTerm.length < 2) {
      setSearchUsers([]);
      return;
    }
    
    try {
      const response = await axios.get(`https://learning-mini-be.onrender.com/chat/search/students`, {
        headers: { Authorization: `Bearer ${token}` },
        params: { search: searchTerm }
      });
      
      if (response.data.success) {
        setSearchUsers(response.data.data || []);
      }
    } catch (error) {
      console.error('Lỗi khi tìm kiếm học viên:', error);
      message.error('Không thể tìm kiếm học viên');
    }
  }, [searchTerm, token]);

  const fetchMessages = useCallback(async (userId) => {
    if (!userId) return;
    
    setLoading(true);
    try {
      const response = await axios.get(`https://learning-mini-be.onrender.com/chat/${userId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.data.success) {
        setMessages(response.data.messages || []);
        setSelectedUser(response.data.user);
        fetchChatUsers();
      } else {
        message.error(response.data.message || 'Không thể tải tin nhắn');
      }
    } catch (error) {
      console.error('Lỗi khi lấy tin nhắn:', error);
      message.error('Không thể tải tin nhắn');
    } finally {
      setLoading(false);
    }
  }, [token, fetchChatUsers]);

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
        fetchChatUsers();
      } else {
        message.error(response.data.message || 'Không thể gửi tin nhắn');
      }
    } catch (error) {
      console.error('Lỗi khi gửi tin nhắn:', error);
      message.error('Không thể gửi tin nhắn');
    }
  }, [selectedUser, newMessage, token, fetchChatUsers]);

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

  const truncateMessage = useCallback((text, maxLength = 25) => {
    if (!text) return '';
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  }, []);

  useEffect(() => {
    if (token && user && user.roles === 'teacher') {
      fetchChatUsers();
      fetchAdmins();
    }
  }, [token, user, fetchChatUsers, fetchAdmins]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (selectedUser) {
        fetchMessages(selectedUser.id);
      } else {
        fetchChatUsers();
      }
    }, 10000);

    return () => clearInterval(interval);
  }, [selectedUser, fetchMessages, fetchChatUsers]);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      searchStudents();
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [searchTerm, searchStudents]);

  useEffect(() => {
    setSelectedUser(null);
    setMessages([]);
  }, [activeTab]);

  if (!user || user.roles !== 'teacher') {
    return (
      <Card className="teacher-chat-not-authorized">
        <div className="not-authorized-content">
          <TeamOutlined />
          <Text type="danger" strong>
            Bạn không có quyền truy cập tính năng chat
          </Text>
          <Text type="secondary">
            Chỉ giảng viên mới có thể sử dụng tính năng này
          </Text>
        </div>
      </Card>
    );
  }

  return (
    <div className="teacher-chat-container">
      <Row gutter={16} className="teacher-chat-layout">
        <Col xs={24} sm={24} md={8} lg={6}>
          <Card 
            className="teacher-chat-users-card"
            title={
              <div className="teacher-chat-header">
                <Tabs 
                  activeKey={activeTab} 
                  onChange={setActiveTab}
                  className="teacher-chat-tabs"
                  size="small"
                >
                  <TabPane 
                    tab={
                      <span>
                        Học viên
                        {totalUnread > 0 && activeTab === 'students' && (
                          <Badge count={totalUnread} style={{ marginLeft: 8 }} />
                        )}
                      </span>
                    } 
                    key="students" 
                  />
                  <TabPane tab="Admin" key="admins" />
                  <TabPane tab="Tìm kiếm" key="search" />
                </Tabs>
              </div>
            }
          >
            {activeTab === 'students' ? (
              <>
                <div className="teacher-chat-users-count">
                  <Text type="secondary">
                    {chatUsers.length} học viên đã chat
                    {totalUnread > 0 && (
                      <Text type="danger" style={{ marginLeft: 8 }}>
                        • {totalUnread} tin nhắn chưa đọc
                      </Text>
                    )}
                  </Text>
                </div>
                <List
                  className="teacher-chat-users-list"
                  dataSource={chatUsers}
                  loading={loading}
                  renderItem={(chatUser) => (
                    <List.Item
                      className={`teacher-chat-user-item ${selectedUser?.id === chatUser.id ? 'active' : ''}`}
                      onClick={() => fetchMessages(chatUser.id)}
                      style={{ cursor: 'pointer', padding: '12px' }}
                    >
                      <List.Item.Meta
                        avatar={
                          <Badge 
                            count={chatUser.unread_count || 0} 
                            offset={[-5, 0]}
                            style={{ 
                              backgroundColor: '#ff4d4f',
                              display: chatUser.unread_count > 0 ? 'inline-block' : 'none'
                            }}
                          >
                            <Avatar 
                              src={chatUser.avatar} 
                              icon={<UserOutlined />}
                              size="large"
                              style={{ backgroundColor: '#52c41a' }}
                            />
                          </Badge>
                        }
                        title={
                          <div className="teacher-chat-user-info">
                            <Text strong ellipsis style={{ flex: 1 }}>
                              {chatUser.name}
                            </Text>
                            {chatUser.last_message_time && (
                              <Text type="secondary" className="last-message-time">
                                {formatRecentTime(chatUser.last_message_time)}
                              </Text>
                            )}
                          </div>
                        }
                        description={
                          <div className="teacher-chat-user-last-message">
                            <Text type="secondary" ellipsis>
                              {truncateMessage(chatUser.last_message) || 'Chưa có tin nhắn'}
                            </Text>
                          </div>
                        }
                      />
                    </List.Item>
                  )}
                  locale={{ 
                    emptyText: (
                      <Empty
                        image={Empty.PRESENTED_IMAGE_SIMPLE}
                        description="Chưa có cuộc trò chuyện với học viên"
                      />
                    )
                  }}
                />
              </>
            ) : activeTab === 'admins' ? (
              <>
                <div className="teacher-admins-count">
                  <Text type="secondary">
                    {admins.length} quản trị viên
                  </Text>
                </div>
                <List
                  className="teacher-admins-list"
                  dataSource={admins}
                  loading={loading}
                  renderItem={(admin) => (
                    <List.Item
                      className={`teacher-admin-item ${selectedUser?.id === admin.id ? 'active' : ''}`}
                      onClick={() => fetchMessages(admin.id)}
                      style={{ cursor: 'pointer', padding: '12px' }}
                    >
                      <List.Item.Meta
                        avatar={
                          <Avatar 
                            src={admin.avatar} 
                            icon={<UserOutlined />}
                            size="large"
                            style={{ backgroundColor: '#1890ff' }}
                          />
                        }
                        title={
                          <div className="teacher-admin-info">
                            <Text strong ellipsis style={{ flex: 1 }}>
                              {admin.name}
                            </Text>
                            <Badge 
                              status="processing"
                              text="Admin"
                              className="admin-status"
                            />
                          </div>
                        }
                        description={
                          <div className="teacher-admin-contact">
                            <Text type="secondary" ellipsis>
                              {admin.email}
                            </Text>
                          </div>
                        }
                      />
                    </List.Item>
                  )}
                  locale={{ 
                    emptyText: (
                      <Empty
                        image={Empty.PRESENTED_IMAGE_SIMPLE}
                        description="Không có admin nào online"
                      />
                    )
                  }}
                />
              </>
            ) : (
              <>
                <div className="teacher-search-input">
                  <Input
                    placeholder="Tìm học viên theo tên hoặc email..."
                    prefix={<SearchOutlined />}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    size="large"
                    allowClear
                  />
                </div>
                <List
                  className="teacher-search-users-list"
                  dataSource={searchUsers}
                  loading={loading}
                  renderItem={(searchUser) => (
                    <List.Item
                      className="teacher-search-user-item"
                      onClick={() => {
                        setSelectedUser(searchUser);
                        fetchMessages(searchUser.id);
                        setActiveTab('students');
                      }}
                      style={{ cursor: 'pointer', padding: '12px' }}
                    >
                      <List.Item.Meta
                        avatar={
                          <Avatar 
                            src={searchUser.avatar} 
                            icon={<UserOutlined />}
                            size="large"
                            style={{ backgroundColor: '#52c41a' }}
                          />
                        }
                        title={<Text strong>{searchUser.name}</Text>}
                        description={
                          <div className="teacher-search-user-info">
                            <Text type="secondary" ellipsis style={{ flex: 1 }}>
                              {searchUser.email}
                            </Text>
                            <Badge 
                              status="success"
                              text="Học viên"
                              className="user-role-badge"
                            />
                          </div>
                        }
                      />
                    </List.Item>
                  )}
                  locale={{ 
                    emptyText: searchTerm ? (
                      <div style={{ textAlign: 'center', padding: '20px' }}>
                        <SearchOutlined style={{ fontSize: 48, color: '#d9d9d9', marginBottom: 16 }} />
                        <Text type="secondary">Không tìm thấy học viên</Text>
                      </div>
                    ) : (
                      <div style={{ textAlign: 'center', padding: '20px' }}>
                        <SearchOutlined style={{ fontSize: 48, color: '#d9d9d9', marginBottom: 16 }} />
                        <Text type="secondary">Nhập từ khóa để tìm kiếm học viên</Text>
                      </div>
                    )
                  }}
                />
              </>
            )}
          </Card>
        </Col>

        <Col xs={24} sm={24} md={16} lg={18}>
          <Card 
            className="teacher-chat-messages-card"
            title={
              selectedUser ? (
                <div className="teacher-chat-messages-header">
                  <Avatar 
                    src={selectedUser.avatar} 
                    icon={<UserOutlined />}
                    size="default"
                    style={{ 
                      backgroundColor: selectedUser.roles === 'admin' ? '#1890ff' : '#52c41a' 
                    }}
                  />
                  <div className="teacher-chat-header-info">
                    <Text strong>{selectedUser.name}</Text>
                    <div className="teacher-chat-user-details">
                      <Text type="secondary" ellipsis style={{ maxWidth: '200px' }}>
                        {selectedUser.email}
                      </Text>
                      <Badge 
                        status={selectedUser.roles === 'admin' ? 'processing' : 'success'}
                        text={selectedUser.roles === 'admin' ? 'Quản trị viên' : 'Học viên'}
                        className="user-role-badge"
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="teacher-empty-chat-header">
                  <BookOutlined />
                  <Text strong>Chọn học viên hoặc admin để bắt đầu trò chuyện</Text>
                </div>
              )
            }
          >
            {selectedUser ? (
              <>
                <div className="teacher-chat-messages-container">
                  {messages.length === 0 ? (
                    <div className="teacher-chat-empty-state">
                      <MessageOutlined />
                      <Text type="secondary">
                        Chưa có tin nhắn nào
                      </Text>
                      <Text type="secondary">
                        Hãy bắt đầu cuộc trò chuyện với {selectedUser.name}!
                      </Text>
                    </div>
                  ) : (
                    <div className="teacher-messages-list">
                      {messages.map((msg, index) => {
                        const showDate = index === 0 || 
                          new Date(msg.created_at).toDateString() !== 
                          new Date(messages[index - 1].created_at).toDateString();
                        
                        return (
                          <React.Fragment key={msg.id}>
                            {showDate && (
                              <div className="teacher-message-date-divider">
                                <Text type="secondary">
                                  {formatDate(msg.created_at)}
                                </Text>
                              </div>
                            )}
                            <div 
                              className={`teacher-message-item ${msg.sender_id === user.id ? 'sent' : 'received'}`}
                            >
                              <div className="teacher-message-content">
                                {msg.sender_id !== user.id && (
                                  <Avatar 
                                    src={msg.sender_avatar} 
                                    icon={<UserOutlined />}
                                    size="small"
                                    className="teacher-message-avatar"
                                    style={{ 
                                      backgroundColor: selectedUser.roles === 'admin' ? '#1890ff' : '#52c41a' 
                                    }}
                                  />
                                )}
                                <div className="teacher-message-bubble">
                                  <div className="teacher-message-text">{msg.message}</div>
                                  <div className="teacher-message-time">
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

                <div className="teacher-chat-input-container">
                  <TextArea
                    placeholder={`Nhắn tin cho ${selectedUser.name}...`}
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyPress={handleKeyPress}
                    autoSize={{ minRows: 1, maxRows: 4 }}
                    className="teacher-chat-input"
                  />
                  <Button
                    type="primary"
                    icon={<SendOutlined />}
                    onClick={sendMessage}
                    disabled={!newMessage.trim()}
                    className="teacher-chat-send-button"
                    size="large"
                  >
                    Gửi
                  </Button>
                </div>
              </>
            ) : (
              <div className="teacher-no-chat-selected">
                <TeamOutlined />
                <Text type="secondary">
                  Chọn học viên hoặc quản trị viên để bắt đầu trò chuyện
                </Text>
                <Text type="secondary">
                  Giữ liên lạc với học viên và admin qua chat!
                </Text>
              </div>
            )}
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default TeacherChatInterface;