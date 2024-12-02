import React, { useState, useEffect } from "react";
import { CardElement, useStripe, useElements } from "@stripe/react-stripe-js";
import axios from "axios";
import { DocumentData, getFirestore } from "firebase/firestore";
import { useAuth } from "./Auth";
import {
  FaCcVisa,
  FaCcMastercard,
  FaCcAmex,
  FaCreditCard,
} from "react-icons/fa";

interface PaymentModalProps {
  isOpen: boolean;
  amount: number;
  onClose: () => void;
  onSuccess: (paymentIntentId: string, paymentMethodId: string) => void; // Pass paymentIntentId on success
}

const PaymentModal: React.FC<PaymentModalProps> = ({
  isOpen,
  amount,
  onClose,
  onSuccess,
}) => {
  const { user } = useAuth(); // Get current logged-in user
  const stripe = useStripe();
  const elements = useElements();
  const db = getFirestore();

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [paymentIntentId, setPaymentIntentId] = useState<string | null>(null);
  const [saveCard, setSaveCard] = useState(false); // Track checkbox state
  const [savedPaymentMethods, setSavedPaymentMethods] = useState<
    DocumentData[string]
  >([]);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState("");

  // Fetch payment intent on load
  useEffect(() => {
    if (isOpen && user) {
      // Only fetch when the modal is open
      axios
        .post("/createPaymentIntent", {
          user: user,
          amount: amount * 100, // Amount in cents
        })
        .then((response) => {
          setPaymentIntentId(response.data.paymentIntentId);
        })
        .catch(() => {
          setError("Failed to initialize payment.");
        });
    }
  }, [isOpen, user, amount]); // Depend on isOpen to avoid issues

  // Fetch saved payment methods when user is logged in
  useEffect(() => {
    const getSavedCards = async (userId: string) => {
      try {
        const response = await axios.get(`/getSavedCards/${userId}`);
        const savedCards = response.data;
        setSavedPaymentMethods(savedCards);
        // Here you can update your state or display the saved cards
      } catch (error) {
        console.error("Error fetching saved cards:", error);
      }
    };

    if (user) {
      getSavedCards(user.uid);
    }
  }, [user]);

  const handlePayment = async () => {
    if (!stripe || !elements || !paymentIntentId || !user) return;

    setLoading(true);
    setError(null);

    const cardElement = elements.getElement(CardElement);

    if (!cardElement) {
      setError("Card details are missing.");
      setLoading(false);
      return;
    }

    try {
      // Step 1: Create PaymentMethod
      const { error, paymentMethod } = await stripe.createPaymentMethod({
        type: "card",
        card: cardElement,
        billing_details: {
          email: user.email,
        },
      });

      if (error) {
        setError(error.message || "Failed to create payment method.");
        setLoading(false);
        return;
      }

      if (paymentMethod) {
        // Step 2: Optionally save the card if saveCard is true
        if (saveCard) {
          await axios.post("/savePaymentMethod", {
            user: user,
            paymentMethodId: paymentMethod.id,
          });
        }

        // Refetch saved cards after saving
        const response = await axios.get(`/getSavedCards/${user.uid}`);
        setSavedPaymentMethods(response.data);

        // Step 3: Pass PaymentIntent ID and PaymentMethod ID to parent
        await onSuccess(paymentIntentId!, paymentMethod.id);
        onClose();
      }
    } catch (err) {
      if (axios.isAxiosError(error)) {
        // Handle Axios-specific errors
        setError(error.response?.data?.error || "Failed to save the card.");
      } else {
        // Handle unexpected errors
        setError("An unexpected error occurred.");
      }
    } finally {
      setLoading(false);
      setSelectedPaymentMethod("");
    }
  };

  // Handle payment with saved card
  const handlePaymentWithSavedCard = async () => {
    if (!selectedPaymentMethod || !paymentIntentId || !user) {
      setError("Please select a saved payment method.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await onSuccess(paymentIntentId, selectedPaymentMethod);
      onClose();
    } catch (err) {
      setError("Payment failed. Please try again.");
    } finally {
      setLoading(false);
      setSelectedPaymentMethod("");
    }
  };

  const getCardBrandIcon = (brand: string) => {
    switch (brand.toLowerCase()) {
      case "visa":
        return <FaCcVisa className="text-2xl text-blue-600" />;
      case "mastercard":
        return <FaCcMastercard className="text-2xl text-orange-600" />;
      case "amex":
        return <FaCcAmex className="text-2xl text-blue-500" />;
      default:
        return <FaCreditCard className="text-2xl text-gray-600" />;
    }
  };

  // If the modal is not open, return null
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
      <div className="bg-white rounded-lg shadow-lg p-8 max-w-lg w-full mx-4">
        <h2 className="text-2xl font-bold text-gray-800 text-center mb-2">
          Complete Your Payment
        </h2>

        {/* Display the cost */}
        <p className="font-semibold text-gray-700 text-center mb-2">
          Amount Due: ${amount.toFixed(2)}
        </p>

        {/* Saved Cards Section */}
        {savedPaymentMethods.length > 0 && (
          <div className="mb-6">
            <h3 className="text-lg font-medium text-gray-700 mb-2">
              Saved Cards
            </h3>
            {savedPaymentMethods.map((method: DocumentData[string]) => (
              <label key={method.id} className="flex items-center mb-2">
                <input
                  type="checkbox" // Use checkbox instead of radio
                  name="paymentMethod"
                  value={method.id}
                  checked={selectedPaymentMethod === method.id}
                  onChange={() =>
                    setSelectedPaymentMethod(
                      selectedPaymentMethod === method.id ? null : method.id
                    )
                  }
                  className="mr-2"
                />
                <span className="flex items-center">
                  {getCardBrandIcon(method.card.brand)}
                  <span className="ml-2">
                    {method.card.brand[0].toUpperCase() +
                      method.card.brand.slice(1)}{" "}
                    ending in {method.card.last4} (Expires{" "}
                    {method.card.exp_month}/{method.card.exp_year})
                  </span>
                </span>
              </label>
            ))}
          </div>
        )}

        {/* Credit Card Section */}
        <div className="mb-6">
          <h3 className="text-lg font-medium text-gray-700 mb-2">
            Credit Card
          </h3>
          <div className="p-4 border border-gray-300 rounded-lg">
            <CardElement
              options={{
                style: {
                  base: {
                    fontSize: "16px",
                    color: "#424770",
                    "::placeholder": { color: "#aab7c4" },
                  },
                  invalid: { color: "#9e2146" },
                },
              }}
            />
          </div>
          {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
        </div>

        <div className="mb-4">
          <label className="flex items-center">
            <input
              type="checkbox"
              className="mr-2"
              checked={saveCard}
              onChange={(e) => setSaveCard(e.target.checked)}
            />
            Save this card for future payments
          </label>
        </div>

        <div className="flex gap-4 mb-4">
          <button
            onClick={
              selectedPaymentMethod ? handlePaymentWithSavedCard : handlePayment
            }
            className="bg-emerald-600 text-white py-2 px-4 rounded w-full hover:bg-emerald-700"
            disabled={loading}
          >
            {loading ? "Processing..." : "Pay with Card"}
          </button>
        </div>

        {/* Cancel Button */}
        <button
          onClick={() => {
            setSelectedPaymentMethod("");
            onClose();
          }}
          className="w-full text-sm text-gray-500 hover:text-gray-700 mt-4"
          disabled={loading}
        >
          Cancel
        </button>
      </div>
    </div>
  );
};

export default PaymentModal;
