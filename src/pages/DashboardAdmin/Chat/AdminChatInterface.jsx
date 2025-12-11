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
  Tabs
} from 'antd';
import { 
  SendOutlined, 
  MessageOutlined, 
  UserOutlined, 
  SearchOutlined,
  WechatOutlined
} from '@ant-design/icons';
import axios from 'axios';
import './AdminChatInterface.css';

const { Text } = Typography;
const { TextArea } = Input;
const { TabPane } = Tabs;

const AdminChatInterface = () => {
  const [chatUsers, setChatUsers] = useState([]);
  const [searchUsers, setSearchUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('chats');
  const [totalUnread, setTotalUnread] = useState(0);
  const messagesEndRef = useRef(null);
  
  const token = localStorage.getItem('token');
  const userStr = localStorage.getItem('user');
  const user = userStr ? JSON.parse(userStr) : null;

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchChatUsers = useCallback(async () => {
    if (!token || !user) return;
    
    try {
      const response = await axios.get('https://learning-mini-be.onrender.com/chat/users', {
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
      console.error('Lỗi khi lấy danh sách người chat:', error);
      if (error.response?.data?.message) {
        message.error(error.response.data.message);
      } else {
        message.error('Không thể tải danh sách chat');
      }
    }
  }, [token, user]);

  const searchUsersForChat = useCallback(async () => {
    if (!searchTerm.trim() || searchTerm.length < 2) {
      setSearchUsers([]);
      return;
    }
    
    try {
      const response = await axios.get(`https://learning-mini-be.onrender.com/chat/search/users`, {
        headers: { Authorization: `Bearer ${token}` },
        params: { search: searchTerm }
      });
      
      if (response.data.success) {
        setSearchUsers(response.data.data || []);
      }
    } catch (error) {
      console.error('Lỗi khi tìm kiếm người dùng:', error);
      message.error('Không thể tìm kiếm người dùng');
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
      if (error.response?.data?.message) {
        message.error(error.response.data.message);
      } else {
        message.error('Không thể tải tin nhắn');
      }
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
      if (error.response?.data?.message) {
        message.error(error.response.data.message);
      } else {
        message.error('Không thể gửi tin nhắn');
      }
    }
  }, [selectedUser, newMessage, token, fetchChatUsers]);

  const handleKeyPress = useCallback((e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }, [sendMessage]);

  const formatTime = useCallback((dateString) => {
    if (!dateString) return '';
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
    
    return date.toLocaleDateString('vi-VN');
  }, []);

  const truncateMessage = useCallback((text, maxLength = 30) => {
    if (!text) return '';
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  }, []);

  const getAvatarColor = useCallback((role) => {
    switch(role) {
      case 'student': return '#1890ff';
      case 'teacher': return '#52c41a';
      default: return '#722ed1';
    }
  }, []);

  const getRoleText = useCallback((role) => {
    switch(role) {
      case 'student': return 'Học viên';
      case 'teacher': return 'Giảng viên';
      default: return 'Người dùng';
    }
  }, []);

  const getBadgeStatus = useCallback((role) => {
    switch(role) {
      case 'student': return 'processing';
      case 'teacher': return 'success';
      default: return 'default';
    }
  }, []);

  useEffect(() => {
    if (token && user && user.roles === 'admin') {
      fetchChatUsers();
    }
  }, [token, user, fetchChatUsers]);

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
      searchUsersForChat();
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [searchTerm, searchUsersForChat]);

  useEffect(() => {
    if (activeTab === 'search') {
      setSelectedUser(null);
      setMessages([]);
    }
  }, [activeTab]);

  if (!user || user.roles !== 'admin') {
    return (
      <Card className="chat-not-authorized">
        <div className="not-authorized-content">
          <WechatOutlined />
          <Text type="danger" strong>
            Bạn không có quyền truy cập tính năng chat
          </Text>
          <Text type="secondary">
            Chỉ quản trị viên mới có thể sử dụng tính năng này
          </Text>
        </div>
      </Card>
    );
  }

  return (
    <div className="admin-chat-container">
      <Row gutter={16} className="chat-layout">
        <Col xs={24} sm={24} md={8} lg={6}>
          <Card 
            className="chat-users-card"
            title={
              <div className="chat-users-header">
                <Tabs 
                  activeKey={activeTab} 
                  onChange={setActiveTab}
                  className="chat-tabs"
                >
                  <TabPane 
                    tab={
                      <span>
                        Tin nhắn
                        {totalUnread > 0 && (
                          <Badge count={totalUnread} />
                        )}
                      </span>
                    } 
                    key="chats" 
                  />
                  <TabPane tab="Tìm kiếm" key="search" />
                </Tabs>
              </div>
            }
          >
            {activeTab === 'chats' ? (
              <>
                <div className="chat-users-count">
                  <Text type="secondary">
                    {chatUsers.length} cuộc trò chuyện
                    {totalUnread > 0 && (
                      <Text type="danger">
                        • {totalUnread} tin nhắn chưa đọc
                      </Text>
                    )}
                  </Text>
                </div>
                <List
                  className="chat-users-list"
                  dataSource={chatUsers}
                  loading={loading}
                  renderItem={(chatUser) => (
                    <List.Item
                      className={`chat-user-item ${selectedUser?.id === chatUser.id ? 'active' : ''}`}
                      onClick={() => fetchMessages(chatUser.id)}
                      style={{padding: '12px'}}
                    >
                      <List.Item.Meta
                        avatar={
                          <Badge 
                            count={chatUser.unread_count || 0} 
                            offset={[-5, 0]}
                          >
                            <Avatar 
                              src={chatUser.avatar} 
                              icon={<UserOutlined />}
                              size="large"
                              style={{ backgroundColor: getAvatarColor(chatUser.roles) }}
                            />
                          </Badge>
                        }
                        title={
                          <div className="chat-user-info">
                            <Text strong ellipsis>
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
                          <div className="chat-user-last-message">
                            <Text type="secondary" ellipsis>
                              {chatUser.last_message ? truncateMessage(chatUser.last_message, 25) : 'Chưa có tin nhắn'}
                            </Text>
                          </div>
                        }
                      />
                    </List.Item>
                  )}
                  locale={{ 
                    emptyText: (
                      <div>
                        <MessageOutlined />
                        <Text type="secondary">Chưa có cuộc trò chuyện nào</Text>
                      </div>
                    )
                  }}
                />
              </>
            ) : (
              <>
                <div className="chat-search-input">
                  <Input
                    placeholder="Tìm kiếm theo tên hoặc email..."
                    prefix={<SearchOutlined />}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    size="large"
                    allowClear
                  />
                </div>
                <List
                  className="search-users-list"
                  dataSource={searchUsers}
                  loading={loading}
                  renderItem={(searchUser) => (
                    <List.Item
                      className="search-user-item"
                      onClick={() => {
                        setSelectedUser(searchUser);
                        fetchMessages(searchUser.id);
                        setActiveTab('chats');
                      }}
                    >
                      <List.Item.Meta
                        avatar={
                          <Avatar 
                            src={searchUser.avatar} 
                            icon={<UserOutlined />}
                            size="large"
                            style={{ backgroundColor: getAvatarColor(searchUser.roles) }}
                          />
                        }
                        title={<Text strong>{searchUser.name}</Text>}
                        description={
                          <div className="search-user-info">
                            <Text type="secondary" ellipsis>
                              {searchUser.email}
                            </Text>
                            <Text type="secondary" className="user-role">
                              {getRoleText(searchUser.roles)}
                            </Text>
                          </div>
                        }
                      />
                    </List.Item>
                  )}
                  locale={{ 
                    emptyText: searchTerm ? (
                      <div>
                        <SearchOutlined />
                        <Text type="secondary">Không tìm thấy người dùng</Text>
                      </div>
                    ) : (
                      <div>
                        <SearchOutlined />
                        <Text type="secondary">Nhập từ khóa để tìm kiếm</Text>
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
            className="chat-messages-card"
            title={
              selectedUser ? (
                <div className="chat-header">
                  <Avatar 
                    src={selectedUser.avatar} 
                    icon={<UserOutlined />}
                    size="default"
                    style={{ backgroundColor: getAvatarColor(selectedUser.roles) }}
                  />
                  <div className="chat-header-info">
                    <Text strong>{selectedUser.name}</Text>
                    <div className="chat-user-details">
                      <Text type="secondary" ellipsis>
                        {selectedUser.email}
                      </Text>
                      <Badge 
                        status={getBadgeStatus(selectedUser.roles)}
                        text={getRoleText(selectedUser.roles)}
                        className="user-role-badge"
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="empty-chat-header">
                  <MessageOutlined />
                  <Text strong>Chọn một cuộc trò chuyện để bắt đầu</Text>
                </div>
              )
            }
          >
            {selectedUser ? (
              <>
                <div className="chat-messages-container">
                  {messages.length === 0 ? (
                    <div className="chat-empty-state">
                      <MessageOutlined />
                      <Text type="secondary">
                        Chưa có tin nhắn nào
                      </Text>
                      <Text type="secondary">
                        Hãy bắt đầu cuộc trò chuyện với {selectedUser.name}!
                      </Text>
                    </div>
                  ) : (
                    <div className="messages-list">
                      {messages.map((msg, index) => {
                        const showDate = index === 0 || 
                          new Date(msg.created_at).toDateString() !== 
                          new Date(messages[index - 1].created_at).toDateString();
                        
                        return (
                          <React.Fragment key={msg.id}>
                            {showDate && (
                              <div className="message-date-divider">
                                <Text type="secondary">
                                  {formatDate(msg.created_at)}
                                </Text>
                              </div>
                            )}
                            <div 
                              className={`message-item ${msg.sender_id === user.id ? 'sent' : 'received'}`}
                            >
                              <div className="message-content">
                                {msg.sender_id !== user.id && (
                                  <Avatar 
                                    src={msg.sender_avatar} 
                                    icon={<UserOutlined />}
                                    size="small"
                                    className="message-avatar"
                                    style={{ backgroundColor: getAvatarColor(selectedUser.roles) }}
                                  />
                                )}
                                <div className="message-bubble">
                                  <div className="message-text">{msg.message}</div>
                                  <div className="message-time">
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

                <div className="chat-input-container">
                  <TextArea
                    placeholder={`Nhắn tin cho ${selectedUser.name}...`}
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyPress={handleKeyPress}
                    autoSize={{ minRows: 1, maxRows: 4 }}
                    className="chat-input"
                  />
                  <Button
                    type="primary"
                    icon={<SendOutlined />}
                    onClick={sendMessage}
                    disabled={!newMessage.trim()}
                    className="chat-send-button"
                    size="large"
                  >
                    Gửi
                  </Button>
                </div>
              </>
            ) : (
              <div className="no-chat-selected">
                <WechatOutlined />
                <Text type="secondary">
                  Chọn một người dùng từ danh sách để bắt đầu trò chuyện
                </Text>
                <Text type="secondary">
                  Hoặc sử dụng tab "Tìm kiếm" để tìm người dùng mới
                </Text>
              </div>
            )}
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default AdminChatInterface;