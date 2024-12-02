import React, { useEffect, useState } from "react";
import { auth, db } from "../firebase/firebaseConfig"; // Adjust your Firebase config import
import { collection, getDocs } from "firebase/firestore";
import EventCard from "../components/EventCard";
import { Event } from "../types/event";

const UserEvents: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [currentEventsPlaying, setCurrentEventsPlaying] = useState<Event[]>([]);
  const [currentEventsWaitlist, setCurrentEventsWaitlist] = useState<Event[]>(
    []
  );
  const [completedEventsPlaying, setCompletedEventsPlaying] = useState<Event[]>(
    []
  );
  const [completedEventsWaitlist, setCompletedEventsWaitlist] = useState<
    Event[]
  >([]);
  const [refundedEvents, setRefundedEvents] = useState<Event[]>([]);
  const [canceledEvents, setCanceledEvents] = useState<Event[]>([]);

  const user = auth.currentUser;

  useEffect(() => {
    const fetchEvents = async () => {
      if (!user) return;

      setLoading(true); // Start loading
      const eventsRef = collection(db, "events");
      const snapshot = await getDocs(eventsRef);

      const now = new Date();
      const playingCurrent: Event[] = [];
      const waitlistCurrent: Event[] = [];
      const playingCompleted: Event[] = [];
      const waitlistCompleted: Event[] = [];
      const refunded: Event[] = [];

      snapshot.forEach((doc) => {
        const data = doc.data() as Event; // Cast to Event type
        const event = { ...data, id: doc.id };
        const {
          endDate,
          players,
          goalkeepers,
          playerWaitList,
          goalkeeperWaitList,
          refundedUsers,
          status,
        } = event;

        const isPlaying =
          players.includes(user.uid) || goalkeepers.includes(user.uid);
        const isOnWaitlist =
          playerWaitList.includes(user.uid) ||
          goalkeeperWaitList.includes(user.uid);
        const isRefunded = refundedUsers?.includes(user.uid);

        if (status === "cancelled") {
          canceledEvents.push(event);
        } else if (isRefunded) {
          refunded.push(event);
        } else if (isPlaying || isOnWaitlist) {
          if (endDate && endDate.toDate() >= now) {
            if (isPlaying) playingCurrent.push(event);
            if (isOnWaitlist) waitlistCurrent.push(event);
          } else {
            if (isPlaying) playingCompleted.push(event);
            if (isOnWaitlist) waitlistCompleted.push(event);
          }
        }
      });

      setCurrentEventsPlaying(playingCurrent);
      setCurrentEventsWaitlist(waitlistCurrent);
      setCompletedEventsPlaying(playingCompleted);
      setCompletedEventsWaitlist(waitlistCompleted);
      setRefundedEvents(refunded);
      setCanceledEvents(canceledEvents);
      setLoading(false); // Finish loading
    };

    fetchEvents();
  }, [user]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="p-4">
      <h2 className="text-2xl font-bold mb-4">Your Events</h2>
      <section>
        <h3 className="text-xl font-semibold mb-2">Current Events</h3>
        {currentEventsPlaying.length === 0 &&
          currentEventsWaitlist.length === 0 && (
            <p className="text-gray-600">
              You are not participating in any current events.
            </p>
          )}
        {currentEventsPlaying.length > 0 && (
          <>
            <h4 className="text-lg font-semibold">Playing</h4>
            <ul className="mt-4">
              {currentEventsPlaying.map((event) => (
                <li key={event.id} className="mb-4">
                  <EventCard event={event} />
                </li>
              ))}
            </ul>
          </>
        )}
        {currentEventsWaitlist.length > 0 && (
          <>
            <h4 className="text-lg font-semibold mt-4">On Waitlist</h4>
            <ul className="mt-4">
              {currentEventsWaitlist.map((event) => (
                <li key={event.id} className="mb-4">
                  <EventCard event={event} />
                </li>
              ))}
            </ul>
          </>
        )}
      </section>
      <section className="mt-8">
        <h3 className="text-xl font-semibold mb-2">Completed Events</h3>
        {completedEventsPlaying.length === 0 &&
          completedEventsWaitlist.length === 0 && (
            <p className="text-gray-600">
              You have not completed any events yet.
            </p>
          )}
        {completedEventsPlaying.length > 0 && (
          <>
            <h4 className="text-lg font-semibold">Played</h4>
            <ul className="mt-4">
              {completedEventsPlaying.map((event) => (
                <li key={event.id} className="mb-4">
                  <EventCard event={event} />
                </li>
              ))}
            </ul>
          </>
        )}
        {completedEventsWaitlist.length > 0 && (
          <>
            <h4 className="text-lg font-semibold mt-4">Waitlisted</h4>
            <ul className="mt-4">
              {completedEventsWaitlist.map((event) => (
                <li key={event.id} className="mb-4">
                  <EventCard event={event} />
                </li>
              ))}
            </ul>
          </>
        )}
      </section>
      <section className="mt-8">
        <h3 className="text-xl font-semibold mb-2">Refunded Events</h3>
        {refundedEvents.length === 0 ? (
          <p className="text-gray-600">You have no refunded events.</p>
        ) : (
          <ul className="mt-4">
            {refundedEvents.map((event) => (
              <li key={event.id} className="mb-4">
                <EventCard event={event} />
              </li>
            ))}
          </ul>
        )}
      </section>
      <section className="mt-8">
        <h3 className="text-xl font-semibold mb-2">Canceled/Refunded Events</h3>
        {canceledEvents.length === 0 ? (
          <p className="text-gray-600">You have no canceled events.</p>
        ) : (
          <ul className="mt-4">
            {canceledEvents.map((event) => (
              <li key={event.id} className="mb-4">
                <EventCard event={event} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
};

export default UserEvents;
