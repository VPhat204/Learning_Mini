import { useState, useEffect, useCallback } from "react";
import { Card, Table, Tag } from "antd";
import { BookOutlined, FireOutlined, TrophyOutlined, UserOutlined } from "@ant-design/icons";
import axios from "axios";
import {
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  Legend,
} from "recharts";
import { useTranslation } from "react-i18next";
import './OverviewAdmin.css'

function OverviewAdmin() {
  const { t } = useTranslation();
  const [courses, setCourses] = useState([]);
  const [users, setUsers] = useState([]);
  const [courseEnrollments, setCourseEnrollments] = useState([]);
  const [chartType, setChartType] = useState("bar");

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;

    axios
      .get("http://localhost:5001/users", {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((res) => setUsers(res.data))
      .catch((err) => console.error(err));
  }, []);

  const parseDate = (dateStr) => {
    if (!dateStr) return new Date();
    return new Date(dateStr.replace(" ", "T"));
  };

    const fetchCourses = useCallback(async () => {
    const token = localStorage.getItem('token');
    try {
      const response = await fetch('http://localhost:5001/courses', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();
      setCourses(data);
      
      const enrollmentsData = await Promise.all(
        data.map(async (course) => {
          try {
            const enrollResponse = await fetch(`http://localhost:5001/courses/${course.id}/students-count`, {
              headers: {
                'Authorization': `Bearer ${token}`
              }
            });
            const enrollData = await enrollResponse.json();
            return {
              ...course,
              studentCount: enrollData.total_students || 0
            };
          } catch (error) {
            return {
              ...course,
              studentCount: 0
            };
          }
        })
      );
      
      enrollmentsData.sort((a, b) => b.studentCount - a.studentCount);
      setCourseEnrollments(enrollmentsData.slice(0, 5)); 
      
    } catch (error) {
      console.error('Lỗi khi tải danh sách khóa học:', error);
    }
  }, []);

    useEffect(() => {
        fetchCourses();
      }, [fetchCourses]); 

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="custom-tooltip">
          <p className="label">
            {label}
          </p>
          {payload.map((entry, index) => (
            <p key={index} className="tooltip-item">
              <span 
                className="color-indicator" 
                style={{ backgroundColor: entry.color }}
              ></span>
              {`${entry.name}: ${entry.value}`}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  const renderChart = () => {
    const months = [...Array(12)].map((_, i) => {
      const monthIndex = i;
      const monthLabel = `${i + 1 < 10 ? "0" : ""}${i + 1}/${new Date().getFullYear()}`;
      return {
        name: monthLabel,
        student: users.filter(
          (u) =>
            u.roles === "student" &&
            parseDate(u.created_at).getMonth() === monthIndex
        ).length,
        teacher: users.filter(
          (u) =>
            u.roles === "teacher" &&
            parseDate(u.created_at).getMonth() === monthIndex
        ).length,
      };
    });

    if (chartType === "bar") {
      return (
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={months} margin={{ top: 20, bottom: 20 }}>
            <XAxis 
              dataKey="name" 
              tick={{ fill: 'var(--text-primary)' }}
            />
            <YAxis 
              allowDecimals={false} 
              tick={{ fill: 'var(--text-primary)' }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            <Bar dataKey="student" fill="#34d399" name={t("student")} />
            <Bar dataKey="teacher" fill="#60a5fa" name={t("teacher")} />
          </BarChart>
        </ResponsiveContainer>
      );
    } else {
      return (
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={months} margin={{ top: 20, bottom: 20 }}>
            <XAxis 
              dataKey="name" 
              tick={{ fill: 'var(--text-primary)' }}
            />
            <YAxis 
              allowDecimals={false} 
              tick={{ fill: 'var(--text-primary)' }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            <Line 
              type="monotone" 
              dataKey="student" 
              stroke="#34d399" 
              strokeWidth={3} 
              name={t("student")} 
            />
            <Line 
              type="monotone" 
              dataKey="teacher" 
              stroke="#60a5fa" 
              strokeWidth={3} 
              name={t("teacher")} 
            />
          </LineChart>
        </ResponsiveContainer>
      );
    }
  };

  const totalUsers = users.length;
  const students = users.filter((u) => u.roles === "student").length;
  const teachers = users.filter((u) => u.roles === "teacher").length;
  const admin = users.filter((u) => u.roles === "admin").length;
  const topEnrolledCourse = courseEnrollments.length > 0 ? courseEnrollments[0] : null;
  const totalEnrollments = courseEnrollments.reduce((sum, course) => sum + course.studentCount, 0);

    const columns = [
    {
      title: '#',
      dataIndex: 'rank',
      key: 'rank',
      width: 60,
      render: (text, record, index) => {
        const rank = index + 1;
        let rankColor = '#8c8c8c';
        if (rank === 1) rankColor = '#f59e0b';
        else if (rank === 2) rankColor = '#94a3b8';
        else if (rank === 3) rankColor = '#b45309';
        
        return (
          <div className="rank-badge" style={{ backgroundColor: rankColor }}>
            {rank}
          </div>
        );
      },
    },
    {
      title: 'Khóa học',
      dataIndex: 'title',
      key: 'title',
      render: (text) => (
        <div className="course-title-cell">
          <BookOutlined style={{ marginRight: 8, color: '#3b82f6' }} />
          <span className="course-title-text">{text}</span>
        </div>
      ),
    },
    {
      title: 'Học viên',
      dataIndex: 'studentCount',
      key: 'studentCount',
      width: 100,
      render: (count) => (
        <div className="student-count-cell">
          <Tag color={count > 50 ? 'success' : count > 20 ? 'warning' : 'default'}>
            <UserOutlined /> {count}
          </Tag>
        </div>
      ),
    },
    {
      title: 'Trạng thái',
      key: 'status',
      width: 100,
      render: (_, record) => {
        const isTop = record.studentCount === topEnrolledCourse?.studentCount;
        return isTop ? (
          <Tag icon={<FireOutlined />} color="red">
            HOT
          </Tag>
        ) : record.studentCount > 30 ? (
          <Tag color="blue">Popular</Tag>
        ) : (
          <Tag color="default">Normal</Tag>
        );
      },
    },
  ];

  return (
    <div className="dashboard-container">
      <div className="dashboard-top">
        <div className="welcome-card">
          <div className="admin-welcome-header">
            <h2>{t("welcomeAdmin")}</h2>
            <div className="admin-overview-avatar">
              <UserOutlined />
            </div>
          </div>
          <p>
            {t("totalUsers")}: <b>{totalUsers}</b>
          </p>
        </div>

        <div className="">
          <div className="admin-stats">
            <div className="admin-stat-item">
              <div className="admin-stat-icon">
                <UserOutlined />
              </div>
              <div className="admin-stat-info">
                <div className="admin-stat-number">{students}</div>
                <div className="admin-stat-label">{t("students")}</div>
              </div>
            </div>
            <div className="admin-stat-item">
              <div className="admin-stat-icon">
                <UserOutlined />
              </div>
              <div className="admin-stat-info">
                <div className="admin-stat-number">{teachers}</div>
                <div className="admin-stat-label">{t("teachers")}</div>
              </div>
            </div>
            <div className="admin-stat-item">
              <div className="admin-stat-icon">
                <UserOutlined />
              </div>
              <div className="admin-stat-info">
                <div className="admin-stat-number">{admin}</div>
                <div className="admin-stat-label">{t("admins")}</div>
              </div>
            </div>
            <div className="admin-stat-item">
              <div className="admin-stat-icon">
                <BookOutlined />
              </div>
              <div className="admin-stat-info">
                <div className="admin-stat-number">{courses.length}</div>
                <div className="admin-stat-label">{t("adds.course")}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="dashboard-middle">
        <div className="popular-courses-card">
          <div className="popular-courses-header">
            <h3>
              <TrophyOutlined />{t("adds.topCourse")}
            </h3>
            <div className="total-enrollments">
              <Tag color="blue">{totalEnrollments} {t("adds.numberSubs")}</Tag>
            </div>
          </div>
          
          {courseEnrollments.length > 0 ? (
            <>
              <Table
                columns={columns}
                dataSource={courseEnrollments}
                rowKey="id"
                pagination={false}
                size="small"
                className="popular-courses-table"
              />
              <div className="popular-courses-footer">
                <div className="enrollment-summary">
                  <span>{t("adds.sumSubs")}: <strong>{totalEnrollments}</strong></span>
                  <span>{t("adds.average")}: <strong>{Math.round(totalEnrollments / courseEnrollments.length)}</strong> {t("adds.student/course")}</span>
                </div>
              </div>
            </>
          ) : (
            <div className="no-courses-message">
              <BookOutlined />
              <p>{t("adds.invalidCourse")}</p>
            </div>
          )}
        </div>
        <Card
          className="chart-card"
          title={t("monthlyAccounts")}
          extra={
            <select
              value={chartType}
              onChange={(e) => setChartType(e.target.value)}
            >
              <option value="bar">{t("barChart")}</option>
              <option value="line">{t("lineChart")}</option>
            </select>
          }
        >
          {renderChart()}
        </Card>
      </div>
    </div>
  );
}

export default OverviewAdmin;