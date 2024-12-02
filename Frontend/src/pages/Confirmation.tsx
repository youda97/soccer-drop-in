import React from "react";
import { Link } from "react-router-dom";

const Confirmation: React.FC = () => {
  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold text-green-600">Payment Successful!</h1>
      <p>
        Your spot has been confirmed. You'll receive a confirmation email
        shortly.
      </p>
      <Link to="/" className="text-blue-500 mt-4">
        Back to Events
      </Link>
    </div>
  );
};

export default Confirmation;
