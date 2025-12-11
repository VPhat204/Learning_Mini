import React, { useState, useEffect, useCallback } from "react";
import { Card, Button, Tag } from "antd";
import { ScheduleOutlined, UserOutlined, VideoCameraOutlined, BookOutlined, LeftOutlined, RightOutlined, CalendarOutlined, EllipsisOutlined } from "@ant-design/icons";
import axios from "axios";
import { useTranslation } from "react-i18next";
import "./TeacherOverview.css";

function TeacherOverview({ setSelectedKey }) {
  const { t } = useTranslation();
  const [myStudents, setMyStudents] = useState([]);
  const [teacherCourses, setTeacherCourses] = useState([]);
  const [monthlySchedule, setMonthlySchedule] = useState([]);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date().getDate());
  const [loading, setLoading] = useState(false);
  const [teacherInfo, setTeacherInfo] = useState({});
  const [videoCount, setVideoCount] = useState(0);
  const token = localStorage.getItem("token");
  const [teacherId, setTeacherId] = useState(null);
  const [showAllCourses, setShowAllCourses] = useState(false);
  const [showAllAssignments, setShowAllAssignments] = useState(false);
  const [assignments, setAssignments] = useState([]);

  useEffect(() => {
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split(".")[1]));
        setTeacherId(payload.id);
      } catch (err) {
        console.error('Error parsing token:', err);
      }
    }
  }, [token]);

  const fetchTeacherInfo = useCallback(async () => {
    try {
      const res = await axios.get(
        `https://learning-mini-be.onrender.com/users/${teacherId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setTeacherInfo(res.data);
    } catch (err) {
      console.error("Error fetching teacher info:", err);
    }
  }, [teacherId, token]);

  const fetchTeacherCourses = useCallback(async () => {
    try {
      const res = await axios.get(
        "https://learning-mini-be.onrender.com/courses/mine",
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setTeacherCourses(res.data);
    } catch (err) {
      console.error("Error fetching teacher courses:", err);
    }
  }, [token]);

  const fetchMyStudents = useCallback(async () => {
    try {
      const teacherCourseIds = teacherCourses.map(course => course.id);
      let allStudents = [];

      for (const courseId of teacherCourseIds) {
        const res = await axios.get(
          `https://learning-mini-be.onrender.com/course-students?courseId=${courseId}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (res.data.students && res.data.students.length > 0) {
          allStudents = [...allStudents, ...res.data.students];
        }
      }

      const uniqueStudents = allStudents.filter((student, index, self) =>
        index === self.findIndex(s => s.student_id === student.student_id)
      );

      setMyStudents(uniqueStudents);
    } catch (err) {
      console.error("Error fetching students:", err);
    }
  }, [teacherCourses, token]);

  const fetchVideoCount = useCallback(async () => {
    try {
      let totalVideos = 0;
      const teacherCourseIds = teacherCourses.map(course => course.id);

      for (const courseId of teacherCourseIds) {
        const res = await axios.get(
          `https://learning-mini-be.onrender.com/videos/${courseId}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (res.data && Array.isArray(res.data)) {
          totalVideos += res.data.length;
        }
      }

      setVideoCount(totalVideos);
    } catch (err) {
      console.error("Error fetching video count:", err);
      setVideoCount(0);
    }
  }, [teacherCourses, token]);

  const fetchTeacherSchedule = useCallback(async () => {
    try {
      setLoading(true);
      
      const year = currentMonth.getFullYear();
      const month = currentMonth.getMonth();
      
      const firstDay = new Date(year, month, 1);
      const lastDay = new Date(year, month + 1, 0);
      
      const weeks = [];
      let currentDate = new Date(firstDay);
      
      while (currentDate <= lastDay) {
        weeks.push(new Date(currentDate));
        currentDate.setDate(currentDate.getDate() + 7);
      }

      const weeklyPromises = weeks.map(weekDate => {
        const dateString = weekDate.toISOString().split('T')[0];
        return axios.get(
          `https://learning-mini-be.onrender.com/api/schedule/week?date=${dateString}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
      });

      const responses = await Promise.all(weeklyPromises);
      
      const teacherCourseIds = teacherCourses.map(course => course.id);
      const allSchedules = [];

      responses.forEach((response, weekIndex) => {
        const data = response.data;
        const weekDate = weeks[weekIndex];
        
        ['Sáng', 'Chiều', 'Tối'].forEach(period => {
          if (data[period]) {
            for (let dayIndex = 0; dayIndex < 7; dayIndex++) {
              const daySlots = data[period][dayIndex];
              
              if (Array.isArray(daySlots)) {
                daySlots.forEach((slot, slotIndex) => {
                  if (slot && slot.type !== 'empty' && slot.course_id) {
                    if (teacherCourseIds.includes(slot.course_id) || slot.teacher_id === teacherId) {
                      const scheduleDate = new Date(weekDate);
                      const dayOfWeek = weekDate.getDay();
                      const adjustedStart = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
                      scheduleDate.setDate(weekDate.getDate() + adjustedStart + dayIndex);
                      
                      if (scheduleDate.getMonth() === currentMonth.getMonth()) {
                        allSchedules.push({
                          ...slot,
                          period: period,
                          slotIndex: slotIndex + 1,
                          date: scheduleDate.getDate(),
                          dateString: `${scheduleDate.getDate().toString().padStart(2, '0')}/${(scheduleDate.getMonth() + 1).toString().padStart(2, '0')}/${scheduleDate.getFullYear()}`,
                          fullDate: scheduleDate,
                          month: scheduleDate.getMonth(),
                          year: scheduleDate.getFullYear()
                        });
                      }
                    }
                  }
                });
              }
            }
          }
        });
      });

      setMonthlySchedule(allSchedules.sort((a, b) => a.fullDate - b.fullDate));
      
    } catch (err) {
      console.log('Error fetching monthly schedule:', err);
      setMonthlySchedule([]);
    } finally {
      setLoading(false);
    }
  }, [currentMonth, teacherCourses, teacherId, token]);

  const fetchAssignments = useCallback(async () => {
    try {
      const teacherCourseIds = teacherCourses.map(course => course.id);
      let allAssignments = [];

      for (const courseId of teacherCourseIds) {
        try {
          const res = await axios.get(
            `https://learning-mini-be.onrender.com/assignments/course/${courseId}`,
            { headers: { Authorization: `Bearer ${token}` } }
          );
          
          if (res.data && Array.isArray(res.data)) {
            const assignmentsWithCourse = res.data.map(assignment => ({
              ...assignment,
              course_name: teacherCourses.find(course => course.id === assignment.course_id)?.title || `${t('courses')} #${assignment.course_id}`
            }));
            allAssignments = [...allAssignments, ...assignmentsWithCourse];
          }
        } catch (courseErr) {
          console.log(`Error fetching assignments for course ${courseId}:`, courseErr.message);
          continue;
        }
      }

      setAssignments(allAssignments);
      
    } catch (err) {
      console.error("General error fetching assignments:", err);
      setAssignments([]);
    }
  }, [teacherCourses, token, t]);

  useEffect(() => {
    if (teacherId) {
      fetchTeacherInfo();
      fetchTeacherCourses();
    }
  }, [teacherId, fetchTeacherInfo, fetchTeacherCourses]);

  useEffect(() => {
    if (teacherCourses.length > 0) {
      fetchMyStudents();
      fetchVideoCount();
      fetchTeacherSchedule();
      fetchAssignments();
    }
  }, [teacherCourses, fetchMyStudents, fetchVideoCount, fetchTeacherSchedule, fetchAssignments]);

  const goToPreviousMonth = () => {
    setCurrentMonth(prev => {
      const newDate = new Date(prev);
      newDate.setMonth(prev.getMonth() - 1);
      return newDate;
    });
  };

  const goToNextMonth = () => {
    setCurrentMonth(prev => {
      const newDate = new Date(prev);
      newDate.setMonth(prev.getMonth() + 1);
      return newDate;
    });
  };

  const goToCurrentMonth = () => {
    const today = new Date();
    setCurrentMonth(today);
    setSelectedDate(today.getDate());
  };

  const generateCalendar = () => {
    const currentMonthValue = currentMonth.getMonth();
    const currentYear = currentMonth.getFullYear();
    
    const firstDay = new Date(currentYear, currentMonthValue, 1);
    const lastDay = new Date(currentYear, currentMonthValue + 1, 0);
    
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();
    
    const calendar = [];
    
    let adjustedStartingDay = startingDayOfWeek === 0 ? 6 : startingDayOfWeek - 1;
    
    for (let i = 0; i < adjustedStartingDay; i++) {
      calendar.push(null);
    }
    
    for (let day = 1; day <= daysInMonth; day++) {
      calendar.push(day);
    }
    
    const totalCells = 42;
    const remainingCells = totalCells - calendar.length;
    for (let i = 0; i < remainingCells; i++) {
      calendar.push(null);
    }
    
    return calendar;
  };

  const getScheduleCountForDate = (day) => {
    if (!day) return 0;
    return monthlySchedule.filter(item => item.date === day).length;
  };

  const getDayColor = (day) => {
    if (!day) return '#9E9E9E';
    
    const daySchedule = monthlySchedule.find(item => item.date === day);
    if (daySchedule) {
      return getScheduleTypeColor(daySchedule.type);
    }
    
    return '#9E9E9E';
  };

  const getSelectedDateSchedule = () => {
    if (!selectedDate) return [];
    
    return monthlySchedule.filter(item => item.date === selectedDate);
  };

  const getScheduleTypeColor = (type) => {
    const colors = {
      theory: '#9E9E9E',
      practice: '#4CAF50',
      online: '#2196F3',
      exam: '#FFEB3B',
      pause: '#FF9800'
    };
    return colors[type] || '#9E9E9E';
  };

  const handleDateClick = (day) => {
    if (day) {
      setSelectedDate(day);
    }
  };

  useEffect(() => {
    const today = new Date();
    const isCurrentMonth = currentMonth.getMonth() === today.getMonth() && 
                          currentMonth.getFullYear() === today.getFullYear();
    
    if (isCurrentMonth && !selectedDate) {
      setSelectedDate(today.getDate());
    }
  }, [currentMonth, selectedDate]);

  const toggleShowAllCourses = () => {
    setShowAllCourses(!showAllCourses);
  };

  const toggleShowAllAssignments = () => {
    setShowAllAssignments(!showAllAssignments);
  };

  const getDisplayedCourses = () => {
    return showAllCourses ? teacherCourses : teacherCourses.slice(0, 2);
  };

  const getDisplayedAssignments = () => {
    return showAllAssignments ? assignments : assignments.slice(0, 2);
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const getClassTypeShortLabel = (type) => {
    const types = {
      theory: t('classTypes.theory'),
      practice: t('classTypes.practice'),
      online: t('classTypes.online'),
      exam: t('classTypes.exam'),
      pause: t('classTypes.pause')
    };
    return types[type] || type;
  };

  const getClassTypeFullLabel = (type) => {
    const types = {
      theory: t('classTypes.theory'),
      practice: t('classTypes.practice'),
      online: t('classTypes.online'),
      exam: t('classTypes.exam'),
      pause: t('classTypes.pause')
    };
    return types[type] || type;
  };

  const getTotalClassesThisMonth = () => {
    return monthlySchedule.length;
  };

  const weekDays = t('weekDays', { returnObjects: true });
  const monthNames = t('months', { returnObjects: true });
  const currentMonthName = `${monthNames[currentMonth.getMonth()]} ${currentMonth.getFullYear()}`;

  const getSelectedDateDisplay = () => {
    if (!selectedDate) return "";
    return `${selectedDate.toString().padStart(2, '0')}/${(currentMonth.getMonth() + 1).toString().padStart(2, '0')}/${currentMonth.getFullYear()}`;
  };

  const calendarDays = generateCalendar();
  const selectedDateSchedule = getSelectedDateSchedule();

  return (
    <div className="teacher-overview-page">
      {loading && (
        <div className="teacher-loading-screen">
          <div className="teacher-loading-content">{t('loadingSchedule')}</div>
        </div>
      )}

      <div className="teacher-dashboard-top-section">
        <div className="teacher-left-sidebar">
          <div className="teacher-welcome-card">
            <div className="teacher-welcome-header">
              <h2>{t('welcometeacher', { name: teacherInfo.name || t('teacher') })}</h2>
              <div className="teacher-overview-avatar">
                <UserOutlined />
              </div>
            </div>
            <div className="teacher-stats">
              <div className="teacher-stat-item">
                <div className="teacher-stat-icon">
                  <BookOutlined />
                </div>
                <div className="teacher-stat-info">
                  <div className="teacher-stat-number">{teacherCourses.length}</div>
                  <div className="teacher-stat-label">{t('teachercourses')}</div>
                </div>
              </div>
              <div className="teacher-stat-item">
                <div className="teacher-stat-icon">
                  <UserOutlined />
                </div>
                <div className="teacher-stat-info">
                  <div className="teacher-stat-number">{myStudents.length}</div>
                  <div className="teacher-stat-label">{t('teacherstudents')}</div>
                </div>
              </div>
              <div className="teacher-stat-item">
                <div className="teacher-stat-icon">
                  <VideoCameraOutlined />
                </div>
                <div className="teacher-stat-info">
                  <div className="teacher-stat-number">{videoCount}</div>
                  <div className="teacher-stat-label">{t('videos')}</div>
                </div>
              </div>
              <div className="teacher-stat-item">
                <div className="teacher-stat-icon">
                  <ScheduleOutlined />
                </div>
                <div className="teacher-stat-info">
                  <div className="teacher-stat-number">{getTotalClassesThisMonth()}</div>
                  <div className="teacher-stat-label">{t('classesThisMonth')}</div>
                </div>
              </div>
            </div>
          </div>

          <Card className="teacher-chart-card" title={t('recentActivity')}>
            <div className="teacher-recent-activity">
              <div className="teacher-activity-item">
                <div className="teacher-activity-icon teacher-activity-success">
                  <UserOutlined />
                </div>
                <div className="teacher-activity-content">
                  <div className="teacher-activity-title">{t('newStudents')}</div>
                  <div className="teacher-activity-desc">{t('studentsRegistered', { count: 5 })}</div>
                </div>
              </div>
              <div className="teacher-activity-item">
                <div className="teacher-activity-icon teacher-activity-info">
                  <VideoCameraOutlined />
                </div>
                <div className="teacher-activity-content">
                  <div className="teacher-activity-title">{t('newVideos')}</div>
                  <div className="teacher-activity-desc">{t('videosUploaded', { count: 3 })}</div>
                </div>
              </div>
              <div className="teacher-activity-item">
                <div className="teacher-activity-icon teacher-activity-warning">
                  <ScheduleOutlined />
                </div>
                <div className="teacher-activity-content">
                  <div className="teacher-activity-title">{t('teachingSchedule')}</div>
                  <div className="teacher-activity-desc">{t('classesInMonth', { count: getTotalClassesThisMonth() })}</div>
                </div>
              </div>
            </div>
          </Card>
        </div>

        <div className="teacher-calendar-section">
          <div className="teacher-calendar-header-panel">
            <h3>{t('teachingScheduleTitle', { month: currentMonthName })}</h3>
            <div className="teacher-month-navigation-panel">
              <div className="teacher-current-month-display">
                <span className="teacher-month-icon"><CalendarOutlined /></span>
                <span className="teacher-month-title">{currentMonthName}</span>
              </div>
              
              <div className="teacher-month-control-buttons">
                <Button 
                  icon={<LeftOutlined />} 
                  onClick={goToPreviousMonth}
                  size="small"
                />
                <Button 
                  onClick={goToCurrentMonth}
                  size="small"
                >
                  {t('today')}
                </Button>
                <Button 
                  icon={<RightOutlined />} 
                  onClick={goToNextMonth}
                  size="small"
                />
              </div>
            </div>
          </div>

          <div className="teacher-calendar-summary-info">
            <p>{t('monthlyClasses', { count: getTotalClassesThisMonth() })}</p>
          </div>

          <div className="teacher-calendar-main-panel">
            <div className="teacher-calendar-days-header">
              {weekDays.map(day => (
                <div key={day} className="teacher-week-day-label">{day}</div>
              ))}
            </div>
            <div className="teacher-calendar-days-grid">
              {calendarDays.map((day, index) => {
                const scheduleCount = getScheduleCountForDate(day);
                const hasSchedule = scheduleCount > 0;
                const dayColor = getDayColor(day);
                const isToday = day === new Date().getDate() && 
                              currentMonth.getMonth() === new Date().getMonth() && 
                              currentMonth.getFullYear() === new Date().getFullYear();
                const isSelected = day === selectedDate;
                
                return (
                  <div 
                    key={index} 
                    className={`teacher-calendar-date-cell ${day ? 'teacher-has-date' : 'teacher-empty-cell'} ${hasSchedule ? 'teacher-has-class' : ''} ${isToday ? 'teacher-current-day' : ''} ${isSelected ? 'teacher-selected-day' : ''}`}
                    onClick={() => handleDateClick(day)}
                  >
                    {day && (
                      <>
                        <span className="teacher-date-number">{day}</span>
                        {hasSchedule && (
                          <div className="teacher-class-indicator">
                            <div 
                              className="teacher-class-dot" 
                              style={{ backgroundColor: dayColor }}
                            ></div>
                            {scheduleCount > 1 && (
                              <span className="teacher-class-count">{scheduleCount}</span>
                            )}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                );
              })}
            </div>
            
            <div className="teacher-schedule-details-panel">
              <h4>
                {selectedDate 
                  ? t('scheduleForDate', { date: getSelectedDateDisplay() })
                  : t('clickDateWithDot')}
              </h4>
              
              {selectedDate ? (
                selectedDateSchedule.length > 0 ? (
                  <div className="teacher-daily-classes-list">
                    {selectedDateSchedule.map((item, index) => (
                      <div key={index} className="teacher-class-schedule-item">
                        <div className="teacher-class-time-slot">
                          <span className="teacher-period-number">
                            {item.period}
                          </span>
                        </div>
                        <div className="teacher-class-details">
                          <span className="teacher-class-name">{item.title || item.course_title || `${t('courses')} #${item.course_id}`}</span>
                          <span className="teacher-class-lesson">
                            {t('lesson')}: {item.lesson || t('noLesson')}
                          </span>
                          <span className="teacher-class-room">
                            {t('class')}: {item.url || t('noClass')}
                          </span>
                        </div>
                        <span 
                          className="teacher-class-type-tag" 
                          style={{ backgroundColor: getScheduleTypeColor(item.type) }}
                        >
                          {getClassTypeShortLabel(item.type)}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="teacher-no-classes-message">
                    {t('noClasses', { date: getSelectedDateDisplay() })}
                  </div>
                )
              ) : (
                <div className="teacher-select-date-message">
                  {t('clickDateWithDot')}
                </div>
              )}
            </div>

            <div className="teacher-class-types-legend">
              <div className="teacher-legend-types-container">
                {['theory', 'practice', 'online', 'exam', 'pause'].map(type => (
                  <div key={type} className="teacher-type-legend-item">
                    <div className="teacher-type-color-box" style={{ backgroundColor: getScheduleTypeColor(type) }}></div>
                    <span className="teacher-type-name-label">{getClassTypeFullLabel(type)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="teacher-dashboard-bottom">
        <Card 
          title={t('courseManagements.myCourses')} 
          className="teacher-courses-card"
          extra={
            teacherCourses.length > 2 && (
              <Button 
                type="link" 
                onClick={toggleShowAllCourses}
                className="teacher-view-more-btn"
                icon={<EllipsisOutlined />}
              >
                {showAllCourses ? t('collapse') : t('viewMore', { count: teacherCourses.length - 2 })}
              </Button>
            )
          }
        >
          {getDisplayedCourses().map(course => (
            <div key={course.id} className="teacher-course-list-item">
              <div className="teacher-course-color" style={{ backgroundColor: course.color || '#9E9E9E' }}></div>
              <div className="teacher-course-info">
                <h4>{course.title}</h4>
                <p>{t('courseManagements.lessons', { count: course.lessons || 0 })} • {t('courseManagements.hours', { count: course.hours || 0 })}</p>
              </div>
              <Tag color={course.status === 'active' ? 'green' : 'red'} className="teacher-course-status">
                {course.status === 'active' ? t('active') : t('paused')}
              </Tag>
            </div>
          ))}
          {teacherCourses.length === 0 && (
            <div className="teacher-no-courses-message">
              {t('courseManagements.noCourses')}
            </div>
          )}
        </Card>

        <Card 
          className="teacher-assignments-card" 
          title={t('courseManagements.myAssignments')} 
          extra={
            assignments.length > 2 && (
              <Button 
                type="link" 
                onClick={toggleShowAllAssignments}
                className="teacher-view-more-btn"
                icon={<EllipsisOutlined />}
              >
                {showAllAssignments ? t('collapse') : t('viewMore', { count: assignments.length - 2 })}
              </Button>
            )
          }
        >
          {getDisplayedAssignments().map(assignment => (
            <div key={assignment.id} className="teacher-assignment-item">
              <div className="teacher-assignment-content">
                <div>
                  <h4>{assignment.title}</h4>
                  <p className="teacher-assignment-course">{assignment.course_name}</p>
                </div>
                <div className="teacher-assignment-details">
                  <span className="teacher-assignment-date">{t('date')}: {formatDate(assignment.created_at)}</span>
                </div>
              </div>
            </div>
          ))}
          {assignments.length === 0 && (
            <div className="teacher-no-assignments-message">
              {t('courseManagements.noAssignments')}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

export default TeacherOverview;