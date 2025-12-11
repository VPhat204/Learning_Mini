import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { ScheduleOutlined, PrinterOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import './ScheduleStudent.css';

const StudentSchedule = () => {
  const { t } = useTranslation();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [scheduleData, setScheduleData] = useState({
    Sáng: Array(7).fill().map(() => [{ type: 'empty' }, { type: 'empty' }]),
    Chiều: Array(7).fill().map(() => [{ type: 'empty' }, { type: 'empty' }]),
    Tối: Array(7).fill().map(() => [{ type: 'empty' }, { type: 'empty' }])
  });
  const [loading, setLoading] = useState(false);
  const [enrolledCourses, setEnrolledCourses] = useState([]);

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

  const fetchEnrolledCourses = useCallback(async () => {
    try {
      const token = localStorage.getItem("token");
      const userId = JSON.parse(localStorage.getItem("user"))?.id;
      
      const res = await axios.get(
        `https://learning-mini-be.onrender.com/users/${userId}/courses`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      setEnrolledCourses(res.data);
    } catch (err) {
      console.error('Error fetching enrolled courses:', err);
    }
  }, []);

  const fetchStudentSchedule = useCallback(async () => {
    const filterScheduleByEnrolledCourses = (scheduleData) => {
      const enrolledCourseIds = enrolledCourses.map(course => course.id);
      
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
                if (enrolledCourseIds.includes(slot.course_id)) {
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
        `https://learning-mini-be.onrender.com/api/schedule/week?date=${dateString}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      const filteredSchedule = filterScheduleByEnrolledCourses(res.data);
      setScheduleData(filteredSchedule);
      
    } catch (err) {
      console.log('Error fetching schedule:', err);
      setScheduleData({
        Sáng: Array(7).fill().map(() => [{ type: 'empty' }, { type: 'empty' }]),
        Chiều: Array(7).fill().map(() => [{ type: 'empty' }, { type: 'empty' }]),
        Tối: Array(7).fill().map(() => [{ type: 'empty' }, { type: 'empty' }])
      });
    } finally {
      setLoading(false);
    }
  }, [currentDate, enrolledCourses]);

  useEffect(() => {
    fetchEnrolledCourses();
  }, [fetchEnrolledCourses]);

  useEffect(() => { 
    if (enrolledCourses.length > 0) {
      fetchStudentSchedule(); 
    }
  }, [fetchStudentSchedule, enrolledCourses]);

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
      <div className="date-picker-overlay" onClick={cancelDate}>
        <div className="date-picker" onClick={(e) => e.stopPropagation()}>
          <h3>{t('studentschedule.datePicker.title')}</h3>
          <input 
            type="date" 
            value={selectedDate.toISOString().split('T')[0]}
            onChange={(e) => setSelectedDate(new Date(e.target.value))}
            className="date-input"
          />
          <div className="date-picker-actions">
            <button onClick={cancelDate} className="cancel-btn">{t('common.cancel')}</button>
            <button onClick={applyDate} className="apply-btn">{t('common.apply')}</button>
          </div>
        </div>
      </div>
    );
  };

  const weekDates = getWeekDates(currentDate);
  const weekDays = weekDates.map(date => ({
    day: t(`studentschedule.days.${date.getDay() === 0 ? 6 : date.getDay() - 1}`),
    date: `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getFullYear()}`
  }));

  const legendItems = [
    { type: 'theory', label: t('studentschedule.legend.theory'), color: '#9E9E9E' },
    { type: 'practice', label: t('studentschedule.legend.practice'), color: '#4CAF50' },
    { type: 'online', label: t('studentschedule.legend.online'), color: '#2196F3' },
    { type: 'exam', label: t('studentschedule.legend.exam'), color: '#FFEB3B' },
    { type: 'pause', label: t('studentschedule.legend.pause'), color: '#FF9800' }
  ];

  const renderCell = (daySlots, period, dayIndex) => {
    if (!Array.isArray(daySlots)) {
      daySlots = [{ type: 'empty' }, { type: 'empty' }];
    }

    return (
      <div className="slots-container">
        {daySlots.map((slot, slotIndex) => {
          if (!slot) {
            slot = { type: 'empty' };
          }

          if (slot.type === 'empty') {
            return (
              <div
                key={slotIndex}
                className="empty-slot"
              >
                <div className="empty-text">{t('studentschedule.emptySlot')}</div>
                <span className="slot-number">{t('studentschedule.slot')} {slotIndex + 1}</span>
              </div>
            );
          }

          return (
            <div
              key={`schedule-${slot.schedule_id}-${slotIndex}`}
              className={`event-item ${slot.type}`}
            >
              <div className="event-top-bar">
                <div className="event-title">{slot.title}</div>
              </div>
              
              <div className="event-details">
                <div><strong>{t('studentschedule.teacher')}:</strong> {slot.teacher || t('studentschedule.noTeacher')}</div>
                <div><strong>{t('studentschedule.class')}:</strong> {slot.url || t('studentschedule.noClass')}</div>
                <div><strong>{t('studentschedule.lesson')}:</strong> {slot.lesson || t('studentschedule.noLesson')}</div>
                <div><strong>{t('studentschedule.type')}:</strong> 
                  {slot.type === 'theory' && ` ${t('studentschedule.types.theory')}`}
                  {slot.type === 'practice' && ` ${t('studentschedule.types.practice')}`}
                  {slot.type === 'online' && ` ${t('studentschedule.types.online')}`}
                  {slot.type === 'exam' && ` ${t('studentschedule.types.exam')}`}
                  {slot.type === 'pause' && ` ${t('studentschedule.types.pause')}`}
                  {!slot.type && ` ${t('studentschedule.types.unknown')}`}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="student-schedule-container">
      {loading && (
        <div className="loading-overlay">
          <div className="loading-spinner">{t('studentschedule.loading')}</div>
        </div>
      )}
      
      <div className="schedule-section">
        <div className="schedule-header student-header">
          <div className="header-top">
            <h1>{t('studentschedule.student.title')}</h1>
            <div className="header-actions">
              <button className="print-btn" onClick={() => window.print()}>
                <span><PrinterOutlined /></span>
                {t('studentschedule.print')}
              </button>
            </div>
          </div>
          
          <div className="header-info">
            <p className="enrolled-info">
              {t('studentschedule.student.enrolledInfo', { count: enrolledCourses.length })}
            </p>
          </div>
          
          <div className="header-controls">
            <div className="date-controls">
              <div className="date-display" onClick={() => setShowDatePicker(true)}>
                <span className="calendar-icon"><ScheduleOutlined /></span>
                <span className="date-text">
                  {currentDate.getDate().toString().padStart(2, '0')}/{(currentDate.getMonth() + 1).toString().padStart(2, '0')}/{currentDate.getFullYear()}
                </span>
              </div>
              
              <div className="navigation-buttons">
                <button className="nav-btn" onClick={goToPreviousWeek}>{t('studentschedule.previous')}</button>
                <button className="nav-btn current" onClick={goToCurrentWeek}>{t('studentschedule.today')}</button>
                <button className="nav-btn" onClick={goToNextWeek}>{t('studentschedule.next')}</button>
              </div>
            </div>
          </div>

          {showDatePicker && <DatePicker />}
        </div>

        <div className="schedule-table-container">
          <table className="schedule-table">
            <thead>
              <tr>
                <th className="header-cell time-header">{t('studentschedule.period')}</th>
                {weekDays.map((day, index) => (
                  <th key={index} className="header-cell">
                    <div className="day">{day.day}</div>
                    <div className="date">{day.date}</div>
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
                    <td className="time-period">{t(`teacherschedule.periods.${keyMap[period]}`)}</td>
                    {scheduleData[period].map((daySlots, dayIndex) => (
                      <td 
                        key={dayIndex} 
                        className="time-slot multi-slot"
                      >
                        {renderCell(daySlots, period, dayIndex)}
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="schedule-legend">
          <h3>{t('studentschedule.legend.title')}</h3>
          <div className="legend-items">
            {legendItems.map((item, index) => (
              <div key={index} className="legend-item">
                <div className="legend-color" style={{ backgroundColor: item.color }}></div>
                <span className="legend-label">{item.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentSchedule;