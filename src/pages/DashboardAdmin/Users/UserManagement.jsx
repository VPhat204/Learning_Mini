import { useCallback, useEffect, useState } from "react";
import axios from "axios";
import {
  Table,
  Button,
  Modal,
  Form,
  Input,
  Select,
  Upload,
  message,
  Popconfirm,
  Tag,
  Space,
} from "antd";
import { UploadOutlined } from "@ant-design/icons";
import { useTranslation } from "react-i18next";
import './UserManagement.css';

const { Option } = Select;

function UserManagement() {
  const { t } = useTranslation();
  const [users, setUsers] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [form] = Form.useForm();
  const [file, setFile] = useState([]);
  const [passwordModal, setPasswordModal] = useState(false);
  const [resetUserId, setResetUserId] = useState(null);
  const [resetForm] = Form.useForm();
  const [viewUser, setViewUser] = useState(null); 
  const [messageApi, contextHolder] = message.useMessage();
  const token = localStorage.getItem("token");

  const fetchUsers = useCallback(async () => {
    try {
      const res = await axios.get("https://learning-mini-be.onrender.com/users", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setUsers(res.data);
    } catch (err) {
      messageApi.error(t('userManagements.messages.loadError'));
    }
  }, [token, t, messageApi]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleAddOrEdit = async (values) => {
    try {
      if (editingUser) {
        const formData = new FormData();
        formData.append("name", values.name);
        formData.append("email", values.email);
        formData.append("roles", values.roles);
        if (values.proofInfo !== undefined) formData.append("proof_info", values.proofInfo);
        file.forEach(f => formData.append("proof_file", f));

        await axios.put(`https://learning-mini-be.onrender.com/users/${editingUser.id}`, formData, {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "multipart/form-data",
          },
        });
        messageApi.success(t('userManagements.messages.updateSuccess'));
      } else {
        if (values.roles === "teacher") {
          const formData = new FormData();
          formData.append("name", values.name);
          formData.append("email", values.email);
          formData.append("password", values.password);
          formData.append("roles", "teacher");
          formData.append("proof_info", values.proofInfo || "");
          file.forEach(f => formData.append("proof_file", f));

          await axios.post("https://learning-mini-be.onrender.com/register", formData, {
            headers: { "Content-Type": "multipart/form-data" },
          });
          messageApi.success(t('userManagements.messages.teacherRegisterSuccess'));
        } else {
          await axios.post(
            "https://learning-mini-be.onrender.com/users",
            {
              name: values.name,
              email: values.email,
              password: values.password,
              roles: values.roles,
            },
            { headers: { Authorization: `Bearer ${token}` } }
          );
          messageApi.success(t('userManagements.messages.addSuccess'));
        }
      }
      setIsModalOpen(false);
      form.resetFields();
      setFile([]);
      setEditingUser(null);
      fetchUsers();
    } catch (err) {
      messageApi.error(err.response?.data?.message || t('userManagements.messages.saveError'));
    }
  };

  const handleDelete = async (id) => {
    try {
      await axios.delete(`https://learning-mini-be.onrender.com/users/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      messageApi.success(t('userManagements.messages.deleteSuccess'));
      fetchUsers();
    } catch {
      messageApi.error(t('userManagements.messages.deleteError'));
    }
  };

  const handleApprove = async (id, approved) => {
    try {
      const res = await axios.put(
        `https://learning-mini-be.onrender.com/users/${id}/approve-teacher`,
        { approve: !approved },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      messageApi.success(res.data.message);
      fetchUsers();
    } catch (err) {
      messageApi.error(err.response?.data?.message || t('userManagements.messages.approveError'));
    }
  };

  const handleLock = async (id, locked) => {
    try {
      const res = await axios.put(
        `https://learning-mini-be.onrender.com/users/${id}/lock`,
        { lock: !Number(locked) },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      messageApi.success(res.data.message);
      fetchUsers();
    } catch (err) {
      messageApi.error(err.response?.data?.message || t('userManagements.messages.lockError'));
    }
  };

  const handleResetPassword = async (values) => {
    try {
      await axios.put(
        `https://learning-mini-be.onrender.com/users/${resetUserId}/reset-password`,
        { newPassword: values.newPassword },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      messageApi.success(t('userManagements.messages.resetPasswordSuccess'));
      setPasswordModal(false);
      setResetUserId(null);
      resetForm.resetFields();
    } catch (err) {
      messageApi.error(err.response?.data?.message || t('userManagements.messages.resetPasswordError'));
    }
  };

  const openModal = (record = null) => {
    setEditingUser(record);
    form.resetFields();
    setFile([]);
    if (record) {
      form.setFieldsValue({
        ...record,
        proofInfo: record.proof_info,
      });
    }
    setIsModalOpen(true);
  };

  const openPasswordModal = (userId) => {
    setResetUserId(userId);
    resetForm.resetFields();
    setPasswordModal(true);
  };

  const columns = [
    { 
      title: t('userManagements.columns.id'), 
      dataIndex: "id", 
      key: "id", 
      width: 60 
    },
    { 
      title: t('userManagements.columns.name'), 
      dataIndex: "name", 
      key: "name" 
    },
    { 
      title: t('userManagements.columns.email'), 
      dataIndex: "email", 
      key: "email" 
    },
    {
      title: t('userManagements.columns.role'),
      dataIndex: "roles",
      key: "roles",
      render: (role) => {
        const color = role === "admin" ? "volcano" : role === "teacher" ? "geekblue" : "green";
        return <Tag color={color} className="user-management-tag">{t(`userManagements.roles.${role}`)}</Tag>;
      },
    },
    {
      title: t('userManagements.columns.approval'),
      dataIndex: "is_approved",
      key: "is_approved",
      render: (_, record) => {
        if (record.roles === "teacher") {
          const approved = Number(record.is_approved) === 1;
          return (
            <Button
              size="small"
              type={approved ? "default" : "primary"}
              onClick={() => handleApprove(record.id, approved)}
              className="status-button"
            >
              {approved ? t('userManagements.approval.approved') : t('userManagements.approval.pending')}
            </Button>
          );
        }
        return <Tag color="default" className="user-management-tag">{t('userManagements.approval.notRequired')}</Tag>;
      },
    },
    {
      title: t('userManagements.columns.status'),
      dataIndex: "is_locked",
      key: "is_locked",
      render: (_, record) => {
        const locked = Number(record.is_locked) === 1;
        return (
          <Button 
            size="small" 
            type={locked ? "default" : "primary"} 
            onClick={() => handleLock(record.id, locked)}
            className="status-button"
          >
            {locked ? t('userManagements.status.locked') : t('userManagements.status.active')}
          </Button>
        );
      },
    },
    {
      title: t('userManagements.columns.verificationInfo'),
      dataIndex: "proof_info",
      key: "proof_info",
      render: (_, record) =>
        record.roles === "teacher" ? (
          <Button type="link" onClick={() => setViewUser(record)}>
            {t('userManagements.actions.view')}
          </Button>
        ) : (
          <Tag className="user-management-tag">{t('userManagements.verification.none')}</Tag>
        ),
    },
    {
      title: t('userManagements.columns.actions'),
      key: "actions",
      render: (_, record) => (
        <Space className="user-management-actions">
          <Button type="link" onClick={() => openModal(record)}>
            {t('userManagements.actions.edit')}
          </Button>
          <Button type="link" onClick={() => openPasswordModal(record.id)}>
            {t('userManagements.actions.resetPassword')}
          </Button>
          <Popconfirm 
            title={t('userManagements.confirm.delete')} 
            onConfirm={() => handleDelete(record.id)}
            okText={t('commons.yes')}
            cancelText={t('commons.no')}
          >
            <Button type="link" danger>
              {t('userManagements.actions.delete')}
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div className="user-management-container">
      {contextHolder}
      <h2 className="user-management-header">{t('userManagements.title')}</h2>

      <Button type="primary" style={{ marginBottom: 16 }} onClick={() => openModal()}>
        + {t('userManagements.actions.addUser')}
      </Button>

      <Table 
        columns={columns} 
        dataSource={users} 
        rowKey="id" 
        bordered 
        pagination={{ pageSize: 6 }} 
        className="user-management-table"
      />

      <Modal
        open={isModalOpen}
        onCancel={() => setIsModalOpen(false)}
        title={editingUser ? t('userManagements.modal.editTitle') : t('userManagements.modal.addTitle')}
        okText={editingUser ? t('commons.save') : t('commons.add')}
        cancelText={t('commons.cancel')}
        onOk={() => form.submit()}
        width={600}
        className="user-management-modal"
      >
        <Form form={form} layout="vertical" onFinish={handleAddOrEdit} className="user-management-form">
          <Form.Item 
            name="name" 
            label={t('userManagements.form.name')} 
            rules={[{ required: true, message: t('userManagements.validation.enterName') }]}
          >
            <Input placeholder={t('userManagements.form.enterName')} />
          </Form.Item>
          <Form.Item 
            name="email" 
            label={t('userManagements.form.email')} 
            rules={[{ required: true, message: t('userManagements.validation.enterEmail') }]}
          >
            <Input placeholder={t('userManagements.form.enterEmail')} />
          </Form.Item>
          {!editingUser && (
            <Form.Item 
              name="password" 
              label={t('userManagements.form.password')} 
              rules={[{ required: true, message: t('userManagements.validation.enterPassword') }]}
            >
              <Input.Password placeholder={t('userManagements.form.enterPassword')} />
            </Form.Item>
          )}
          <Form.Item 
            name="roles" 
            label={t('userManagements.form.role')} 
            rules={[{ required: true, message: t('userManagements.validation.selectRole') }]}
          >
            <Select placeholder={t('userManagements.form.selectRole')} onChange={() => form.resetFields(["proofInfo"])}>
              <Option value="admin">{t('userManagements.roles.admin')}</Option>
              <Option value="teacher">{t('userManagements.roles.teacher')}</Option>
              <Option value="student">{t('userManagements.roles.student')}</Option>
            </Select>
          </Form.Item>
          {form.getFieldValue("roles") === "teacher" && (
            <>
              <Form.Item 
                name="proofInfo" 
                label={t('userManagements.form.verificationInfo')} 
                rules={[{ required: true, message: t('userManagements.validation.enterVerificationInfo') }]}
              >
                <Input.TextArea placeholder={t('userManagements.form.enterVerificationInfo')} />
              </Form.Item>
              <Form.Item label={t('userManagements.form.proofFiles')}>
                <Upload
                  beforeUpload={(file) => {
                    const isImage = /\.(jpg|jpeg|png|gif)$/i.test(file.name);
                    if (!isImage) {
                      messageApi.error(t('userManagements.validation.imageOnly'));
                      return Upload.LIST_IGNORE;  
                    }
                    setFile((prev) => [...prev, file]);
                    return false;  
                  }}
                  multiple
                  accept="image/*"
                  listType="picture"
                >
                  <Button icon={<UploadOutlined />}>{t('userManagements.actions.selectImages')}</Button>
                </Upload>
                {file.length > 0 && (
                  <ul className="upload-file-list">
                    {file.map((f, idx) => (
                      <li key={idx}>{f.name}</li>
                    ))}
                  </ul>
                )}
                {editingUser?.proof_file && (
                  <ul className="upload-file-list">
                    {Array.isArray(editingUser.proof_file)
                      ? editingUser.proof_file.map((f, idx) => (
                          <li key={idx}>
                            <a
                              href={`https://learning-mini-be.onrender.com/uploads/${f}`}
                              target="_blank"
                              rel="noreferrer"
                            >
                              {f} ({t('userManagements.actions.download')})
                            </a>
                          </li>
                        ))
                      : (
                          <li>
                            <a
                              href={`https://learning-mini-be.onrender.com/uploads/${editingUser.proof_file}`}
                              target="_blank"
                              rel="noreferrer"
                            >
                              {editingUser.proof_file} ({t('userManagements.actions.download')})
                            </a>
                          </li>
                        )}
                  </ul>
                )}
              </Form.Item>
            </>
          )}
        </Form>
      </Modal>

      <Modal
        open={passwordModal}
        onCancel={() => setPasswordModal(false)}
        title={t('userManagements.modal.resetPasswordTitle')}
        okText={t('userManagements.actions.reset')}
        cancelText={t('commons.cancel')}
        onOk={() => resetForm.submit()}
        className="user-management-modal"
      >
        <Form form={resetForm} layout="vertical" onFinish={handleResetPassword} className="user-management-form">
          <Form.Item 
            name="newPassword" 
            label={t('userManagements.form.newPassword')} 
            rules={[{ required: true, message: t('userManagements.validation.enterNewPassword') }]}
          >
            <Input.Password placeholder={t('userManagements.form.enterNewPassword')} />
          </Form.Item>
        </Form>
      </Modal>
      <Modal
        title={t('userManagements.modal.verificationInfoTitle')}
        open={!!viewUser}
        onCancel={() => setViewUser(null)}
        footer={<Button onClick={() => setViewUser(null)}>{t('commons.close')}</Button>}
        width={700}
        className="user-management-modal verification-modal"
      >
        {viewUser && (
          <div className="verification-modal-content">
            <p>
              <strong>{t('userManagements.form.verificationInfo')}:</strong>
            </p>
            <div className="verification-info-text">
              {viewUser.proof_info}
            </div>
            
            {viewUser.proof_file && (
              <div className="verification-file-section">
                {/\.(jpg|jpeg|png|gif)$/i.test(viewUser.proof_file) && (
                  <img
                    src={`https://learning-mini-be.onrender.com/uploads/${viewUser.proof_file}`}
                    alt="proof"
                    className="verification-image"
                  />
                )}
                {viewUser.proof_file.toLowerCase().endsWith(".pdf") && (
                  <iframe
                    src={`https://learning-mini-be.onrender.com/uploads/${viewUser.proof_file}`}
                    title="proof-pdf"
                    className="verification-iframe"
                  />
                )}
                <p>
                  <a 
                    href={`https://learning-mini-be.onrender.com/uploads/${viewUser.proof_file}`} 
                    target="_blank" 
                    rel="noreferrer"
                    className="download-link"
                  >
                    📎 {t('userManagements.actions.downloadFile')}
                  </a>
                </p>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}

export default UserManagement;