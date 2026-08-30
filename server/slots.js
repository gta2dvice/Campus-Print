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

function buildSlotStatuses(locationId, countsByTime = {}) {
    return TIME_SLOTS.map(time => {
        const seed = SEED_BOOKED[slotKey(locationId, time)] || 0;
        const live = countsByTime[time] || 0;
        const booked = Math.min(SLOT_CAPACITY, seed + live);
        const status = statusFromBooked(booked);
        return {
            time,
            status,
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
    buildSlotStatuses
};
