import React from "react";
import "./Contact.css";
import { useTranslation } from "react-i18next";

const Contact = () => {
  const { t } = useTranslation();

  return (
    <div className="contact-container">
      <h1>{t("contactUs")}</h1>
      <p>{t("email")}: support@elearning.com</p>
      <p>{t("phone")}: 0987 654 321</p>
      <p>{t("address")}: 331A Phường An Phú Đông, Quận 12, TP.HCM (Đại học Nguyễn Tất Thành cơ sở Q12)</p>
      <div className="map-container">
        <iframe
          title="map"
          src="https://www.google.com/maps?q=331A+Phường+An+Phú+Đông+Quận+12+TPHCM&output=embed"
          width="100%"
          height="400"
          style={{ border: 0 }}
          allowFullScreen=""
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
        ></iframe>
      </div>
    </div>
  );
};

export default Contact;
