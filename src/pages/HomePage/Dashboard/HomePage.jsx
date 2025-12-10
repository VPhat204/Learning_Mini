import { Layout, Menu } from "antd";
import { useState } from "react";
import Review from "../Review/Review";
import Contact from "../Contact/Contact";
import { useTranslation } from "react-i18next";
import "./HomePage.css";
import TeacherList from "../Teacher/TeacherHomePage";
import PrivacyPolicy from "../Policy/PrivacyPolicy";

const { Sider, Content } = Layout;

function HomePage() {
  const [selectedKey, setSelectedKey] = useState("1");
  const { t } = useTranslation();

  const renderContent = () => {
    switch (selectedKey) {
      case "1":
        return <Review />;
      case "2":
        return <TeacherList />;
      case "3":
        return <PrivacyPolicy />;
      case "4":
        return <Contact />;
      default:
        return <p>{t("selectMenu")}</p>;
    }
  };

  return (
    <Layout className="homepage" style={{ minHeight: "100vh" }}>
      <Sider width={220} className="site-layout-background">
        <Menu
          mode="inline"
          selectedKeys={[selectedKey]}
          onClick={(e) => setSelectedKey(e.key)}
          className="custom-menu"
        >
          <Menu.Item key="1">{t("menu.introduction")}</Menu.Item>
          <Menu.Item key="2">{t("teachers")}</Menu.Item>
          <Menu.Item key="3">{t("privacy")}</Menu.Item>
          <Menu.Item key="4">{t("menu.contact")}</Menu.Item>
        </Menu>
      </Sider>
      <Layout className="homepage-content">
        <Content className="homepage-content-inner">
          {renderContent()}
        </Content>
      </Layout>
    </Layout>
  );
}

export default HomePage;