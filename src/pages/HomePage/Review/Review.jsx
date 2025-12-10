import React from "react";
import { useTranslation } from "react-i18next";
import "./Review.css";

const Review = () => {
  const { t } = useTranslation();

  return (
    <div className="review-container">
      <h1>{t("review.title")}</h1>
      <p>{t("review.paragraph1")}</p>
      <p>{t("review.paragraph2")}</p>
      <p>{t("review.paragraph3")}</p>
    </div>
  );
};

export default Review;
