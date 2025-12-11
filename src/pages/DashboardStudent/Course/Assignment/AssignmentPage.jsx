import { useEffect, useState, useCallback } from "react";
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
  FileTextOutlined,
  ExclamationCircleOutlined,
} from "@ant-design/icons";
import { useTranslation } from "react-i18next";
import api from "../../../../api";
import "./Assignments.css";

const { Panel } = Collapse;
const { TextArea } = Input;
const { confirm } = Modal;

export default function StudentAssignments({ courseId }) {
  const { t } = useTranslation();
  const [assignments, setAssignments] = useState([]);
  const [answers, setAnswers] = useState({});
  const [grades, setGrades] = useState({});
  const [questions, setQuestions] = useState({});
  const [submittedAssignments, setSubmittedAssignments] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState({});
  const [messageApi, contextHolder] = message.useMessage();

  const token = localStorage.getItem("token");
  const studentId = token ? JSON.parse(atob(token.split(".")[1])).id : null;

  const loadAssignments = useCallback(async () => {
    if (!studentId || !courseId) return;
    setLoading(true);
    try {
      const res = await api.get(`/assignments/course/${courseId}`);
      const data = res.data || [];
      setAssignments(data);

      for (const a of data) {
        const qsRes = await api.get(`/assignments/${a.id}/questions`);
        const ansRes = await api.get(`/assignments/${a.id}/answers/student/${studentId}`);

        const qs = qsRes.data || [];
        const ansList = ansRes.data || [];

        setQuestions((p) => ({ ...p, [a.id]: qs }));

        const initial = {};
        qs.forEach((q) => (initial[q.id] = ""));

        const gradeMap = {};
        const answerMap = {};
        let submitted = false;

        ansList.forEach((ans) => {
          gradeMap[ans.question_id] = ans.score ?? null;
          answerMap[ans.question_id] = ans.answer_text ?? "";
          if (ans.submitted_at) submitted = true;
        });

        if (submitted) setSubmittedAssignments((s) => new Set(s).add(a.id));

        setGrades((p) => ({ ...p, [a.id]: gradeMap }));
        setAnswers((p) => ({ ...p, [a.id]: { ...initial, ...answerMap } }));
      }
    } finally {
      setLoading(false);
    }
  }, [studentId, courseId]);

  useEffect(() => {
    loadAssignments();
  }, [loadAssignments]);

  const handleChange = (assignmentId, questionId, value) => {
    if (submittedAssignments.has(assignmentId)) return;
    setAnswers((p) => ({
      ...p,
      [assignmentId]: { ...(p[assignmentId] || {}), [questionId]: value }
    }));
  };

  const submit = async (assignmentId) => {
    const aAnswers = answers[assignmentId] || {};
    const qs = questions[assignmentId] || [];
    for (const q of qs) {
      if (!aAnswers[q.id] || aAnswers[q.id].trim() === "") {
        messageApi.error(t("assignments.messages.answerAllRequired"));
        return;
      }
    }

    setSubmitting((p) => ({ ...p, [assignmentId]: true }));
    try {
      await api.post(`/assignments/${assignmentId}/submit-answers`, {
        answers: aAnswers
      });
      setSubmittedAssignments((s) => new Set(s).add(assignmentId));
      messageApi.success(t("assignments.messages.submitSuccess"));
    } finally {
      setSubmitting((p) => ({ ...p, [assignmentId]: false }));
    }
  };

  const confirmSubmit = (id) => {
    if (submittedAssignments.has(id)) return;
    confirm({
      title: t("assignments.confirm.submitTitle"),
      icon: <ExclamationCircleOutlined />,
      content: t("assignments.confirm.submitContent"),
      okText: t("common.yes"),
      cancelText: t("common.no"),
      onOk() {
        submit(id);
      }
    });
  };

  if (loading)
    return (
      <div className="assignments-loading">
        {contextHolder}
        <Spin size="large" />
        <p>{t("assignments.loading")}</p>
      </div>
    );

  return (
    <div className="student-assignments">
      {contextHolder}

      {assignments.length === 0 ? (
        <div className="assignments-empty">
          <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} />
        </div>
      ) : (
        <div className="assignments-grid">
          {assignments.map((a) => {
            const qs = questions[a.id] || [];
            const ans = answers[a.id] || {};
            const grade = grades[a.id] || {};

            const completion = qs.length
              ? (Object.values(ans).filter((x) => x && x.trim()).length /
                  qs.length) *
                100
              : 0;

            const editable =
              !submittedAssignments.has(a.id) &&
              !Object.values(grade).some((s) => s != null);

            const canSubmit =
              editable &&
              qs.length &&
              Object.values(ans).filter((x) => x && x.trim()).length ===
                qs.length;

            return (
              <div key={a.id} className="assignment-card">
                <div className="assignment-card-header">
                  <h3 className="assignment-title">
                    <FileTextOutlined /> {a.title}
                  </h3>
                  <Tag
                    color={
                      Object.values(grade).some((s) => s != null)
                        ? "green"
                        : submittedAssignments.has(a.id)
                        ? "blue"
                        : "orange"
                    }
                  >
                    {Object.values(grade).some((s) => s != null)
                      ? t("assignments.status.graded")
                      : submittedAssignments.has(a.id)
                      ? t("assignments.status.submitted")
                      : t("assignments.status.pending")}
                  </Tag>
                </div>

                <div className="assignment-progress">
                  <div className="progress-info">
                    <span>{t("assignments.progress.completion")}</span>
                    <span>{completion.toFixed(0)}%</span>
                  </div>
                  <Progress percent={completion} size="small" showInfo={false} />
                </div>

                <Collapse expandIconPosition="end" className="questions-collapse">
                  <Panel header={`${qs.length} ${t("assignments.questions")}`}>
                    <div className="questions-list">
                      {qs.map((q) => (
                        <div key={q.id} className="question-item">
                          <div className="question-header">
                            {q.question_text}
                          </div>
                          <TextArea
                            value={ans[q.id] || ""}
                            disabled={!editable}
                            rows={4}
                            onChange={(e) =>
                              handleChange(a.id, q.id, e.target.value)
                            }
                          />
                          {grade[q.id] != null && (
                            <Tag color="blue">
                              {t("assignments.score")}: {grade[q.id]}/{q.points}
                            </Tag>
                          )}
                        </div>
                      ))}
                    </div>
                  </Panel>
                </Collapse>

                <div className="assignment-actions">
                  <Button
                    type="primary"
                    disabled={!canSubmit}
                    onClick={() => confirmSubmit(a.id)}
                    loading={submitting[a.id]}
                  >
                    {submittedAssignments.has(a.id)
                      ? t("assignments.status.submitted")
                      : t("assignments.actions.submit")}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
