const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

require("dotenv").config();

const User = require("./model/User");
const Complaint = require("./model/Complaint");
const Notification = require("./model/Notification");

const app = express();

const PORT = 5000;

const JWT_SECRET =
  process.env.JWT_SECRET || "smart-civic-secret-key";

// =========================
// MIDDLEWARE
// =========================

app.use(cors());

app.use(express.json());

app.use(express.urlencoded({ extended: true }));

// =========================
// FILE UPLOAD SETUP
// =========================

const uploadDir = path.join(__dirname, "uploads");

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },

  filename: (req, file, cb) => {
    const uniqueName =
      Date.now() +
      "-" +
      Math.round(Math.random() * 1e9) +
      path.extname(file.originalname);

    cb(null, uniqueName);
  },
});

const upload = multer({
  storage: storage,

  limits: {
    fileSize: 5 * 1024 * 1024,
  },

  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      "image/jpeg",
      "image/jpg",
      "image/png",
      "image/webp",
    ];

    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(
        new Error(
          "Only JPG, JPEG, PNG and WEBP images are allowed."
        )
      );
    }
  },
});

// Serve uploaded images

app.use(
  "/uploads",
  express.static(uploadDir)
);

// =========================
// MONGODB CONNECTION
// =========================

console.log(
  "Mongo URI:",
  process.env.MONGO_URI
);

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log(
      "MongoDB Connected Successfully"
    );
  })
  .catch((error) => {
    console.log(
      "MongoDB Connection Error:",
      error.message
    );
  });

// =========================
// TEST ROUTE
// =========================

app.get("/", (req, res) => {
  res.send(
    "Smart Civic Platform Server is Running"
  );
});

// =========================
// AUTH MIDDLEWARE
// =========================

const authenticateToken = (
  req,
  res,
  next
) => {
  const authHeader =
    req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({
      message:
        "Authorization token required",
    });
  }

  const token =
    authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({
      message: "Invalid token",
    });
  }

  try {
    const decoded = jwt.verify(
      token,
      JWT_SECRET
    );

    req.user = decoded;

    next();
  } catch (error) {
    return res.status(401).json({
      message:
        "Invalid or expired token",
    });
  }
};

// =========================
// ADMIN MIDDLEWARE
// =========================

const adminOnly = (
  req,
  res,
  next
) => {
  if (
    !req.user ||
    req.user.role !== "admin"
  ) {
    return res.status(403).json({
      message:
        "Admin access required",
    });
  }

  next();
};

// =========================
// REGISTER CITIZEN
// =========================

app.post(
  "/api/register",
  async (req, res) => {
    try {
      const {
        name,
        email,
        password,
      } = req.body;

      if (
        !name ||
        !email ||
        !password
      ) {
        return res.status(400).json({
          message:
            "Name, email and password are required",
        });
      }

      const existingUser =
        await User.findOne({
          email:
            email.toLowerCase(),
        });

      if (existingUser) {
        return res.status(400).json({
          message:
            "User already exists",
        });
      }

      const hashedPassword =
        await bcrypt.hash(
          password,
          10
        );

      const user =
        await User.create({
          name,
          email:
            email.toLowerCase(),
          password:
            hashedPassword,
          role: "user",
        });

      res.status(201).json({
        message:
          "Registration successful",

        user: {
          id: user._id.toString(),
          name: user.name,
          email: user.email,
          role: user.role,
        },
      });
    } catch (error) {
      console.log(
        "Register Error:",
        error
      );

      res.status(500).json({
        message: "Server error",
      });
    }
  }
);

// =========================
// LOGIN
// =========================

