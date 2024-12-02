import React, { useEffect, useState } from "react";
import {
  isToday,
  isTomorrow,
  isThisWeek,
  addWeeks,
  isSameMonth,
  isSaturday,
  isSunday,
  isSameWeek,
} from "date-fns";
import { db } from "../firebase/firebaseConfig"; // Firestore instance
import { collection, getDocs, Timestamp, GeoPoint } from "firebase/firestore";
import { FaSadTear } from "react-icons/fa";
import EventCard from "../components/EventCard";
import { Event } from "../types/event";
import CompletedEventsTable from "../components/CompletedEventsTable";

// Helper function
function isThisWeekend(date: Date) {
  return (
    (isSaturday(date) || isSunday(date)) &&
    isSameWeek(date, new Date(), { weekStartsOn: 1 })
  );
}

type GroupedEvents = {
  [category: string]: Event[];
};

const EventList: React.FC = () => {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);

  const getEventsFromFirebase = async (): Promise<Event[]> => {
    const eventsCollection = collection(db, "events"); // Use collection method
    const eventsSnapshot = await getDocs(eventsCollection);
    return eventsSnapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        title: data.title,
        startDate: data.startDate instanceof Timestamp ? data.startDate : null,
        endDate: data.endDate instanceof Timestamp ? data.endDate : null,
        duration: data.duration,
        location:
          data.location instanceof GeoPoint
            ? data.location
            : new GeoPoint(0, 0),
        locationName: data.locationName || "Unknown Location",
        cost: data.cost,
        maxPlayers: data.maxPlayers,
        includeGoalkeepers: data.includeGoalkeepers || false,
        goalkeeperCost: data.includeGoalkeepers ? data.goalkeeperCost : 0,
        maxGoalkeepers: data.maxGoalkeepers || 2,
        status: data.status || "",
        players: data.players || [],
        goalkeepers: data.goalkeepers || [],
        playerWaitList: data.playerWaitList || [],
        goalkeeperWaitList: data.goalkeeperWaitList || [],
        refundedUsers: [],
      };
    });
  };

  function groupEvents(events: Event[]) {
    const today: Event[] = [];
    const tomorrow: Event[] = [];
    const thisWeek: Event[] = [];
    const thisWeekend: Event[] = [];
    const nextWeek: Event[] = [];
    const nextMonth: GroupedEvents = {};
    const upcomingMonths: GroupedEvents = {};
    const completed: Event[] = [];

    // Filter out cancelled events
    const activeEvents = events.filter((event) => event.status !== "cancelled");

    activeEvents.forEach((event) => {
      if (!event.startDate) {
        console.error("Event does not have a valid date");
        return;
      }
      const startDate = event.startDate.toDate();

      if (startDate < new Date()) {
        completed.push(event);
      } else if (isToday(startDate)) {
        today.push(event);
      } else if (isTomorrow(startDate)) {
        tomorrow.push(event);
      } else if (isThisWeek(startDate)) {
        thisWeek.push(event);
      } else if (isThisWeekend(startDate)) {
        thisWeekend.push(event);
      } else if (
        startDate >= addWeeks(new Date(), 1) &&
        startDate < addWeeks(new Date(), 2)
      ) {
        nextWeek.push(event);
      } else if (isSameMonth(startDate, new Date(addWeeks(new Date(), 2)))) {
        const monthKey = startDate.getMonth();
        if (!nextMonth[monthKey]) {
          nextMonth[monthKey] = [];
        }
        nextMonth[monthKey].push(event);
      } else {
        const monthKey = `${startDate.toLocaleString("default", {
          month: "long",
        })}`;
        if (!upcomingMonths[monthKey]) {
          upcomingMonths[monthKey] = [];
        }
        upcomingMonths[monthKey].push(event);
      }
    });

    // Sort each group by startDate
    const sortByDate = (a: Event, b: Event) =>
      a.startDate!.toDate().getTime() - b.startDate!.toDate().getTime();

    today.sort(sortByDate);
    tomorrow.sort(sortByDate);
    thisWeek.sort(sortByDate);
    thisWeekend.sort(sortByDate);
    nextWeek.sort(sortByDate);
    completed.sort(sortByDate);

    Object.values(nextMonth).forEach((monthEvents) =>
      monthEvents.sort(sortByDate)
    );
    Object.values(upcomingMonths).forEach((monthEvents) =>
      monthEvents.sort(sortByDate)
    );

    return {
      today,
      tomorrow,
      thisWeek,
      thisWeekend,
      nextWeek,
      nextMonth,
      upcomingMonths,
      completed,
    };
  }

  useEffect(() => {
    const fetchEvents = async () => {
      const eventsData = await getEventsFromFirebase();
      setEvents(eventsData);
      setLoading(false);
    };

    fetchEvents();
  }, []);

  const renderSection = (
    title: string,
    events: Event[],
    sectionKey: string
  ) => {
    if (events.length === 0) return null;
    return (
      <div key={sectionKey} className="relative">
        <div className="flex pl-[1px] items-center">
          <div className="border-4 w-4 h-4 border-gray-500 rounded-full mr-2"></div>

          <h2 className="text-lg font-bold text-gray-500">{title}</h2>
        </div>
        <div className="relative pl-6 pb-3 pt-3">
          <div className="absolute left-2 top-0 bottom-0 border-l-2 border-gray-300"></div>
          <div className="relative space-y-6">
            {events.map((event) => (
              <div key={event.id} className="ml-2">
                <EventCard event={event} />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  const {
    today,
    tomorrow,
    thisWeek,
    thisWeekend,
    nextWeek,
    nextMonth,
    upcomingMonths,
    completed,
  } = groupEvents(events);

  return (
    <div className="p-4">
      <div className="container mx-auto px-0 md:px-4 xl:px-32 2xl:px-60">
        <h1 className="text-2xl font-bold mb-4">Available Events</h1>
        {loading ? (
          <div className="flex justify-center items-center h-screen">
            <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-blue-500 border-solid"></div>
          </div>
        ) : (
          <>
            {today.length === 0 &&
              tomorrow.length === 0 &&
              thisWeek.length === 0 &&
              thisWeekend.length === 0 &&
              nextWeek.length === 0 &&
              Object.keys(nextMonth).length === 0 &&
              Object.keys(upcomingMonths).length === 0 && (
                <div className="flex items-center mt-10 ml-4">
                  <FaSadTear className="text-gray-500 text-5xl mr-4" />
                  <div>
                    <h2 className="text-lg font-semibold text-gray-600">
                      No Current Events
                    </h2>
                    <p className="text-gray-500">
                      Please check back later for updates.
                    </p>
                  </div>
                </div>
              )}

            {/* Render available events */}
            {renderSection("Today", today, "today")}
            {renderSection("Tomorrow", tomorrow, "tomorrow")}
            {renderSection("This Week", thisWeek, "thisWeek")}
            {renderSection("This Weekend", thisWeekend, "thisWeekend")}
            {renderSection("Next Week", nextWeek, "nextWeek")}
            {Object.entries(nextMonth).map(([_, events]) =>
              renderSection(`Next Month`, events, `nextMonth`)
            )}
            {Object.entries(upcomingMonths).map(([month, events]) =>
              renderSection(`${month}`, events, `upcomingMonths-${month}`)
            )}

            {/* Render completed events */}
            {completed.length > 0 ? (
              <>
                <h1 className="text-2xl font-bold mt-8 mb-4">
                  Completed Events
                </h1>
                <CompletedEventsTable events={completed} />
              </>
            ) : (
              <div className="mt-6 text-gray-500">
                <h2 className="text-lg font-bold">No Completed Events</h2>
                <p>Completed events will appear here once available.</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default EventList;
