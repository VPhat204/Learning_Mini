import React from 'react';
import { Card, Typography, List, Divider, Collapse } from 'antd';
import { SecurityScanOutlined, LockOutlined, EyeOutlined, FileProtectOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import './PrivacyPolicy.css';

const { Title, Paragraph, Text } = Typography;
const { Panel } = Collapse;

const PrivacyPolicy = () => {
  const { t } = useTranslation();

  const policySections = [
    {
      key: '1',
      title: t('privacypolicy.sections.collection.title'),
      icon: <EyeOutlined />,
      content: (
        <div>
          <p>{t('privacypolicy.sections.collection.description')}</p>
          <ul>
            <li>{t('privacypolicy.sections.collection.points.register')}</li>
            <li>{t('privacypolicy.sections.collection.points.enroll')}</li>
            <li>{t('privacypolicy.sections.collection.points.contact')}</li>
            <li>{t('privacypolicy.sections.collection.points.useService')}</li>
          </ul>
        </div>
      ),
      items: [
        t('privacypolicy.sections.collection.items.name'),
        t('privacypolicy.sections.collection.items.email'),
        t('privacypolicy.sections.collection.items.phone'),
        t('privacypolicy.sections.collection.items.studyInfo'),
        t('privacypolicy.sections.collection.items.paymentInfo')
      ]
    },
    {
      key: '2',
      title: t('privacypolicy.sections.usage.title'),
      icon: <FileProtectOutlined />,
      content: (
        <div>
          <p>{t('privacypolicy.sections.usage.description')}</p>
          <ul>
            <li>{t('privacypolicy.sections.usage.points.provideService')}</li>
            <li>{t('privacypolicy.sections.usage.points.processRegistration')}</li>
            <li>{t('privacypolicy.sections.usage.points.sendNotifications')}</li>
            <li>{t('privacypolicy.sections.usage.points.customerSupport')}</li>
            <li>{t('privacypolicy.sections.usage.points.analysis')}</li>
          </ul>
        </div>
      ),
      items: []
    },
    {
      key: '3',
      title: t('privacypolicy.sections.security.title'),
      icon: <LockOutlined />,
      content: (
        <div>
          <p>{t('privacypolicy.sections.security.description')}</p>
          <ul>
            <li>{t('privacypolicy.sections.security.points.encryption')}</li>
            <li>{t('privacypolicy.sections.security.points.multiLayer')}</li>
            <li>{t('privacypolicy.sections.security.points.accessControl')}</li>
            <li>{t('privacypolicy.sections.security.points.staffTraining')}</li>
          </ul>
        </div>
      ),
      items: [
        t('privacypolicy.sections.security.items.ssl'),
        t('privacypolicy.sections.security.items.firewall'),
        t('privacypolicy.sections.security.items.twoFactor'),
        t('privacypolicy.sections.security.items.backup')
      ]
    },
    {
      key: '4',
      title: t('privacypolicy.sections.sharing.title'),
      icon: <SecurityScanOutlined />,
      content: (
        <div>
          <p>{t('privacypolicy.sections.sharing.description')}</p>
          <ul>
            <li>{t('privacypolicy.sections.sharing.points.consent')}</li>
            <li>{t('privacypolicy.sections.sharing.points.legal')}</li>
            <li>{t('privacypolicy.sections.sharing.points.partners')}</li>
          </ul>
        </div>
      ),
      items: []
    }
  ];

  const policyPrinciples = [
    t('privacypolicy.principles.transparency'),
    t('privacypolicy.principles.security'),
    t('privacypolicy.principles.control'),
    t('privacypolicy.principles.compliance')
  ];

  return (
    <div className="privacy-policy-container">
      <div className="policy-header">
        <Title level={2} className="policy-title">
          <LockOutlined /> {t('privacypolicy.title')}
        </Title>
        <Paragraph className="policy-intro">
          {t('privacypolicy.introduction')}
        </Paragraph>
      </div>

      <Card className="principles-card">
        <Title level={4} className="principles-title">
          {t('privacypolicy.principles.title')}
        </Title>
        <List
          dataSource={policyPrinciples}
          renderItem={(item, index) => (
            <List.Item>
              <div className="principle-item">
                <div className="principle-number">{index + 1}</div>
                <Text>{item}</Text>
              </div>
            </List.Item>
          )}
        />
      </Card>

      <div className="policy-sections">
        <Title level={4} className="sections-title">
          {t('privacypolicy.sections.mainContent')}
        </Title>
        <Collapse 
          accordion 
          className="policy-collapse"
          defaultActiveKey={['1']}
        >
          {policySections.map(section => (
            <Panel 
              header={
                <div className="panel-header">
                  {section.icon}
                  <span className="panel-title">{section.title}</span>
                </div>
              } 
              key={section.key}
            >
              <div className="section-content">
                {section.content}
                {section.items.length > 0 && (
                  <>
                    <Divider orientation="left">
                      {t('privacypolicy.sections.details')}
                    </Divider>
                    <List
                      dataSource={section.items}
                      renderItem={item => (
                        <List.Item className="policy-list-item">
                          <Text>{item}</Text>
                        </List.Item>
                      )}
                      className="policy-list"
                    />
                  </>
                )}
              </div>
            </Panel>
          ))}
        </Collapse>
      </div>

      <div className="contact-section">
        <Card className="contact-card">
          <Title level={4}>{t('privacypolicy.contact.title')}</Title>
          <Paragraph>
            {t('privacypolicy.contact.description')}
          </Paragraph>
          
          <div className="contact-details">
            <div className="contact-item">
              <Text strong>{t('privacypolicy.contact.email')} </Text>
              <Text>{t('privacypolicy.contact.emailValue')}</Text>
            </div>
            <div className="contact-item">
              <Text strong>{t('privacypolicy.contact.phone')} </Text>
              <Text>{t('privacypolicy.contact.phoneValue')}</Text>
            </div>
            <div className="contact-item">
              <Text strong>{t('privacypolicy.contact.address')} </Text>
              <Text>{t('privacypolicy.contact.addressValue')}</Text>
            </div>
          </div>
          
          <Divider />
          
          <Paragraph type="secondary" className="last-updated">
            {t('privacypolicy.lastUpdated')} 01/01/2024
          </Paragraph>
        </Card>
      </div>
    </div>
  );
};

export default PrivacyPolicy;