app.post(
  "/api/login",
  async (req, res) => {
    try {
      const {
        email,
        password,
      } = req.body;

      if (
        !email ||
        !password
      ) {
        return res.status(400).json({
          message:
            "Email and password are required",
        });
      }

      const user =
        await User.findOne({
          email:
            email.toLowerCase(),
        });

      if (!user) {
        return res.status(401).json({
          message:
            "Invalid email or password",
        });
      }

      const passwordMatch =
        await bcrypt.compare(
          password,
          user.password
        );

      if (!passwordMatch) {
        return res.status(401).json({
          message:
            "Invalid email or password",
        });
      }

      console.log(
        "LOGIN USER:",
        user.email
      );

      console.log(
        "LOGIN ROLE:",
        user.role
      );

      const token =
        jwt.sign(
          {
            id: user._id.toString(),
            email: user.email,
            role: user.role,
          },
          JWT_SECRET,
          {
            expiresIn: "1d",
          }
        );

      res.status(200).json({
        message:
          "Login successful",

        token,

        user: {
          id: user._id.toString(),
          name: user.name,
          email: user.email,
          role: user.role,
        },
      });
    } catch (error) {
      console.log(
        "Login Error:",
        error
      );

      res.status(500).json({
        message: "Server error",
      });
    }
  }
);

// =========================
// CREATE COMPLAINT
// WITH IMAGE + LOCATION
// =========================

app.post(
  "/api/complaints",
  authenticateToken,
  upload.single("image"),
  async (req, res) => {
    try {
      const {
        category,
        description,
        location,
        latitude,
        longitude,
      } = req.body;

      if (
        !category ||
        !description ||
        !location
      ) {
        return res.status(400).json({
          message:
            "Category, description and location are required",
        });
      }

      const complaint =
        await Complaint.create({
          userId:
            req.user.id,

          category,

          description,

          location,

          latitude:
            latitude || null,

          longitude:
            longitude || null,

          image: req.file
            ? `/uploads/${req.file.filename}`
            : "",

          status: "Pending",
        });

      res.status(201).json({
        message:
          "Complaint submitted successfully",

        complaint: {
          id:
            complaint._id.toString(),

          category:
            complaint.category,

          description:
            complaint.description,

          location:
            complaint.location,

          latitude:
            complaint.latitude,

          longitude:
            complaint.longitude,

          image:
            complaint.image,

          status:
            complaint.status,
        },
      });
    } catch (error) {
      console.log(
        "Complaint Error:",
        error
      );

      res.status(500).json({
        message:
          error.message ||
          "Server error",
      });
    }
  }
);

// =========================
// GET USER COMPLAINTS
// =========================

app.get(
  "/api/complaints",
  authenticateToken,
  async (req, res) => {
    try {
      const complaints =
        await Complaint.find({
          userId:
            req.user.id,
        }).sort({
          createdAt: -1,
        });

      res.status(200).json({
        complaints,
      });
    } catch (error) {
      console.log(
        "Get Complaints Error:",
        error
      );

      res.status(500).json({
        message: "Server error",
      });
    }
  }
);

// =========================
// ADMIN - GET ALL COMPLAINTS
// =========================

app.get(
  "/api/admin/complaints",
  authenticateToken,
  adminOnly,
  async (req, res) => {
    try {
      const complaints =
        await Complaint.find()
          .populate(
            "userId",
            "name email"
          )
          .sort({
            createdAt: -1,
          });

      res.status(200).json({
        complaints,
      });
    } catch (error) {
      console.log(
        "Admin Get Complaints Error:",
        error
      );

      res.status(500).json({
        message: "Server error",
      });
    }
  }
);

// =========================
// ADMIN - UPDATE STATUS
// + CREATE NOTIFICATION
// =========================

