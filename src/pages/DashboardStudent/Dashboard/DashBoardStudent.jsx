import { useState } from "react";
import { Layout, Menu } from "antd";
import { DashboardOutlined, BookOutlined, TeamOutlined, ReadOutlined, ScheduleOutlined, WechatWorkOutlined } from "@ant-design/icons";
import { useTranslation } from "react-i18next";
import DashboardOverview from "./Overview/DashboardOverview";
import ScheduleStudent from "../Schedules/ScheduleStudent";
import Courses from "../Course/Courses";
import EnrolledCourse from "../Course/CourseEnrollment";
import TeacherList from "../Teachers/TeacherList";
import StudentAssignments from "../Assignment/AssignmentPage";
import './DashboardStudent.css';
import StudentChatInterface from "../Chat/StudentChatInterface";

const { Sider, Content } = Layout;

function DashboardStudent() {
  const { t } = useTranslation();
  const [selectedKey, setSelectedKey] = useState("dashboard");
  const [refreshCourses, setRefreshCourses] = useState(false);

  const handleCourseEnrolled = () => {
    setRefreshCourses(prev => !prev);
  };

  const renderContent = () => {
    switch (selectedKey) {
      case "dashboard":
        return <DashboardOverview setSelectedKey={setSelectedKey}/>;
      case "enrolledcourse":
        return <EnrolledCourse/>;
      case "mycourses":
        return <Courses refreshTrigger={refreshCourses} />;
      case "assignments":
        return <StudentAssignments />;
      case "schedules":
        return <ScheduleStudent />;
      case "chats":
        return <StudentChatInterface />;
      case "teachers":
        return <TeacherList onCourseEnrolled={handleCourseEnrolled} />;
      default:
        return null;
    }
  };

  const menuItems = [
    {
      key: "dashboard",
      icon: <DashboardOutlined />,
      label: t('dashboardStudent.menu.dashboard')
    },
    {
      key: "teachers",
      icon: <TeamOutlined />,
      label: t('dashboardStudent.menu.teachers')
    },
    {
      key: "enrolledcourse",
      icon: <BookOutlined />,
      label: t('dashboardStudent.menu.enrolledCourses')
    },
    {
      key: "mycourses",
      icon: <BookOutlined />,
      label: t('dashboardStudent.menu.myCourses')
    },
    {
      key: "assignments",
      icon: <ReadOutlined />,
      label: t('dashboardStudent.menu.assignments')
    },
    {
      key: "chats",
      icon: <WechatWorkOutlined />,
      label: "Chat"
    },
    {
      key: "schedules",
      icon: <ScheduleOutlined />,
      label: t('dashboardStudent.menu.schedules')
    }
  ];

  return (
    <Layout className="dashboard-student">
      <Sider width={260} className="student-sider">
        <Menu
          mode="inline"
          selectedKeys={[selectedKey]}
          className="student-menu"
          onClick={(e) => setSelectedKey(e.key)}
          items={menuItems}
        />
      </Sider>
      <Layout className="student-content">
        <Content className="student-content-layout">
          {renderContent()}
        </Content>
      </Layout>
    </Layout>
  );
}

export default DashboardStudent;