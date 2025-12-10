import { useEffect, useState } from "react";
import { 
  Button, 
  Input, 
  message, 
  Collapse, 
  Tag,
  Progress,
  Empty,
  Spin,
  Modal
} from "antd";
import { 
  RocketOutlined, 
  FileTextOutlined, 
  CheckCircleOutlined,
  StarOutlined,
  ExclamationCircleOutlined,
  LockOutlined
} from "@ant-design/icons";
import { useTranslation } from "react-i18next";
import api from "../../../api";
import "./Assignment.css";

const { Panel } = Collapse;
const { TextArea } = Input;
const { confirm } = Modal;

export default function StudentAssignments() {
  const { t } = useTranslation();
  const [assignments, setAssignments] = useState([]);
  const [answers, setAnswers] = useState({});
  const [grades, setGrades] = useState({});
  const [totalScores, setTotalScores] = useState({});
  const [questions, setQuestions] = useState({});
  const [submittedAssignments, setSubmittedAssignments] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState({});
  const [messageApi, contextHolder] = message.useMessage();

  const token = localStorage.getItem("token");
  const studentId = token ? JSON.parse(atob(token.split(".")[1])).id : null;

  useEffect(() => {
    if (!studentId) return;
    
    const fetchData = async () => {
      setLoading(true);
      try {
        const coursesRes = await api.get(`/users/${studentId}/courses`);
        const courses = coursesRes.data;
        
        if (!courses.length) {
          setLoading(false);
          return;
        }

        const assignmentsPromises = courses.map(c => 
          api.get(`/assignments/course/${c.id}`)
        );
        const assignmentsResults = await Promise.all(assignmentsPromises);
        
        let allAssignments = [];
        assignmentsResults.forEach(r => {
          allAssignments = allAssignments.concat(r.data);
        });
        
        setAssignments(allAssignments);

        const detailPromises = allAssignments.map(async (a) => {
          const [questionsRes, answersRes] = await Promise.all([
            api.get(`/assignments/${a.id}/questions`),
            api.get(`/assignments/${a.id}/answers/student/${studentId}`)
          ]);

          setQuestions(prev => ({ ...prev, [a.id]: questionsRes.data }));

          const initialAnswers = {};
          questionsRes.data.forEach(q => {
            initialAnswers[q.id] = "";
          });
          setAnswers(prev => ({ ...prev, [a.id]: initialAnswers }));

          const gradeMap = {};
          const answerMap = {};
          let total = 0;
          let hasSubmission = false;
          
          answersRes.data.forEach(ans => {
            gradeMap[ans.question_id] = ans.score;
            answerMap[ans.question_id] = ans.answer_text;
            if (ans.score != null) total += ans.score;
            if (ans.submitted_at) hasSubmission = true;
          });

          if (hasSubmission) {
            setSubmittedAssignments(prev => new Set([...prev, a.id]));
          }

          setGrades(prev => ({ ...prev, [a.id]: gradeMap }));
          setAnswers(prev => ({ 
            ...prev, 
            [a.id]: { ...initialAnswers, ...answerMap } 
          }));
          setTotalScores(prev => ({ ...prev, [a.id]: total }));
        });

        await Promise.all(detailPromises);
        
      } catch (error) {
        console.error(error);
        messageApi.error(t('assignments.messages.loadError'));
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [studentId, messageApi, t]);

  const handleChange = (assignmentId, questionId, value) => {
    if (submittedAssignments.has(assignmentId)) return;
    
    setAnswers(prev => ({
      ...prev,
      [assignmentId]: { 
        ...(prev[assignmentId] || {}), 
        [questionId]: value 
      }
    }));
  };

  const handleSubmit = async (assignmentId) => {
    const assignmentAnswers = answers[assignmentId] || {};
    const assignmentQuestions = questions[assignmentId] || [];
    
    const unansweredQuestions = assignmentQuestions.filter(question => {
      const answer = assignmentAnswers[question.id];
      return !answer || answer.trim() === "";
    });

    if (unansweredQuestions.length > 0) {
      messageApi.error({
        content: t('assignments.messages.answerAllRequired'),
        duration: 3,
      });
      return;
    }

    setSubmitting(prev => ({ ...prev, [assignmentId]: true }));

    try {
      await api.post(`/assignments/${assignmentId}/submit-answers`, {
        answers: assignmentAnswers
      });
      
      setSubmittedAssignments(prev => new Set([...prev, assignmentId]));
      
      messageApi.success({
        content: t('assignments.messages.submitSuccess'),
        duration: 3,
      });
      
      await loadGrades(assignmentId);
      
      messageApi.info({
        content: t('assignments.messages.submitLocked'),
        duration: 4,
      });
      
    } catch (err) {
      console.error("Lỗi khi nộp bài:", err.response || err);
      if (err.response?.status === 409) {
        messageApi.error(t('assignments.messages.alreadySubmitted'));
        setSubmittedAssignments(prev => new Set([...prev, assignmentId]));
      } else {
        messageApi.error(err.response?.data?.message || t('assignments.messages.submitError'));
      }
    } finally {
      setSubmitting(prev => ({ ...prev, [assignmentId]: false }));
    }
  };

  const showSubmitConfirm = (assignmentId) => {
    const isSubmitting = submitting[assignmentId];
    const isSubmitted = submittedAssignments.has(assignmentId);
    
    if (isSubmitting || isSubmitted) return;

    confirm({
      title: t('assignments.confirm.submitTitle'),
      icon: <ExclamationCircleOutlined />,
      content: t('assignments.confirm.submitContent'),
      okText: t('common.yes'),
      cancelText: t('common.no'),
      onOk() {
        handleSubmit(assignmentId);
      },
    });
  };

  const loadGrades = async (assignmentId) => {
    try {
      const res = await api.get(`/assignments/${assignmentId}/answers/student/${studentId}`);
      const gradeMap = {};
      let total = 0;
      
      res.data.forEach(ans => {
        gradeMap[ans.question_id] = ans.score;
        if (ans.score != null) total += ans.score;
      });
      
      setGrades(prev => ({ ...prev, [assignmentId]: gradeMap }));
      setTotalScores(prev => ({ ...prev, [assignmentId]: total }));
    } catch (err) {
      console.error(err);
    }
  };

  const getAssignmentStatus = (assignmentId) => {
    const assignmentGrades = grades[assignmentId] || {};
    const isGraded = Object.values(assignmentGrades).some(score => score != null);
    const isSubmitted = submittedAssignments.has(assignmentId);
    
    if (isGraded) return { 
      status: 'graded', 
      text: t('assignments.status.graded'),
      icon: <CheckCircleOutlined />
    };
    if (isSubmitted) return { 
      status: 'submitted', 
      text: t('assignments.status.submitted'),
      icon: <LockOutlined />
    };
    return { 
      status: 'pending', 
      text: t('assignments.status.pending'),
      icon: <StarOutlined />
    };
  };

  const isAssignmentEditable = (assignmentId) => {
    const assignmentGrades = grades[assignmentId] || {};
    const isGraded = Object.values(assignmentGrades).some(score => score != null);
    const isSubmitted = submittedAssignments.has(assignmentId);
    
    return !isSubmitted && !isGraded;
  };

  const canSubmitAssignment = (assignmentId) => {
    if (submitting[assignmentId]) return false;
    
    const assignmentAnswers = answers[assignmentId] || {};
    const assignmentQuestions = questions[assignmentId] || [];
    
    if (!isAssignmentEditable(assignmentId)) return false;
    
    const allAnswered = assignmentQuestions.length > 0 && 
      assignmentQuestions.every(question => {
        const answer = assignmentAnswers[question.id];
        return answer && answer.trim() !== "";
      });
    
    return allAnswered;
  };

  const getSubmitButtonText = (assignmentId) => {
    if (submitting[assignmentId]) return t('assignments.status.submitting');
    if (submittedAssignments.has(assignmentId)) return t('assignments.status.submitted');
    return t('assignments.actions.submit');
  };

  if (loading) {
    return (
      <div className="assignments-loading">
        {contextHolder}
        <Spin size="large" />
        <p>{t('assignments.loading')}</p>
      </div>
    );
  }

  return (
    <div className="student-assignments">
      {contextHolder}
      <div className="assignments-header">
        <div className="header-content">
          <h1>
            <RocketOutlined /> {t('assignments.title')}
          </h1>
          <p>{t('assignments.subtitle')}</p>
        </div>
        <div className="header-stats">
          <div className="stat-card">
            <div className="stat-number">{assignments.length}</div>
            <div className="stat-label">{t('assignments.stats.total')}</div>
          </div>
          <div className="stat-card">
            <div className="stat-number">
              {assignments.filter(a => submittedAssignments.has(a.id)).length}
            </div>
            <div className="stat-label">{t('assignments.stats.submitted')}</div>
          </div>
          <div className="stat-card">
            <div className="stat-number">
              {assignments.filter(a => {
                const gradesObj = grades[a.id] || {};
                return Object.values(gradesObj).some(score => score != null);
              }).length}
            </div>
            <div className="stat-label">{t('assignments.stats.graded')}</div>
          </div>
        </div>
      </div>

      {assignments.length === 0 ? (
        <div className="assignments-empty">
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={t('assignments.empty.noAssignments')}
          >
            <Button type="primary">{t('assignments.actions.exploreCourses')}</Button>
          </Empty>
        </div>
      ) : (
        <div className="assignments-grid">
          {assignments.map(assignment => (
            <AssignmentCard
              key={assignment.id}
              assignment={assignment}
              questions={questions[assignment.id] || []}
              answers={answers[assignment.id] || {}}
              grades={grades[assignment.id] || {}}
              totalScore={totalScores[assignment.id]}
              onChange={handleChange}
              onSubmit={showSubmitConfirm}
              status={getAssignmentStatus(assignment.id)}
              isEditable={isAssignmentEditable(assignment.id)}
              canSubmit={canSubmitAssignment(assignment.id)}
              submitting={submitting[assignment.id]}
              submitButtonText={getSubmitButtonText(assignment.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function AssignmentCard({ 
  assignment, 
  questions, 
  answers, 
  grades, 
  totalScore, 
  onChange, 
  onSubmit,
  status,
  isEditable,
  canSubmit,
  submitting,
  submitButtonText
}) {
  const { t } = useTranslation();
  
  const completionRate = questions.length > 0 
    ? (Object.values(answers).filter(a => a && a.trim()).length / questions.length) * 100 
    : 0;

  const allQuestionsAnswered = questions.length > 0 && 
    Object.values(answers).filter(a => a && a.trim()).length === questions.length;

  return (
    <div className="assignment-card">
      <div className="assignment-card-header">
        <div className="assignment-title-section">
          <h3 className="assignment-title">
            <FileTextOutlined /> {assignment.title}
          </h3>
          <Tag 
            color={
              status.status === 'graded' ? 'green' : 
              status.status === 'submitted' ? 'blue' : 'orange'
            }
            className="status-tag"
            icon={status.icon}
          >
            {status.text}
          </Tag>
        </div>
        
        <div className="assignment-meta">
          <div className="meta-item">
            <span className="meta-label">{t('assignments.maxScore')}:</span>
            <span className="meta-value">{assignment.total_points}</span>
          </div>
          {totalScore != null && (
            <div className="meta-item highlight">
              <span className="meta-label">{t('assignments.yourScore')}:</span>
              <span className="meta-value">{totalScore}</span>
            </div>
          )}
        </div>
      </div>

      <div className="assignment-progress">
        <div className="progress-info">
          <span>{t('assignments.progress.completion')}</span>
          <span>{completionRate.toFixed(0)}%</span>
        </div>
        <Progress 
          percent={completionRate} 
          size="small"
          strokeColor={allQuestionsAnswered ? '#52c41a' : {
            '0%': '#4096ff',
            '100%': '#70b6ff',
          }}
          showInfo={false}
        />
        {!allQuestionsAnswered && !isEditable && (
          <div className="progress-warning">
            {t('assignments.messages.incompleteWarning')}
          </div>
        )}
      </div>

      <Collapse 
        className="questions-collapse"
        expandIconPosition="end"
      >
        <Panel 
          header={
            <div className="collapse-header">
              <span className="questions-count">
                {Object.values(answers).filter(a => a && a.trim()).length}/{questions.length} {t('assignments.progress.answered')}
              </span>
              {!isEditable && (
                <Tag color="red" className="edit-disabled-tag">
                  <LockOutlined /> {t('assignments.status.locked')}
                </Tag>
              )}
            </div>
          } 
          key={assignment.id}
        >
          <QuestionList 
            assignmentId={assignment.id}
            questions={questions}
            answers={answers}
            grades={grades}
            onChange={onChange}
            isEditable={isEditable}
          />
        </Panel>
      </Collapse>

      <div className="assignment-actions">
        <Button 
          type={status.status === 'submitted' ? "default" : "primary"}
          onClick={() => onSubmit(assignment.id)}
          className={`submit-button ${status.status === 'submitted' ? 'submitted' : ''} ${submitting ? 'submitting' : ''}`}
          icon={status.status === 'submitted' ? <LockOutlined /> : <RocketOutlined />}
          disabled={!canSubmit}
          loading={submitting}
        >
          {submitButtonText}
        </Button>
      </div>
    </div>
  );
}

function QuestionList({ assignmentId, questions, answers, grades, onChange, isEditable }) {
  const { t } = useTranslation();

  if (!questions.length) {
    return (
      <div className="questions-empty">
        <Empty
          description={t('assignments.empty.noQuestions')}
          image={Empty.PRESENTED_IMAGE_SIMPLE}
        />
      </div>
    );
  }

  return (
    <div className="questions-list">
      {questions.map((question, index) => {
        const userAnswer = answers[question.id] || "";
        const score = grades[question.id];
        const isAnswered = userAnswer && userAnswer.trim() !== "";

        return (
          <div key={question.id} className="question-item">
            <div className="question-header">
              <span className="question-number">{question.question_text}</span>
              <Tag 
                color={isAnswered ? "green" : "orange"} 
                className="points-tag"
              >
                {question.points} {t('assignments.points')}
                {isAnswered && " ✓"}
              </Tag>
              {!isEditable && (
                <Tag color="red" className="edit-disabled-indicator">
                  <LockOutlined /> {t('assignments.status.locked')}
                </Tag>
              )}
            </div>

            <div className="question-content">
              <p className="question-text">{question.text}</p>

              <div className="answer-section">
                <TextArea
                  className="answer-textarea"
                  value={userAnswer}
                  onChange={(e) => onChange(assignmentId, question.id, e.target.value)}
                  placeholder={isEditable ? t('assignments.placeholder.enterAnswer') : t('assignments.placeholder.submitted')}
                  rows={4}
                  showCount
                  maxLength={1000}
                  disabled={!isEditable}
                  status={!isAnswered && !isEditable ? "error" : ""}
                />
                {score != null && (
                  <div className="score-display">
                    <Tag color="blue">
                      {t('assignments.score')}: {score}/{question.points}
                    </Tag>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}