import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { PrinterOutlined, ScheduleOutlined, EditOutlined, SaveOutlined, CloseOutlined, PlusOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { message } from 'antd';
import './Schedule.css';

const ScheduleWithCourses = () => {
  const { t } = useTranslation();
  const [activeFilter, setActiveFilter] = useState('all');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [courses, setCourses] = useState([]);
  const [scheduleData, setScheduleData] = useState({
    morning: Array(7).fill().map(() => [{ type: 'empty' }, { type: 'empty' }]),
    afternoon: Array(7).fill().map(() => [{ type: 'empty' }, { type: 'empty' }]),
    evening: Array(7).fill().map(() => [{ type: 'empty' }, { type: 'empty' }])
  });
  const [loading, setLoading] = useState(false);
  const [editingCourse, setEditingCourse] = useState(null);
  const [editForm, setEditForm] = useState({
    url: '',
    lesson: '',
    type: 'theory'
  });
  const [showCourseModal, setShowCourseModal] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState({ period: '', dayIndex: -1, slotIndex: -1 });
  const [messageApi, contextHolder] = message.useMessage();

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

  const fetchSchedule = useCallback(async () => {
    const token = localStorage.getItem("token");  
    const dateString = currentDate.toISOString().split('T')[0];
    
    try {
      setLoading(true);
      const res = await axios.get(
        `https://learning-mini-be.onrender.com/api/schedule/week?date=${dateString}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      setScheduleData(res.data);
      
    } catch (err) {
      console.log('Error fetching schedule:', err);
      setScheduleData({
        morning: Array(7).fill().map(() => [{ type: 'empty' }, { type: 'empty' }]),
        afternoon: Array(7).fill().map(() => [{ type: 'empty' }, { type: 'empty' }]),
        evening: Array(7).fill().map(() => [{ type: 'empty' }, { type: 'empty' }])
      });
    } finally {
      setLoading(false);
    }
  }, [currentDate]);

  const fetchCourses = useCallback(async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get("https://learning-mini-be.onrender.com/courses", {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      setCourses(res.data);
      
    } catch (err) { 
      console.error('Error fetching courses:', err); 
    }
  }, []);

  useEffect(() => { 
    fetchSchedule(); 
  }, [fetchSchedule]);

  useEffect(() => {
    fetchCourses();
  }, [fetchCourses]);

  const handleEditCourse = async (slot, period, dayIndex, slotIndex) => {
    if (!slot.schedule_id) return;
    
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get(
        `https://learning-mini-be.onrender.com/api/schedules/${slot.schedule_id}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      const latestSchedule = response.data;
      
      setEditingCourse(slot.schedule_id);
      setEditForm({
        url: latestSchedule.url || '',
        lesson: latestSchedule.lesson || '',
        type: latestSchedule.type || 'theory'
      });
    } catch (err) {
      console.error('Error fetching schedule details:', err);
      setEditingCourse(slot.schedule_id);
      setEditForm({
        url: slot.url || '',
        lesson: slot.lesson || '',
        type: slot.type || 'theory'
      });
    }
  };

  const handleSaveEdit = async (scheduleId) => {
    if (!editForm.url.trim()) {
      messageApi.warning(t('schedule.alert.enterClass'));
      return;
    }

    if (!editForm.lesson.trim()) {
      messageApi.warning(t('schedule.alert.enterLesson'));
      return;
    }

    try {
      const token = localStorage.getItem("token");
      setLoading(true);

      await axios.put(
        `https://learning-mini-be.onrender.com/api/schedules/${scheduleId}`,
        {
          url: editForm.url,
          lesson: editForm.lesson,
          type: editForm.type
        },
        { 
          headers: { 
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          } 
        }
      );

      await fetchSchedule();

      setEditingCourse(null);
      messageApi.success(t('schedule.alert.updateSuccess'));

    } catch (err) {
      console.error('Error updating schedule:', err);
      messageApi.error(t('schedule.alert.updateError') + (err.response?.data?.message || err.message));
    } finally {
      setLoading(false);
    }
  };

  const handleCancelEdit = () => {
    setEditingCourse(null);
    setEditForm({
      url: '',
      lesson: '',
      type: 'theory'
    });
  };

  const handleRemoveSchedule = async (scheduleId, period, dayIndex, slotIndex) => {
    if (!scheduleId || !window.confirm(t('schedule.confirm.deleteSchedule'))) return;

    try {
      const token = localStorage.getItem("token");
      setLoading(true);

      await axios.delete(
        `https://learning-mini-be.onrender.com/api/schedules/${scheduleId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      await fetchSchedule();

    } catch (err) {
      console.error('Error removing schedule:', err);
      messageApi.success(t('schedule.alert.deleteError'));
    } finally {
      setLoading(false);
    }
  };

  const handleAddCourseClick = (period, dayIndex, slotIndex) => {
    setSelectedSlot({ period, dayIndex, slotIndex });
    setShowCourseModal(true);
  };

  const handleSelectCourse = async (course) => {
    if (!selectedSlot.period || selectedSlot.dayIndex === -1 || selectedSlot.slotIndex === -1) return;

    const { period, dayIndex, slotIndex } = selectedSlot;
    const weekDates = getWeekDates(currentDate);
    const date = weekDates[parseInt(dayIndex)];
    
    const localDate = new Date(date.getTime() - (date.getTimezoneOffset() * 60000));
    const dateString = localDate.toISOString().split('T')[0];
    
    try {
      const token = localStorage.getItem("token");
      setLoading(true);

      await axios.post(
        "https://learning-mini-be.onrender.com/api/schedule/assign",
        {
          course_id: course.id,
          date: dateString,
          period: period,
          lesson: course.lesson || t('schedule.defaultLesson', { count: course.lessons || 1 }),
          type: course.type || 'theory',
          order_index: slotIndex
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      await fetchSchedule();

      setShowCourseModal(false);
      setSelectedSlot({ period: '', dayIndex: -1, slotIndex: -1 });
      messageApi.success(t('schedule.alert.addSuccess'));

    } catch (err) {
      console.error('Error assigning course to schedule:', err);
      messageApi.error(t('schedule.alert.error') + (err.response?.data?.message || err.message));
    } finally {
      setLoading(false);
    }
  };

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

  const weekDates = getWeekDates(currentDate);
  const weekDays = weekDates.map(date => ({
    day: t(`schedule.days.${date.getDay() === 0 ? 6 : date.getDay() - 1}`),
    date: `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getFullYear()}`
  }));

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
      <div className="admin-date-picker-overlay" onClick={cancelDate}>
        <div className="admin-date-picker" onClick={(e) => e.stopPropagation()}>
          <h3>{t('schedule.datePicker.title')}</h3>
          <input 
            type="date" 
            value={selectedDate.toISOString().split('T')[0]}
            onChange={(e) => setSelectedDate(new Date(e.target.value))}
            className="admin-date-input"
          />
          <div className="admin-date-picker-actions">
            <button onClick={cancelDate} className="admin-cancel-btn">{t('common.cancel')}</button>
            <button onClick={applyDate} className="admin-apply-btn">{t('common.apply')}</button>
          </div>
        </div>
      </div>
    );
  };

  const legendItems = [
    { type: 'theory', label: t('schedule.legend.theory'), color: '#9E9E9E' },
    { type: 'practice', label: t('schedule.legend.practice'), color: '#4CAF50' },
    { type: 'online', label: t('schedule.legend.online'), color: '#2196F3' },
    { type: 'exam', label: t('schedule.legend.exam'), color: '#FFEB3B' },
    { type: 'pause', label: t('schedule.legend.pause'), color: '#FF9800' }
  ];

  const periodTranslations = {
    morning: t('schedule.periods.morning'),
    afternoon: t('schedule.periods.afternoon'),
    evening: t('schedule.periods.evening')
  };

  const renderCell = (daySlots, period, dayIndex) => {
    if (!Array.isArray(daySlots)) {
      daySlots = [{ type: 'empty' }, { type: 'empty' }];
    }

    return (
      <div className="admin-slots-container">
        {daySlots.map((slot, slotIndex) => {
          if (!slot) {
            slot = { type: 'empty' };
          }

          const isEditing = editingCourse === slot.schedule_id;

          if (slot.type === 'empty') {
            return (
              <div
                key={slotIndex}
                className="admin-empty-slot"
                onClick={() => handleAddCourseClick(period, dayIndex, slotIndex)}
              >
                <div className="admin-empty-icon"><PlusOutlined /></div>
                <span>{t('schedule.addCourse')}</span>
                <span className="admin-slot-number">{t('schedule.slot')} {slotIndex + 1}</span>
              </div>
            );
          }

          return (
            <div
              key={`schedule-${slot.schedule_id}-${slotIndex}`}
              className={`admin-event-item ${slot.type} ${isEditing ? 'editing' : ''}`}
            >
              <div className="admin-event-top-bar">
                <div className="admin-event-title">{slot.title}</div>
                <div className="admin-event-actions">
                  {!isEditing ? (
                    <button 
                      className="admin-edit-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEditCourse(slot, period, dayIndex, slotIndex);
                      }}
                      title={t('common.edit')}
                    >
                      <EditOutlined />
                    </button>
                  ) : (
                    <>
                      <button 
                        className="admin-save-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSaveEdit(slot.schedule_id);
                        }}
                        title={t('common.save')}
                      >
                        <SaveOutlined />
                      </button>
                      <button 
                        className="admin-cancel-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCancelEdit();
                        }}
                        title={t('common.cancel')}
                      >
                        <CloseOutlined />
                      </button>
                    </>
                  )}
                  <button 
                    className="admin-remove-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemoveSchedule(slot.schedule_id, period, dayIndex, slotIndex);
                    }}
                    title={t('schedule.deleteSchedule')}
                  >
                    ×
                  </button>
                </div>
              </div>
              
              {isEditing ? (
                <div className="admin-edit-form">
                  <div className="admin-form-group">
                    <label>{t('schedule.form.class')}:</label>
                    <input 
                      type="text" 
                      value={editForm.url}
                      onChange={(e) => setEditForm(prev => ({...prev, url: e.target.value}))}
                      placeholder={t('schedule.form.enterClass')}
                    />
                  </div>
                  <div className="admin-form-group">
                    <label>{t('schedule.form.lesson')}:</label>
                    <input 
                      type="text" 
                      value={editForm.lesson}
                      onChange={(e) => setEditForm(prev => ({...prev, lesson: e.target.value}))}
                      placeholder={t('schedule.form.enterLesson')}
                    />
                  </div>
                  <div className="admin-form-group">
                    <label>{t('schedule.form.type')}:</label>
                    <select 
                      value={editForm.type}
                      onChange={(e) => setEditForm(prev => ({...prev, type: e.target.value}))}
                    >
                      <option value="theory">{t('schedule.types.theory')}</option>
                      <option value="practice">{t('schedule.types.practice')}</option>
                      <option value="online">{t('schedule.types.online')}</option>
                      <option value="exam">{t('schedule.types.exam')}</option>
                      <option value="pause">{t('schedule.types.pause')}</option>
                    </select>
                  </div>
                </div>
              ) : (
                <div className="admin-event-details">
                  <div><strong>{t('schedule.teacher')}:</strong> {slot.teacher || t('schedule.noTeacher')}</div>
                  <div><strong>{t('schedule.form.class')}:</strong> {slot.url || t('schedule.noClass')}</div>
                  <div><strong>{t('schedule.form.lesson')}:</strong> {slot.lesson || t('schedule.noLesson')}</div>
                  <div><strong>{t('schedule.form.type')}:</strong> 
                    {slot.type === 'theory' && ` ${t('schedule.types.theory')}`}
                    {slot.type === 'practice' && ` ${t('schedule.types.practice')}`}
                    {slot.type === 'online' && ` ${t('schedule.types.online')}`}
                    {slot.type === 'exam' && ` ${t('schedule.types.exam')}`}
                    {slot.type === 'pause' && ` ${t('schedule.types.pause')}`}
                    {!slot.type && ` ${t('schedule.types.unknown')}`}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  const CourseSelectionModal = () => {
    if (!showCourseModal) return null;

    return (
      <div className="admin-modal-overlay" onClick={() => setShowCourseModal(false)}>
        <div className="admin-modal-content" onClick={(e) => e.stopPropagation()}>
          <div className="admin-modal-header">
            <h3>{t('schedule.selectCourse')}</h3>
            <button className="admin-close-btn" onClick={() => setShowCourseModal(false)}>×</button>
          </div>
          <div className="admin-modal-body">
            <div className="admin-courses-list">
              {courses.map(course => (
                <div 
                  key={course.id} 
                  className="admin-course-selection-item"
                  onClick={() => handleSelectCourse(course)}
                >
                  <div className="admin-course-selection-header">
                    <h4>{course.title}</h4>
                    <span className={`admin-course-type ${course.type}`}>{course.type}</span>
                  </div>
                  <div className="admin-course-selection-info">
                    <p><strong>{t('schedule.teacher')}:</strong> {course.teacher_name || t('schedule.teacherId', { id: course.teacher_id })}</p>
                    <p><strong>{t('schedule.form.lesson')}:</strong> {course.lesson || t('schedule.noLesson')}</p>
                    <p><strong>{t('schedule.form.class')}:</strong> {course.url || t('schedule.noClass')}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="admin-modal-footer">
            <button className="admin-cancel-btn" onClick={() => setShowCourseModal(false)}>{t('common.cancel')}</button>
          </div>
        </div>
      </div>
    );
  };

  const filterOptions = [
    { key: 'all', label: t('schedule.filters.all') },
    { key: 'study', label: t('schedule.filters.study') },
    { key: 'exam', label: t('schedule.filters.exam') }
  ];

  return (
    <div className="admin-schedule-with-courses">
      {contextHolder}
      {loading && (
        <div className="admin-loading-overlay">
          <div className="admin-loading-spinner">{t('common.processing')}</div>
        </div>
      )}
      
      <CourseSelectionModal />
      
      <div className="admin-schedule-section">
        <div className="admin-schedule-admin-header">
          <div className="admin-header-top">
            <h1>{t('schedule.title')}</h1>
            <div className="admin-header-actions">
              <button className="admin-print-btn" onClick={() => window.print()}>
                <span><PrinterOutlined /></span>
                {t('schedule.print')}
              </button>
            </div>
          </div>
          
          <div className="admin-header-controls">
            <div className="admin-filter-buttons">
              {filterOptions.map(filter => (
                <button 
                  key={filter.key}
                  className={`admin-filter-btn ${activeFilter === filter.key ? 'active' : ''}`}
                  onClick={() => setActiveFilter(filter.key)}
                >
                  {filter.label}
                </button>
              ))}
            </div>
            
            <div className="admin-date-controls">
              <div className="admin-date-display" onClick={() => setShowDatePicker(true)}>
                <span className="admin-calendar-icon"><ScheduleOutlined /></span>
                <span className="admin-date-text">
                  {currentDate.getDate().toString().padStart(2, '0')}/{(currentDate.getMonth() + 1).toString().padStart(2, '0')}/{currentDate.getFullYear()}
                </span>
              </div>
              
              <div className="admin-navigation-buttons">
                <button className="admin-nav-btn" onClick={goToPreviousWeek}>{t('schedule.previous')}</button>
                <button className="admin-nav-btn current" onClick={goToCurrentWeek}>{t('schedule.today')}</button>
                <button className="admin-nav-btn" onClick={goToNextWeek}>{t('schedule.next')}</button>
              </div>
            </div>
          </div>

          {showDatePicker && <DatePicker />}
        </div>

        <div className="admin-schedule-table-container">
          <table className="admin-schedule-table">
            <thead>
              <tr>
                <th className="admin-header-cell admin-time-header">{t('schedule.period')}</th>
                {weekDays.map((day, index) => (
                  <th key={index} className="admin-header-cell">
                    <div className="admin-day">{day.day}</div>
                    <div className="admin-date">{day.date}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Object.keys(scheduleData).map(period => (
                <tr key={period}>
                  <td className="admin-time-period">{periodTranslations[period]}</td>
                  {scheduleData[period].map((daySlots, dayIndex) => (
                    <td 
                      key={dayIndex} 
                      className="admin-time-slot admin-multi-slot"
                    >
                      {renderCell(daySlots, period, dayIndex)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="admin-schedule-legend">
          <h3>{t('schedule.legend.title')}</h3>
          <div className="admin-legend-items">
            {legendItems.map((item, index) => (
              <div key={index} className="admin-legend-item">
                <div className="admin-legend-color" style={{ backgroundColor: item.color }}></div>
                <span className="admin-legend-label">{item.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ScheduleWithCourses;