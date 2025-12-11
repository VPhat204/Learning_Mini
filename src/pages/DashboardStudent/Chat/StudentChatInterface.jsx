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
import { useTranslation } from 'react-i18next';
import './StudentChatInterface.css';

const { Text } = Typography;
const { TextArea } = Input;
const { TabPane } = Tabs;

const StudentChatInterface = () => {
  const { t } = useTranslation();
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
            console.error(`${t('studentChat.errors.unreadCountAdmin')} ${admin.id}:`, error);
            counts[admin.id] = 0;
          }
        }
        setUnreadCounts(counts);
      }
    } catch (error) {
      console.error(t('studentChat.errors.loadAdmins'), error);
      message.error(t('studentChat.errors.cannotLoadAdmins'));
    }
  }, [token, user, unreadCounts, t]);

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
            console.error(`${t('studentChat.errors.unreadCountTeacher')} ${teacher.id}:`, error);
            counts[teacher.id] = 0;
          }
        }
        setUnreadCounts(counts);
      }
    } catch (error) {
      console.error(t('studentChat.errors.loadTeachers'), error);
      message.error(t('studentChat.errors.cannotLoadTeachers'));
    }
  }, [token, user, unreadCounts, t]);

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
      console.error(t('studentChat.errors.loadMessages'), error);
      message.error(t('studentChat.errors.cannotLoadMessages'));
    } finally {
      setLoading(false);
    }
  }, [token, fetchAdmins, fetchTeachers, t]);

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
        message.error(response.data.message || t('studentChat.errors.cannotSendMessage'));
      }
    } catch (error) {
      console.error(t('studentChat.errors.sendMessage'), error);
      message.error(t('studentChat.errors.cannotSendMessage'));
    }
  }, [selectedUser, newMessage, token, fetchAdmins, fetchTeachers, t]);

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
    
    if (diffMins < 1) return t('studentChat.time.justNow');
    if (diffMins < 60) return t('studentChat.time.minutesAgo', { minutes: diffMins });
    if (diffHours < 24) return t('studentChat.time.hoursAgo', { hours: diffHours });
    if (diffDays === 1) return t('studentChat.time.yesterday');
    if (diffDays < 7) return t('studentChat.time.daysAgo', { days: diffDays });
    
    return date.toLocaleDateString();
  }, [t]);

  const formatDate = useCallback((dateString) => {
    if (!dateString) return '';
    
    const date = new Date(dateString);
    const today = new Date();
    
    if (date.toDateString() === today.toDateString()) {
      return t('studentChat.time.today');
    }
    
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    if (date.toDateString() === yesterday.toDateString()) {
      return t('studentChat.time.yesterday');
    }
    
    return date.toLocaleDateString();
  }, [t]);

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
            {t('studentChat.notAuthorized.title')}
          </Text>
          <Text type="secondary">
            {t('studentChat.notAuthorized.description')}
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
                        <TeamOutlined /> {t('studentChat.tabs.support')}
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
                        <SolutionOutlined /> {t('studentChat.tabs.teachers')}
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
                  ? t('studentChat.select.support') 
                  : t('studentChat.select.teachers')}
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
                          text={activeTab === 'admins' 
                            ? t('studentChat.roles.admin') 
                            : t('studentChat.roles.teacher')}
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
                        ? t('studentChat.empty.noAdmins') 
                        : t('studentChat.empty.noTeachers')
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
                        text={selectedUser.roles === 'admin' 
                          ? t('studentChat.roles.admin') 
                          : t('studentChat.roles.teacher')}
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
                      ? t('studentChat.select.support') 
                      : t('studentChat.select.teachers')}
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
                        {t('studentChat.messages.noMessages')}
                      </Text>
                      <Text type="secondary">
                        {t('studentChat.messages.startConversation', { name: selectedUser.name })}
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
                                      <span className="read-status">{t('studentChat.messages.read')}</span>
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
                    placeholder={t('studentChat.input.placeholder', { name: selectedUser.name })}
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
                    {t('studentChat.buttons.send')}
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
                    ? t('studentChat.select.instructions.admin') 
                    : t('studentChat.select.instructions.teacher')}
                </Text>
                <Text type="secondary">
                  {activeTab === 'admins' 
                    ? t('studentChat.select.supportMessage') 
                    : t('studentChat.select.teacherSupportMessage')}
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