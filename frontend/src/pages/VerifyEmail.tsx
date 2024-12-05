// VerifyEmail.tsx
import React, { useEffect } from "react";
import { getAuth, sendEmailVerification } from "firebase/auth";
import { useNavigate } from "react-router-dom";

const VerifyEmail: React.FC = () => {
  const auth = getAuth();
  const navigate = useNavigate();

  const handleResendVerification = async () => {
    try {
      if (auth.currentUser) {
        await auth.currentUser.reload(); // Refresh the user's auth state
        await sendEmailVerification(auth.currentUser);
        alert("Verification email sent! Please check your inbox.");
      } else {
        alert("User not authenticated. Please log in.");
      }
    } catch (error) {
      console.error("Error resending verification email:", error);
      alert(
        "There was an issue sending the verification email. Please try again."
      );
    }
  };

  useEffect(() => {
    const checkEmailVerified = async () => {
      if (auth.currentUser) {
        await auth.currentUser.reload();
        if (!auth.currentUser.emailVerified) {
          setTimeout(checkEmailVerified, 3000); // Retry after 3 seconds if not verified
        }
      }
    };

    checkEmailVerified(); // Initiate the check on component mount
  }, [auth, navigate]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100">
      <div className="flex flex-col justify-center w-full sm:max-w-md bg-white sm:rounded sm:shadow-lg p-8 h-lvh sm:h-fit rounded-none shadow-none text-center">
        <h2 className="text-2xl font-semibold text-gray-800 mb-4">
          Verify Your Email
        </h2>
        <p className="text-gray-600 mb-6">
          Please verify your email address to continue using the app. Check your
          inbox and click the verification link.
        </p>
        <button
          onClick={handleResendVerification}
          className="bg-emerald-500 hover:bg-emerald-600 text-white font-semibold py-2 px-4 rounded transition duration-200 ease-in-out"
        >
          Resend Verification Email
        </button>
        <p className="text-gray-500 text-sm mt-4">
          Didn't receive the email? Check your spam folder or click the button
          to resend.
        </p>
      </div>
    </div>
  );
};

export default VerifyEmail;
