import { useEffect, useState } from "react";
import { Card, Button, Modal, Form, Input, Select, message, Table, Popconfirm } from "antd";
import { useTranslation } from "react-i18next";
import api from "../../../api";
import "./MyAssignments.css";

export default function MyAssignments() {
  const { t } = useTranslation();
  const [courses, setCourses] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [visibleAssignmentModal, setVisibleAssignmentModal] = useState(false);
  const [visibleQuestionModal, setVisibleQuestionModal] = useState(false);
  const [currentAssignment, setCurrentAssignment] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [grading, setGrading] = useState({});
  const [form] = Form.useForm();
  const [questionForm] = Form.useForm();

  useEffect(() => {
    api.get("/courses").then(res => {
      setCourses(res.data);
      if (res.data.length > 0) setSelectedCourse(res.data[0].id);
    });
  }, []);

  useEffect(() => {
    if (!selectedCourse) return;
    setAssignments([]);
    setSubmissions([]);
    setCurrentAssignment(null);
    setQuestions([]);
    api.get(`/assignments/course/${selectedCourse}`).then(res => setAssignments(res.data));
  }, [selectedCourse]);

  const handleCreateAssignment = (values) => {
    api.post("/assignments", values)
      .then(() => {
        message.success(t("assign.successCreate"));
        form.resetFields();
        setVisibleAssignmentModal(false);
        api.get(`/assignments/course/${selectedCourse}`).then(res => setAssignments(res.data));
      })
      .catch(() => message.error(t("assign.errorCreate")));
  };

  const handleAddQuestion = (values) => {
    api.post(`/assignments/${currentAssignment}/questions`, values)
      .then(() => {
        message.success(t("assign.successAddQuestion"));
        questionForm.resetFields();
        loadQuestions(currentAssignment);
      })
      .catch(err => message.error(err.response?.data?.message || t("assign.errorAddQuestion")));
  };

  const loadQuestions = (assignmentId) => {
    api.get(`/assignments/${assignmentId}/questions`).then(res => setQuestions(res.data));
  };

  const handleDeleteQuestion = (questionId) => {
    api.delete(`/assignments/${currentAssignment}/questions/${questionId}`)
      .then(() => {
        message.success(t("assign.successDeleteQuestion"));
        loadQuestions(currentAssignment);
      })
      .catch(() => message.error(t("assign.errorDeleteQuestion")));
  };

  const viewSubmissions = async (assignmentId) => {
    const res = await api.get(`/assignments/${assignmentId}/submissions`);
    const submissionsWithAnswers = await Promise.all(
      res.data.map(async sub => {
        const answersRes = await api.get(`/assignments/${assignmentId}/answers/student/${sub.student_id}`);
        return { ...sub, answers: answersRes.data };
      })
    );
    setSubmissions(submissionsWithAnswers);
    setCurrentAssignment(assignmentId);
    const newGrading = {};
    submissionsWithAnswers.forEach(sub => {
      newGrading[sub.submission_id] = {};
      sub.answers.forEach(a => newGrading[sub.submission_id][a.question_id] = a.score ?? 0);
    });
    setGrading(newGrading);
  };

  const handleChangeScore = (submissionId, questionId, value) => {
    setGrading(prev => ({
      ...prev,
      [submissionId]: { ...prev[submissionId], [questionId]: value !== "" ? Number(value) : undefined },
    }));
  };

  const confirmGrading = async () => {
    try {
      const payload = [];
      submissions.forEach(sub => {
        sub.answers.forEach(a => {
          const score = grading[sub.submission_id]?.[a.question_id];
          if (score !== undefined) {
            payload.push({
              submission_id: sub.submission_id,
              question_id: a.question_id,
              score: Number(score)
            });
          }
        });
      });

      if (payload.length === 0) return message.warning(t("assign.noValidScore"));
      if (!currentAssignment) return message.error(t("assign.errorAssignmentNotFound"));

      await api.post(`/assignments/${currentAssignment}/grade-answers-bulk`, { grades: payload });
      message.success(t("assign.successGrade"));
      viewSubmissions(currentAssignment);
    } catch {
      message.error(t("assign.errorGrade"));
    }
  };

  const handleDeleteAnswer = (studentId, questionId) => {
    api.delete(`/assignments/${currentAssignment}/answers/${studentId}/${questionId}`)
      .then(() => {
        message.success(t("assign.successDeleteAnswer"));
        viewSubmissions(currentAssignment);
      })
      .catch(() => message.error(t("assign.errorDeleteAnswer")));
  };

  const handleDeleteSubmission = (studentId) => {
    api.delete(`/assignments/${currentAssignment}/submissions/${studentId}`)
      .then(() => {
        message.success(t("assign.successDeleteSubmission"));
        viewSubmissions(currentAssignment);
      })
      .catch(() => message.error(t("assign.errorDeleteSubmission")));
  };

  const submissionColumns = [
    { title: t("assign.student"), dataIndex: "student_name" },
    {
      title: t("assign.answersAndScore"),
      render: (_, record) => (
        <div className="answers-box">
          {(record.answers || []).map((a, index) => (
            <div key={a.question_id} className="answer-item">
              <p><b>{t("assign.question")} {index + 1}:</b> {a.answer_text}</p>
              <div className="answer-item-info">
                <Input
                  type="number"
                  min={0}
                  placeholder={t("assign.score")}
                  value={grading[record.submission_id]?.[a.question_id] ?? 0}
                  onChange={e => handleChangeScore(record.submission_id, a.question_id, e.target.value)}
                  className="score-input"
                />
                <Popconfirm
                  title={t("assign.confirmDeleteAnswer")}
                  onConfirm={() => handleDeleteAnswer(record.student_id, a.question_id)}
                >
                  <Button danger size="small" className="assign-danger-btn">{t("assign.delete")}</Button>
                </Popconfirm>
              </div>
            </div>
          ))}
          <Popconfirm
            title={t("assign.confirmDeleteSubmission")}
            onConfirm={() => handleDeleteSubmission(record.student_id)}
          >
            <Button danger className="assign-danger-btn">{t("assign.deleteSubmission")}</Button>
          </Popconfirm>
        </div>
      ),
    },
  ];

  return (
    <div className="assign-container">
      <Card
        title={t("assign.assignments")}
        extra={<Button type="primary" onClick={() => setVisibleAssignmentModal(true)} className="assign-primary-btn">{t("assign.create")}</Button>}
        className="assign-card"
      >
        <Select
          className="course-select"
          value={selectedCourse}
          onChange={val => setSelectedCourse(val)}
          options={courses.map(c => ({ label: c.title, value: c.id }))}
        />

        {assignments.map(a => (
          <Card key={a.id} className="assignment-item">
            <h3>{a.title}</h3>
            <p>{t("assign.maxScore")}: {a.total_points}</p>
            <Button type="primary" className="assign-primary-btn" onClick={() => { setCurrentAssignment(a.id); setVisibleQuestionModal(true); loadQuestions(a.id); }}>{t("assign.addQuestion")}</Button>
            <Button className="ml10 assign-primary-btn" onClick={() => viewSubmissions(a.id)}>{t("assign.viewSubmissions")}</Button>
          </Card>
        ))}
      </Card>

      <Modal 
        open={visibleAssignmentModal} 
        onCancel={() => setVisibleAssignmentModal(false)} 
        onOk={() => form.submit()} 
        title={t("assign.createNew")}
        className="assign-modal"
      >
        <Form form={form} layout="vertical" onFinish={handleCreateAssignment}>
          <Form.Item name="course_id" label={t("assign.course")} initialValue={selectedCourse} rules={[{ required: true }]}>
            <Select options={courses.map(c => ({ label: c.title, value: c.id }))} />
          </Form.Item>
          <Form.Item name="title" label={t("assign.title")} rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="total_points" label={t("assign.maxScore")}>
            <Input type="number" />
          </Form.Item>
        </Form>
      </Modal>

      <Modal 
        open={visibleQuestionModal} 
        onCancel={() => setVisibleQuestionModal(false)} 
        onOk={() => questionForm.submit()} 
        title={t("assign.addQuestion")}
        className="assign-modal"
      >
        <Form form={questionForm} layout="vertical" onFinish={handleAddQuestion}>
          <Form.Item name="question_text" label={t("assign.question")} rules={[{ required: true }]}>
            <Input.TextArea />
          </Form.Item>
          <Form.Item name="points" label={t("assign.score")} rules={[{ required: true }]}>
            <Input type="number" />
          </Form.Item>
        </Form>

        {questions.length > 0 && (
          <div className="question-list">
            <h4>{t("assign.questionList")}:</h4>
            <ul>
              {questions.map(q => (
                <li key={q.id}>
                  {q.question_text} ({q.points})
                  <Popconfirm title={t("assign.confirmDeleteQuestion")} onConfirm={() => handleDeleteQuestion(q.id)}>
                    <Button danger size="small" className="ml10 assign-danger-btn">{t("assign.delete")}</Button>
                  </Popconfirm>
                </li>
              ))}
            </ul>
          </div>
        )}
      </Modal>

      {submissions.length > 0 && (
        <Card
          title={t("assign.submissionList")}
          extra={
            <>
              <Button type="primary" className="assign-primary-btn" onClick={confirmGrading}>{t("assign.confirmGrading")}</Button>
              <Button className="ml10 assign-primary-btn" onClick={() => setSubmissions([])}>{t("assign.close")}</Button>
            </>
          }
          className="assign-card"
        >
          <Table 
            columns={submissionColumns} 
            dataSource={submissions} 
            rowKey="submission_id" 
            className="assign-table"
          />
        </Card>
      )}
    </div>
  );
}