import React, { useState } from "react";

interface CancelModalProps {
  onCancel: () => void;
  onModalClose: () => void;
  isModalOpen: boolean;
  title: string;
  description: string;
}

const CancelModal: React.FC<CancelModalProps> = ({
  onCancel,
  onModalClose,
  isModalOpen,
  title,
  description,
}) => {
  const [isLoading, setIsLoading] = useState(false);

  const handleCancelEvent = async () => {
    setIsLoading(true);
    await onCancel(); // Pass the cancel logic as a prop
    setIsLoading(false);
  };

  // If the modal is not open, return null
  if (!isModalOpen) return null;

  return (
    <>
      {/* Confirmation Modal */}
      <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
        <div className="bg-white rounded-lg shadow-lg w-96 p-6 text-center">
          <h2 className="text-xl font-bold text-gray-800">{title}</h2>
          <p className="text-gray-600 mt-4">{description}</p>
          <div className="mt-6 flex justify-center gap-4">
            <button
              className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 disabled:bg-gray-400"
              onClick={handleCancelEvent}
              disabled={isLoading}
            >
              {isLoading ? "Processing..." : "Confirm"}
            </button>
            <button
              className="bg-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-400"
              onClick={() => onModalClose()}
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default CancelModal;
