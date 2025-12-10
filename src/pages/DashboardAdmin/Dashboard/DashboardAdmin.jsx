import { useState } from "react";
import { Layout, Menu } from "antd";
import {
  UserOutlined,
  BookOutlined,
  VideoCameraOutlined,
  DashboardOutlined,
  WechatWorkOutlined,
} from "@ant-design/icons";
import { useTranslation } from "react-i18next";

import UserManagement from "../Users/UserManagement";
import CourseManagement from "../Courses/CourseManagement";
import VideoManagement from "../Videos/VideoManagement";
import ScheduleManagement from "../Schedules/ScheduleManagement";
import OverviewAdmin from "./Overview/OverviewAdmin";
import AdminChatInterface from "../Chat/AdminChatInterface"
import "./DashboardAdmin.css"; 

const { Sider, Content } = Layout;

function AdminDashboard() {
  const { t } = useTranslation();
  const [selectedKey, setSelectedKey] = useState("dashboard");

  const renderContent = () => {
    switch (selectedKey) {
      case "dashboard":
        return <OverviewAdmin />;
      case "users":
        return <UserManagement />;
      case "courses":
        return <CourseManagement />;
      case "schedules":
        return <ScheduleManagement />;
      case "videos":
        return <VideoManagement />;
      case "chats":
        return <AdminChatInterface />;
      default:
        return <div>{t("pageNotFound")}</div>;
    }
  };

  return (
    <Layout className="admin-dashboard">
      <Sider 
        width={260} 
        className="admin-sider"
        breakpoint="lg"
        collapsedWidth="0"
      >
        <Menu
          mode="inline"
          selectedKeys={[selectedKey]}
          className="custom-menu"
          onClick={(e) => setSelectedKey(e.key)}
        >
          <Menu.Item key="dashboard" icon={<DashboardOutlined />}>
            {t("dashboard")}
          </Menu.Item>
          <Menu.Item key="users" icon={<UserOutlined />}>
            {t("userManagement")}
          </Menu.Item>
          <Menu.Item key="courses" icon={<BookOutlined />}>
            {t("courseManagement")}
          </Menu.Item>
          <Menu.Item key="schedules" icon={<BookOutlined />}>
            {t("scheduleManagement")}
          </Menu.Item>
          <Menu.Item key="videos" icon={<VideoCameraOutlined />}>
            {t("videoManagement")}
          </Menu.Item>
          <Menu.Item key="chats" icon={<WechatWorkOutlined />}>
            Chat
          </Menu.Item>
        </Menu>
      </Sider>

      <Layout className="admin-content">
        <Content className="admin-content-layout">
          {renderContent()}
        </Content>
      </Layout>
    </Layout>
  );
}

export default AdminDashboard;