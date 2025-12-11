import React, { useEffect, useState } from 'react';
import { Pagination } from 'antd';
import { useTranslation } from 'react-i18next';
import './TableScore.css';

export default function GradeTable() {
  const { t } = useTranslation();
  const [gradeData, setGradeData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [activeTab, setActiveTab] = useState('overview'); 
  
  const [overviewPage, setOverviewPage] = useState(1);
  const [detailsPage, setDetailsPage] = useState(1);
  const [pageSize, setPageSize] = useState(6);
  
  const [expandedCourses, setExpandedCourses] = useState({});
  const [showAllDetails, setShowAllDetails] = useState(false);

  useEffect(() => {
    const fetchGrades = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem('token') || sessionStorage.getItem('token');
        
        const response = await fetch("https://learning-mini-be.onrender.com/api/student/grades", {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.success) {
          setGradeData(data.data);
          const initialExpanded = {};
          data.data.courses.forEach(course => {
            initialExpanded[course.course_id] = false;
          });
          setExpandedCourses(initialExpanded);
        } else {
          throw new Error(data.message || t('gradeTable.loading.error'));
        }
      } catch (err) {
        console.error("Error fetching grades:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchGrades();
  }, [t]);

  const getGradeColor = (percentage) => {
    if (percentage >= 90) return '#4CAF50'; 
    if (percentage >= 80) return '#8BC34A'; 
    if (percentage >= 70) return '#FFC107'; 
    if (percentage >= 60) return '#FF9800'; 
    return '#F44336'; 
  };

  const getGPAColor = (gpa) => {
    if (gpa >= 3.7) return '#4CAF50'; 
    if (gpa >= 3.0) return '#8BC34A'; 
    if (gpa >= 2.0) return '#FFC107'; 
    if (gpa >= 1.0) return '#FF9800'; 
    return '#F44336';
  };

  const overviewIndexLast = overviewPage * pageSize;
  const overviewIndexFirst = overviewIndexLast - pageSize;
  const currentOverviewCourses = gradeData ? gradeData.courses.slice(overviewIndexFirst, overviewIndexLast) : [];
  
  const detailsIndexLast = detailsPage * pageSize;
  const detailsIndexFirst = detailsIndexLast - pageSize;
  const currentDetailsCourses = gradeData ? gradeData.courses.slice(detailsIndexFirst, detailsIndexLast) : [];

  const toggleAllDetails = () => {
    if (showAllDetails) {
      const allCollapsed = {};
      gradeData.courses.forEach(course => {
        allCollapsed[course.course_id] = false;
      });
      setExpandedCourses(allCollapsed);
    } else {
      const allExpanded = {};
      gradeData.courses.forEach(course => {
        allExpanded[course.course_id] = true;
      });
      setExpandedCourses(allExpanded);
    }
    setShowAllDetails(!showAllDetails);
  };

  const toggleCourseExpansion = (courseId) => {
    setExpandedCourses(prev => ({
      ...prev,
      [courseId]: !prev[courseId]
    }));
  };

  const handleOverviewPageChange = (page, newPageSize) => {
    setOverviewPage(page);
    if (newPageSize) {
      setPageSize(newPageSize);
    }
  };

  const handleDetailsPageChange = (page, newPageSize) => {
    setDetailsPage(page);
    if (newPageSize) {
      setPageSize(newPageSize);
    }
  };

  if (loading) return (
    <div className="loading-container">
      <div className="spinner"></div>
      <p>{t('gradeTable.loading.message')}</p>
    </div>
  );

  if (error) return (
    <div className="error-container">
      <h2>{t('gradeTable.loading.error')}</h2>
      <p>{error}</p>
      <button onClick={() => window.location.reload()}>{t('gradeTable.loading.tryAgain')}</button>
    </div>
  );

  if (!gradeData || gradeData.courses.length === 0) return (
    <div className="empty-container">
      <h2>{t('gradeTable.loading.noData')}</h2>
      <p>{t('gradeTable.loading.noDataMessage')}</p>
    </div>
  );

  return (
    <div className="grade-container">
      <div className="grade-header">
        <h1 className="title">{t('gradeTable.title')}</h1>
        <p className="student-id">{t('gradeTable.studentId')}: {gradeData.student_id}</p>
        
        <div className="summary-cards">
          <div className="summary-card">
            <h3>{t('gradeTable.summaryCards.totalCourses')}</h3>
            <p className="count">{gradeData.summary.total_courses}</p>
          </div>
          <div className="summary-card">
            <h3>{t('gradeTable.summaryCards.gradedAssignments')}</h3>
            <p className="count">{gradeData.summary.graded_assignments}/{gradeData.summary.total_assignments}</p>
          </div>
          <div className="summary-card">
            <h3>{t('gradeTable.summaryCards.overallGPA')}</h3>
            <p 
              className="gpa-score" 
              style={{ color: getGPAColor(gradeData.summary.overall_gpa) }}
            >
              {gradeData.summary.overall_gpa}
            </p>
            <small>{t('gradeTable.summaryCards.totalCredits')}: {gradeData.summary.total_credits}</small>
          </div>
        </div>
      </div>

      <div className="tabs">
        <button 
          className={`tab ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => {
            setActiveTab('overview');
            setOverviewPage(1);
          }}
        >
          {t('gradeTable.tabs.overview')}
        </button>
        <button 
          className={`tab ${activeTab === 'details' ? 'active' : ''}`}
          onClick={() => {
            setActiveTab('details');
            setDetailsPage(1);
          }}
        >
          {t('gradeTable.tabs.details')}
        </button>
      </div>

      {activeTab === 'overview' ? (
        <div className="courses-overview">
          <div className="courses-header">
            <h2>{t('gradeTable.coursesOverview.header')} ({gradeData.courses.length} {t('gradeTable.coursesOverview.header').toLowerCase()})</h2>
            <div className="courses-summary">
              <span>{t('gradeTable.coursesOverview.showingPerPage')}: {Math.min(pageSize, currentOverviewCourses.length)}</span>
            </div>
          </div>
          
          <div className="courses-grid">
            {currentOverviewCourses.map((course, index) => (
              <div 
                key={course.course_id} 
                className="course-card"
                onClick={() => setSelectedCourse(course)}
              >
                <div className="course-header">
                  <div className="course-number-badge">#{overviewIndexFirst + index + 1}</div>
                  <h3>{course.course_name}</h3>
                  <span className="teacher">{t('gradeTable.coursesOverview.courseCard.teacher')}: {course.teacher_name}</span>
                </div>
                
                <div className="course-grades">
                  <div className="grade-info">
                    <div className="grade-circle">
                      <svg width="80" height="80" viewBox="0 0 100 100">
                        <circle 
                          cx="50" 
                          cy="50" 
                          r="40" 
                          fill="none" 
                          stroke="#f0f0f0" 
                          strokeWidth="8"
                        />
                        <circle 
                          cx="50" 
                          cy="50" 
                          r="40" 
                          fill="none" 
                          stroke={getGradeColor(course.average_percentage)}
                          strokeWidth="8"
                          strokeDasharray={`${2 * Math.PI * 40}`}
                          strokeDashoffset={`${2 * Math.PI * 40 * (1 - course.average_percentage / 100)}`}
                          strokeLinecap="round"
                          transform="rotate(-90 50 50)"
                        />
                        <text 
                          x="50" 
                          y="55" 
                          textAnchor="middle" 
                          fontSize="18" 
                          fontWeight="bold"
                          fill={getGradeColor(course.average_percentage)}
                        >
                          {course.average_percentage.toFixed(1)}%
                        </text>
                      </svg>
                    </div>
                    <div className="grade-details">
                      <p className="overall-grade">
                        {t('gradeTable.coursesOverview.courseCard.overallGrade')}: <strong>{course.overall_grade}</strong>
                      </p>
                      <p className="assignments-count">
                        {t('gradeTable.coursesOverview.courseCard.assignments')}: {course.assignments.length}
                      </p>
                    </div>
                  </div>
                  
                  <div className="course-summary">
                    <p>{t('gradeTable.coursesOverview.courseCard.totalScore')}: {course.total_obtained_score}/{course.total_max_score}</p>
                    <p>{t('gradeTable.coursesOverview.courseCard.completionRate')}: {course.assignments.filter(a => a.completed).length}/{course.assignments.length}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          <div className="pagination-wrapper">
            <Pagination
              current={overviewPage}
              pageSize={pageSize}
              total={gradeData.courses.length}
              onChange={handleOverviewPageChange}
              onShowSizeChange={(current, size) => {
                setPageSize(size);
                setOverviewPage(1);
              }}
              showSizeChanger
              showQuickJumper
              showTotal={(total, range) => t('gradeTable.pagination.showTotal', {
                start: range[0],
                end: range[1],
                total
              })}
              pageSizeOptions={t('gradeTable.pagination.pageSizeOptions', { returnObjects: true })}
              className="ant-pagination-custom"
            />
          </div>
        </div>
      ) : (
        <div className="assignments-details">
          <div className="details-header">
            <h2>{t('gradeTable.assignmentsDetails.header')} ({gradeData.courses.length} {t('gradeTable.assignmentsDetails.header').toLowerCase()})</h2>
            <div className="expand-controls">
              <button 
                className={`toggle-all-btn ${showAllDetails ? 'active' : ''}`}
                onClick={toggleAllDetails}
              >
                {showAllDetails 
                  ? t('gradeTable.assignmentsDetails.expandControls.collapseAll')
                  : t('gradeTable.assignmentsDetails.expandControls.expandAll')
                }
              </button>
            </div>
          </div>
          
          <p className="instructions">
            <strong>{t('gradeTable.assignmentsDetails.instructions')}</strong>
          </p>
          
          <div className="course-details-list">
            {currentDetailsCourses.map((course, index) => {
              const isExpanded = expandedCourses[course.course_id];
              
              return (
                <div key={course.course_id} className="course-detail-item">
                  <div 
                    className="course-summary-header"
                    onClick={() => toggleCourseExpansion(course.course_id)}
                  >
                    <div className="course-summary-info">
                      <div className="course-number-display">
                        <span className="course-index">#{detailsIndexFirst + index + 1}</span>
                      </div>
                      <div className="course-title-wrapper">
                        <h3 className="course-title-summary">
                          {course.course_name}
                          <span className="course-teacher"> - {t('gradeTable.assignmentsDetails.courseDetail.teacher')}: {course.teacher_name}</span>
                        </h3>
                        <div className="course-summary-stats">
                          <span className="stat-item">
                            <span className="stat-label">{t('gradeTable.assignmentsDetails.courseDetail.averageScore')}:</span>
                            <span className="stat-value" style={{ color: getGradeColor(course.average_percentage) }}>
                              {course.average_percentage.toFixed(1)}%
                            </span>
                          </span>
                          <span className="stat-item">
                            <span className="stat-label">{t('gradeTable.assignmentsDetails.courseDetail.grade')}:</span>
                            <span className="stat-value">{course.overall_grade}</span>
                          </span>
                          <span className="stat-item">
                            <span className="stat-label">{t('gradeTable.assignmentsDetails.courseDetail.assignmentsCount')}:</span>
                            <span className="stat-value">{course.assignments.length}</span>
                          </span>
                        </div>
                      </div>
                    </div>
                    <button 
                      className={`expand-indicator ${isExpanded ? 'expanded' : ''}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleCourseExpansion(course.course_id);
                      }}
                    >
                      {isExpanded 
                        ? t('gradeTable.assignmentsDetails.courseDetail.collapse')
                        : t('gradeTable.assignmentsDetails.courseDetail.viewDetails')
                      }
                    </button>
                  </div>
                  
                  {isExpanded && (
                    <div className="course-detail-content">
                      <div className="assignments-table-wrapper">
                        <table className="assignments-table">
                          <thead>
                            <tr>
                              <th style={{ width: '50px', textAlign: 'center' }}>{t('gradeTable.assignmentsDetails.assignmentsTable.headers.stt')}</th>
                              <th>{t('gradeTable.assignmentsDetails.assignmentsTable.headers.assignment')}</th>
                              <th>{t('gradeTable.assignmentsDetails.assignmentsTable.headers.maxScore')}</th>
                              <th>{t('gradeTable.assignmentsDetails.assignmentsTable.headers.obtainedScore')}</th>
                              <th>{t('gradeTable.assignmentsDetails.assignmentsTable.headers.percentage')}</th>
                              <th>{t('gradeTable.assignmentsDetails.assignmentsTable.headers.grade')}</th>
                              <th>{t('gradeTable.assignmentsDetails.assignmentsTable.headers.submissionDate')}</th>
                              <th>{t('gradeTable.assignmentsDetails.assignmentsTable.headers.status')}</th>
                            </tr>
                          </thead>
                          <tbody>
                            {course.assignments.length > 0 ? (
                              course.assignments.map((assignment, idx) => (
                                <tr key={idx} className={assignment.is_graded ? 'graded' : 'pending'}>
                                  <td style={{ textAlign: 'center', fontWeight: 'bold' }}>{idx + 1}</td>
                                  <td>{assignment.assignment_name}</td>
                                  <td style={{ textAlign: 'center' }}>{assignment.max_score}</td>
                                  <td style={{ textAlign: 'center', fontWeight: 'bold' }}>
                                    <span className="score-cell">
                                      {assignment.obtained_score !== null 
                                        ? assignment.obtained_score 
                                        : t('gradeTable.assignmentsDetails.assignmentsTable.notGraded')}
                                    </span>
                                  </td>
                                  <td>
                                    <div className="percentage-bar">
                                      <div 
                                        className="percentage-fill"
                                        style={{
                                          width: `${assignment.percentage}%`,
                                          backgroundColor: getGradeColor(assignment.percentage)
                                        }}
                                      ></div>
                                      <span className="percentage-text">
                                        {assignment.percentage}%
                                      </span>
                                    </div>
                                  </td>
                                  <td style={{ textAlign: 'center' }}>
                                    <span 
                                      className="grade-letter"
                                      style={{ color: getGradeColor(assignment.percentage) }}
                                    >
                                      {assignment.grade_letter}
                                    </span>
                                  </td>
                                  <td style={{ textAlign: 'center' }}>
                                    {assignment.submitted_at 
                                      ? new Date(assignment.submitted_at).toLocaleDateString()
                                      : t('gradeTable.assignmentsDetails.assignmentsTable.notSubmitted')
                                    }
                                  </td>
                                  <td style={{ textAlign: 'center' }}>
                                    <span className={`status-badge ${assignment.is_graded ? 'graded' : 'pending'}`}>
                                      {assignment.is_graded 
                                        ? t('gradeTable.assignmentsDetails.assignmentsTable.statuses.graded')
                                        : t('gradeTable.assignmentsDetails.assignmentsTable.statuses.pending')
                                      }
                                    </span>
                                  </td>
                                </tr>
                              ))
                            ) : (
                              <tr>
                                <td colSpan="8" className="no-assignments">
                                  {t('gradeTable.assignmentsDetails.assignmentsTable.noAssignments')}
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>          
          <div className="pagination-wrapper">
            <Pagination
              current={detailsPage}
              pageSize={pageSize}
              total={gradeData.courses.length}
              onChange={handleDetailsPageChange}
              onShowSizeChange={(current, size) => {
                setPageSize(size);
                setDetailsPage(1);
              }}
              showSizeChanger
              showQuickJumper
              showTotal={(total, range) => t('gradeTable.pagination.showTotal', {
                start: range[0],
                end: range[1],
                total
              })}
              pageSizeOptions={t('gradeTable.pagination.pageSizeOptions', { returnObjects: true })}
              className="ant-pagination-custom"
            />
          </div>
        </div>
      )}

      {selectedCourse && (
        <div className="modal-overlay" onClick={() => setSelectedCourse(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{selectedCourse.course_name}</h2>
              <button className="close-btn" onClick={() => setSelectedCourse(null)}>×</button>
            </div>
            <div className="modal-body">
              <div className="modal-summary">
                <div className="modal-grade">
                  <h3>{t('gradeTable.modal.summary')}</h3>
                  <p className="average-score">
                    {selectedCourse.average_percentage.toFixed(1)}%
                  </p>
                  <p className="grade-letter">{t('gradeTable.modal.grade')}: {selectedCourse.overall_grade}</p>
                </div>
                <div className="modal-stats">
                  <p>{t('gradeTable.modal.totalAssignments')}: {selectedCourse.assignments.length}</p>
                  <p>{t('gradeTable.modal.completed')}: {selectedCourse.assignments.filter(a => a.completed).length}</p>
                  <p>{t('gradeTable.modal.graded')}: {selectedCourse.assignments.filter(a => a.is_graded).length}</p>
                </div>
              </div>
              
              <h3>{t('gradeTable.modal.assignmentList')}</h3>
              <ul className="assignment-list">
                {selectedCourse.assignments.map((assignment, idx) => (
                  <li key={idx} className="assignment-item">
                    <div className="assignment-info">
                      <h4>{assignment.assignment_name}</h4>
                      <p>{t('assignments.points')}: {assignment.obtained_score || t('gradeTable.assignmentsDetails.assignmentsTable.notGraded')}/{assignment.max_score}</p>
                    </div>
                    <div className="assignment-status">
                      <span className={`status ${assignment.is_graded ? 'graded' : 'pending'}`}>
                        {assignment.is_graded 
                          ? t('gradeTable.assignmentsDetails.assignmentsTable.statuses.graded')
                          : t('gradeTable.assignmentsDetails.assignmentsTable.statuses.pending')
                        }
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
            <div className="modal-footer">
              <button className="close-modal-btn" onClick={() => setSelectedCourse(null)}>
                {t('gradeTable.modal.close')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}