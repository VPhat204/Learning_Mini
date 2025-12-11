import { Layout, Dropdown, Modal, Form, Input, message, Switch, Badge, List, Menu } from "antd";
import { BellOutlined, GlobalOutlined, MoonOutlined, SunOutlined } from "@ant-design/icons";
import { useContext, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { UserContext } from "../../context/userContext";
import { useTheme } from "../../context/themeContext"; 
import axios from "axios";
import "./AppHeader.css";
import ProfileModal from "../ProfilePage/Profile";
import { Link, useNavigate } from "react-router-dom";

const { Header } = Layout;
const BASE_URL = "https://learning-mini-be.onrender.com";

function AppHeader() {
  const { t, i18n } = useTranslation();
  const { user, logout, updateName, updateUser, loading } = useContext(UserContext);
  const { darkMode, toggleTheme, resetToDefaultTheme } = useTheme(); 
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [form] = Form.useForm();
  const navigate = useNavigate();
  const [isProfileVisible, setIsProfileVisible] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [isNotifVisible, setIsNotifVisible] = useState(false);

  useEffect(() => {
    if (user?.language) {
      i18n.changeLanguage(user.language);
    }
  }, [user?.language, i18n]);

  const handleLogout = () => {
    logout();
    resetToDefaultTheme();
    navigate("/login");
  };

  const handleChangeName = () => {
    form.validateFields().then(async (values) => {
      try {
        await axios.put(`${BASE_URL}/users/${user.id}/name`, { name: values.name });
        updateName(values.name);
        message.success(t("updateNameSuccess"));
        setIsModalVisible(false);
      } catch (err) {
        message.error(t("updateNameFail"));
      }
    });
  };

  const handleToggleTheme = async () => {
    try {
      const newDarkMode = !darkMode;
      
      if (user?.id) {
        await axios.put(
          `${BASE_URL}/users/${user.id}/theme`,
          { theme: newDarkMode ? 'dark' : 'light' },
          {
            headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
          }
        );
        
        const updatedUser = { ...user, theme: newDarkMode ? 'dark' : 'light' };
        updateUser(updatedUser);
        
        const storedUser = JSON.parse(localStorage.getItem("user")) || {};
        localStorage.setItem("user", JSON.stringify({
          ...storedUser,
          theme: newDarkMode ? 'dark' : 'light'
        }));
      }
      
      toggleTheme();
      
    } catch (err) {
      console.error('Failed to update theme:', err);
      message.error(t("themeUpdateError"));
    }
  };

  useEffect(() => {
    if (!user) {
      setNotifications([]);
      return;
    }
    const fetchNotifications = async () => {
      try {
        const res = await axios.get(`${BASE_URL}/notifications/${user.id}`, {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        });
        setNotifications(res.data);
      } catch (error) {
        console.error(error);
      }
    };
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 15000);
    return () => clearInterval(interval);
  }, [user]);

  const markAsRead = async (id) => {
    try {
      await axios.put(`${BASE_URL}/notifications/${id}/read`, {}, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: 1 } : n)));
    } catch (err) {
      console.error(err);
    }
  };

  const handleChangeLang = async (lang) => {
    i18n.changeLanguage(lang);
    try {
      if (user?.id) {
        await axios.put(`${BASE_URL}/users/${user.id}/language`, { language: lang }, {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        });
        updateUser({ ...user, language: lang });
      }
    } catch (err) {
      console.error(err);
      message.error("Failed to change language");
    }
  };

  const langMenu = (
    <Menu>
      <Menu.Item key="vi" onClick={() => handleChangeLang("vi")}>{t("lang.vi")}</Menu.Item>
      <Menu.Item key="en" onClick={() => handleChangeLang("en")}>{t("lang.en")}</Menu.Item>
    </Menu>
  );

  if (loading) return null;

  const avatarUrl = user?.avatar ? (user.avatar.startsWith("http") ? user.avatar : `${BASE_URL}${user.avatar}`) : "/default-avatar.png";

  return (
    <Header className="app-header">
      <nav className="app-nav">
        <div className="app-logo">
          <Link to="/">E_Study</Link>
        </div>

        <div className="app-user">
          <div className="app-actions">
            <Dropdown overlay={langMenu} placement="bottomRight" trigger={['click']}>
              <GlobalOutlined className="icon-btn" />
            </Dropdown>

            <Badge count={notifications.filter(n => !n.is_read).length} size="small">
              <BellOutlined
                className="icon-btn"
                onClick={() => setIsNotifVisible(true)}
              />
            </Badge>

            <Switch
              checkedChildren={<SunOutlined />}
              unCheckedChildren={<MoonOutlined />}
              checked={darkMode}
              onChange={handleToggleTheme} 
              className="theme-switch"
            />
          </div>

          {user ? (
            <Dropdown
              menu={{
                items: [
                  { key: "editProfile", label: t("profileInfo"), onClick: () => setIsProfileVisible(true) },
                  { key: "editName", label: t("changeName"), onClick: () => setIsModalVisible(true) },
                  { key: "logout", label: t("logout"), onClick: handleLogout },
                ],
              }}
              placement="bottomRight"
              trigger={['click']}
            >
              <div className="header-user-info">
                <img src={avatarUrl} alt="avatar" className="header-avatar" />
                <span className="app-user-name">{user?.name || t("account")}</span>
              </div>
            </Dropdown>
          ) : (
            <div className="app-auth-links">
              <Link to="/login">{t("login")}</Link> | <Link to="/register">{t("register")}</Link>
            </div>
          )}
        </div>
      </nav>

      <Modal
        title={t("notifications")}
        open={isNotifVisible}
        onCancel={() => setIsNotifVisible(false)}
        footer={null}
      >
        <List
          dataSource={notifications}
          renderItem={(item) => (
            <List.Item
              style={{ fontWeight: item.is_read ? "normal" : "bold" }}
            >
              <Link to={item.link || "#"} onClick={() => markAsRead(item.id)}>
                {item.title}
              </Link>
            </List.Item>
          )}
        />
      </Modal>

      <Modal
        title={t("changeName")}
        open={isModalVisible}
        onOk={handleChangeName}
        onCancel={() => setIsModalVisible(false)}
        okText={t("update")}
      >
        <Form form={form} layout="vertical" initialValues={{ name: user?.name || "" }}>
          <Form.Item name="name" label={t("newName")} rules={[{ required: true, message: t("enterNewName") }]}>
            <Input />
          </Form.Item>
        </Form>
      </Modal>

      <ProfileModal 
        visible={isProfileVisible} 
        onClose={() => setIsProfileVisible(false)} 
        user={user} 
        updateUser={updateUser} />
    </Header>
  );
}

export default AppHeader;