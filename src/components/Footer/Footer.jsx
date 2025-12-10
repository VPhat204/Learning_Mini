import { Layout } from "antd";
import { useTranslation } from "react-i18next";
import "./AppFooter.css";
import "../../languages/i18n";  

const { Footer } = Layout;

function AppFooter() {
  const { t } = useTranslation();

  return (
    <Footer className="app-footer">
      <p>{t("footerText")}</p>
      <p>
        <a href="/about">{t("about")}</a> |{" "}
        <a href="/contact">{t("contact")}</a> |{" "}
        <a href="/privacy">{t("privacy")}</a>
      </p>
    </Footer>
  );
}

export default AppFooter;