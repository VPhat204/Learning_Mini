import { useState } from "react";
import { Form, Input, Button, message } from "antd";
import axios from "axios";
import "./ForgotPage.css";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

function ForgotPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [otpVerified, setOtpVerified] = useState(false);
  const [messageApi, contextHolder] = message.useMessage();
  const [form] = Form.useForm();

  const handleSendOtp = async () => {
    try {
      const emailValue = form.getFieldValue("email");
      if (!emailValue) {
        messageApi.error(t("enterEmailBeforeSendingOtp"));
        return;
      }
      await axios.post("https://learning-mini-be.onrender.com/forgot-password", { email: emailValue });
      setEmail(emailValue);
      setOtpSent(true);
      messageApi.success(t("otpSentToEmail"));
    } catch (err) {
      messageApi.error(err.response?.data?.message || t("cannotSendEmail"));
    }
  };

  const handleVerifyOtp = async () => {
    try {
      const otpValue = form.getFieldValue("otp");
      if (!otpValue) {
        messageApi.error(t("enterOtpBeforeVerify"));
        return;
      }
      await axios.post("https://learning-mini-be.onrender.com/verify-otp", { email, otp: otpValue });
      setOtpVerified(true);
      messageApi.success(t("otpVerifiedSuccess"));
    } catch (err) {
      messageApi.error(t("otpIncorrect"));
    }
  };

  const handleResetPassword = async () => {
    try {
      const password = form.getFieldValue("password");
      const confirmPassword = form.getFieldValue("confirmPassword");
      if (!password || !confirmPassword) {
        messageApi.error(t("enterAllPasswordFields"));
        return;
      }
      if (password !== confirmPassword) {
        messageApi.error(t("passwordMismatch"));
        return;
      }
      await axios.post("https://learning-mini-be.onrender.com/reset-password", { email, password });
      messageApi.success(t("passwordResetSuccess"));
      form.resetFields();
      setOtpSent(false);
      setOtpVerified(false);
      setEmail("");
      navigate("/login");
    } catch (err) {
      messageApi.error(t("passwordUpdateError"));
    }
  };

  return (
    <div className="forgot-wrapper">
      {contextHolder}
      <div className="forgot-container">
        <h2 className="forgot-title">{t("forgotPassword")}</h2>
        <Form form={form} layout="vertical">
          <div className="forgot-inline">
            <Form.Item className="forgot-form-item" name="email">
              <Input placeholder={t("email")} disabled={otpSent} />
            </Form.Item>
            <Button
              className="forgot-button"
              type="primary"
              onClick={handleSendOtp}
              disabled={otpSent}
            >
              {t("sendOtp")}
            </Button>
          </div>

          <div className="forgot-inline">
            <Form.Item className="forgot-form-item" name="otp">
              <Input placeholder={t("enterOtp")} disabled={!otpSent || otpVerified} />
            </Form.Item>
            <Button
              className="forgot-button"
              type="primary"
              onClick={handleVerifyOtp}
              disabled={!otpSent || otpVerified}
            >
              {t("verifyOtp")}
            </Button>
          </div>

          <Form.Item className="forgot-form-item" name="password">
            <Input.Password placeholder={t("newPassword")} disabled={!otpVerified} />
          </Form.Item>
          <Form.Item className="forgot-form-item" name="confirmPassword">
            <Input.Password placeholder={t("confirmPassword")} disabled={!otpVerified} />
          </Form.Item>
          <Button
            className="forgot-button"
            type="primary"
            onClick={handleResetPassword}
            disabled={!otpVerified}
          >
            {t("updatePassword")}
          </Button>
        </Form>
      </div>
    </div>
  );
}

export default ForgotPage;