app.put(
  "/api/admin/complaints/:id/status",
  authenticateToken,
  adminOnly,
  async (req, res) => {
    try {
      const { status } =
        req.body;

      const allowedStatuses = [
        "Pending",
        "In Progress",
        "Resolved",
      ];

      if (
        !allowedStatuses.includes(
          status
        )
      ) {
        return res.status(400).json({
          message:
            "Invalid complaint status",
        });
      }

      const complaint =
        await Complaint.findByIdAndUpdate(
          req.params.id,
          {
            status,
          },
          {
            new: true,
          }
        );

      if (!complaint) {
        return res.status(404).json({
          message:
            "Complaint not found",
        });
      }

      // =========================
      // NOTIFICATION MESSAGE
      // =========================

      let notificationMessage =
        "";

      if (
        status === "Pending"
      ) {
        notificationMessage =
          "Your complaint is currently pending.";
      }

      if (
        status === "In Progress"
      ) {
        notificationMessage =
          "Your complaint is now being worked on by the administration.";
      }

      if (
        status === "Resolved"
      ) {
        notificationMessage =
          "Your complaint has been resolved successfully.";
      }

      // =========================
      // CREATE NOTIFICATION
      // =========================

      await Notification.create({
        userId:
          complaint.userId,

        complaintId:
          complaint._id,

        title:
          "Complaint Status Updated",

        message:
          notificationMessage,

        status: "unread",

        read: false,
      });

      console.log(
        "Notification created for:",
        complaint.userId
      );

      res.status(200).json({
        message:
          "Complaint status updated successfully",

        complaint,
      });
    } catch (error) {
      console.log(
        "Update Status Error:",
        error
      );

      res.status(500).json({
        message: "Server error",
      });
    }
  }
);

// =========================
// ADMIN - DELETE COMPLAINT
// =========================

app.delete(
  "/api/admin/complaints/:id",
  authenticateToken,
  adminOnly,
  async (req, res) => {
    try {
      const complaint =
        await Complaint.findByIdAndDelete(
          req.params.id
        );

      if (!complaint) {
        return res.status(404).json({
          message:
            "Complaint not found",
        });
      }

      // DELETE RELATED NOTIFICATIONS

      await Notification.deleteMany({
        complaintId:
          req.params.id,
      });

      res.status(200).json({
        message:
          "Complaint deleted successfully",
      });
    } catch (error) {
      console.log(
        "Delete Complaint Error:",
        error
      );

      res.status(500).json({
        message: "Server error",
      });
    }
  }
);

// =========================
// GET USER NOTIFICATIONS
// =========================

app.get(
  "/api/notifications",
  authenticateToken,
  async (req, res) => {
    try {
      const notifications =
        await Notification.find({
          userId:
            req.user.id,
        })
          .populate(
            "complaintId",
            "category description location status image latitude longitude"
          )
          .sort({
            createdAt: -1,
          });

      res.status(200).json({
        notifications,
      });
    } catch (error) {
      console.log(
        "Get Notifications Error:",
        error
      );

      res.status(500).json({
        message: "Server error",
      });
    }
  }
);

// =========================
// MARK NOTIFICATION AS READ
// =========================

app.put(
  "/api/notifications/:id/read",
  authenticateToken,
  async (req, res) => {
    try {
      const notification =
        await Notification.findOneAndUpdate(
          {
            _id:
              req.params.id,

            userId:
              req.user.id,
          },
          {
            status: "read",
            read: true,
          },
          {
            new: true,
          }
        );

      if (!notification) {
        return res.status(404).json({
          message:
            "Notification not found",
        });
      }

      res.status(200).json({
        message:
          "Notification marked as read",

        notification,
      });
    } catch (error) {
      console.log(
        "Read Notification Error:",
        error
      );

      res.status(500).json({
        message: "Server error",
      });
    }
  }
);

// =========================
// MULTER ERROR HANDLER
// =========================

app.use(
  (error, req, res, next) => {
    if (
      error instanceof multer.MulterError
    ) {
      return res.status(400).json({
        message:
          "Image upload error: " +
          error.message,
      });
    }

    if (error) {
      return res.status(400).json({
        message: error.message,
      });
    }

    next();
  }
);

// =========================
// START SERVER
// =========================

app.listen(
  PORT,
  () => {
    console.log(
      `Server running on http://localhost:${PORT}`
    );

    console.log(
      "Image uploads available at /uploads"
    );
  }
);