import React from "react";

interface PaginationProps {
  currentPage: number;
  totalItems: number;
  itemsPerPage: number;
  onPageChange: (page: number) => void;
}

const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalItems,
  itemsPerPage,
  onPageChange,
}) => {
  const totalPages = Math.ceil(totalItems / itemsPerPage);

  const handlePrev = () => {
    if (currentPage > 1) onPageChange(currentPage - 1);
  };

  const handleNext = () => {
    if (currentPage < totalPages) onPageChange(currentPage + 1);
  };

  return (
    <div className="flex justify-between items-center py-4">
      <button
        className="px-4 py-2 ml-4 text-sm font-semibold text-gray-600 bg-gray-200 rounded-lg hover:bg-gray-300"
        onClick={handlePrev}
        disabled={currentPage === 1}
      >
        Previous
      </button>

      <div className="text-sm text-gray-600">
        Page {currentPage} of {totalPages}
      </div>

      <button
        className="px-4 py-2 mr-4 text-sm font-semibold text-gray-600 bg-gray-200 rounded-lg hover:bg-gray-300"
        onClick={handleNext}
        disabled={currentPage === totalPages}
      >
        Next
      </button>
    </div>
  );
};

export default Pagination;
