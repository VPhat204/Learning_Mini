import { useNavigate } from "react-router-dom";
import axios from "axios";
import { Form, Input, Button, message } from "antd";
import { useContext } from "react";
import { UserContext } from "../../context/userContext";
import { useTheme } from "../../context/themeContext"; 
import { useTranslation } from "react-i18next";
import "./Login.css";

function LoginPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { login } = useContext(UserContext);
  const { reloadTheme } = useTheme(); 
  const [messageApi, contextHolder] = message.useMessage();

  const onFinish = async (values) => {
    try {
      const res = await axios.post("https://learning-mini-be.onrender.com/login", values, {
        headers: { "Content-Type": "application/json" },
      });

      if (res.data.token && res.data.roles) {
        localStorage.setItem("token", res.data.token);
        login({
          id: res.data.id,
          name: res.data.name,
          language: res.data.language,
          email: res.data.email,
          roles: res.data.roles,
          proof_info: res.data.proof_info,
          proof_file: res.data.proof_file,
          avatar: res.data.avatar,
          phone: res.data.phone,
          address: res.data.address,
          birthdate: res.data.birthdate,
          gender: res.data.gender,
          theme: res.data.theme,
          token: res.data.token,
        });
        reloadTheme();

        messageApi.success({
          content: t("loginSuccess"),
          duration: 2,
          onClose: () => {
            if (res.data.roles === "admin") navigate("/admin-dashboard");
            else if (res.data.roles === "teacher") navigate("/teacher-dashboard");
            else navigate("/student-dashboard");
          },
        });
      } else {
        messageApi.error(t("invalidServerResponse"));
      }
    } catch (err) {
      if (err.response) {
        const status = err.response.status;
        const data = err.response.data;

        if (status === 401) {
          messageApi.error(t("wrongEmailOrPassword"));
        } else if (status === 403) {
          messageApi.warning(data?.message || t("noAccess"));
        } else {
          messageApi.error(data?.message || t("serverError"));
        }
      } else {
        messageApi.error(t("cannotConnectServer"));
      }
    }
  };

  return (
    <div className="login-wrapper">
      {contextHolder}
      <div className="login-container">
        <h2 className="login-title">{t("login")}</h2>
        <Form onFinish={onFinish} layout="vertical">
          <Form.Item
            name="email"
            rules={[{ required: true, message: t("enterEmail") }]}
          >
            <Input placeholder={t("email")} autoComplete="email" />
          </Form.Item>
          <Form.Item
            name="password"
            rules={[{ required: true, message: t("enterPassword") }]}
          >
            <Input.Password
              placeholder={t("password")}
              autoComplete="current-password"
            />
          </Form.Item>
          <Button type="primary" htmlType="submit" block>
            {t("login")}
          </Button>
          <div className="login-links">
            <a href="/register">{t("noAccount")}</a>
            <br />
            <a href="/forgot-password">{t("forgotPassword")}</a>
          </div>
        </Form>
      </div>
    </div>
  );
}

export default LoginPage;
