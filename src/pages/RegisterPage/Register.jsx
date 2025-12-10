import { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { Form, Input, Button, message, Select, Upload } from "antd";
import { UploadOutlined } from "@ant-design/icons";
import { useTranslation } from "react-i18next";
import "./Register.css";

const { Option } = Select;

function RegisterPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [fileList, setFileList] = useState([]);
  const [messageApi, contextHolder] = message.useMessage();

  const onFinish = async (values) => {
    try {
      const formData = new FormData();
      formData.append("name", values.name);
      formData.append("email", values.email);
      formData.append("password", values.password);
      formData.append("roles", values.role);
      if (values.role === "teacher") {
        formData.append("proof_info", values.proof_info);
        if (fileList[0]) formData.append("proof_file", fileList[0].originFileObj);
      }

      await axios.post("http://localhost:5001/register", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      if (values.role === "teacher") {
        messageApi.success(t("registerTeacherSuccess"));
      } else {
        messageApi.success(t("registerStudentSuccess"));
      }

      setTimeout(() => {
        navigate("/login");
      }, 2000);
    } catch (err) {
      messageApi.error(err.response?.data?.message || t("registerFail"));
    }
  };

  return (
    <div className="register-wrapper">
      {contextHolder}
      <div className="register-container">
        <h2 className="register-title">{t("register")}</h2>
        <Form onFinish={onFinish} layout="vertical">
          <Form.Item 
            name="name" 
            rules={[{ required: true, message: t("enterName") }]}
          >
            <Input placeholder={t("fullName")} />
          </Form.Item>
          
          <Form.Item 
            name="email" 
            rules={[
              { required: true, message: t("enterEmail") },
              { type: 'email', message: t("invalidEmail") }
            ]}
          >
            <Input placeholder={t("email")} />
          </Form.Item>
          
          <Form.Item 
            name="password" 
            rules={[
              { required: true, message: t("enterPassword") },
              { min: 6, message: t("passwordMinLength") }
            ]}
          >
            <Input.Password placeholder={t("password")} />
          </Form.Item>
          
          <Form.Item
            name="confirmPassword"
            dependencies={["password"]}
            rules={[
              { required: true, message: t("confirmPasswordRequired") },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue("password") === value) {
                    return Promise.resolve();
                  }
                  return Promise.reject(new Error(t("passwordMismatch")));
                },
              }),
            ]}
          >
            <Input.Password placeholder={t("confirmPassword")} />
          </Form.Item>
          
          <Form.Item 
            name="role" 
            rules={[{ required: true, message: t("selectRole") }]}
          >
            <Select placeholder={t("selectRole")}>
              <Option value="student">{t("student")}</Option>
              <Option value="teacher">{t("teacher")}</Option>
            </Select>
          </Form.Item>

          <Form.Item 
            noStyle 
            shouldUpdate={(prev, cur) => prev.role !== cur.role}
          >
            {({ getFieldValue }) =>
              getFieldValue("role") === "teacher" && (
                <>
                  <Form.Item 
                    name="proof_info" 
                    rules={[{ required: true, message: t("enterProofInfo") }]}
                  >
                    <Input.TextArea 
                      placeholder={t("proofInfo")}
                      rows={4}
                      showCount
                      maxLength={500}
                    />
                  </Form.Item>
                  <Form.Item 
                    name="proof_file" 
                    rules={[{ required: true, message: t("selectProofFile") }]}
                  >
                    <Upload 
                      beforeUpload={() => false} 
                      fileList={fileList} 
                      onChange={({ fileList }) => setFileList(fileList)}
                      accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                      maxCount={1}
                    >
                      <Button icon={<UploadOutlined />}>{t("chooseFile")}</Button>
                    </Upload>
                  </Form.Item>
                </>
              )
            }
          </Form.Item>

          <Button 
            className="register-button" 
            type="primary" 
            htmlType="submit"
            block
          >
            {t("register")}
          </Button>
          
          <div className="register-footer">
            <a href="/login">{t("alreadyHaveAccount")}</a>
          </div>
        </Form>
      </div>
    </div>
  );
}

export default RegisterPage;