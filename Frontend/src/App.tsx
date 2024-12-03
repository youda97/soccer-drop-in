import React, { useEffect, useState } from "react";
import {
  BrowserRouter as Router,
  Route,
  Routes,
  useNavigate,
  Navigate,
} from "react-router-dom";
import Home from "./pages/Home";
import Header from "./components/Header";
import Login from "./pages/Login";
import Register from "./pages/Register";
import EventDetails from "./pages/EventDetails";
import ConfirmationPage from "./pages/Confirmation";
import CreateEvent from "./pages/CreateEvent";
import { AuthProvider, useAuth } from "./components/Auth";
import ProtectedRoute from "./components/ProtectedRoute";
import Notification from "./components/Notification";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import VerifyEmail from "./pages/VerifyEmail";
import YourEvents from "./pages/YourEvents";
import Footer from "./components/Footer";

const App: React.FC = () => {
  return (
    <AuthProvider>
      <Router>
        <MainRoutes />
      </Router>
    </AuthProvider>
  );
};

const MainRoutes: React.FC = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false); // Adjust this state as necessary
  const [isLoading, setIsLoading] = useState(true); // Add loading state

  const navigate = useNavigate();
  const { user } = useAuth();
  const auth = getAuth();

  const [notification, setNotification] = useState({
    message: "",
    isVisible: false,
  });

  const handleLogout = () => {
    setIsLoggedIn(false);
    showNotification("You are logged out");
  };

  // Function to show a notification
  const showNotification = (message: string) => {
    setNotification({ message, isVisible: true });

    setTimeout(() => {
      hideNotification();
    }, 2500);
  };

  // Function to hide a notification
  const hideNotification = () => {
    setNotification({ message: "", isVisible: false });
  };

  useEffect(() => {
    // Function to reset the session expiration timer
    const resetTimer = () => {
      const newExpirationTime = new Date().getTime() + 10 * 60 * 1000; // 10 minutes
      localStorage.setItem("sessionExpiration", newExpirationTime.toString());
    };

    // Add event listeners for user activity
    const events = ["mousemove", "keydown", "click", "scroll", "touchstart"];
    events.forEach((event) => window.addEventListener(event, resetTimer));

    // Check for session expiration on page load
    const checkSessionExpiration = () => {
      const expirationTime = localStorage.getItem("sessionExpiration");
      if (expirationTime) {
        const currentTime = new Date().getTime();
        if (currentTime > parseInt(expirationTime)) {
          // If the session is expired, log out and redirect to the login page
          localStorage.removeItem("sessionExpiration"); // Clear the expiration time
          handleLogout();
          navigate("/");
        }
      }
    };

    // Check immediately when the app loads
    checkSessionExpiration();

    // Optionally, set up a periodic check (every minute)
    const interval = setInterval(checkSessionExpiration, 60000); // Check every minute

    return () => {
      // Clean up event listeners and interval on unmount
      events.forEach((event) => window.removeEventListener(event, resetTimer));
      clearInterval(interval);
    };
  }, [navigate]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setIsLoading(false); // Stop loading spinner once auth state is checked

      if (user) {
        if (user.emailVerified) {
          setIsLoggedIn(true);

          // Show notification only if this is the first login for the session
          if (sessionStorage.getItem("hasLoggedInOnce") !== "true") {
            showNotification("You are logged in!");
            sessionStorage.setItem("hasLoggedInOnce", "true"); // Mark as logged in
          }
        } else {
          setIsLoggedIn(false);
          // Only redirect to /verify-email if not on /register or /login
          if (
            window.location.pathname !== "/register" &&
            window.location.pathname !== "/"
          ) {
            navigate("/verify-email");
          }
        }
        // Optionally set user information in state or context
      } else {
        setIsLoggedIn(false);
        sessionStorage.setItem("hasLoggedInOnce", "false");
        // Only redirect to '/' if not on /register or /verify-email to avoid unnecessary redirects
        if (
          window.location.pathname !== "/register" &&
          window.location.pathname !== "/verify-email"
        ) {
          navigate("/");
        }
      }
    });

    return () => unsubscribe(); // Cleanup subscription on unmount
  }, [auth, navigate]);

  const shouldShowFooter =
    isLoggedIn && !window.location.pathname.includes("/event/");

  if (isLoading) return <div>Loading...</div>; // Show loading indicator

  return (
    <div className="flex flex-col">
      <div className="flex-grow">
        {isLoggedIn && <Header onLogout={handleLogout} />}
        <Notification
          message={notification.message}
          isVisible={notification.isVisible}
          onClose={hideNotification}
        />
        <Routes>
          <Route
            path="/"
            element={
              isLoggedIn ? <Home /> : <Login setIsLoggedIn={setIsLoggedIn} />
            }
          />

          <Route
            path="/register"
            element={isLoggedIn ? <Navigate to="/" replace /> : <Register />}
          />
          <Route
            path="/verify-email"
            element={isLoggedIn ? <Navigate to="/" replace /> : <VerifyEmail />}
          />

          {/* Protected Routes */}
          <Route
            path="/event/:id"
            element={
              <ProtectedRoute isAuthenticated={isLoggedIn}>
                <EventDetails showNotification={showNotification} />
              </ProtectedRoute>
            }
          />
          <Route
            path="/confirmation"
            element={
              <ProtectedRoute isAuthenticated={isLoggedIn}>
                <ConfirmationPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/your-events"
            element={
              <ProtectedRoute isAuthenticated={isLoggedIn}>
                <YourEvents />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/create-event"
            element={
              <ProtectedRoute isAuthenticated={isLoggedIn}>
                {user && user.isAdmin ? (
                  <CreateEvent showNotification={showNotification} />
                ) : (
                  <Home />
                )}
              </ProtectedRoute>
            }
          />
        </Routes>
      </div>

      {shouldShowFooter && <Footer />}
    </div>
  );
};

export default App;
