const express = require("express");
const mysql = require("mysql2/promise");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const multer = require("multer");
const path = require("path");
const nodemailer = require("nodemailer");
require("dotenv").config(); 

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Cấu hình multer cho upload file
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, process.env.UPLOAD_PATH || "uploads/");
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname);
    cb(null, Date.now() + ext);
  },
});
const upload = multer({ storage });
const uploadFields = upload.fields([
  { name: "avatar", maxCount: 1 },
  { name: "proof_file", maxCount: 10 },
]);

// Cấu hình email
const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 587,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER || "phettpeo160@gmail.com",
    pass: process.env.EMAIL_PASS || "eaxh vwxs obiz exhw",
  },
});

// Kết nối database Aiven
let db;
async function connectDB() {
  try {
    db = await mysql.createConnection({
      host: process.env.DB_HOST || "mysql-1a97ab41-phatvn88988-54c4.j.aivencloud.com",
      port: process.env.DB_PORT || 17842,
      user: process.env.DB_USER || "avnadmin",
      password: process.env.DB_PASSWORD || "",
      database: process.env.DB_NAME || "defaultdb",
      ssl: {
        rejectUnauthorized: false // Cần thiết cho Aiven
      },
      connectTimeout: 60000,
      timezone: 'UTC' // Thêm timezone
    });
    console.log("✅ MySQL Aiven connected successfully!");
    
    // Kiểm tra kết nối bằng truy vấn đơn giản
    const [result] = await db.execute("SELECT 1 as test");
    console.log("✅ Database connection test passed:", result[0].test);
    
    // Kiểm tra bảng tồn tại
    await checkAndCreateTables();
  } catch (err) {
    console.error("❌ Database connection error:", err);
    process.exit(1);
  }
}

async function checkAndCreateTables() {
  try {
    // Kiểm tra và tạo bảng users nếu chưa tồn tại
    const [tables] = await db.execute("SHOW TABLES LIKE 'users'");
    if (tables.length === 0) {
      console.log("📦 Creating tables...");
      
      // Tạo bảng users
      await db.execute(`
        CREATE TABLE users (
          id INT PRIMARY KEY AUTO_INCREMENT,
          name VARCHAR(255) NOT NULL,
          email VARCHAR(255) UNIQUE NOT NULL,
          password VARCHAR(255) NOT NULL,
          roles ENUM('admin', 'teacher', 'student') DEFAULT 'student',
          is_approved TINYINT DEFAULT 1,
          is_locked TINYINT DEFAULT 0,
          language VARCHAR(10) DEFAULT 'vi',
          theme VARCHAR(10) DEFAULT 'light',
          phone VARCHAR(20),
          address TEXT,
          birthdate DATE,
          gender ENUM('male', 'female', 'other'),
          avatar VARCHAR(500),
          proof_info TEXT,
          proof_file TEXT,
          last_password_reset DATETIME,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )
      `);
      console.log("✅ Created users table");
      
      // Thêm user admin mặc định
      const adminPassword = await bcrypt.hash("admin123", 10);
      await db.execute(
        "INSERT INTO users (name, email, password, roles) VALUES (?, ?, ?, 'admin')",
        ["Admin", "admin@example.com", adminPassword]
      );
      console.log("✅ Created default admin user");
    }
    
    // Kiểm tra các bảng khác
    await createOtherTables();
    
  } catch (err) {
    console.error("❌ Error checking/creating tables:", err);
  }
}

async function createOtherTables() {
  const tables = [
    `CREATE TABLE IF NOT EXISTS courses (
      id INT PRIMARY KEY AUTO_INCREMENT,
      title VARCHAR(255) NOT NULL,
      description TEXT,
      teacher_id INT,
      lessons INT DEFAULT 0,
      hours INT DEFAULT 0,
      is_approved TINYINT DEFAULT 0,
      color VARCHAR(10) DEFAULT '#9E9E9E',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (teacher_id) REFERENCES users(id) ON DELETE CASCADE
    )`,
    
    `CREATE TABLE IF NOT EXISTS course_enrollments (
      id INT PRIMARY KEY AUTO_INCREMENT,
      course_id INT,
      student_id INT,
      status ENUM('pending', 'confirmed') DEFAULT 'pending',
      enrolled_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
      FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE
    )`,
    
    `CREATE TABLE IF NOT EXISTS assignments (
      id INT PRIMARY KEY AUTO_INCREMENT,
      course_id INT,
      title VARCHAR(255) NOT NULL,
      total_points INT DEFAULT 100,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE
    )`,
    
    `CREATE TABLE IF NOT EXISTS assignment_submissions (
      id INT PRIMARY KEY AUTO_INCREMENT,
      assignment_id INT,
      student_id INT,
      completed TINYINT DEFAULT 0,
      submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (assignment_id) REFERENCES assignments(id) ON DELETE CASCADE,
      FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE
    )`,
    
    `CREATE TABLE IF NOT EXISTS grades (
      id INT PRIMARY KEY AUTO_INCREMENT,
      submission_id INT,
      score DECIMAL(5,2),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (submission_id) REFERENCES assignment_submissions(id) ON DELETE CASCADE
    )`,
    
    `CREATE TABLE IF NOT EXISTS questions (
      id INT PRIMARY KEY AUTO_INCREMENT,
      assignment_id INT,
      question_text TEXT NOT NULL,
      points INT DEFAULT 1,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (assignment_id) REFERENCES assignments(id) ON DELETE CASCADE
    )`,
    
    `CREATE TABLE IF NOT EXISTS answers (
      id INT PRIMARY KEY AUTO_INCREMENT,
      assignment_id INT,
      question_id INT,
      student_id INT,
      answer_text TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (assignment_id) REFERENCES assignments(id) ON DELETE CASCADE,
      FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE,
      FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE
    )`,
    
    `CREATE TABLE IF NOT EXISTS schedule (
      id INT PRIMARY KEY AUTO_INCREMENT,
      course_id INT,
      teacher_id INT,
      url VARCHAR(500),
      date DATE NOT NULL,
      period ENUM('Sáng', 'Chiều', 'Tối') NOT NULL,
      lesson VARCHAR(100),
      type ENUM('theory', 'practice') DEFAULT 'theory',
      order_index INT DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
      FOREIGN KEY (teacher_id) REFERENCES users(id) ON DELETE CASCADE
    )`,
    
    `CREATE TABLE IF NOT EXISTS videos (
      id INT PRIMARY KEY AUTO_INCREMENT,
      course_id INT,
      title VARCHAR(255) NOT NULL,
      url VARCHAR(500) NOT NULL,
      duration VARCHAR(20),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE
    )`,
    
    `CREATE TABLE IF NOT EXISTS comments (
      id INT PRIMARY KEY AUTO_INCREMENT,
      course_id INT,
      user_id INT,
      parent_id INT,
      content TEXT NOT NULL,
      is_edited TINYINT DEFAULT 0,
      edited_at TIMESTAMP NULL,
      deleted_at TIMESTAMP NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (parent_id) REFERENCES comments(id) ON DELETE CASCADE
    )`,
    
    `CREATE TABLE IF NOT EXISTS notifications (
      id INT PRIMARY KEY AUTO_INCREMENT,
      user_id INT,
      title VARCHAR(255) NOT NULL,
      is_read TINYINT DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )`,
    
    `CREATE TABLE IF NOT EXISTS messages (
      id INT PRIMARY KEY AUTO_INCREMENT,
      sender_id INT,
      receiver_id INT,
      message TEXT NOT NULL,
      is_read TINYINT DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (receiver_id) REFERENCES users(id) ON DELETE CASCADE
    )`,
    
    `CREATE TABLE IF NOT EXISTS password_reset (
      id INT PRIMARY KEY AUTO_INCREMENT,
      email VARCHAR(255) NOT NULL,
      otp VARCHAR(6) NOT NULL,
      expires_at DATETIME NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`
  ];
  
  for (const tableSql of tables) {
    try {
      await db.execute(tableSql);
      console.log(`✅ Created/verified table: ${tableSql.split('CREATE TABLE IF NOT EXISTS ')[1].split('(')[0]}`);
    } catch (err) {
      console.error(`❌ Error creating table:`, err.message);
    }
  }
}

