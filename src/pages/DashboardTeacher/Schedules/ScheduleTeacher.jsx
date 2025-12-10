import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useTranslation } from 'react-i18next';
import { ScheduleOutlined, PrinterOutlined } from '@ant-design/icons';
import './ScheduleTeacher.css';

const TeacherSchedule = () => {
  const { t } = useTranslation();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [scheduleData, setScheduleData] = useState({
    Sáng: Array(7).fill().map(() => [{ type: 'empty' }, { type: 'empty' }]),
    Chiều: Array(7).fill().map(() => [{ type: 'empty' }, { type: 'empty' }]),
    Tối: Array(7).fill().map(() => [{ type: 'empty' }, { type: 'empty' }])
  });
  const [loading, setLoading] = useState(false);
  const [teacherCourses, setTeacherCourses] = useState([]);

  const getWeekDates = useCallback((date) => {
    const startDate = new Date(date);
    const day = startDate.getDay();
    const diff = startDate.getDate() - day + (day === 0 ? -6 : 1);
    startDate.setDate(diff);
    startDate.setHours(0, 0, 0, 0);
    const weekDates = [];
    for (let i = 0; i < 7; i++) {
      const currentDate = new Date(startDate);
      currentDate.setDate(startDate.getDate() + i);
      currentDate.setHours(0, 0, 0, 0);
      weekDates.push(currentDate);
    }
    return weekDates;
  }, []);

  const fetchTeacherCourses = useCallback(async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get("http://localhost:5001/courses/mine", {
        headers: { Authorization: `Bearer ${token}` }
      });
      setTeacherCourses(res.data);
    } catch (err) {}
  }, []);

  const fetchTeacherSchedule = useCallback(async () => {
    const filterScheduleByTeacherCourses = (scheduleData) => {
      const teacherCourseIds = teacherCourses.map(course => course.id);
      const user = JSON.parse(localStorage.getItem("user"));
      const teacherId = user?.id;

      const filteredSchedule = {
        Sáng: Array(7).fill().map(() => []),
        Chiều: Array(7).fill().map(() => []),
        Tối: Array(7).fill().map(() => [])
      };

      Object.keys(scheduleData).forEach(period => {
        for (let dayIndex = 0; dayIndex < 7; dayIndex++) {
          const daySlots = scheduleData[period][dayIndex];
          if (Array.isArray(daySlots)) {
            daySlots.forEach((slot, slotIndex) => {
              if (slot && slot.type !== 'empty' && slot.course_id) {
                if (teacherCourseIds.includes(slot.course_id) || slot.teacher_id === teacherId) {
                  if (!filteredSchedule[period][dayIndex][slotIndex]) {
                    filteredSchedule[period][dayIndex][slotIndex] = slot;
                  }
                } else {
                  filteredSchedule[period][dayIndex][slotIndex] = { type: 'empty' };
                }
              } else {
                filteredSchedule[period][dayIndex][slotIndex] = slot || { type: 'empty' };
              }
            });
          }
        }
      });

      return filteredSchedule;
    };

    const token = localStorage.getItem("token");
    const dateString = currentDate.toISOString().split('T')[0];

    try {
      setLoading(true);
      const res = await axios.get(
        `http://localhost:5001/api/schedule/week?date=${dateString}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const filteredSchedule = filterScheduleByTeacherCourses(res.data);
      setScheduleData(filteredSchedule);
    } catch (err) {
      setScheduleData({
        Sáng: Array(7).fill().map(() => [{ type: 'empty' }, { type: 'empty' }]),
        Chiều: Array(7).fill().map(() => [{ type: 'empty' }, { type: 'empty' }]),
        Tối: Array(7).fill().map(() => [{ type: 'empty' }, { type: 'empty' }])
      });
    } finally {
      setLoading(false);
    }
  }, [currentDate, teacherCourses]);

  useEffect(() => {
    fetchTeacherCourses();
  }, [fetchTeacherCourses]);

  useEffect(() => {
    if (teacherCourses.length > 0) {
      fetchTeacherSchedule();
    }
  }, [fetchTeacherSchedule, teacherCourses]);

  const goToPreviousWeek = () => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      newDate.setDate(prev.getDate() - 7);
      return newDate;
    });
  };

  const goToNextWeek = () => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      newDate.setDate(prev.getDate() + 7);
      return newDate;
    });
  };

  const goToCurrentWeek = () => {
    setCurrentDate(new Date());
  };

  const DatePicker = () => {
    const [selectedDate, setSelectedDate] = useState(currentDate);

    const applyDate = () => {
      setCurrentDate(selectedDate);
      setShowDatePicker(false);
    };

    const cancelDate = () => {
      setShowDatePicker(false);
    };

    return (
      <div className="teacher-date-picker-overlay" onClick={cancelDate}>
        <div className="teacher-date-picker" onClick={(e) => e.stopPropagation()}>
          <h3>{t("teacherschedule.selectDate")}</h3>
          <input
            type="date"
            value={selectedDate.toISOString().split('T')[0]}
            onChange={(e) => setSelectedDate(new Date(e.target.value))}
            className="teacher-date-input"
          />
          <div className="teacher-date-picker-actions">
            <button onClick={cancelDate} className="teacher-cancel-btn">
              {t("teachercommon.cancel")}
            </button>
            <button onClick={applyDate} className="teacher-apply-btn">
              {t("teachercommon.apply")}
            </button>
          </div>
        </div>
      </div>
    );
  };

  const weekDates = getWeekDates(currentDate);
  const weekDays = weekDates.map(date => ({
    day: t(`teacherschedule.days.${date.getDay()}`),
    date: `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1)
      .toString()
      .padStart(2, '0')}/${date.getFullYear()}`
  }));

  const legendItems = [
    { type: 'theory', label: t("teacherschedule.lessonTypes.theory"), color: '#9E9E9E' },
    { type: 'practice', label: t("teacherschedule.lessonTypes.practice"), color: '#4CAF50' },
    { type: 'online', label: t("teacherschedule.lessonTypes.online"), color: '#2196F3' },
    { type: 'exam', label: t("teacherschedule.lessonTypes.exam"), color: '#FFEB3B' },
    { type: 'pause', label: t("teacherschedule.lessonTypes.pause"), color: '#FF9800' }
  ];

  const renderCell = (daySlots) => {
    if (!Array.isArray(daySlots)) {
      daySlots = [{ type: 'empty' }, { type: 'empty' }];
    }

    return (
      <div className="teacher-slots-container">
        {daySlots.map((slot, slotIndex) => {
          if (!slot) {
            slot = { type: 'empty' };
          }

          if (slot.type === 'empty') {
            return (
              <div key={slotIndex} className="teacher-empty-slot">
                <div className="teacher-empty-text">{t("teacherschedule.empty")}</div>
                <span className="teacher-slot-number">
                  {t("teacherschedule.slot")} {slotIndex + 1}
                </span>
              </div>
            );
          }

          return (
            <div key={slotIndex} className={`teacher-event-item ${slot.type}`}>
              <div className="teacher-event-top-bar">
                <div className="teacher-event-title">{slot.title}</div>
              </div>

              <div className="teacher-event-details">
                <div>
                  <strong>{t("teacherschedule.teacher")}:</strong>{" "}
                  {slot.teacher || t("teacherschedule.noTeacher")}
                </div>

                <div>
                  <strong>{t("teacherschedule.class")}:</strong>{" "}
                  {slot.url || t("teacherschedule.noClass")}
                </div>

                <div>
                  <strong>{t("teacherschedule.lesson")}:</strong>{" "}
                  {slot.lesson || t("teacherschedule.noLesson")}
                </div>

                <div>
                  <strong>{t("teacherschedule.type")}:</strong>{" "}
                  {t(`teacherschedule.lessonTypes.${slot.type}`)}
                </div>

                <div>
                  <strong>{t("teacherschedule.students")}:</strong>{" "}
                  {slot.enrolled_count || 0}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="teacher-schedule-container">
      {loading && (
        <div className="teacher-loading-overlay">
          <div className="teacher-loading-spinner">
            {t("teacherschedule.loading")}
          </div>
        </div>
      )}

      <div className="teacher-schedule-section">
        <div className="teacher-schedule-header teacher-header">
          <div className="teacher-header-top">
            <h1>{t("teacherschedule.mySchedule")}</h1>

            <div className="teacher-header-actions">
              <button className="teacher-print-btn" onClick={() => window.print()}>
                <span><PrinterOutlined /></span>
                {t("teacherschedule.print")}
              </button>
            </div>
          </div>

          <div className="teacher-header-info">
            <p className="teacher-courses-info">
              {t("teacherschedule.displayingCourses", {
                count: teacherCourses.length
              })}
            </p>
          </div>

          <div className="teacher-header-controls">
            <div className="teacher-date-controls">
              <div
                className="teacher-date-display"
                onClick={() => setShowDatePicker(true)}
              >
                <span className="teacher-calendar-icon">
                  <ScheduleOutlined />
                </span>

                <span className="teacher-date-text">
                  {currentDate.getDate().toString().padStart(2, '0')}/
                  {(currentDate.getMonth() + 1).toString().padStart(2, '0')}/
                  {currentDate.getFullYear()}
                </span>
              </div>

              <div className="teacher-navigation-buttons">
                <button className="teacher-nav-btn" onClick={goToPreviousWeek}>
                  {t("teacherschedule.previous")}
                </button>

                <button
                  className="teacher-nav-btn teacher-nav-btn-current"
                  onClick={goToCurrentWeek}
                >
                  {t("teacherschedule.today")}
                </button>

                <button className="teacher-nav-btn" onClick={goToNextWeek}>
                  {t("teacherschedule.next")}
                </button>
              </div>
            </div>
          </div>

          {showDatePicker && <DatePicker />}
        </div>

        <div className="teacher-schedule-table-container">
          <table className="teacher-schedule-table">
            <thead>
              <tr>
                <th className="teacher-header-cell teacher-time-header">
                  {t("teacherschedule.period")}
                </th>

                {weekDays.map((day, index) => (
                  <th key={index} className="teacher-header-cell">
                    <div className="teacher-day">{day.day}</div>
                    <div className="teacher-date">{day.date}</div>
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {['Sáng', 'Chiều', 'Tối'].map(period => {
                const keyMap = {
                  'Sáng': 'morning',
                  'Chiều': 'afternoon',
                  'Tối': 'evening'
                };
                return (
                  <tr key={period}>
                    <td className="teacher-time-period">
                      {t(`teacherschedule.periods.${keyMap[period]}`)}
                    </td>

                    {scheduleData[period].map((daySlots, dayIndex) => (
                      <td key={dayIndex} className="teacher-time-slot teacher-multi-slot">
                        {renderCell(daySlots)}
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="teacher-schedule-legend">
          <h3>{t("teacherschedule.legend")}</h3>

          <div className="teacher-legend-items">
            {legendItems.map((item, index) => (
              <div key={index} className="teacher-legend-item">
                <div
                  className="teacher-legend-color"
                  style={{ backgroundColor: item.color }}
                ></div>
                <span className="teacher-legend-label">{item.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TeacherSchedule;
