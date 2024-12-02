import React, { useEffect, useState, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { auth } from "../firebase/firebaseConfig";
import { FaUserCircle } from "react-icons/fa";
import { doc, getDoc, getFirestore } from "firebase/firestore";
import { useAuth } from "./Auth";

const Header: React.FC<{
  onLogout: () => void;
}> = ({ onLogout }) => {
  const navigate = useNavigate();
  const db = getFirestore();
  const { user } = useAuth();

  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [username, setUsername] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);

  const handleLogout = async () => {
    setDropdownOpen(false);

    try {
      await auth.signOut();
      onLogout();
      navigate("/"); // Redirect to home page on successful logout
    } catch (error) {
      console.error("Error signing out: ", error);
    }
  };

  const fetchUserName = async () => {
    if (!user || !user.uid) return "";

    try {
      const userDoc = await getDoc(doc(db, "users", user.uid));
      if (userDoc.exists()) {
        const userData = userDoc.data();
        setUsername(`${userData.firstName} ${userData.lastName}`);
      }
    } catch (error) {
      console.error("Error fetching user data:", error);
    }
  };

  useEffect(() => {
    fetchUserName();

    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setDropdownOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  return (
    <header className="bg-zinc-700 text-white flex justify-between items-center p-4 sticky top-0 z-10">
      <Link
        to="/"
        className="text-xl font-bold text-white hover:text-gray-300 no-underline"
      >
        Soccer Drop-In
      </Link>
      <div className="relative" ref={dropdownRef}>
        {/* Profile Icon */}
        <button
          onClick={() => setDropdownOpen(!dropdownOpen)}
          className="flex items-center text-white focus:outline-none"
        >
          <FaUserCircle className="text-3xl" />
        </button>

        {/* Dropdown Menu */}
        {dropdownOpen && (
          <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg overflow-hidden z-10">
            <div className="flex items-center p-4 border-b">
              <FaUserCircle className="text-3xl text-gray-700 mr-3" />
              <div className="text-gray-800">
                <p className="font-medium">{username}</p>
              </div>
            </div>
            {user && user.isAdmin && (
              <button
                onClick={() => {
                  navigate("/admin/create-event");
                  setDropdownOpen(false);
                }}
                className="block w-full text-left px-4 py-2 text-gray-700 hover:bg-gray-100"
              >
                Create New Event
              </button>
            )}
            <button
              onClick={() => {
                navigate("/your-events");
                setDropdownOpen(false);
              }}
              className="block w-full text-left px-4 py-2 text-gray-700 hover:bg-gray-100"
            >
              Your Events
            </button>
            <button
              onClick={handleLogout}
              className="block w-full text-left px-4 py-2 text-red-600 hover:bg-gray-100"
            >
              Log Out
            </button>
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;
