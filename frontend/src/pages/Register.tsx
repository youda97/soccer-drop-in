import React, { useState } from "react";
import {
  auth,
  GoogleAuthProvider,
  signInWithPopup,
  createUserWithEmailAndPassword,
  sendEmailVerification,
  updateProfile,
  db,
} from "../firebase/firebaseConfig"; // Adjust the path as necessary
import { doc, getDoc, setDoc } from "firebase/firestore";
import { useNavigate } from "react-router-dom";

const RegisterPage: React.FC = () => {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    // Basic validation checks
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    try {
      // Create user account
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );
      const user = userCredential.user;

      if (user) {
        // Send verification email
        await sendEmailVerification(user);

        // Update user's profile with first and last name
        await updateProfile(user, { displayName: `${firstName} ${lastName}` });

        // Save additional data to Firestore
        await setDoc(doc(db, "users", user.uid), {
          firstName,
          lastName,
          email,
        });

        navigate("/verify-email");
      }
    } catch (error) {
      setError("Registration failed: " + (error as Error).message);
    }
  };

  const handleGoogleSignIn = async () => {
    const provider = new GoogleAuthProvider();

    try {
      // Sign in with Google
      const userCredential = await signInWithPopup(auth, provider);
      const user = userCredential.user;

      // Check if user document exists in Firestore
      const userDocRef = doc(db, "users", user.uid);
      const userDoc = await getDoc(userDocRef);

      // If the user document does not exist, create it
      if (!userDoc.exists()) {
        const displayName = user.displayName; // Get full name from Google profile
        const [firstName, lastName] = displayName
          ? displayName.split(" ")
          : ["", ""]; // Split name into first and last names

        // Create user document with additional information
        await setDoc(userDocRef, {
          firstName,
          lastName,
          email: user.email,
        });
      }

      const expirationTime = new Date().getTime() + 10 * 60 * 1000; // 10 minutes
      localStorage.setItem("sessionExpiration", expirationTime.toString());
    } catch (error) {
      setError((error as any).message);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <div className="flex flex-col justify-center w-full sm:max-w-md bg-white sm:rounded sm:shadow-lg p-8 h-lvh sm:h-fit rounded-none shadow-none">
        <h2 className="text-xl font-bold mb-4">Register</h2>
        {error && <p className="text-red-500 mb-4">{error}</p>}
        <form onSubmit={handleRegister}>
          <div className="mb-4">
            <input
              type="text"
              id="firstName"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              required
              className="w-full border rounded p-2"
              autoComplete="new-first-name"
              placeholder="First name"
            />
          </div>
          <div className="mb-4">
            <input
              type="text"
              id="lastName"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              required
              className="w-full border rounded p-2"
              autoComplete="new-last-name"
              placeholder="Last name"
            />
          </div>
          <div className="mb-4">
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full border rounded p-2"
              autoComplete="new-email"
              placeholder="Email"
            />
          </div>
          <div className="mb-4">
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full border rounded p-2"
              autoComplete="new-password"
              placeholder="Password"
            />
          </div>
          <div className="mb-4">
            <input
              type="password"
              id="confirmPassword"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              className="w-full border rounded p-2"
              autoComplete="new-confirm-password"
              placeholder="Confirm password"
            />
          </div>
          <button
            type="submit"
            className="bg-emerald-600 text-white py-2 px-4 rounded w-full hover:bg-emerald-700"
          >
            Register
          </button>
        </form>
        <div className="flex items-center my-4">
          <hr className="flex-grow border-gray-300" />
          <span className="mx-2">or</span>
          <hr className="flex-grow border-gray-300" />
        </div>
        <button
          onClick={handleGoogleSignIn}
          className="w-full p-3 bg-white border border-gray-300 rounded-lg flex items-center justify-center hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <img
            src="/images/google.png" // Google logo URL
            alt="Google Logo"
            className="w-6 h-6 mr-3" // Logo styling, adjust size as necessary
          />
          <span className="text-gray-800 font-medium">Sign in with Google</span>
        </button>
      </div>
    </div>
  );
};

export default RegisterPage;
