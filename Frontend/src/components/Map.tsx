import React from "react";
import { useLoadScript, GoogleMap } from "@react-google-maps/api";

interface Location {
  lat: number;
  lng: number;
}

const Map: React.FC<{ location: Location | null }> = ({ location }) => {
  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: process.env.GOOGLE_MAPS_API_KEY as string,
  });

  if (loadError) return <div>Error loading maps</div>;
  if (!isLoaded) return <div>Loading...</div>;

  return (
    location && (
      <GoogleMap
        mapContainerStyle={{ height: "300px", width: "100%" }}
        center={location}
        zoom={15}
      />
    )
  );
};

export default Map;
