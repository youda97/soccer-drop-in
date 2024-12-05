import React, { useState } from "react";
import { FaArrowRight } from "react-icons/fa";
import Pagination from "./Pagination"; // We'll assume you have a Pagination component
import { Event } from "../types/event";
import { format } from "date-fns";
import { Timestamp } from "firebase/firestore";
import { Link } from "react-router-dom";

interface CompletedEventsTableProps {
  events: Event[];
}

const CompletedEventsTable: React.FC<CompletedEventsTableProps> = ({
  events,
}) => {
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5; // Adjust the number of events per page

  // Paginate the events
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentEvents = events.slice(startIndex, startIndex + itemsPerPage);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  // Helper function to format timestamps to a readable date format
  const formatDate = (timestamp: Timestamp | null): Date | null => {
    if (!timestamp) return null; // Handle missing timestamp
    try {
      return timestamp.toDate(); // Convert to JS Date
    } catch (error) {
      console.error("Invalid timestamp:", timestamp, error);
      return null;
    }
  };

  return (
    <div className="overflow-x-auto bg-white shadow-md rounded-lg">
      <table className="min-w-full table-auto">
        <thead className="bg-gray-100">
          <tr>
            <th className="px-4 py-2 text-left text-sm font-semibold text-gray-600">
              Event Title
            </th>
            <th className="px-4 py-2 text-left text-sm font-semibold text-gray-600">
              Cost
            </th>
            <th className="px-4 py-2 text-left text-sm font-semibold text-gray-600">
              Date
            </th>
            <th className="px-4 py-2 text-left text-sm font-semibold text-gray-600">
              Hours
            </th>
            <th className="px-4 py-2 text-left text-sm font-semibold text-gray-600">
              Location
            </th>
            <th className="px-4 py-2 text-left text-sm font-semibold text-gray-600">
              Max Players
            </th>
            <th className="px-4 py-2 text-left text-sm font-semibold text-gray-600">
              Goalkeepers
            </th>
            <th className="px-4 py-2 text-left text-sm font-semibold text-gray-600">
              Details
            </th>
          </tr>
        </thead>
        <tbody>
          {currentEvents.map((event) => (
            <tr key={event.id} className="border-b hover:bg-gray-50">
              <td className="px-4 py-3 text-sm text-gray-800">{event.title}</td>
              <td className="px-4 py-3 text-sm text-gray-800">{event.cost}</td>
              <td className="px-4 py-3 text-sm text-gray-800">
                {formatDate(event.startDate)
                  ? format(formatDate(event.startDate)!, "EEE, MMMM d, yyyy")
                  : "Invalid Date"}
              </td>
              <td className="px-4 py-3 text-sm text-gray-800">
                {formatDate(event.startDate)
                  ? format(formatDate(event.startDate)!, "h:mm a")
                  : "Invalid Date"}
                -{" "}
                {formatDate(event.endDate)
                  ? format(formatDate(event.endDate)!, "h:mm a")
                  : "Invalid Date"}
              </td>
              <td className="px-4 py-3 text-sm text-gray-800">
                {event.locationName}
              </td>
              <td className="px-4 py-3 text-sm text-gray-800">
                {event.maxPlayers}
              </td>
              <td className="px-4 py-3 text-sm text-gray-800">
                {event.includeGoalkeepers ? (
                  <>
                    {event.maxGoalkeepers} Goalkeeper(s) - $
                    {event.goalkeeperCost}
                  </>
                ) : (
                  "No"
                )}
              </td>
              <td className="px-4 py-3 text-sm text-blue-500 cursor-pointer hover:underline">
                <Link to={`/event/${event.id}`} className="flex items-center">
                  <span className="text-blue-500">More</span>
                  <FaArrowRight className="ml-2 text-blue-500" />
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Pagination Component */}
      <Pagination
        currentPage={currentPage}
        totalItems={events.length}
        itemsPerPage={itemsPerPage}
        onPageChange={handlePageChange}
      />
    </div>
  );
};

export default CompletedEventsTable;
