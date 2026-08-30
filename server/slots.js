const LOCATIONS = [
    { id: 'main-gate', name: 'Main Gate', hint: 'Campus Gate 1 pickup' },
    { id: 'academic-block', name: 'Academic Block', hint: 'Main Academic Block' },
    { id: 'hostel-gate', name: 'Hostel Gate', hint: 'Hostel entrance pickup' }
];

const TIME_SLOTS = ['9:25 AM', '11:05 AM', '1:15 PM', '2:05 PM', '4:00 PM'];

const SLOT_CAPACITY = 6;

/** Baseline occupancy so availability differs per location + slot. */
const SEED_BOOKED = {
    'main-gate|9:25 AM': 1,
    'main-gate|11:05 AM': 2,
    'main-gate|1:15 PM': 5,
    'main-gate|2:05 PM': 0,
    'main-gate|4:00 PM': 6,
    'academic-block|9:25 AM': 6,
    'academic-block|11:05 AM': 1,
    'academic-block|1:15 PM': 2,
    'academic-block|2:05 PM': 5,
    'academic-block|4:00 PM': 0,
    'hostel-gate|9:25 AM': 2,
    'hostel-gate|11:05 AM': 6,
    'hostel-gate|1:15 PM': 0,
    'hostel-gate|2:05 PM': 1,
    'hostel-gate|4:00 PM': 5
};

function getLocationById(id) {
    return LOCATIONS.find(loc => loc.id === id) || null;
}

function getLocationByName(name) {
    return LOCATIONS.find(loc => loc.name === name) || null;
}

function slotKey(locationId, timeSlot) {
    return `${locationId}|${timeSlot}`;
}

function statusFromBooked(booked, capacity = SLOT_CAPACITY) {
    if (booked >= capacity) return 'full';
    if (booked >= Math.ceil(capacity * 0.7)) return 'limited';
    return 'available';
}

// Campus Print only operates in India, so "now" for slot cutoffs is always IST — regardless of
// what timezone the server process/host happens to be configured with. Comparing minutes-since-
// midnight (instead of Date objects built from the OS's local timezone) keeps this correct no
// matter where the Node process actually runs.
const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

/** Minutes since midnight IST, right now. */
function nowMinutesIST(atMs = Date.now()) {
    const istMs = atMs + IST_OFFSET_MS;
    return Math.floor((istMs % 86400000) / 60000);
}

/** Parses a "9:25 AM" style label into minutes since midnight. */
function slotMinutes(time) {
    const match = /^(\d{1,2}):(\d{2})\s*(AM|PM)$/i.exec(time.trim());
    if (!match) return null;
    let [, hourStr, minStr, meridiem] = match;
    let hour = parseInt(hourStr, 10) % 12;
    if (meridiem.toUpperCase() === 'PM') hour += 12;
    return hour * 60 + parseInt(minStr, 10);
}

function buildSlotStatuses(locationId, countsByTime = {}, atMs = Date.now()) {
    const nowMinutes = nowMinutesIST(atMs);
    return TIME_SLOTS.map(time => {
        const seed = SEED_BOOKED[slotKey(locationId, time)] || 0;
        const live = countsByTime[time] || 0;
        const booked = Math.min(SLOT_CAPACITY, seed + live);
        const mins = slotMinutes(time);
        const isPast = mins !== null && mins <= nowMinutes;
        const status = isPast ? 'past' : statusFromBooked(booked);
        return {
            time,
            status,
            isPast,
            booked,
            capacity: SLOT_CAPACITY,
            remaining: Math.max(0, SLOT_CAPACITY - booked)
        };
    });
}

module.exports = {
    LOCATIONS,
    TIME_SLOTS,
    SLOT_CAPACITY,
    getLocationById,
    getLocationByName,
    nowMinutesIST,
    slotMinutes,
    buildSlotStatuses
};
