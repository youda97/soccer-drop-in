import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  auth,
  signInWithEmailAndPassword,
  setPersistence,
  browserLocalPersistence,
  browserSessionPersistence,
  sendPasswordResetEmail,
} from "../firebase/firebaseConfig";
import { useAuth } from "../components/Auth";

interface LoginPageProps {
  setIsLoggedIn: (value: boolean) => void;
}

const LoginPage: React.FC<LoginPageProps> = ({ setIsLoggedIn }) => {
  const navigate = useNavigate();
  const { loginWithGoogle } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(false); // State for Remember Me

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      // Set persistence based on Remember Me
      const persistence = rememberMe
        ? browserLocalPersistence
        : browserSessionPersistence;
      await setPersistence(auth, persistence); // Set persistence to local

      const userCredential = await signInWithEmailAndPassword(
        auth,
        email,
        password
      );
      const user = userCredential.user;

      if (user.emailVerified) {
        const expirationTime = new Date().getTime() + 10 * 60 * 1000; // 10 minutes
        localStorage.setItem("sessionExpiration", expirationTime.toString());
        setIsLoggedIn(true); // Set logged-in state to true
        navigate("/"); // Redirect to home page on successful login and email is verified
      } else {
        setError(
          "Please verify your email before logging in. Check your inbox."
        );
      }
    } catch (error) {
      setError("Login failed: " + (error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      await setPersistence(
        auth,
        rememberMe ? browserLocalPersistence : browserSessionPersistence
      ); // Set persistence based on Remember Me
      await loginWithGoogle(); // Call the loginWithGoogle method from AuthContext

      const expirationTime = new Date().getTime() + 10 * 60 * 1000; // 10 minutes
      localStorage.setItem("sessionExpiration", expirationTime.toString());
      setIsLoggedIn(true); // Set logged-in state to true
      navigate("/"); // Redirect to home page on successful login
    } catch (error) {
      setError("Failed to sign in with Google");
    }
  };

  const handleForgotPassword = async () => {
    if (!email) {
      setError("Please enter your email address.");
      return;
    }
    try {
      // Implement your password reset functionality here
      await sendPasswordResetEmail(auth, email);
      setError("Password reset email sent. Please check your inbox.");
    } catch (error) {
      setError(
        "Failed to send password reset email: " + (error as Error).message
      );
    }
  };

  return (
    <div className="flex flex-col items-center justify-center h-screen bg-gray-100">
      <div className="flex flex-col justify-center w-full sm:max-w-md bg-white sm:rounded sm:shadow-lg p-8 h-lvh sm:h-fit rounded-none shadow-none">
        <h2 className="text-2xl font-bold text-center mb-4">Login</h2>
        {error && <p className="text-red-500 text-center mb-4">{error}</p>}

        <form onSubmit={handleEmailLogin}>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            required
            className="w-full p-3 border border-gray-300 rounded mb-3"
            // autoComplete="new-email"
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            required
            className="w-full p-3 border border-gray-300 rounded mb-3"
            // autoComplete="new-password"
          />

          <div className="flex items-center mb-4">
            <input
              type="checkbox"
              id="rememberMe"
              checked={rememberMe}
              onChange={() => setRememberMe(!rememberMe)}
              className="mr-2"
            />
            <label htmlFor="rememberMe" className="text-gray-600">
              Remember Me
            </label>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full p-3 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            {loading ? "Logging in..." : "Login"}
          </button>
        </form>

        <button
          onClick={handleGoogleLogin}
          className="w-full mt-4 p-3 bg-red-500 text-white rounded hover:bg-red-600"
        >
          Sign in with Google
        </button>

        <p className="text-center mt-4">
          <span
            onClick={handleForgotPassword}
            className="text-blue-600 cursor-pointer hover:underline"
          >
            Forgot Password?
          </span>
        </p>

        <p className="text-center mt-4">
          Don't have an account?{" "}
          <span
            onClick={() => navigate("/register")}
            className="text-blue-600 cursor-pointer hover:underline"
          >
            Register here
          </span>
        </p>
      </div>
    </div>
  );
};

export default LoginPage;
