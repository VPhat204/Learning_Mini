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
import { useTranslation } from 'react-i18next';
import './TeacherChatInterface.css';

const { Text } = Typography;
const { TextArea } = Input;
const { TabPane } = Tabs;

const TeacherChatInterface = () => {
  const { t } = useTranslation();
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
      console.error(t('teacherChat.errors.loadStudents'), error);
      message.error(t('teacherChat.errors.cannotLoadStudents'));
    }
  }, [token, user, t]);

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
      console.error(t('teacherChat.errors.loadAdmins'), error);
      message.error(t('teacherChat.errors.cannotLoadAdmins'));
    }
  }, [token, user, t]);

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
      console.error(t('teacherChat.errors.searchStudents'), error);
      message.error(t('teacherChat.errors.cannotSearchStudents'));
    }
  }, [searchTerm, token, t]);

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
        message.error(response.data.message || t('teacherChat.errors.cannotLoadMessages'));
      }
    } catch (error) {
      console.error(t('teacherChat.errors.loadMessages'), error);
      message.error(t('teacherChat.errors.cannotLoadMessages'));
    } finally {
      setLoading(false);
    }
  }, [token, fetchChatUsers, t]);

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
        message.error(response.data.message || t('teacherChat.errors.cannotSendMessage'));
      }
    } catch (error) {
      console.error(t('teacherChat.errors.sendMessage'), error);
      message.error(t('teacherChat.errors.cannotSendMessage'));
    }
  }, [selectedUser, newMessage, token, fetchChatUsers, t]);

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
    
    if (diffMins < 1) return t('teacherChat.time.justNow');
    if (diffMins < 60) return t('teacherChat.time.minutesAgo', { minutes: diffMins });
    if (diffHours < 24) return t('teacherChat.time.hoursAgo', { hours: diffHours });
    if (diffDays === 1) return t('teacherChat.time.yesterday');
    if (diffDays < 7) return t('teacherChat.time.daysAgo', { days: diffDays });
    
    return date.toLocaleDateString();
  }, [t]);

  const formatDate = useCallback((dateString) => {
    if (!dateString) return '';
    
    const date = new Date(dateString);
    const today = new Date();
    
    if (date.toDateString() === today.toDateString()) {
      return t('teacherChat.time.today');
    }
    
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    if (date.toDateString() === yesterday.toDateString()) {
      return t('teacherChat.time.yesterday');
    }
    
    return date.toLocaleDateString();
  }, [t]);

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
            {t('teacherChat.notAuthorized.title')}
          </Text>
          <Text type="secondary">
            {t('teacherChat.notAuthorized.description')}
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
                        {t('teacherChat.tabs.students')}
                        {totalUnread > 0 && activeTab === 'students' && (
                          <Badge count={totalUnread} style={{ marginLeft: 8 }} />
                        )}
                      </span>
                    } 
                    key="students" 
                  />
                  <TabPane tab={t('teacherChat.tabs.admin')} key="admins" />
                  <TabPane tab={t('teacherChat.tabs.search')} key="search" />
                </Tabs>
              </div>
            }
          >
            {activeTab === 'students' ? (
              <>
                <div className="teacher-chat-users-count">
                  <Text type="secondary">
                    {t('teacherChat.stats.chattedStudents', { count: chatUsers.length })}
                    {totalUnread > 0 && (
                      <Text type="danger" style={{ marginLeft: 8 }}>
                        • {t('teacherChat.stats.unreadMessages', { count: totalUnread })}
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
                              {truncateMessage(chatUser.last_message) || t('teacherChat.messages.noMessages')}
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
                        description={t('teacherChat.empty.noStudentConversations')}
                      />
                    )
                  }}
                />
              </>
            ) : activeTab === 'admins' ? (
              <>
                <div className="teacher-admins-count">
                  <Text type="secondary">
                    {t('teacherChat.stats.admins', { count: admins.length })}
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
                              text={t('teacherChat.roles.admin')}
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
                        description={t('teacherChat.empty.noAdminsOnline')}
                      />
                    )
                  }}
                />
              </>
            ) : (
              <>
                <div className="teacher-search-input">
                  <Input
                    placeholder={t('teacherChat.search.placeholder')}
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
                              text={t('teacherChat.roles.student')}
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
                        <Text type="secondary">{t('teacherChat.empty.noStudentsFound')}</Text>
                      </div>
                    ) : (
                      <div style={{ textAlign: 'center', padding: '20px' }}>
                        <SearchOutlined style={{ fontSize: 48, color: '#d9d9d9', marginBottom: 16 }} />
                        <Text type="secondary">{t('teacherChat.empty.enterKeyword')}</Text>
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
                        text={selectedUser.roles === 'admin' ? t('teacherChat.roles.admin') : t('teacherChat.roles.student')}
                        className="user-role-badge"
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="teacher-empty-chat-header">
                  <BookOutlined />
                  <Text strong>{t('teacherChat.select.startConversation')}</Text>
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
                        {t('teacherChat.messages.noMessages')}
                      </Text>
                      <Text type="secondary">
                        {t('teacherChat.messages.startConversation', { name: selectedUser.name })}
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
                                      <span className="read-status">✓ {t('teacherChat.messages.read')}</span>
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
                    placeholder={t('teacherChat.input.placeholder', { name: selectedUser.name })}
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
                    {t('teacherChat.buttons.send')}
                  </Button>
                </div>
              </>
            ) : (
              <div className="teacher-no-chat-selected">
                <TeamOutlined />
                <Text type="secondary">
                  {t('teacherChat.select.instructions')}
                </Text>
                <Text type="secondary">
                  {t('teacherChat.select.contactMessage')}
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