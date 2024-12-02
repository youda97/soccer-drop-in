// server.js
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const stripe = require('stripe')(process.env.stripe_secret_key);
const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');
const { getFirestore } = require("firebase-admin/firestore");

// Initialize Firebase Admin
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const app = express();

// Enable CORS
app.use(cors());

// Middleware
app.use(express.json());

// Payment Intent Route
app.post('/createPaymentIntent', async (req, res) => {
  const { user, amount } = req.body; // Get amount in cents from frontend

  try {
    const db = getFirestore();
    const userId = user.uid
    const userRef = db.collection("users").doc(userId);
    const userDoc = await userRef.get();

    let customerId = userDoc.data()?.stripeCustomerId;
    if (!customerId) {
      // Create a new customer if no Stripe customer ID exists
      const customer = await stripe.customers.create({
        metadata: { userId }, // Optionally store userId in Stripe metadata
        name: user.email,
        email: user.email,  
      });

      customerId = customer.id;

      // Update Firestore with the new customer ID
      await userRef.update({ stripeCustomerId: customerId });
    }
    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency: 'cad',
      payment_method_types: ["card"],
      customer: customerId,
    });

    res.send({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
    });
  } catch (error) {
    console.error("Error creating payment intent:", error.message);
    res.status(500).json({ error: error.message });
  }
});

app.post("/savePaymentMethod", async (req, res) => {
  const { user, paymentMethodId } = req.body;

  try {
    const db = getFirestore();
    const userId = user.uid;
    const userRef = db.collection("users").doc(userId);
    const userDoc = await userRef.get();
    let customerId = userDoc.data()?.stripeCustomerId;

    if (!customerId) {
      // Create a new customer if no Stripe customer ID exists
      const customer = await stripe.customers.create({
        metadata: { userId }, // Optionally store userId in Stripe metadata
        name: user.email,
        email: user.email,  
      });

      customerId = customer.id;

      // Update Firestore with the new customer ID
      await userRef.update({ stripeCustomerId: customerId });
    }

    // Retrieve the payment method to get its fingerprint
    const paymentMethod = await stripe.paymentMethods.retrieve(paymentMethodId);

    if (!paymentMethod) {
      return res.status(400).send("Invalid payment method ID.");
    }

    const paymentMethodFingerprint = paymentMethod.card.fingerprint;

    // Fetch all payment methods for the customer
    const paymentMethods = await stripe.paymentMethods.list({
      customer: customerId,
      type: "card",
    });

    // Check if the payment method fingerprint is already saved
    const isDuplicate = paymentMethods.data.some(
      (method) => method.card.fingerprint === paymentMethodFingerprint
    );

    if (!isDuplicate) {
      // Attach the payment method to the customer only if it's not a duplicate
      await stripe.paymentMethods.attach(paymentMethodId, { customer: customerId });   
    }

    // Proceed with the payment intent creation or further actions
    res.send({ success: true, message: "Payment method processed successfully." });
  } catch (error) {
    console.error("Error saving payment method:", error);
    res.status(500).send({ error: error.message });
  }
});


app.get("/getSavedCards/:userId", async (req, res) => {
  const { userId } = req.params;

  try {
    const db = getFirestore();
    const userDoc = await db.collection("users").doc(userId).get();

    const customerId = userDoc.data()?.stripeCustomerId;
    if (!customerId) return res.status(404).send("Customer not found");

    const paymentMethods = await stripe.paymentMethods.list({
      customer: customerId,
      type: "card",
    });

    res.send(paymentMethods.data);
  } catch (error) {
    res.status(500).send({ error: error.message });
  }
});

// Backend endpoint for confirming the payment intent
app.post("/chargeUser", async (req, res) => {
  const { paymentIntentId, paymentMethodId, userId } = req.body;

  try {
    // Retrieve the PaymentIntent to check for an existing payment method
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

    if (!paymentIntent.payment_method) {
      if (!paymentMethodId) {
        return res
          .status(400)
          .send({ success: false, message: "Payment method is required." });
      }

      // Retrieve the customer associated with the user
      const customer = await stripe.customers.retrieve(userId); // Assuming userId is passed as part of the request

      if (!customer) {
        return res.status(400).send({ success: false, message: "Customer not found." });
      }

      // Attach the payment method to the PaymentIntent
      await stripe.paymentIntents.update(paymentIntentId, {
        payment_method: paymentMethodId,
        customer: customer.id,
      });
    }


    // Confirm the PaymentIntent
    const confirmedPaymentIntent = await stripe.paymentIntents.confirm(
      paymentIntentId
    );

    res.status(200).send({ success: true, paymentIntent: confirmedPaymentIntent });
  } catch (error) {
    console.error("Error confirming PaymentIntent:", error);
    res.status(500).send({ success: false, message: error.message });
  }
});

app.get('/paymentIntents/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const paymentIntent = await stripe.paymentIntents.retrieve(id);
    res.json(paymentIntent);
  } catch (error) {
    console.error('Error retrieving payment intent:', error);
    res.status(400).json({ success: false, message: error.message });
  }
});

app.post('/refund', async (req, res) => {
  const { chargeId } = req.body;

  try {
    // Step 1: Retrieve the charge details
    const charge = await stripe.charges.retrieve(chargeId);

    // Step 2: Calculate the processing fee (2.9% + 0.30 CAD)
    const chargeAmount = charge.amount; // Amount is in cents
    const stripeFee = Math.round(chargeAmount * 0.029) + 30; // Fee in cents
    const refundAmount = chargeAmount - stripeFee; // Deduct fee

    const refund = await stripe.refunds.create({
      charge: chargeId,
      amount: refundAmount
    });
    res.json({ success: true, data: refund });
  } catch (error) {
    console.error('Error issuing refund:', error);
    res.status(400).json({ success: false, message: error.message });
  }
});

// Start the Express Server
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
