import React, { useEffect, useState } from "react";

interface NotificationProps {
  message: string;
  isVisible: boolean;
  onClose: () => void;
}

const Notification: React.FC<NotificationProps> = ({
  message,
  isVisible,
  onClose,
}) => {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (isVisible) {
      setShow(true); // Trigger fade-in
    } else {
      setTimeout(() => setShow(false), 300); // Wait for fade-out to complete before hiding
    }
  }, [isVisible]);

  if (!show) return null; // Don't render the notification if it's not visible

  return (
    <div
      className={`fixed top-7 left-0 right-0 mx-auto sm:w-1/2 bg-green-500 text-white px-6 py-3 rounded shadow-lg z-50 flex items-center justify-between w-4/5
      ${isVisible ? "fade-in" : "fade-out"}`}
      style={{ maxWidth: "600px" }} // Optional: max width for smaller screens
    >
      <p className="text-white">{message}</p>
      <button
        onClick={onClose}
        className="mr-[-10px] bg-green-700 text-white hover:bg-green-600 focus:outline-none rounded-[6px] px-3 py-1"
        aria-label="Close notification"
      >
        &times;
      </button>
    </div>
  );
};

export default Notification;
