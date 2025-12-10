import { useState, useEffect } from "react";
import { Layout, Menu, Form, message } from "antd";
import {
  DashboardOutlined,
  BookOutlined,
  TeamOutlined,
  ReadOutlined,
  ScheduleOutlined,
  WechatWorkOutlined,
} from "@ant-design/icons";
import { useTranslation } from "react-i18next";
import api from "../../../api";
import "./DashboardTeacher.css"; 
import MyCourses from "../Courses/MyCourse";
import StudentsList from "../Students/StudentList";
import CreateCourse from "../Courses/CreateCourse";
import MyAssignments from "../Assignments/MyAssignments";
import ScheduleTeacher from "../Schedules/ScheduleTeacher"
import TeacherOverview from "./Overview/TeacherOverview";
import TeacherChatInterface from "../Chat/TeacherChatInterface";

const { Sider, Content } = Layout;

function DashboardTeacher() {
  const { t } = useTranslation();
  const [selectedKey, setSelectedKey] = useState("dashboard");
  const [teacherId, setTeacherId] = useState(null);
  const [courses, setCourses] = useState([]);
  const [students, setStudents] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [courseForm] = Form.useForm();

  const token = localStorage.getItem("token");

  useEffect(() => {
    if (token) {
      const payload = JSON.parse(atob(token.split(".")[1]));
      setTeacherId(payload.id);
    }
  }, [token]);

  const fetchStudents = (courseId) => {
    api
      .get(`/courses/${courseId}/students`)
      .then((res) => setStudents(res.data))
      .catch((err) => console.error(err));
  };

  const handleCreateCourse = (values) => {
    api
      .post("/courses", values)
      .then((res) => {
        message.success(t('messages.createCourseSuccess'));
        setCourses((prev) => [...prev, { id: res.data.courseId, ...values }]);
        setSelectedKey("mycourses");
      })
      .catch(() => message.error(t('messages.createCourseFail')));
  };

  const renderContent = () => {
    switch (selectedKey) {
      case "dashboard":
        return <TeacherOverview setSelectedKey={setSelectedKey} />;
      case "mycourses":
        return <MyCourses courses={courses} onViewStudents={(id) => {
          setSelectedCourse(id);
          fetchStudents(id);
          setSelectedKey("students");
        }} />;
      case "students":
        return <StudentsList students={students} courseId={selectedCourse} />;
      case "createcourse":
        return <CreateCourse courseForm={courseForm} onCreateCourse={handleCreateCourse} />;
      case "myassignments":
        return <MyAssignments teacherId={teacherId} />;
      case "schedules":
        return <ScheduleTeacher />;
      case "chats":
        return <TeacherChatInterface />;
      default:
        return <h2>{t('dashboard')}</h2>;
    }
  };

  const menuItems = [
    {
      key: "dashboard",
      icon: <DashboardOutlined />,
      label: t('dashboard')
    },
    {
      key: "mycourses",
      icon: <BookOutlined />,
      label: t('courseManagements.myCourses')
    },
    {
      key: "students",
      icon: <TeamOutlined />,
      label: t('teacherstudents')
    },
    {
      key: "myassignments",
      icon: <ReadOutlined />,
      label: t('courseManagements.myAssignments')
    },
    {
      key: "chats",
      icon: <WechatWorkOutlined />,
      label: "Chat"
    },
    {
      key: "schedules",
      icon: <ScheduleOutlined />,
      label: t('teachingSchedule')
    }
  ];

  return (
    <Layout className="dashboard-teacher">
      <Sider width={260} className="teacher-sider">
        <Menu
          mode="inline"
          selectedKeys={[selectedKey]}
          className="teacher-menu"
          onClick={(e) => setSelectedKey(e.key)}
          items={menuItems}
        />
      </Sider>
      <Layout className="teacher-content">
        <Content className="teacher-content-layout">
          {renderContent()}
        </Content>
      </Layout>
    </Layout>
  );
}

export default DashboardTeacher;