import { useState } from "react";
import { Form, Input, Button, message } from "antd";
import { useTranslation } from "react-i18next";

export default function CreateCourse({ courseForm, onCreateCourse }) {
  const { t } = useTranslation();
  const [submitting, setSubmitting] = useState(false);
  const [messageApi, contextHolder] = message.useMessage();

  const handleSubmit = async (values) => {
    setSubmitting(true);
    try {
      await onCreateCourse(values);
            messageApi.success({
        content: t("createcourses.success_message"),
        duration: 4,
      });
      
      messageApi.info({
        content: t("createcourses.pending_approval_message"),
        duration: 5,
      });
      
      courseForm.resetFields();
      
    } catch (error) {
      console.error("Lỗi khi tạo khóa học:", error);
      messageApi.error(
        error.response?.data?.message || t("createcourses.error_message")
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      {contextHolder}
      <h3>{t("createcourses.create_title")}</h3>
      <p style={{ color: "#666", marginBottom: "16px" }}>
        {t("createcourses.instruction")}
      </p>
      
      <Form
        form={courseForm}
        layout="vertical"
        style={{ maxWidth: 400 }}
        onFinish={handleSubmit}
      >
        <Form.Item
          name="title"
          label={t("createcourses.name")}
          rules={[{ required: true, message: t("createcourses.name_required") }]}
        >
          <Input 
            placeholder={t("createcourses.name_placeholder")}
            disabled={submitting}
          />
        </Form.Item>

        <Form.Item
          name="description"
          label={t("createcourses.description")}
          rules={[{ required: true, message: t("createcourses.description_required") }]}
        >
          <Input.TextArea 
            placeholder={t("createcourses.description_placeholder")} 
            rows={4}
            disabled={submitting}
          />
        </Form.Item>

        <Form.Item>
          <Button 
            type="primary" 
            htmlType="submit"
            loading={submitting}
            disabled={submitting}
          >
            {submitting ? t("createcourses.creating") : t("createcourses.btn_create")}
          </Button>
        </Form.Item>
      </Form>
    </div>
  );
}