async function sendEmailNotification(to, subject, htmlContent) {
  try {
    await transporter.sendMail({
      from: '"Hệ thống E-Study" <phettpeo160@gmail.com>',
      to: to,
      subject: subject,
      html: htmlContent
    });
    console.log(`✅ Email sent to: ${to}`);
  } catch (err) {
    console.error("❌ Error sending email:", err);
  }
}

async function createNotification(userId, title, link = null) {
  try {
    await db.execute(
      "INSERT INTO notifications (user_id, title) VALUES (?, ?)",
      [userId, title]
    );
  } catch (err) {
    console.error("❌ Error creating notification:", err);
  }
}

async function sendOTP(email, otp) {
  await transporter.sendMail({
    from: '"Hệ thống E-Study" <phettpeo160@gmail.com>',
    to: email,
    subject: "Mã OTP khôi phục mật khẩu",
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.5;">
        <h2 style="color: #1890ff;">E-Learning System</h2>
        <p>Bạn yêu cầu khôi phục mật khẩu. Mã OTP của bạn là:</p>
        <h1 style="text-align: center; color: #ff4d4f;">${otp}</h1>
        <p>OTP này sẽ hết hạn sau 5 phút.</p>
        <p>Nếu bạn không yêu cầu, hãy bỏ qua email này.</p>
      </div>
    `,
  });
}

async function saveOTP(email, otp) {
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000);
  await db.execute(
    "INSERT INTO password_reset (email, otp, expires_at) VALUES (?, ?, ?)",
    [email, otp, expiresAt]
  );
}

function authMiddleware(req, res, next) {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ message: "Unauthorized" });
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "secretkey");
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ message: "Invalid token" });
  }
}

// Test endpoint
app.get("/", (req, res) => {
  res.json({
    message: "E-Study Backend API is running!",
    database: "Connected to Aiven MySQL",
    endpoints: {
      auth: ["POST /register", "POST /login", "POST /forgot-password"],
      users: ["GET /users", "PUT /users/:id"],
      courses: ["GET /courses", "POST /courses", "GET /courses/pending-approval"],
      assignments: ["GET /assignments", "POST /assignments"]
    }
  });
});

// Health check endpoint
app.get("/health", async (req, res) => {
  try {
    const [result] = await db.execute("SELECT 1 as status");
    res.json({
      status: "healthy",
      database: "connected",
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    res.status(500).json({
      status: "unhealthy",
      database: "disconnected",
      error: err.message
    });
  }
});

// ==================== AUTH ENDPOINTS ====================
app.post("/register", upload.array("proof_file"), async (req, res) => {
  try {
    const { name, email, password, roles = "student", proof_info } = req.body;
    const proof_files = Array.isArray(req.files) ? req.files.map(f => f.filename) : [];

    const [exist] = await db.execute("SELECT * FROM users WHERE email=?", [email]);
    if (exist.length > 0) return res.status(400).json({ message: "Email đã tồn tại" });

    const hashedPassword = await bcrypt.hash(password, 10);
    const isApproved = roles === "teacher" ? 0 : 1;

    await db.execute(
      "INSERT INTO users (name, email, password, roles, is_approved, proof_info, proof_file) VALUES (?,?,?,?,?,?,?)",
      [name, email, hashedPassword, roles, isApproved, proof_info || null, JSON.stringify(proof_files)]
    );

    if (roles === "teacher") {
      const [admins] = await db.execute("SELECT id, name FROM users WHERE roles = 'admin'");
      for (const admin of admins) {
        await createNotification(
          admin.id,
          `Có giảng viên mới đăng ký: ${name} (${email}) cần duyệt`
        );
      }
      
      return res.json({ message: "Đăng ký giảng viên thành công. Chờ admin duyệt." });
    } else {
      return res.json({ message: "Đăng ký thành công" });
    }
  } catch (err) {
    console.error("❌ Register error:", err);
    res.status(500).json({ message: "Lỗi server", error: err.message });
  }
});

app.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const [rows] = await db.execute("SELECT * FROM users WHERE email=?", [email]);
    if (rows.length === 0) return res.status(401).json({ message: "Sai email hoặc mật khẩu" });

    const user = rows[0];
    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(401).json({ message: "Sai email hoặc mật khẩu" });

    if (user.roles === "teacher" && user.is_approved === 0) {
      return res.status(403).json({ message: "Tài khoản giảng viên đang chờ duyệt" });
    }

    const token = jwt.sign({ id: user.id, email: user.email, roles: user.roles }, process.env.JWT_SECRET || "secretkey", { expiresIn: "1d" });
    res.json({
      id: user.id,
      avatar: user.avatar,
      language: user.language,
      phone: user.phone,
      address: user.address,
      birthdate: user.birthdate,
      gender: user.gender,
      name: user.name,
      email: user.email,
      theme: user.theme || 'light',
      roles: user.roles,
      proof_info: user.proof_info,
      proof_file: user.proof_file,
      token
    });
  } catch (err) {
    console.error("❌ Login error:", err);
    res.status(500).json({ message: "Lỗi server", error: err.message });
  }
});

app.post("/forgot-password", async (req, res) => {
  const { email } = req.body;
  try {
    const [user] = await db.execute("SELECT id FROM users WHERE email=?", [email]);
    if (!user.length) return res.status(404).json({ message: "Email không tồn tại" });

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    await saveOTP(email, otp);
    await sendOTP(email, otp);

    res.json({ message: "Đã gửi mã OTP vào email của bạn" });
  } catch (err) {
    console.error("❌ Forgot password error:", err);
    res.status(500).json({ message: "Lỗi server", error: err.message });
  }
});

app.post("/verify-otp", async (req, res) => {
  const { email, otp } = req.body;
  try {
    const [rows] = await db.execute(
      "SELECT * FROM password_reset WHERE email=? AND otp=? ORDER BY id DESC LIMIT 1",
      [email, otp]
    );
    if (!rows.length) return res.status(400).json({ message: "OTP không đúng" });

    const record = rows[0];
    if (new Date(record.expires_at) < new Date())
      return res.status(400).json({ message: "OTP đã hết hạn" });

    res.json({ message: "OTP hợp lệ" });
  } catch (err) {
    console.error("❌ Verify OTP error:", err);
    res.status(500).json({ message: "Lỗi server", error: err.message });
  }
});

app.post("/reset-password", async (req, res) => {
  const { email, password } = req.body;
  try {
    const hashed = await bcrypt.hash(password, 10);
    await db.execute(
      "UPDATE users SET password=?, last_password_reset=NOW() WHERE email=?",
      [hashed, email]
    );
    res.json({ message: "Đổi mật khẩu thành công" });
  } catch (err) {
    console.error("❌ Reset password error:", err);
    res.status(500).json({ message: "Lỗi server", error: err.message });
  }
});

// ==================== USER ENDPOINTS ====================
app.get("/users", authMiddleware, async (req, res) => {
  if (req.user.roles !== "admin") return res.status(403).json({ message: "Forbidden" });
  try {
    const [rows] = await db.execute(
      "SELECT id, name, email, roles, is_approved, is_locked, proof_info, proof_file, created_at FROM users"
    );
    res.json(rows);
  } catch (err) {
    console.error("❌ Get users error:", err);
    res.status(500).json({ message: "Lỗi server", error: err.message });
  }
});

app.put("/users/:id/language", authMiddleware, async (req, res) => {
  const { language } = req.body;
  const userId = req.params.id;
  try {
    await db.execute("UPDATE users SET language = ? WHERE id = ?", [language, userId]);
    res.json({ success: true });
  } catch (err) {
    console.error("❌ Update language error:", err);
    res.status(500).json({ message: "Update language failed" });
  }
});

app.put('/users/:id/theme', authMiddleware, async (req, res) => {
  try {
    const { theme } = req.body;
    const userId = req.params.id;
    
    if (req.user.id !== parseInt(userId) && req.user.roles !== 'admin') {
      return res.status(403).json({ message: 'Forbidden' });
    }
    
    await db.execute('UPDATE users SET theme = ? WHERE id = ?', [theme, userId]);
    res.json({ success: true, theme });
  } catch (error) {
    console.error('❌ Error updating theme:', error);
    res.status(500).json({ error: 'Failed to update theme' });
  }
});

app.get('/users/:id/theme', authMiddleware, async (req, res) => {
  try {
    const userId = req.params.id;
    
    if (req.user.id !== parseInt(userId) && req.user.roles !== 'admin') {
      return res.status(403).json({ message: 'Forbidden' });
    }
    
    const [rows] = await db.execute('SELECT theme FROM users WHERE id = ?', [userId]);
    
    if (rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json({ theme: rows[0].theme || 'light' });
  } catch (error) {
    console.error('❌ Error getting theme:', error);
    res.status(500).json({ error: 'Failed to get theme' });
  }
});

app.put("/users/:id/approve-teacher", authMiddleware, async (req, res) => {
  if (req.user.roles !== "admin") return res.status(403).json({ message: "Forbidden" });
  
  try {
    const { approve } = req.body;
    const teacherId = req.params.id;
    
    const [teacher] = await db.execute(
      "SELECT name, email FROM users WHERE id = ?",
      [teacherId]
    );
    
    if (teacher.length === 0) {
      return res.status(404).json({ message: "Không tìm thấy giảng viên" });
    }
    
    await db.execute("UPDATE users SET is_approved=? WHERE id=?", [approve ? 1 : 0, teacherId]);

    const teacherName = teacher[0].name;
    const teacherEmail = teacher[0].email;

    if (approve) {
      await sendEmailNotification(
        teacherEmail,
        "Tài khoản giảng viên đã được duyệt",
        `
        <div style="font-family: Arial, sans-serif; line-height: 1.5;">
          <h2 style="color: #1890ff;">Chúc mừng ${teacherName}!</h2>
          <p>Tài khoản giảng viên của bạn đã được duyệt thành công.</p>
          <p>Bây giờ bạn có thể:</p>
          <ul>
            <li>Đăng nhập vào hệ thống</li>
            <li>Tạo khóa học mới</li>
            <li>Quản lý học viên</li>
            <li>Tham gia quá trình giảng dạy</li>
          </ul>
          <p>Chúc bạn có những trải nghiệm tuyệt vời trên hệ thống E-Study!</p>
        </div>
        `
      );
      
      await createNotification(teacherId, "Tài khoản giảng viên của bạn đã được duyệt!");
      
      res.json({ message: "Đã duyệt tài khoản giảng viên và gửi thông báo" });
    } else {
      await sendEmailNotification(
        teacherEmail,
        "Thông báo về tài khoản giảng viên",
        `
        <div style="font-family: Arial, sans-serif; line-height: 1.5;">
          <h2 style="color: #ff4d4f;">Thông báo từ hệ thống E-Study</h2>
          <p>Xin chào ${teacherName},</p>
          <p>Rất tiếc, tài khoản giảng viên của bạn đã bị từ chối.</p>
          <p>Vui lòng liên hệ với quản trị viên để biết thêm chi tiết.</p>
        </div>
        `
      );
      
      await createNotification(teacherId, "Tài khoản giảng viên của bạn đã bị từ chối.");
      
      res.json({ message: "Đã từ chối tài khoản giảng viên và gửi thông báo" });
    }
  } catch (err) {
    console.error("❌ Approve teacher error:", err);
    res.status(500).json({ message: "Lỗi server", error: err.message });
  }
});

app.put("/users/:id/lock", authMiddleware, async (req, res) => {
  if (req.user.roles !== "admin") return res.status(403).json({ message: "Forbidden" });
  try {
    const { lock } = req.body;
    await db.execute("UPDATE users SET is_locked=? WHERE id=?", [lock ? 1 : 0, req.params.id]);
    res.json({ message: `Tài khoản đã ${lock ? "khóa" : "mở khóa"}` });
  } catch (err) {
    console.error("❌ Lock user error:", err);
    res.status(500).json({ message: "Lỗi server", error: err.message });
  }
});

app.put("/users/:id", authMiddleware, uploadFields, async (req, res) => {
  if (req.user.id !== parseInt(req.params.id) && req.user.roles !== "admin") {
    return res.status(403).json({ message: "Không có quyền cập nhật hồ sơ này" });
  }

  try {
    const { name, email, roles, phone, gender, birthdate, address, proof_info } = req.body;

    const avatarFile = req.files?.["avatar"]?.[0];
    const proofFiles = req.files?.["proof_file"];

    let avatarPath = avatarFile ? `/uploads/${avatarFile.filename}` : undefined;
    let proofFilePaths = proofFiles ? proofFiles.map(f => `/uploads/${f.filename}`) : undefined;

    let query = "UPDATE users SET";
    let params = [];
    let updates = [];

    if (name) { updates.push(" name=? "); params.push(name); }
    if (email) { updates.push(" email=? "); params.push(email); }
    if (roles && req.user.roles === "admin") { updates.push(" roles=? "); params.push(roles); }
    if (phone !== undefined) { updates.push(" phone=? "); params.push(phone); }
    if (gender !== undefined) { updates.push(" gender=? "); params.push(gender); }
    if (birthdate !== undefined) { updates.push(" birthdate=? "); params.push(birthdate); }
    if (address !== undefined) { updates.push(" address=? "); params.push(address); }
    if (proof_info !== undefined) { updates.push(" proof_info=? "); params.push(proof_info); }
    if (avatarPath) { updates.push(" avatar=? "); params.push(avatarPath); }
    if (proofFilePaths) { updates.push(" proof_file=? "); params.push(JSON.stringify(proofFilePaths)); }

    if (updates.length === 0) {
      return res.json({ message: "Không có gì để cập nhật" });
    }

    query += updates.join(",") + " WHERE id=?";
    params.push(req.params.id);

    await db.execute(query, params);

    res.json({
      message: "Cập nhật thành công",
      avatar: avatarPath,
      proof_file: proofFilePaths
    });
  } catch (err) {
    console.error("❌ Update user error:", err);
    res.status(500).json({ message: "Lỗi khi cập nhật người dùng", error: err.message });
  }
});

app.post("/users", authMiddleware, async (req, res) => {
  if (req.user.roles !== "admin") return res.status(403).json({ message: "Forbidden" });
  try {
    const { name, email, password, roles } = req.body;
    const hashed = await bcrypt.hash(password, 10);
    await db.execute("INSERT INTO users (name, email, password, roles) VALUES (?, ?, ?, ?)", [name, email, hashed, roles]);
    res.json({ message: "Thêm người dùng thành công" });
  } catch (err) {
    console.error("❌ Add user error:", err);
    res.status(500).json({ message: "Lỗi khi thêm người dùng", error: err.message });
  }
});

app.delete("/users/:id", authMiddleware, async (req, res) => {
  if (req.user.roles !== "admin") return res.status(403).json({ message: "Forbidden" });
  try {
    await db.execute("DELETE FROM users WHERE id=?", [req.params.id]);
    res.json({ message: "Xóa người dùng thành công" });
  } catch (err) {
    console.error("❌ Delete user error:", err);
    res.status(500).json({ message: "Lỗi khi xóa người dùng", error: err.message });
  }
});

// ==================== COURSE ENDPOINTS ====================
app.get("/courses", authMiddleware, async (req, res) => {
  try {
    let query = `
      SELECT c.*, u.name as teacher_name
      FROM courses c
      JOIN users u ON c.teacher_id = u.id
    `;
    let params = [];

    if (req.user.roles === "teacher") {
      query += " WHERE c.teacher_id = ?";
      params.push(req.user.id);
    } else if (req.user.roles === "student") {
      query += " WHERE c.is_approved = 1";
    }

    const [courses] = await db.execute(query, params);
    res.json(courses);
  } catch (err) {
    console.error("❌ Get courses error:", err);
    res.status(500).json({ message: "Lỗi khi lấy khóa học", error: err.message });
  }
});

app.get("/users/:id/courses", authMiddleware, async (req, res) => {
  try {
    const studentId = req.params.id;

    const [courses] = await db.execute(
      `SELECT c.id, c.title, c.description, u.name AS teacher_name, ce.enrolled_at
       FROM course_enrollments ce
       JOIN courses c ON ce.course_id = c.id
       JOIN users u ON c.teacher_id = u.id
       WHERE ce.student_id = ? AND ce.status = 'confirmed'`,
      [studentId]
    );

    res.json(courses);
  } catch (err) {
    console.error("❌ Get user courses error:", err);
    res.status(500).json({ message: "Lỗi khi lấy danh sách khóa học của sinh viên", error: err.message });
  }
});

app.post("/courses", authMiddleware, async (req, res) => {
  try {
    if (req.user.roles !== "teacher") {
      return res.status(403).json({ message: "Chỉ giảng viên mới được thêm khóa học." });
    }

    const [teacher] = await db.execute(
      "SELECT is_approved FROM users WHERE id = ?",
      [req.user.id]
    );
    
    if (teacher.length === 0 || teacher[0].is_approved === 0) {
      return res.status(403).json({ 
        message: "Tài khoản giảng viên chưa được duyệt. Vui lòng chờ admin duyệt tài khoản." 
      });
    }

    const { title, description, lessons, hours } = req.body;
    const teacherId = req.user.id;

    if (!title || !description) {
      return res.status(400).json({ message: "Vui lòng nhập đầy đủ thông tin khóa học." });
    }

    const [result] = await db.execute(
      `INSERT INTO courses (title, description, teacher_id, lessons, hours, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, NOW(), NOW())`,
      [title, description, teacherId, lessons || 0, hours || 0]
    );

    const courseId = result.insertId;

    const [admins] = await db.execute("SELECT id, name FROM users WHERE roles = 'admin'");
    const [teacherInfo] = await db.execute("SELECT name FROM users WHERE id = ?", [teacherId]);

    const teacherName = teacherInfo[0].name;

    for (const admin of admins) {
      await createNotification(
        admin.id,
        `Giảng viên ${teacherName} đã tạo khóa học mới: "${title}" cần duyệt`
      );
    }

    await createNotification(
      teacherId,
      `Khóa học "${title}" của bạn đã được tạo thành công và đang chờ duyệt`
    );

    res.json({ 
      message: "Thêm khóa học thành công! Khóa học đang chờ admin duyệt.",
      courseId: courseId
    });
  } catch (err) {
    console.error("❌ Add course error:", err);
    res.status(500).json({ message: "Lỗi máy chủ", error: err.message });
  }
});

app.get("/courses/pending-approval", authMiddleware, async (req, res) => {
  if (req.user.roles !== "admin") return res.status(403).json({ message: "Forbidden" });
  
  try {
    const [courses] = await db.execute(
      `SELECT c.*, u.name as teacher_name, u.email as teacher_email
       FROM courses c
       JOIN users u ON c.teacher_id = u.id
       WHERE c.is_approved = 0
       ORDER BY c.created_at DESC`
    );
    res.json(courses);
  } catch (err) {
    console.error("❌ Get pending courses error:", err);
    res.status(500).json({ message: "Lỗi server", error: err.message });
  }
});

app.put("/courses/:id/approve", authMiddleware, async (req, res) => {
  if (req.user.roles !== "admin") return res.status(403).json({ message: "Forbidden" });
  
  try {
    const courseId = req.params.id;
    const { approve } = req.body;
    
    const [course] = await db.execute(
      `SELECT c.*, u.name as teacher_name, u.id as teacher_id, u.email as teacher_email
       FROM courses c 
       JOIN users u ON c.teacher_id = u.id 
       WHERE c.id = ?`,
      [courseId]
    );
    
    if (course.length === 0) {
      return res.status(404).json({ message: "Khóa học không tồn tại" });
    }
    
    const courseData = course[0];
    const teacherId = courseData.teacher_id;
    
    if (approve) {
      await db.execute(
        "UPDATE courses SET is_approved = 1, updated_at = NOW() WHERE id = ?",
        [courseId]
      );
      
      await createNotification(
        teacherId,
        `Khóa học "${courseData.title}" của bạn đã được duyệt. Học viên có thể đăng ký ngay!`
      );
      
      res.json({ 
        success: true,
        message: "Đã duyệt khóa học thành công",
        is_approved: 1
      });
    } else {
      await db.execute(
        "UPDATE courses SET is_approved = 2, updated_at = NOW() WHERE id = ?",
        [courseId]
      );
      
      await createNotification(
        teacherId,
        `Khóa học "${courseData.title}" của bạn đã bị từ chối. Vui lòng liên hệ admin để biết thêm chi tiết.`
      );
      
      res.json({ 
        success: true,
        message: "Đã từ chối khóa học",
        is_approved: 2
      });
    }
  } catch (err) {
    console.error("❌ Approve course error:", err);
    res.status(500).json({ 
      success: false,
      message: "Lỗi server",
      error: err.message 
    });
  }
});

app.post("/courses/:id/enroll", authMiddleware, async (req, res) => {
  if (req.user.roles !== "student")
    return res.status(403).json({ message: "Forbidden" });

  try {
    const courseId = req.params.id;
    await db.execute(
      "INSERT IGNORE INTO course_enrollments (course_id, student_id) VALUES (?,?)",
      [courseId, req.user.id]
    );
    res.json({ message: "Enrolled successfully" });
  } catch (err) {
    console.error("❌ Enroll course error:", err);
    res.status(500).json({ message: "Lỗi server", error: err.message });
  }
});

// ==================== ASSIGNMENT ENDPOINTS ====================
app.get("/assignments/course/:courseId", authMiddleware, async (req, res) => {
  try {
    const { courseId } = req.params;
    const [rows] = await db.execute(
      "SELECT * FROM assignments WHERE course_id = ? ORDER BY created_at DESC",
      [courseId]
    );
    res.json(rows);
  } catch (err) {
    console.error("❌ Get assignments error:", err);
    res.status(500).json({ message: "Lỗi lấy danh sách bài tập", error: err.message });
  }
});

app.post("/assignments", authMiddleware, async (req, res) => {
  try {
    if (req.user.roles !== "teacher")
      return res.status(403).json({ message: "Chỉ giảng viên mới được tạo bài tập." });

    const { course_id, title, total_points } = req.body;

    const [course] = await db.execute(
      "SELECT id, title, is_approved FROM courses WHERE id = ?",
      [course_id]
    );
    
    if (course.length === 0) {
      return res.status(404).json({ message: "Khóa học không tồn tại" });
    }
    
    if (course[0].is_approved === 0) {
      return res.status(400).json({ 
        message: "Khóa học chưa được duyệt. Vui lòng chờ admin duyệt khóa học trước khi tạo bài tập." 
      });
    }

    await db.execute(
      "INSERT INTO assignments (course_id, title, total_points, created_at, updated_at) VALUES (?, ?, ?, NOW(), NOW())",
      [course_id, title, total_points || 100]
    );

    const [students] = await db.execute(
      "SELECT student_id, u.email, u.name FROM course_enrollments ce JOIN users u ON ce.student_id = u.id WHERE ce.course_id=?",
      [course_id]
    );
    
    for (const s of students) {
      await createNotification(
        s.student_id,
        `Khóa học "${course[0].title}" có bài tập mới: ${title}`
      );
    }

    res.json({ message: "Tạo bài tập thành công" });
  } catch (err) {
    console.error("❌ Create assignment error:", err);
    res.status(500).json({ message: "Lỗi tạo bài tập", error: err.message });
  }
});

app.post("/assignments/submit", authMiddleware, async (req, res) => {
  try {
    if (req.user.roles !== "student")
      return res.status(403).json({ message: "Chỉ sinh viên mới nộp bài." });

    const { assignment_id } = req.body;
    await db.execute(
      `INSERT INTO assignment_submissions (assignment_id, student_id, completed, submitted_at)
       VALUES (?, ?, 1, NOW())
       ON DUPLICATE KEY UPDATE completed=1, submitted_at=NOW()`,
      [assignment_id, req.user.id]
    );
    
    const [assignment] = await db.execute("SELECT course_id, title FROM assignments WHERE id=?", [assignment_id]);
    const [course] = await db.execute("SELECT teacher_id, title FROM courses WHERE id=?", [assignment[0].course_id]);
    
    if (course[0].teacher_id != null) {
      const [student] = await db.execute("SELECT name FROM users WHERE id = ?", [req.user.id]);
      const studentName = student[0].name;
      
      await createNotification(
        course[0].teacher_id,
        `Học viên ${studentName} đã nộp bài tập "${assignment[0].title}" trong khóa học "${course[0].title}"`
      );
    }
    
    res.json({ message: "Đã nộp bài" });
  } catch (err) {
    console.error("❌ Submit assignment error:", err);
    res.status(500).json({ message: "Lỗi nộp bài", error: err.message });
  }
});

// ==================== VIDEO ENDPOINTS ====================
app.post("/videos/add", authMiddleware, async (req, res) => {
  try {
    const { course_id, title, url, duration } = req.body;
    const userId = req.user.id;

    if (req.user.roles !== "teacher" && req.user.roles !== "admin") {
      return res.status(403).json({ message: "Chỉ giảng viên được thêm video." });
    }

    if (!course_id || !title || !url) {
      return res.status(400).json({ message: "Thiếu thông tin bắt buộc" });
    }

    const [course] = await db.execute(
      "SELECT id, title, is_approved FROM courses WHERE id = ?",
      [course_id]
    );
    
    if (course.length === 0) {
      return res.status(404).json({ message: "Khóa học không tồn tại" });
    }
    
    if (course[0].is_approved === 0) {
      return res.status(400).json({ 
        message: "Khóa học chưa được duyệt. Vui lòng chờ admin duyệt khóa học trước khi thêm video." 
      });
    }

    if (req.user.roles === "teacher") {
      const [courseCheck] = await db.execute("SELECT teacher_id FROM courses WHERE id = ?", [course_id]);
      if (courseCheck.length === 0) {
        return res.status(404).json({ message: "Khóa học không tồn tại" });
      }
      if (courseCheck[0].teacher_id !== userId) {
        return res.status(403).json({ message: "Bạn không có quyền thêm video vào khóa học này" });
      }
    }

    const durationValue = duration ? duration.toString() : "0";

    await db.execute(
      "INSERT INTO videos (course_id, title, url, duration) VALUES (?, ?, ?, ?)",
      [course_id, title, url, durationValue]
    );

    const [students] = await db.execute(
      "SELECT student_id, u.email, u.name FROM course_enrollments ce JOIN users u ON ce.student_id = u.id WHERE ce.course_id=?",
      [course_id]
    );
    
    for (const s of students) {
      await createNotification(
        s.student_id,
        `Khóa học "${course[0].title}" có video mới: ${title}`
      );
    }

    res.json({ message: "Thêm video thành công" });
  } catch (err) {
    console.error("❌ Add video error:", err);
    res.status(500).json({ message: "Lỗi server khi thêm video", error: err.message });
  }
});

app.get("/videos", authMiddleware, async (req, res) => {
  try {
    let query = "SELECT * FROM videos";
    let params = [];

    if (req.user.roles === "teacher") {
      query += " WHERE course_id IN (SELECT id FROM courses WHERE teacher_id = ?)";
      params.push(req.user.id);
    }

    query += " ORDER BY created_at DESC";

    const [videos] = await db.execute(query, params);
    res.json(videos);
  } catch (err) {
    console.error("❌ Get videos error:", err);
    res.status(500).json({ message: "Lỗi server", error: err.message });
  }
});

// ==================== NOTIFICATION ENDPOINTS ====================
app.get("/notifications/:userId", authMiddleware, async (req, res) => {
  const { userId } = req.params;
  if (parseInt(userId) !== req.user.id && req.user.roles !== "admin") {
    return res.status(403).json({ message: "Forbidden" });
  }
  try {
    const [rows] = await db.execute(
      "SELECT * FROM notifications WHERE user_id=? ORDER BY created_at DESC",
      [userId]
    );
    res.json(rows);
  } catch (err) {
    console.error("❌ Get notifications error:", err);
    res.status(500).json({ message: "Lỗi khi lấy thông báo", error: err.message });
  }
});

app.put("/notifications/:id/read", authMiddleware, async (req, res) => {
  const notifId = req.params.id;
  try {
    await db.execute("UPDATE notifications SET is_read=1 WHERE id=?", [notifId]);
    res.json({ message: "Đã đánh dấu đã đọc" });
  } catch (err) {
    console.error("❌ Mark notification read error:", err);
    res.status(500).json({ message: "Lỗi khi đánh dấu thông báo", error: err.message });
  }
});

// ==================== CHAT ENDPOINTS ====================
app.get("/chat/:other_user_id", authMiddleware, async (req, res) => {
  try {
    const current_user_id = req.user.id;
    const other_user_id = req.params.other_user_id;
    
    const [user] = await db.execute(
      "SELECT id, name FROM users WHERE id = ?",
      [other_user_id]
    );
    
    if (user.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: "Người dùng không tồn tại" 
      });
    }
    
    const [messages] = await db.execute(
      `SELECT m.*, 
              u.name as sender_name, 
              u.avatar as sender_avatar,
              CASE WHEN m.sender_id = ? THEN 'sent' ELSE 'received' END as message_type
       FROM messages m
       JOIN users u ON m.sender_id = u.id
       WHERE (m.sender_id = ? AND m.receiver_id = ?)
          OR (m.sender_id = ? AND m.receiver_id = ?)
       ORDER BY m.created_at ASC`,
      [current_user_id, current_user_id, other_user_id, other_user_id, current_user_id]
    );
    
    await db.execute(
      "UPDATE messages SET is_read = 1 WHERE receiver_id = ? AND sender_id = ? AND is_read = 0",
      [current_user_id, other_user_id]
    );
    
    const [userInfo] = await db.execute(
      "SELECT id, name, email, avatar, roles FROM users WHERE id = ?",
      [other_user_id]
    );
    
    res.json({
      success: true,
      user: userInfo[0],
      messages: messages
    });
  } catch (err) {
    console.error("❌ Get chat error:", err);
    res.status(500).json({ 
      success: false, 
      message: "Lỗi server",
      error: err.message 
    });
  }
});

app.post("/chat/send", authMiddleware, async (req, res) => {
  try {
    const { receiver_id, message } = req.body;
    const sender_id = req.user.id;
    
    if (!receiver_id || !message || !message.trim()) {
      return res.status(400).json({ 
        success: false, 
        message: "Thiếu thông tin tin nhắn" 
      });
    }
    
    const [receiver] = await db.execute(
      "SELECT id, name FROM users WHERE id = ?",
      [receiver_id]
    );
    
    if (receiver.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: "Người nhận không tồn tại" 
      });
    }
    
    const [result] = await db.execute(
      "INSERT INTO messages (sender_id, receiver_id, message) VALUES (?, ?, ?)",
      [sender_id, receiver_id, message.trim()]
    );
    
    const [newMessage] = await db.execute(
      `SELECT m.*, u.name as sender_name, u.avatar as sender_avatar
       FROM messages m
       JOIN users u ON m.sender_id = u.id
       WHERE m.id = ?`,
      [result.insertId]
    );
    
    await createNotification(
      receiver_id,
      `Bạn có tin nhắn mới từ ${req.user.name || req.user.email}`
    );
    
    res.json({
      success: true,
      message: "Đã gửi tin nhắn",
      chat: newMessage[0]
    });
  } catch (err) {
    console.error("❌ Send chat error:", err);
    res.status(500).json({ 
      success: false, 
      message: "Lỗi server",
      error: err.message 
    });
  }
});

// ==================== GRADE ENDPOINTS ====================
app.get('/api/student/grades', authMiddleware, async (req, res) => {
  try {
    if (req.user.roles !== 'student') {
      return res.status(403).json({ 
        success: false, 
        message: 'Chỉ sinh viên mới có thể xem điểm' 
      });
    }

    const studentId = req.user.id;

    const [grades] = await db.execute(`
      SELECT 
        c.id as course_id,
        c.title as course_name,
        a.id as assignment_id,
        a.title as assignment_name,
        a.total_points as max_score,
        s.id as submission_id,
        s.submitted_at,
        s.completed,
        g.score as obtained_score,
        ROUND((g.score * 100.0 / a.total_points), 2) as percentage,
        CASE 
          WHEN g.score >= (a.total_points * 0.9) THEN 'A+'
          WHEN g.score >= (a.total_points * 0.8) THEN 'A'
          WHEN g.score >= (a.total_points * 0.7) THEN 'B'
          WHEN g.score >= (a.total_points * 0.6) THEN 'C'
          WHEN g.score >= (a.total_points * 0.5) THEN 'D'
          ELSE 'F'
        END as grade_letter,
        u.name as teacher_name
      FROM course_enrollments ce
      JOIN courses c ON ce.course_id = c.id
      LEFT JOIN assignments a ON c.id = a.course_id
      LEFT JOIN assignment_submissions s ON a.id = s.assignment_id AND s.student_id = ce.student_id
      LEFT JOIN grades g ON s.id = g.submission_id
      LEFT JOIN users u ON c.teacher_id = u.id
      WHERE ce.student_id = ?
        AND ce.status = 'confirmed'
      ORDER BY c.title, a.created_at DESC
    `, [studentId]);

    const courseSummaries = {};
    
    grades.forEach(grade => {
      if (!courseSummaries[grade.course_id]) {
        courseSummaries[grade.course_id] = {
          course_id: grade.course_id,
          course_name: grade.course_name,
          teacher_name: grade.teacher_name,
          assignments: [],
          total_max_score: 0,
          total_obtained_score: 0,
          graded_assignments: 0,
          average_percentage: 0,
          overall_grade: ''
        };
      }

      if (grade.assignment_id) {
        const isGraded = grade.obtained_score !== null;
        const assignment = {
          assignment_id: grade.assignment_id,
          assignment_name: grade.assignment_name,
          max_score: grade.max_score,
          obtained_score: isGraded ? grade.obtained_score : null,
          percentage: isGraded ? grade.percentage : 0,
          grade_letter: isGraded ? grade.grade_letter : 'N/A',
          submitted_at: grade.submitted_at,
          completed: grade.completed,
          is_graded: isGraded
        };

        courseSummaries[grade.course_id].assignments.push(assignment);
        
        if (isGraded) {
          courseSummaries[grade.course_id].total_max_score += grade.max_score;
          courseSummaries[grade.course_id].total_obtained_score += grade.obtained_score;
          courseSummaries[grade.course_id].graded_assignments += 1;
        }
      }
    });

    Object.values(courseSummaries).forEach(course => {
      if (course.graded_assignments > 0) {
        course.average_percentage = (course.total_obtained_score / course.total_max_score) * 100;
        
        if (course.average_percentage >= 90) course.overall_grade = 'A+';
        else if (course.average_percentage >= 80) course.overall_grade = 'A';
        else if (course.average_percentage >= 70) course.overall_grade = 'B';
        else if (course.average_percentage >= 60) course.overall_grade = 'C';
        else if (course.average_percentage >= 50) course.overall_grade = 'D';
        else course.overall_grade = 'F';
      } else {
        course.average_percentage = 0;
        course.overall_grade = 'Chưa có điểm';
      }
    });

    res.json({
      success: true,
      data: {
        student_id: studentId,
        courses: Object.values(courseSummaries)
      }
    });

  } catch (err) {
    console.error('❌ Get student grades error:', err);
    res.status(500).json({ 
      success: false, 
      message: 'Lỗi khi lấy điểm',
      error: err.message 
    });
  }
});

// ==================== SCHEDULE ENDPOINTS ====================
app.get("/api/schedule/week", authMiddleware, async (req, res) => {
  const { date } = req.query;
  try {
    const inputDate = new Date(date);
    const startOfWeek = new Date(inputDate);
    const day = startOfWeek.getDay();
    const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1);
    startOfWeek.setDate(diff);
    startOfWeek.setHours(0, 0, 0, 0);

    const dates = [];
    for (let i = 0; i < 7; i++) {
      const currentDate = new Date(startOfWeek);
      currentDate.setDate(startOfWeek.getDate() + i);
      currentDate.setHours(0, 0, 0, 0);
      dates.push(currentDate.toISOString().split('T')[0]);
    }

    const [rows] = await db.execute(
      `SELECT s.*, c.title, c.teacher_id, c.lessons, c.color, u.name as teacher_name
       FROM schedule s
       LEFT JOIN courses c ON s.course_id = c.id
       LEFT JOIN users u ON c.teacher_id = u.id
       WHERE s.date BETWEEN ? AND ?
       ORDER BY s.date, s.period, s.order_index`,
      [dates[0], dates[6]]
    );

    const scheduleData = {
      Sáng: Array(7).fill().map(() => [{ type: 'empty' }, { type: 'empty' }]),
      Chiều: Array(7).fill().map(() => [{ type: 'empty' }, { type: 'empty' }]),
      Tối: Array(7).fill().map(() => [{ type: 'empty' }, { type: 'empty' }])
    };

    rows.forEach(r => {
      const scheduleDate = new Date(r.date);
      scheduleDate.setHours(0, 0, 0, 0);
      const normalizedDate = scheduleDate.toISOString().split('T')[0];
      
      const dayIndex = dates.findIndex(d => d === normalizedDate);
      
      if (dayIndex !== -1 && r.period in scheduleData) {
        const orderIndex = parseInt(r.order_index) || 0;
        if (orderIndex >= 0 && orderIndex < 2) {
          scheduleData[r.period][dayIndex][orderIndex] = {
            type: r.type || 'theory',
            title: r.title || `Khóa học ${r.course_id}`,
            teacher: r.teacher_name || `Giáo viên ${r.teacher_id}`,
            lesson: r.lesson || `Tiết ${r.lessons || 1}`,
            schedule_id: r.id,
            course_id: r.course_id,
            teacher_id: r.teacher_id,
            url: r.url || '',
            date: normalizedDate,
            period: r.period,
            order_index: orderIndex,
            color: r.color || '#9E9E9E'
          };
        }
      }
    });

    res.json(scheduleData);

  } catch (err) {
    console.error("❌ Get schedule error:", err);
    res.status(500).json({ message: "Lỗi lấy lịch tuần", error: err.message });
  }
});

// ==================== COMMENT ENDPOINTS ====================
app.get("/comments/:course_id", async (req, res) => {
  try {
    const { course_id } = req.params;
    const { nested } = req.query;
    
    if (nested === 'true') {
      const [results] = await db.execute(
        `SELECT
          c.id,
          c.content,
          c.created_at,
          c.parent_id,
          c.is_edited,
          c.edited_at,
          c.deleted_at,
          u.id as user_id,
          u.name AS user_name,
          u.avatar,
          u.roles as user_role
         FROM comments c
         JOIN users u ON c.user_id = u.id
         WHERE c.course_id = ? AND c.deleted_at IS NULL
         ORDER BY c.created_at ASC`,
        [course_id]
      );
      
      const commentMap = {};
      const rootComments = [];
      
      results.forEach(comment => {
        commentMap[comment.id] = { ...comment, replies: [] };
      });
      
      results.forEach(comment => {
        if (comment.parent_id) {
          if (commentMap[comment.parent_id]) {
            commentMap[comment.parent_id].replies.push(commentMap[comment.id]);
          }
        } else {
          rootComments.push(commentMap[comment.id]);
        }
      });
      
      res.json(rootComments);
    } else {
      const [results] = await db.execute(
        `SELECT c.id, c.content, c.created_at, c.parent_id, u.name AS user_name
         FROM comments c
         JOIN users u ON c.user_id = u.id
         WHERE c.course_id = ? AND c.deleted_at IS NULL
         ORDER BY c.created_at DESC`,
        [course_id]
      );
      res.json(results);
    }
  } catch (err) {
    console.error("❌ Get comments error:", err);
    res.status(500).json({ message: "Lỗi khi lấy bình luận", error: err.message });
  }
});

app.post("/comments/add", authMiddleware, async (req, res) => {
  try {
    const { course_id, content, parent_id } = req.body;
    const userId = req.user.id;
    
    if (!content || !content.trim()) {
      return res.status(400).json({ message: "Nội dung bình luận không được để trống" });
    }
    
    const [course] = await db.execute("SELECT id FROM courses WHERE id = ?", [course_id]);
    if (course.length === 0) {
      return res.status(404).json({ message: "Khóa học không tồn tại" });
    }
    
    if (parent_id) {
      const [parentComment] = await db.execute(
        "SELECT id, course_id FROM comments WHERE id = ?",
        [parent_id]
      );
      if (parentComment.length === 0) {
        return res.status(404).json({ message: "Bình luận cha không tồn tại" });
      }
      if (parentComment[0].course_id !== parseInt(course_id)) {
        return res.status(400).json({ message: "Bình luận không thuộc khóa học này" });
      }
    }
    
    const [result] = await db.execute(
      "INSERT INTO comments (course_id, user_id, parent_id, content) VALUES (?, ?, ?, ?)",
      [course_id, userId, parent_id || null, content]
    );
    
    const [newComment] = await db.execute(
      `SELECT
        c.id,
        c.content,
        c.created_at,
        c.parent_id,
        c.is_edited,
        c.edited_at,
        u.id as user_id,
        u.name AS user_name,
        u.avatar,
        u.roles as user_role
       FROM comments c
       JOIN users u ON c.user_id = u.id
       WHERE c.id = ?`,
      [result.insertId]
    );
    
    if (parent_id) {
      const [parentComment] = await db.execute(
        "SELECT user_id FROM comments WHERE id = ?",
        [parent_id]
      );
      if (parentComment.length > 0 && parentComment[0].user_id !== userId) {
        await createNotification(
          parentComment[0].user_id,
          `Có người trả lời bình luận của bạn`
        );
      }
    } else {
      const [students] = await db.execute(
        "SELECT student_id FROM course_enrollments WHERE course_id = ? AND student_id != ?",
        [course_id, userId]
      );
      for (const s of students) {
        await createNotification(s.student_id, `Có bình luận mới trong khóa học`);
      }
      
      const [courseInfo] = await db.execute(
        "SELECT teacher_id FROM courses WHERE id = ?",
        [course_id]
      );
      if (courseInfo.length > 0 && courseInfo[0].teacher_id !== userId) {
        await createNotification(
          courseInfo[0].teacher_id,
          `Có học viên bình luận trong khóa học của bạn`
        );
      }
    }
    
    res.json({
      message: "Đã đăng bình luận thành công",
      comment: newComment[0]
    });
  } catch (err) {
    console.error("❌ Add comment error:", err);
    res.status(500).json({ message: "Lỗi khi đăng bình luận", error: err.message });
  }
});

// ==================== START SERVER ====================
connectDB()
  .then(() => {
    const port = process.env.PORT || 5001;
    app.listen(port, () => {
      console.log(`🚀 Server running on port ${port}`);
      console.log(`📊 Database: ${process.env.DB_HOST}`);
      console.log(`🔗 Health check: http://localhost:${port}/health`);
      console.log(`🔗 API Test: http://localhost:${port}/`);
    });
  })
  .catch((err) => {
    console.error("❌ Database connection failed:", err);
    process.exit(1);
  });