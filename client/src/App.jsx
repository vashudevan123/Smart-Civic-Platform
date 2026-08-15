import { useEffect, useState } from "react";
import "./App.css";

const API_URL = "http://localhost:5000";

function getSavedUser() {
  try {
    const savedUser = localStorage.getItem("user");

    if (!savedUser) {
      return null;
    }

    return JSON.parse(savedUser);
  } catch (error) {
    console.log("Saved user error:", error);
    localStorage.removeItem("user");
    localStorage.removeItem("token");
    return null;
  }
}

function App() {
  // =====================================================
  // USER
  // =====================================================

  const [user, setUser] = useState(getSavedUser);

  // =====================================================
  // MODALS
  // =====================================================

  const [showLogin, setShowLogin] = useState(false);
  const [showRegister, setShowRegister] = useState(false);
  const [showComplaint, setShowComplaint] = useState(false);
  const [showTracker, setShowTracker] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showAdmin, setShowAdmin] = useState(false);
  const [showCitizen, setShowCitizen] = useState(false);

  // =====================================================
  // LOGIN
  // =====================================================

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // =====================================================
  // REGISTER
  // =====================================================

  const [registerName, setRegisterName] = useState("");
  const [registerEmail, setRegisterEmail] = useState("");
  const [registerPassword, setRegisterPassword] = useState("");

  // =====================================================
  // COMPLAINT
  // =====================================================

  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");

  // =====================================================
  // DATA
  // =====================================================

  const [complaints, setComplaints] = useState([]);
  const [adminComplaints, setAdminComplaints] = useState([]);
  const [notifications, setNotifications] = useState([]);

  // =====================================================
  // COMMON
  // =====================================================

  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  // =====================================================
  // LOAD NOTIFICATIONS
  // =====================================================

  const loadNotifications = async () => {
    const token = localStorage.getItem("token");

    if (!token) {
      return;
    }

    try {
      const response = await fetch(
        `${API_URL}/api/notifications`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();

      if (response.ok) {
        setNotifications(data.notifications || []);
      }
    } catch (error) {
      console.log("Notification error:", error);
    }
  };

  // =====================================================
  // NOTIFICATION AUTO REFRESH
  // =====================================================

  useEffect(() => {
    if (!user) {
      return;
    }

    const firstLoad = window.setTimeout(() => {
      loadNotifications();
    }, 0);

    const interval = window.setInterval(() => {
      loadNotifications();
    }, 10000);

    return () => {
      window.clearTimeout(firstLoad);
      window.clearInterval(interval);
    };
  }, [user]);

  // =====================================================
  // UNREAD NOTIFICATION COUNT
  // =====================================================

  const unreadCount = notifications.filter(
    (notification) =>
      notification.read !== true &&
      notification.status !== "read"
  ).length;

  // =====================================================
  // MARK NOTIFICATION READ
  // =====================================================

  const markNotificationRead = async (id) => {
    const token = localStorage.getItem("token");

    if (!token) {
      return;
    }

    try {
      const response = await fetch(
        `${API_URL}/api/notifications/${id}/read`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.ok) {
        setNotifications((oldNotifications) =>
          oldNotifications.map((notification) =>
            notification._id === id
              ? {
                  ...notification,
                  read: true,
                  status: "read",
                }
              : notification
          )
        );
      }
    } catch (error) {
      console.log("Mark notification error:", error);
    }
  };

  // =====================================================
  // LOGIN
  // =====================================================

  const handleLogin = async (event) => {
    event.preventDefault();

    setLoading(true);
    setMessage("");

    try {
      const response = await fetch(
        `${API_URL}/api/login`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email,
            password,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        setMessage(
          data.message || "Invalid login details."
        );
        return;
      }

      localStorage.setItem("token", data.token);
      localStorage.setItem(
        "user",
        JSON.stringify(data.user)
      );

      setUser(data.user);

      setEmail("");
      setPassword("");

      setMessage("Login successful!");

      window.setTimeout(() => {
        setShowLogin(false);
        setMessage("");

        if (data.user.role === "admin") {
          setShowAdmin(true);
        } else {
          setShowCitizen(true);
          loadCitizenComplaints();
        }
      }, 500);
    } catch (error) {
      console.log("Login error:", error);

      setMessage(
        "Backend server se connection nahi ho raha."
      );
    } finally {
      setLoading(false);
    }
  };

  // =====================================================
  // REGISTER
  // =====================================================

  const handleRegister = async (event) => {
    event.preventDefault();

    setLoading(true);
    setMessage("");

    try {
      const response = await fetch(
        `${API_URL}/api/register`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name: registerName,
            email: registerEmail,
            password: registerPassword,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        setMessage(
          data.message || "Registration failed."
        );
        return;
      }

      setRegisterName("");
      setRegisterEmail("");
      setRegisterPassword("");

      setMessage(
        "Account created successfully! Ab Login karein."
      );

      window.setTimeout(() => {
        setShowRegister(false);
        setShowLogin(true);
        setMessage("");
      }, 1000);
    } catch (error) {
      console.log("Register error:", error);

      setMessage(
        "Backend server se connection nahi ho raha."
      );
    } finally {
      setLoading(false);
    }
  };

  // =====================================================
  // LOGOUT
  // =====================================================

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");

    setUser(null);

    setComplaints([]);
    setAdminComplaints([]);
    setNotifications([]);

    setShowAdmin(false);
    setShowCitizen(false);
    setShowComplaint(false);
    setShowTracker(false);
    setShowNotifications(false);
    setShowLogin(false);
    setShowRegister(false);

    setMessage("");
  };

  // =====================================================
  // OPEN COMPLAINT FORM
  // =====================================================

  const openComplaintForm = () => {
    if (!user) {
      setShowLogin(true);
      setMessage(
        "Complaint submit karne ke liye pehle Login karein."
      );
      return;
    }

    setMessage("");
    setShowComplaint(true);
  };

  // =====================================================
  // SUBMIT COMPLAINT
  // =====================================================

  const submitComplaint = async (event) => {
    event.preventDefault();

    const token = localStorage.getItem("token");

    if (!token) {
      setShowComplaint(false);
      setShowLogin(true);
      setMessage("Pehle Login karein.");
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      const response = await fetch(
        `${API_URL}/api/complaints`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            category,
            description,
            location,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        setMessage(
          data.message ||
            "Complaint submit nahi hui."
        );
        return;
      }

      const complaintId =
        data.complaint?.id ||
        data.complaint?._id ||
        data.id ||
        data._id ||
        "";

      setCategory("");
      setDescription("");
      setLocation("");

      setMessage(
        `Complaint submitted successfully! ID: ${complaintId}`
      );

      await loadCitizenComplaints();

      window.setTimeout(() => {
        setShowComplaint(false);
        setShowCitizen(true);
        setMessage("");
      }, 1500);
    } catch (error) {
      console.log("Complaint error:", error);

      setMessage(
        "Backend server se connection nahi ho raha."
      );
    } finally {
      setLoading(false);
    }
  };

  // =====================================================
  // LOAD CITIZEN COMPLAINTS
  // =====================================================

  const loadCitizenComplaints = async () => {
    const token = localStorage.getItem("token");

    if (!token) {
      return false;
    }

    try {
      const response = await fetch(
        `${API_URL}/api/complaints`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        setMessage(
          data.message ||
            "Complaints load nahi hui."
        );
        return false;
      }

      setComplaints(data.complaints || []);
      return true;
    } catch (error) {
      console.log(
        "Citizen complaints error:",
        error
      );

      setMessage(
        "Backend server se connection nahi ho raha."
      );

      return false;
    }
  };

  // =====================================================
  // TRACK COMPLAINT
  // =====================================================

  const trackComplaints = async () => {
    if (!user) {
      setShowLogin(true);
      setMessage(
        "Complaint track karne ke liye Login karein."
      );
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      const success =
        await loadCitizenComplaints();

      if (success) {
        setShowTracker(true);
      }
    } finally {
      setLoading(false);
    }
  };

  // =====================================================
  // CITIZEN DASHBOARD
  // =====================================================

  const openCitizenDashboard = async () => {
    if (!user) {
      setShowLogin(true);
      return;
    }

    if (user.role === "admin") {
      setMessage(
        "Admin account ke liye Admin Dashboard use karein."
      );
      return;
    }

    setLoading(true);

    try {
      await loadCitizenComplaints();
      setShowCitizen(true);
    } finally {
      setLoading(false);
    }
  };

  // =====================================================
  // ADMIN DASHBOARD
  // =====================================================

  const openAdminDashboard = async () => {
    const token = localStorage.getItem("token");

    if (!token) {
      setShowLogin(true);
      return;
    }

    if (!user || user.role !== "admin") {
      setMessage(
        "Sirf admin dashboard access kar sakta hai."
      );
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      const response = await fetch(
        `${API_URL}/api/admin/complaints`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        setMessage(
          data.message ||
            "Admin complaints load nahi hui."
        );
        return;
      }

      setAdminComplaints(
        data.complaints || []
      );

      setShowAdmin(true);
    } catch (error) {
      console.log("Admin error:", error);

      setMessage(
        "Backend server se connection nahi ho raha."
      );
    } finally {
      setLoading(false);
    }
  };

  // =====================================================
  // UPDATE COMPLAINT STATUS
  // =====================================================

  const updateComplaintStatus = async (
    complaintId,
    status
  ) => {
    const token = localStorage.getItem("token");

    if (!token) {
      return;
    }

    try {
      const response = await fetch(
        `${API_URL}/api/admin/complaints/${complaintId}/status`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            status,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        setMessage(
          data.message ||
            "Status update nahi hua."
        );
        return;
      }

      setAdminComplaints((oldComplaints) =>
        oldComplaints.map((complaint) =>
          complaint._id === complaintId
            ? {
                ...complaint,
                status,
              }
            : complaint
        )
      );

      setMessage(
        "Complaint status updated successfully."
      );

      await loadNotifications();

      // Citizen complaint list ko bhi refresh
      if (user?.role !== "admin") {
        await loadCitizenComplaints();
      }
    } catch (error) {
      console.log(
        "Update status error:",
        error
      );

      setMessage(
        "Status update ke time server error."
      );
    }
  };

  // =====================================================
  // DELETE COMPLAINT
  // =====================================================

  const deleteComplaint = async (id) => {
    const token = localStorage.getItem("token");

    if (!token) {
      return;
    }

    const confirmed = window.confirm(
      "Kya aap complaint delete karna chahte hain?"
    );

    if (!confirmed) {
      return;
    }

    try {
      const response = await fetch(
        `${API_URL}/api/admin/complaints/${id}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        setMessage(
          data.message ||
            "Complaint delete nahi hui."
        );
        return;
      }

      setAdminComplaints((oldComplaints) =>
        oldComplaints.filter(
          (complaint) =>
            complaint._id !== id
        )
      );

      setMessage(
        "Complaint deleted successfully."
      );
    } catch (error) {
      console.log(
        "Delete complaint error:",
        error
      );
    }
  };

  // =====================================================
  // OPEN NOTIFICATIONS
  // =====================================================

  const openNotifications = () => {
    if (!user) {
      setShowLogin(true);
      setMessage(
        "Notifications ke liye Login karein."
      );
      return;
    }

    setShowNotifications(true);

    window.setTimeout(() => {
      loadNotifications();
    }, 0);
  };

  // =====================================================
  // RENDER
  // =====================================================

  return (
    <div className="app">

      {/* =================================================
          NAVBAR
      ================================================= */}

      <nav className="navbar">

        <div className="logo">
          🏙️ Smart Civic
        </div>

        <div className="nav-links">

          <a href="#home">
            Home
          </a>

          <a href="#complaints">
            Complaints
          </a>

          <a href="#services">
            Services
          </a>

          <a href="#about">
            About
          </a>

          {user && user.role !== "admin" && (
            <button
              className="login-btn"
              onClick={openCitizenDashboard}
            >
              👤 Citizen Dashboard
            </button>
          )}

          {user?.role === "admin" && (
            <button
              className="login-btn"
              onClick={openAdminDashboard}
            >
              🛠️ Admin Dashboard
            </button>
          )}

          {user && (
            <button
              className="notification-btn"
              onClick={openNotifications}
            >
              🔔

              {unreadCount > 0 && (
                <span className="notification-badge">
                  {unreadCount}
                </span>
              )}
            </button>
          )}

          {user ? (
            <button
              className="login-btn"
              onClick={handleLogout}
            >
              Logout
            </button>
          ) : (
            <button
              className="login-btn"
              onClick={() => {
                setShowLogin(true);
                setMessage("");
              }}
            >
              Login
            </button>
          )}

        </div>
      </nav>

      {/* =================================================
          HERO
      ================================================= */}

      <section
        id="home"
        className="hero-section"
      >

        <div className="hero-content">

          <h1>
            Smart Solutions for a
            <span> Better City</span>
          </h1>

          <p>
            Report civic problems, track
            complaints and connect with
            your local administration
            through one smart platform.
          </p>

          <div className="hero-buttons">

            <button
              className="primary-btn"
              onClick={openComplaintForm}
            >
              📝 Report a Problem
            </button>

            <button
              className="secondary-btn"
              onClick={trackComplaints}
              disabled={loading}
            >
              📊 Track Complaint
            </button>

          </div>

        </div>

        <div className="hero-card">

          <div className="city-icon">
            🏙️
          </div>

          <h2>
            Smart Civic Platform
          </h2>

          <p>
            Making cities cleaner,
            safer and smarter.
          </p>

        </div>

      </section>

      {/* =================================================
          STATS
      ================================================= */}

      <section className="stats">

        <div className="stat-card">
          <h2>1,250+</h2>
          <p>Complaints Resolved</p>
        </div>

        <div className="stat-card">
          <h2>850+</h2>
          <p>Active Citizens</p>
        </div>

        <div className="stat-card">
          <h2>95%</h2>
          <p>Resolution Rate</p>
        </div>

        <div className="stat-card">
          <h2>24/7</h2>
          <p>Support</p>
        </div>

      </section>

      {/* =================================================
          COMPLAINTS
      ================================================= */}

      <section
        id="complaints"
        className="section"
      >

        <h2>
          Report Civic Issues
        </h2>

        <p className="section-text">
          Easily report problems in your
          area and help improve your city.
        </p>

        <div className="complaint-grid">

          {[
            ["🚧", "Road Damage"],
            ["💡", "Street Light"],
            ["🗑️", "Garbage"],
            ["💧", "Water Supply"],
          ].map(([icon, title]) => (
            <div
              className="complaint-card"
              key={title}
            >

              <div className="card-icon">
                {icon}
              </div>

              <h3>
                {title}
              </h3>

              <p>
                Report{" "}
                {title.toLowerCase()}{" "}
                problems.
              </p>

              <button
                onClick={openComplaintForm}
              >
                Report Now
              </button>

            </div>
          ))}

        </div>

      </section>

      {/* =================================================
          SERVICES
      ================================================= */}

      <section
        id="services"
        className="services-section"
      >

        <h2>
          Our Services
        </h2>

        <p className="section-text">
          Click on any service to access it directly.
        </p>

        <div className="service-grid">

          {/* ONLINE COMPLAINT */}

          <div
            className="service-card clickable-service"
            onClick={openComplaintForm}
          >

            <span>📝</span>

            <h3>
              Online Complaints
            </h3>

            <p>
              Submit your civic complaint
              online.
            </p>

            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                openComplaintForm();
              }}
            >
              Click to Open →
            </button>

          </div>

          {/* LOCATION */}

          <div
            className="service-card clickable-service"
            onClick={openComplaintForm}
          >

            <span>📍</span>

            <h3>
              Location Tracking
            </h3>

            <p>
              Select exact location for
              your complaint.
            </p>

            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                openComplaintForm();
              }}
            >
              Click to Open →
            </button>

          </div>

          {/* TRACKING */}

          <div
            className="service-card clickable-service"
            onClick={trackComplaints}
          >

            <span>📊</span>

            <h3>
              Complaint Tracking
            </h3>

            <p>
              Check current complaint
              status.
            </p>

            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                trackComplaints();
              }}
            >
              Click to Open →
            </button>

          </div>

          {/* NOTIFICATIONS */}

          <div
            className="service-card clickable-service"
            onClick={openNotifications}
          >

            <span>🔔</span>

            <h3>
              Notifications
            </h3>

            <p>
              Receive complaint status
              updates.
            </p>

            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                openNotifications();
              }}
            >
              Click to Open →
            </button>

          </div>

        </div>

      </section>

      {/* =================================================
          ABOUT
      ================================================= */}

      <section
        id="about"
        className="about-section"
      >

        <h2>
          About Smart Civic
        </h2>

        <p>
          Smart Civic is a digital platform
          designed to connect citizens with
          local administration. Citizens can
          report civic issues, track complaints
          and receive updates.
        </p>

      </section>

      {/* =================================================
          FOOTER
      ================================================= */}

      <footer>

        <h3>
          🏙️ Smart Civic
        </h3>

        <p>
          Building smarter and better
          communities.
        </p>

        <p>
          © 2026 Smart Civic Platform
        </p>

      </footer>

      {/* =================================================
          LOGIN MODAL
      ================================================= */}

      {showLogin && (
        <div className="login-overlay">

          <div className="login-box">

            <button
              className="close-btn"
              onClick={() => {
                setShowLogin(false);
                setMessage("");
              }}
            >
              ✕
            </button>

            <div className="login-icon">
              🔐
            </div>

            <h2>
              Welcome Back
            </h2>

            <p>
              Login to your Smart Civic
              account
            </p>

            <form onSubmit={handleLogin}>

              <input
                type="email"
                placeholder="Enter Email"
                value={email}
                onChange={(event) =>
                  setEmail(event.target.value)
                }
                required
              />

              <input
                type="password"
                placeholder="Enter Password"
                value={password}
                onChange={(event) =>
                  setPassword(event.target.value)
                }
                required
              />

              <button
                className="login-submit"
                type="submit"
                disabled={loading}
              >
                {loading
                  ? "Logging in..."
                  : "Login"}
              </button>

            </form>

            <button
              className="register-link"
              onClick={() => {
                setShowLogin(false);
                setShowRegister(true);
                setMessage("");
              }}
            >
              New user? Create Citizen
              Account
            </button>

            {message && (
              <p className="login-message">
                {message}
              </p>
            )}

          </div>

        </div>
      )}

      {/* =================================================
          REGISTER MODAL
      ================================================= */}

      {showRegister && (
        <div className="login-overlay">

          <div className="login-box">

            <button
              className="close-btn"
              onClick={() => {
                setShowRegister(false);
                setMessage("");
              }}
            >
              ✕
            </button>

            <div className="login-icon">
              👤
            </div>

            <h2>
              Create Citizen Account
            </h2>

            <form onSubmit={handleRegister}>

              <input
                type="text"
                placeholder="Enter Name"
                value={registerName}
                onChange={(event) =>
                  setRegisterName(
                    event.target.value
                  )
                }
                required
              />

              <input
                type="email"
                placeholder="Enter Email"
                value={registerEmail}
                onChange={(event) =>
                  setRegisterEmail(
                    event.target.value
                  )
                }
                required
              />

              <input
                type="password"
                placeholder="Create Password"
                value={registerPassword}
                onChange={(event) =>
                  setRegisterPassword(
                    event.target.value
                  )
                }
                minLength={6}
                required
              />

              <button
                className="login-submit"
                type="submit"
                disabled={loading}
              >
                {loading
                  ? "Creating..."
                  : "Create Citizen Account"}
              </button>

            </form>

            <button
              className="register-link"
              onClick={() => {
                setShowRegister(false);
                setShowLogin(true);
                setMessage("");
              }}
            >
              Already have an account?
              Login
            </button>

            {message && (
              <p className="login-message">
                {message}
              </p>
            )}

          </div>

        </div>
      )}

      {/* =================================================
          COMPLAINT FORM
      ================================================= */}

      {showComplaint && (
        <div className="login-overlay">

          <div className="login-box complaint-box">

            <button
              className="close-btn"
              onClick={() => {
                setShowComplaint(false);
                setMessage("");
              }}
            >
              ✕
            </button>

            <div className="login-icon">
              📍
            </div>

            <h2>
              Online Complaint
            </h2>

            <p>
              Report your civic problem
            </p>

            <form onSubmit={submitComplaint}>

              <select
                value={category}
                onChange={(event) =>
                  setCategory(event.target.value)
                }
                required
              >

                <option value="">
                  Select Problem Type
                </option>

                <option value="Road Damage">
                  🚧 Road Damage
                </option>

                <option value="Street Light">
                  💡 Street Light
                </option>

                <option value="Garbage">
                  🗑️ Garbage
                </option>

                <option value="Water Supply">
                  💧 Water Supply
                </option>

                <option value="Other">
                  Other
                </option>

              </select>

              <textarea
                placeholder="Describe your problem"
                value={description}
                onChange={(event) =>
                  setDescription(
                    event.target.value
                  )
                }
                required
              />

              <input
                type="text"
                placeholder="Enter exact location"
                value={location}
                onChange={(event) =>
                  setLocation(event.target.value)
                }
                required
              />

              {/* GOOGLE MAP */}

              <div className="map-container">

                <iframe
                  title="Google Map Location"
                  width="100%"
                  height="220"
                  style={{
                    border: 0,
                    borderRadius: "12px",
                  }}
                  loading="lazy"
                  allowFullScreen
                  src={`https://www.google.com/maps?q=${encodeURIComponent(
                    location || "India"
                  )}&output=embed`}
                />

              </div>

              <p className="map-help">
                📍 Enter your area/address in the location box. The map will update automatically.
                
              </p>

              <button
                className="login-submit"
                type="submit"
                disabled={loading}
              >
                {loading
                  ? "Submitting..."
                  : "Submit Complaint"}
              </button>

            </form>

            {message && (
              <p className="login-message">
                {message}
              </p>
            )}

          </div>

        </div>
      )}

      {/* =================================================
          COMPLAINT TRACKER
      ================================================= */}

      {showTracker && (
        <div className="login-overlay">

          <div className="login-box tracker-box">

            <button
              className="close-btn"
              onClick={() => {
                setShowTracker(false);
                setMessage("");
              }}
            >
              ✕
            </button>

            <div className="login-icon">
              📊
            </div>

            <h2>
              Complaint Tracker
            </h2>

            <p>
              Your submitted complaints
            </p>

            <button
              className="refresh-btn"
              onClick={trackComplaints}
              disabled={loading}
            >
              🔄 Refresh
            </button>

            {complaints.length === 0 ? (
              <div className="empty-dashboard">

                <div className="empty-icon">
                  📭
                </div>

                <h3>
                  No Complaints Found
                </h3>

                <p>
                  You have not submitted
                  any complaints.
                </p>

              </div>
            ) : (
              complaints.map((complaint) => (
                <div
                  className="complaint-item"
                  key={complaint._id}
                >

                  <h3>
                    {complaint.category}
                  </h3>

                  <p>
                    <strong>ID:</strong>{" "}
                    {complaint._id}
                  </p>

                  <p>
                    <strong>Description:</strong>{" "}
                    {complaint.description}
                  </p>

                  <p>
                    <strong>Location:</strong>{" "}
                    {complaint.location}
                  </p>

                  <p>
                    <strong>Status:</strong>{" "}
                    {complaint.status ||
                      "Pending"}
                  </p>

                  <p>
                    <strong>Date:</strong>{" "}
                    {complaint.createdAt
                      ? new Date(
                          complaint.createdAt
                        ).toLocaleString()
                      : ""}
                  </p>

                </div>
              ))
            )}

          </div>

        </div>
      )}

      {/* =================================================
          CITIZEN DASHBOARD
      ================================================= */}

      {showCitizen && user && (
        <div className="admin-overlay">

          <div className="admin-dashboard">

            <div className="admin-header">

              <div>
                <h1>
                  👤 Citizen Dashboard
                </h1>

                <p>
                  Welcome,{" "}
                  {user.name || "Citizen"}
                </p>
              </div>

              <button
                className="admin-close-btn"
                onClick={() =>
                  setShowCitizen(false)
                }
              >
                ✕
              </button>

            </div>

            {/* DASHBOARD STATS */}

            <div className="dashboard-stats">

              <div className="dashboard-stat total">

                <div className="stat-icon">
                  📋
                </div>

                <div>
                  <h3>
                    {complaints.length}
                  </h3>

                  <p>
                    My Complaints
                  </p>
                </div>

              </div>

              <div className="dashboard-stat pending">

                <div className="stat-icon">
                  ⏳
                </div>

                <div>
                  <h3>
                    {
                      complaints.filter(
                        (complaint) =>
                          complaint.status ===
                          "Pending"
                      ).length
                    }
                  </h3>

                  <p>
                    Pending
                  </p>
                </div>

              </div>

              <div className="dashboard-stat progress">

                <div className="stat-icon">
                  🔄
                </div>

                <div>
                  <h3>
                    {
                      complaints.filter(
                        (complaint) =>
                          complaint.status ===
                          "In Progress"
                      ).length
                    }
                  </h3>

                  <p>
                    In Progress
                  </p>
                </div>

              </div>

              <div className="dashboard-stat resolved">

                <div className="stat-icon">
                  ✅
                </div>

                <div>
                  <h3>
                    {
                      complaints.filter(
                        (complaint) =>
                          complaint.status ===
                          "Resolved"
                      ).length
                    }
                  </h3>

                  <p>
                    Resolved
                  </p>
                </div>

              </div>

            </div>

            {/* CONTENT */}

            <div className="dashboard-content">

              <div className="dashboard-title">

                <div>
                  <h2>
                    My Complaints
                  </h2>

                  <p>
                    Track your submitted
                    complaints
                  </p>
                </div>

                <button
                  className="refresh-btn"
                  onClick={trackComplaints}
                  disabled={loading}
                >
                  🔄 Refresh
                </button>

              </div>

              <button
                className="primary-btn"
                onClick={openComplaintForm}
              >
                📝 Submit New Complaint
              </button>

              {complaints.length === 0 ? (
                <div className="empty-dashboard">

                  <div className="empty-icon">
                    📭
                  </div>

                  <h3>
                    No Complaints
                  </h3>

                  <p>
                    Submit your first civic
                    complaint.
                  </p>

                </div>
              ) : (
                <div className="admin-complaints-list">

                  {complaints.map(
                    (complaint) => (
                      <div
                        className="admin-complaint-card"
                        key={complaint._id}
                      >

                        <div className="complaint-card-header">

                          <div>

                            <span className="complaint-category">
                              {complaint.category}
                            </span>

                            <p className="complaint-id">
                              ID:{" "}
                              {complaint._id}
                            </p>

                          </div>

                          <span
                            className={`status-badge ${
                              complaint.status ===
                              "Pending"
                                ? "status-pending"
                                : complaint.status ===
                                  "In Progress"
                                ? "status-progress"
                                : "status-resolved"
                            }`}
                          >
                            {complaint.status ||
                              "Pending"}
                          </span>

                        </div>

                        <div className="complaint-description">

                          <span>
                            Description
                          </span>

                          <p>
                            {
                              complaint.description
                            }
                          </p>

                        </div>

                        <div className="info-item">

                          <span>
                            📍 Location
                          </span>

                          <strong>
                            {complaint.location}
                          </strong>

                        </div>

                        <div className="info-item">

                          <span>
                            📅 Date
                          </span>

                          <strong>
                            {complaint.createdAt
                              ? new Date(
                                  complaint.createdAt
                                ).toLocaleString()
                              : ""}
                          </strong>

                        </div>

                      </div>
                    )
                  )}

                </div>
              )}

            </div>

          </div>

        </div>
      )}

      {/* =================================================
          NOTIFICATIONS
      ================================================= */}

      {showNotifications && (
        <div className="login-overlay">

          <div className="login-box tracker-box">

            <button
              className="close-btn"
              onClick={() =>
                setShowNotifications(false)
              }
            >
              ✕
            </button>

            <div className="login-icon">
              🔔
            </div>

            <h2>
              Notifications
            </h2>

            <p>
              Complaint status updates
            </p>

            {notifications.length === 0 ? (
              <div className="empty-dashboard">

                <div className="empty-icon">
                  🔕
                </div>

                <h3>
                  No Notifications
                </h3>

                <p>
                  Abhi koi update nahi hai.
                </p>

              </div>
            ) : (
              notifications.map(
                (notification) => {

                  const unread =
                    notification.read !== true &&
                    notification.status !==
                      "read";

                  return (
                    <div
                      className={`complaint-item ${
                        unread
                          ? "unread-notification"
                          : ""
                      }`}
                      key={notification._id}
                      onClick={() => {
                        if (unread) {
                          markNotificationRead(
                            notification._id
                          );
                        }
                      }}
                    >

                      <h3>
                        {notification.title ||
                          "Complaint Update"}
                      </h3>

                      <p>
                        {notification.message}
                      </p>

                      {notification.complaintId && (
                        <p>
                          <strong>
                            Status:
                          </strong>{" "}
                          {typeof notification.complaintId ===
                          "object"
                            ? notification
                                .complaintId
                                .status
                            : ""}
                        </p>
                      )}

                      <small>
                        {notification.createdAt
                          ? new Date(
                              notification.createdAt
                            ).toLocaleString()
                          : ""}
                      </small>

                    </div>
                  );
                }
              )
            )}

          </div>

        </div>
      )}

      {/* =================================================
          ADMIN DASHBOARD
      ================================================= */}

      {showAdmin && user?.role === "admin" && (
        <div className="admin-overlay">

          <div className="admin-dashboard">

            <div className="admin-header">

              <div>

                <h1>
                  🛠️ Admin Dashboard
                </h1>

                <p>
                  Smart Civic Complaint
                  Management
                </p>

              </div>

              <button
                className="admin-close-btn"
                onClick={() =>
                  setShowAdmin(false)
                }
              >
                ✕
              </button>

            </div>

            {/* ADMIN STATS */}

            <div className="dashboard-stats">

              <div className="dashboard-stat total">

                <div className="stat-icon">
                  📋
                </div>

                <div>

                  <h3>
                    {adminComplaints.length}
                  </h3>

                  <p>
                    Total Complaints
                  </p>

                </div>

              </div>

              <div className="dashboard-stat pending">

                <div className="stat-icon">
                  ⏳
                </div>

                <div>

                  <h3>
                    {
                      adminComplaints.filter(
                        (complaint) =>
                          complaint.status ===
                          "Pending"
                      ).length
                    }
                  </h3>

                  <p>
                    Pending
                  </p>

                </div>

              </div>

              <div className="dashboard-stat progress">

                <div className="stat-icon">
                  🔄
                </div>

                <div>

                  <h3>
                    {
                      adminComplaints.filter(
                        (complaint) =>
                          complaint.status ===
                          "In Progress"
                      ).length
                    }
                  </h3>

                  <p>
                    In Progress
                  </p>

                </div>

              </div>

              <div className="dashboard-stat resolved">

                <div className="stat-icon">
                  ✅
                </div>

                <div>

                  <h3>
                    {
                      adminComplaints.filter(
                        (complaint) =>
                          complaint.status ===
                          "Resolved"
                      ).length
                    }
                  </h3>

                  <p>
                    Resolved
                  </p>

                </div>

              </div>

            </div>

            {message && (
              <div className="dashboard-message">
                {message}
              </div>
            )}

            {/* ADMIN CONTENT */}

            <div className="dashboard-content">

              <div className="dashboard-title">

                <div>

                  <h2>
                    All Complaints
                  </h2>

                  <p>
                    Manage citizen complaints
                  </p>

                </div>

                <button
                  className="refresh-btn"
                  onClick={openAdminDashboard}
                  disabled={loading}
                >
                  🔄 Refresh
                </button>

              </div>

              {adminComplaints.length === 0 ? (
                <div className="empty-dashboard">

                  <div className="empty-icon">
                    📭
                  </div>

                  <h3>
                    No Complaints Found
                  </h3>

                </div>
              ) : (
                <div className="admin-complaints-list">

                  {adminComplaints.map(
                    (complaint) => (
                      <div
                        className="admin-complaint-card"
                        key={complaint._id}
                      >

                        <div className="complaint-card-header">

                          <div>

                            <span className="complaint-category">
                              {complaint.category}
                            </span>

                            <p className="complaint-id">
                              ID:{" "}
                              {complaint._id}
                            </p>

                          </div>

                          <span
                            className={`status-badge ${
                              complaint.status ===
                              "Pending"
                                ? "status-pending"
                                : complaint.status ===
                                  "In Progress"
                                ? "status-progress"
                                : "status-resolved"
                            }`}
                          >
                            {complaint.status ||
                              "Pending"}
                          </span>

                        </div>

                        <div className="complaint-info-grid">

                          <div className="info-item">

                            <span>
                              👤 Citizen
                            </span>

                            <strong>
                              {complaint.userId
                                ?.name ||
                                "Citizen"}
                            </strong>

                          </div>

                          <div className="info-item">

                            <span>
                              📧 Email
                            </span>

                            <strong>
                              {complaint.userId
                                ?.email ||
                                "N/A"}
                            </strong>

                          </div>

                          <div className="info-item">

                            <span>
                              📍 Location
                            </span>

                            <strong>
                              {complaint.location}
                            </strong>

                          </div>

                          <div className="info-item">

                            <span>
                              📅 Date
                            </span>

                            <strong>
                              {complaint.createdAt
                                ? new Date(
                                    complaint.createdAt
                                  ).toLocaleString()
                                : ""}
                            </strong>

                          </div>

                        </div>

                        <div className="complaint-description">

                          <span>
                            Description
                          </span>

                          <p>
                            {
                              complaint.description
                            }
                          </p>

                        </div>

                        {/* ACTIONS */}

                        <div className="complaint-actions">

                          <div className="status-control">

                            <label>
                              Update Status
                            </label>

                            <select
                              value={
                                complaint.status ||
                                "Pending"
                              }
                              onChange={(event) =>
                                updateComplaintStatus(
                                  complaint._id,
                                  event.target.value
                                )
                              }
                            >

                              <option value="Pending">
                                Pending
                              </option>

                              <option value="In Progress">
                                In Progress
                              </option>

                              <option value="Resolved">
                                Resolved
                              </option>

                            </select>

                          </div>

                          <button
                            className="delete-complaint-btn"
                            onClick={() =>
                              deleteComplaint(
                                complaint._id
                              )
                            }
                          >
                            🗑️ Delete
                          </button>

                        </div>

                      </div>
                    )
                  )}

                </div>
              )}

            </div>

          </div>

        </div>
      )}

    </div>
  );
}

export default App;