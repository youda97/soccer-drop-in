import React, { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  FaCalendar,
  FaClock,
  FaHourglassHalf,
  FaMapMarkerAlt,
  FaUsers,
  FaHandPaper,
  FaChevronDown,
} from "react-icons/fa";
import ProgressBar from "./ProgressBar"; // Ensure you have a ProgressBar component
import { Timestamp } from "firebase/firestore";
import { format, differenceInMinutes, differenceInHours } from "date-fns";
import { Event } from "../types/event";

interface EventCardProps {
  event: Event;
}

const EventCard: React.FC<EventCardProps> = ({ event }) => {
  // State for controlling collapsible section
  const [isCollapsed, setIsCollapsed] = useState(true);
  const contentRef = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState("0px");
  const [isSmallScreen, setIsSmallScreen] = useState(window.innerWidth <= 640);

  useEffect(() => {
    if (contentRef.current) {
      setHeight(isCollapsed ? "0px" : `${contentRef.current.scrollHeight}px`);
    }
  }, [isCollapsed]);

  useEffect(() => {
    const handleResize = () => {
      setIsSmallScreen(window.innerWidth <= 640);
      if (window.innerWidth < 640) {
        // Tailwind's `sm` breakpoint is 640px
        setIsCollapsed(false);
      } else {
        setIsCollapsed(true);
      }
    };

    window.addEventListener("resize", handleResize);
    handleResize(); // Initialize the value on load

    return () => window.removeEventListener("resize", handleResize);
  }, []);

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

  const getDuration = (start: Date | undefined, end: Date | undefined) => {
    if (!start || !end) return "N/A"; // Handle missing timestamp
    // Get the duration in hours and minutes
    const hours = differenceInHours(end, start);
    const minutes = differenceInMinutes(end, start) % 60; // Get remaining minutes after subtracting hours

    // Build the formatted duration string
    let formattedDuration = "";
    if (hours > 0) {
      formattedDuration += `${hours} hour${hours > 1 ? "s" : ""}`;
    }
    if (minutes > 0) {
      // If we already have hours, append minutes with 'and', otherwise just minutes
      if (hours > 0) {
        formattedDuration += ` and ${minutes} minute${minutes > 1 ? "s" : ""}`;
      } else {
        formattedDuration += `${minutes} minute${minutes > 1 ? "s" : ""}`;
      }
    }

    // If both are 0, display "0 minutes"
    if (hours === 0 && minutes === 0) {
      formattedDuration = "0 minutes";
    }

    return formattedDuration;
  };

  const renderEventCard = () => {
    return (
      <div className="border shadow-md overflow-hidden hover:shadow-lg transition-shadow duration-200 rounded-lg bg-white">
        {/* Header Section */}
        <div
          className="bg-emerald-600 p-4 flex items-center justify-between text-white shadow-sm relative cursor-pointer"
          onClick={() => {
            if (window.innerWidth >= 640) {
              // Prevent header click on small screens
              setIsCollapsed((prev) => !prev);
            }
          }}
        >
          {/* Left Side: Calendar and Title */}
          <div className="flex items-center overflow-hidden">
            <div className="min-[400px]:w-12 min-[400px]:h-12 w-10 h-10 border-2 border-white rounded-lg flex flex-col items-center justify-center bg-lime-500 shadow-md sm:mr-4 mr-2">
              <span className="mt-1 text-xs font-bold text-white">
                {formatDate(event.startDate)
                  ? format(formatDate(event.startDate)!, "EEE")
                  : "Invalid Date"}
              </span>
              <span className="-mt-1 min-[400px]:text-lg text-sm font-semibold text-white">
                {formatDate(event.startDate)
                  ? format(formatDate(event.startDate)!, "d")
                  : "Invalid Date"}
              </span>
            </div>
            <h3 className="text-lg sm:text-2xl font-semibold tracking-tight truncate flex-1 text-white">
              {event.title}
            </h3>
          </div>

          {/* Right Side: Cost, Book Button */}
          <div className="flex items-center justify-end sm:space-x-4 sm:mr-8">
            {/* Event Cost */}
            <p className="text-lg sm:text-2xl font-roboto sm:ml-auto flex-shrink-0 text-white">
              ${event.cost.toFixed(2)}
            </p>

            {/* Book/Register Button */}
            {!isSmallScreen && (
              <Link
                to={`/event/${event.id}`}
                className="hidden sm:flex text-emerald-600 bg-white hover:bg-gray-100 hover:text-emerald-700 px-4 py-2 rounded-md text-md font-semibold transition-colors duration-200"
              >
                {(event.endDate && event.endDate.toDate() < new Date()) ||
                event.status === "cancelled"
                  ? "More Info"
                  : "Register"}
              </Link>
            )}
          </div>

          {/* Full-Width Expand/Collapse Button */}
          <div className="hidden sm:flex absolute right-2 top-1/2 transform -translate-y-1/2 items-center justify-center p-2">
            <button
              className={`flex items-center justify-center text-white focus:outline-none hover:opacity-80 
        pointer-events-none opacity-50 sm:pointer-events-auto sm:opacity-100`}
              onClick={(e) => {
                if (window.innerWidth >= 640) {
                  // Ensure it only works for larger screens
                  e.stopPropagation(); // Prevent triggering the entire header click
                  setIsCollapsed((prev) => !prev);
                }
              }}
            >
              <FaChevronDown
                className={`transition-transform duration-300 ${
                  isCollapsed ? "rotate-0" : "rotate-180"
                } text-xl`}
              />
            </button>
          </div>
        </div>

        {/* Collapsible Section */}
        <div
          ref={contentRef}
          className="transition-all duration-500 ease-in-out overflow-hidden"
          style={{ height }}
        >
          <div className="p-4 bg-gray-100">
            <div className="space-y-1">
              <p className="text-sm text-gray-800 flex items-center">
                <FaCalendar className="mr-2 text-gray-500" />
                Date:{" "}
                {formatDate(event.startDate)
                  ? format(formatDate(event.startDate)!, "EEE, MMMM d, yyyy")
                  : "Invalid Date"}
              </p>
              <p className="text-sm text-gray-800 flex items-center">
                <FaClock className="mr-2 text-gray-500" />
                Hours:{" "}
                {formatDate(event.startDate)
                  ? format(formatDate(event.startDate)!, "h:mm a")
                  : "Invalid Date"}{" "}
                -{" "}
                {formatDate(event.endDate)
                  ? format(formatDate(event.endDate)!, "h:mm a")
                  : "Invalid Date"}
              </p>
              <p className="text-sm text-gray-800 flex items-center">
                <FaHourglassHalf className="mr-2 text-gray-500" />
                Duration:{" "}
                {getDuration(
                  event.startDate?.toDate(),
                  event.endDate?.toDate()
                )}
              </p>
              <p className="text-sm text-gray-800 flex items-center">
                <FaMapMarkerAlt className="mr-2 text-gray-500 flex-shrink-0" />
                <span className="line-clamp-2">{event.locationName}</span>
              </p>
              <p className="text-sm text-gray-800 flex items-center">
                <FaUsers className="mr-2 text-gray-500" />
                Max Players: {event.maxPlayers}
              </p>
              <p className="text-sm text-gray-800 flex items-center">
                <FaHandPaper className="mr-2 text-gray-500" />
                {event.includeGoalkeepers
                  ? `+${event.maxGoalkeepers} goalkeepers (${
                      event.goalkeeperCost > 0
                        ? "$" + event.goalkeeperCost?.toFixed(2)
                        : "Free"
                    })`
                  : "No goalkeepers"}
              </p>
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <ProgressBar
          currentPlayers={event.players.length + event.goalkeepers.length}
          maxPlayers={
            event.maxPlayers +
            (event.includeGoalkeepers ? event.maxGoalkeepers : 0)
          }
        />
      </div>
    );
  };

  return (
    <>
      {isSmallScreen ? (
        <Link to={`/event/${event.id}`} className="block">
          {renderEventCard()}
        </Link>
      ) : (
        renderEventCard()
      )}
    </>
  );
};

export default EventCard;
