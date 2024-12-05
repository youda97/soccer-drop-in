// src/index.tsx
import React from "react";
import ReactDOM from "react-dom/client";
import { Elements } from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import App from "./App";
import "./index.css";

const stripePublicKey = process.env.REACT_APP_STRIPE_LIVE_PUBLIC_KEY;

let stripePromise = null;
if (!stripePublicKey) {
  console.error("Stripe public key is missing!");
  // Handle the error (maybe show a user-friendly message or redirect)
} else {
  stripePromise = loadStripe(stripePublicKey);
}

// Create a root to render your application
const container = document.getElementById("root")!;
const root = ReactDOM.createRoot(container);

root.render(
  <Elements stripe={stripePromise}>
    <App />
  </Elements>
);
