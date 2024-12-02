import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { db } from "../firebase/firebaseConfig"; // Import Firestore instance
import { collection, addDoc, Timestamp, GeoPoint } from "firebase/firestore";
import { Autocomplete } from "@react-google-maps/api";
import Map from "../components/Map";

interface CreateEventProps {
  showNotification: (message: string) => void;
}

interface Location {
  lat: number;
  lng: number;
}

// Custom hook to load Google Maps API
const useGoogleMapsApi = (apiKey: string) => {
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const loadApi = () => {
      const existingScript = document.getElementById("google-maps-script");
      if (!existingScript) {
        const script = document.createElement("script");
        script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
        script.id = "google-maps-script";
        script.onload = () => setIsLoaded(true);
        document.body.appendChild(script);
      } else {
        setIsLoaded(true); // The script was already loaded
      }
    };

    loadApi();
  }, [apiKey]);

  return isLoaded;
};

const CreateEvent: React.FC<CreateEventProps> = ({ showNotification }) => {
  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [durationHours, setDurationHours] = useState("1"); // default to 1 hour
  const [durationMinutes, setDurationMinutes] = useState("0"); // default to 0 minutes
  const [cost, setCost] = useState("");
  const [maxPlayers, setMaxPlayers] = useState("");
  const [message, setMessage] = useState("");
  const [field, setField] = useState("");
  const [includeGoalkeepers, setIncludeGoalkeepers] = useState(false);
  const [goalkeeperCost, setGoalkeeperCost] = useState("");
  const [maxGoalkeepers, setMaxGoalkeepers] = useState("");

  const [location, setLocation] = useState<Location | null>(null);
  const [locationName, setLocationName] = useState("");
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const isApiLoaded = useGoogleMapsApi(
    "AIzaSyArENfJ3czxw6LMD-OmxZHluWTVuP8Jpgg"
  );

  const navigate = useNavigate();

  const handlePlaceChanged = () => {
    const place = autocompleteRef.current?.getPlace();
    if (place && place.geometry) {
      const lat = place.geometry.location?.lat() || 0;
      const lng = place.geometry.location?.lng() || 0;
      setLocation({ lat, lng });
      setLocationName(place.formatted_address || "");
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (
      !title ||
      !date ||
      !time ||
      !durationHours ||
      !durationMinutes ||
      !location ||
      !cost ||
      !maxPlayers ||
      (includeGoalkeepers && !goalkeeperCost) ||
      (includeGoalkeepers && !maxGoalkeepers)
    ) {
      setMessage("All fields are required");
      return;
    }

    const [year, month, day] = date.split("-").map(Number);
    const localDate = new Date(year, month - 1, day); // Month is 0-based
    if (new Date() > localDate) {
      setMessage("Date must be after todays date");
      return;
    }

    try {
      // Create a GeoPoint for the location
      const locationGeoPoint = new GeoPoint(location.lat, location.lng);

      // Combine selected date with time to create start time
      const startDateTime = new Date(`${date}T${time}`);
      // Add duration in hours and minutes to get the end time
      const endDateTime = new Date(startDateTime);
      endDateTime.setHours(endDateTime.getHours() + parseInt(durationHours));
      endDateTime.setMinutes(
        endDateTime.getMinutes() + parseInt(durationMinutes)
      );

      // Convert both to Firebase Timestamps
      const startTimestamp = Timestamp.fromDate(startDateTime);
      const endTimestamp = Timestamp.fromDate(endDateTime);

      await addDoc(collection(db, "events"), {
        title,
        startDate: startTimestamp,
        endDate: endTimestamp,
        location: locationGeoPoint,
        locationName,
        field,
        cost: parseFloat(cost),
        maxPlayers: parseInt(maxPlayers),
        includeGoalkeepers,
        goalkeeperCost: parseFloat(goalkeeperCost),
        maxGoalkeepers: parseInt(maxGoalkeepers),
        players: [],
        goalkeepers: [],
        playerWaitList: [],
        goalkeeperWaitList: [],
        createdAt: new Date(),
      });

      // Set notification message
      showNotification("Event created successfully!");

      // Redirect to events page after a short delay
      setTimeout(() => {
        navigate("/");
      }, 500);
    } catch (error) {
      setMessage("Error creating event: " + (error as Error).message);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center">
      <div className="p-8 sm:mt-8 sm:mb-8 w-[800px] mx-auto bg-white shadow-lg sm:rounded-lg">
        <h1 className="text-3xl font-semibold mb-6">Create New Event</h1>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-lg font-semibold">Title</label>
            <input
              type="text"
              value={title}
              required
              onChange={(e) => setTitle(e.target.value)}
              className="border p-3 rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-green-500"
              placeholder="Enter event title"
            />
          </div>
          <div>
            <label className="block text-lg font-semibold">Date</label>
            <input
              type="date"
              value={date}
              required
              onChange={(e) => setDate(e.target.value)}
              className="border p-3 rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>

          <div>
            <label className="block text-lg font-semibold">Event Time</label>
            <input
              type="time"
              value={time}
              required
              onChange={(e) => setTime(e.target.value)}
              className="border p-3 rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>

          <div className="flex flex-col sm:flex-row sm:space-x-4">
            {/* Duration Hours */}
            <div className="flex flex-col sm:w-3/6">
              <label className="block text-lg font-semibold">
                Duration Hours
              </label>
              <input
                type="number"
                value={durationHours}
                required
                onChange={(e) => setDurationHours(e.target.value)}
                min="0"
                className="border p-3 rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>

            {/* Duration Minutes */}
            <div className="flex flex-col sm:w-3/6">
              <label className="block text-lg font-semibold">
                Duration Minutes
              </label>
              <input
                type="number"
                value={durationMinutes}
                required
                onChange={(e) => setDurationMinutes(e.target.value)}
                min="0"
                max="59"
                className="border p-3 rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-lg font-semibold">
              Event Location
            </label>
            {isApiLoaded ? (
              <Autocomplete
                onLoad={(autocomplete) =>
                  (autocompleteRef.current = autocomplete)
                }
                onPlaceChanged={handlePlaceChanged}
              >
                <input
                  type="text"
                  placeholder="Search for location"
                  className="border p-3 w-full rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </Autocomplete>
            ) : (
              <p>Loading...</p> // Show a loading message while the API is loading
            )}
            {location && (
              <>
                <p className="mt-2 text-gray-600">
                  Selected Location: {locationName} (Lat:
                  {location.lat.toFixed(4)}, Lng: {location.lng.toFixed(4)})
                </p>
                <Map location={location} />
              </>
            )}
          </div>

          <div>
            <label className="block text-lg font-semibold">Field</label>
            <input
              type="text"
              value={field}
              onChange={(e) => setField(e.target.value)}
              className="border p-3 rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-green-500"
              placeholder="Enter field (optional)"
            />
          </div>

          <div>
            <label className="block text-lg font-semibold">
              Cost (Add processing fee of 2.9% + $0.30)
            </label>
            <input
              type="number"
              value={cost}
              required
              onChange={(e) => setCost(e.target.value)}
              className="border p-3 rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-green-500"
              placeholder="Enter cost (e.g., 20.00)"
            />
          </div>

          <div>
            <label className="block text-lg font-semibold">
              Max Players (excluding goalkeepers)
            </label>
            <input
              type="number"
              value={maxPlayers}
              required
              onChange={(e) => setMaxPlayers(e.target.value)}
              className="border p-3 rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-green-500"
              placeholder="Enter max players"
            />
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              checked={includeGoalkeepers}
              onChange={(e) => setIncludeGoalkeepers(e.target.checked)} // Handle checkbox state change
              className="mr-3"
            />
            <span className="text-lg font-semibold">Include Goalkeepers?</span>
          </div>

          {includeGoalkeepers && (
            <div>
              <label className="block text-lg font-semibold">
                Goalkeeper Cost (Add processing fee of 2.9% + $0.30)
              </label>
              <input
                type="number"
                value={goalkeeperCost}
                onChange={(e) => setGoalkeeperCost(e.target.value)}
                className="border p-3 rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-green-500"
                placeholder="Enter goalkeeper cost (free if blank)"
              />
            </div>
          )}

          {includeGoalkeepers && (
            <div>
              <label className="block text-lg font-semibold">
                Max Goalkeepers
              </label>
              <input
                type="number"
                value={maxGoalkeepers}
                required
                onChange={(e) => setMaxGoalkeepers(e.target.value)}
                className="border p-3 rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-green-500"
                placeholder="Enter max goalkeepers"
              />
            </div>
          )}

          {message && (
            <div className="text-red-500 font-semibold text-sm mt-4">
              {message}
            </div>
          )}

          <div>
            <button
              type="submit"
              className="w-full bg-green-500 text-white p-3 rounded-lg font-semibold hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              Create Event
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateEvent;
