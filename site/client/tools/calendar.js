import { getRequiredElement } from "../../../docs/layouts/plant-tracker-data.js";

const inspectionEvent = "7:30 inspect/photo/log; rotate after off";
const archivedLightOff = "AW200SE off";
/** @typedef {{ id: string; type: string; text: string }} CalendarEvent */
/**
 * @typedef {{
 *     title: string;
 *     subtitle: string;
 *     startDay: number;
 *     days: number;
 *     events: Record<number, CalendarEvent[]>;
 * }} CalendarMonth
 */
try {
    document.documentElement.classList.toggle(
        "hide-empty-days",
        localStorage.getItem("gardening-indoor-calendar-hide-empty") === "true"
    );
} catch {
    /* Keep the default expanded calendar if storage is unavailable. */
}

/** @type {Record<string, CalendarMonth>} */
const calendarData = {
    "2026-08": {
        days: 31,
        events: {
            1: [
                {
                    id: "aug01-risers",
                    text: "After off · install 3×4 riser map; restore 20 in",
                    type: "move",
                },
                {
                    id: "aug01-cables",
                    text: "Secure cables + make drip loops",
                    type: "check",
                },
            ],
            2: [
                {
                    id: "aug02-baseline",
                    text: "7:30 · inspect/photo/log baseline",
                    type: "sensor",
                },
                {
                    id: "aug02-layout",
                    text: "After off · lock aligned tables + risers + camera",
                    type: "check",
                },
            ],
            3: [
                {
                    id: "aug03-light",
                    text: "7:45 · time-lapse; 40% at 20 in",
                    type: "light",
                },
                {
                    id: "aug03-sensor",
                    text: "Daily 7:30 sensor log begins",
                    type: "sensor",
                },
            ],
            4: [
                {
                    id: "aug04-air-baseline",
                    text: "Air-treatment baseline · purifier low",
                    type: "sensor",
                },
                {
                    id: "aug04-dehumidifier",
                    text: "DH-CS01 off unless sustained RH triggers it",
                    type: "check",
                },
            ],
            8: [
                {
                    id: "aug08-expansion",
                    text: "Add second wood table + 8 new plants",
                    type: "move",
                },
                {
                    id: "aug08-camera",
                    text: "Reframe all 3 surfaces + start fresh clip",
                    type: "check",
                },
            ],
            9: [
                {
                    id: "aug09-new-plants",
                    text: "New plants perimeter; no risers until measured",
                    type: "check",
                },
                {
                    id: "aug09-labels",
                    text: "E/F + #1–#4 label mappings recorded",
                    type: "check",
                },
                {
                    id: "aug09-check",
                    text: inspectionEvent,
                    type: "check",
                },
                {
                    id: "aug09-fan",
                    text: "Approve fan Level 3 only if needed",
                    type: "check",
                },
            ],
            10: [
                {
                    id: "aug10-light",
                    text: "Planned · 18 in / 40%; not confirmed",
                    type: "light",
                },
            ],
            14: [
                {
                    id: "aug14-light",
                    text: "Actual · 45% at 18 in; hold steady",
                    type: "light",
                },
                {
                    id: "aug14-fans",
                    text: "Add second E6 Gen2/E25 · both Level 1–2",
                    type: "move",
                },
                {
                    id: "aug14-repot",
                    text: "P01–P18 → setup 2 · 3:2 Molly’s/perlite by volume",
                    type: "check",
                },
                {
                    id: "aug14-drydown",
                    text: "P01–P18: start setup-2 dry trial",
                    type: "sensor",
                },
                {
                    id: "aug14-camera",
                    text: "Start fresh clip after pots + fans settle",
                    type: "sensor",
                },
            ],
            16: [
                {
                    id: "aug16-check",
                    text: inspectionEvent,
                    type: "check",
                },
                {
                    id: "aug16-sensor",
                    text: "Last daily sensor log",
                    type: "sensor",
                },
            ],
            17: [
                {
                    id: "aug17-light",
                    text: "Hold 45% at 18 in · inspect, do not raise",
                    type: "light",
                },
                {
                    id: "aug17-sensor",
                    text: "Sensor changes to Sunday routine",
                    type: "sensor",
                },
            ],
            21: [
                {
                    id: "aug21-water",
                    text: "Original watering target · no completed soak recorded",
                    type: "check",
                },
                {
                    id: "aug21-weights",
                    text: "Keep setup-2 dry readings; do not invent a wet baseline",
                    type: "sensor",
                },
                {
                    id: "aug21-root-fallback",
                    text: "Original fallback window was Aug 21–24",
                    type: "check",
                },
            ],
            23: [
                {
                    id: "aug23-check",
                    text: inspectionEvent,
                    type: "check",
                },
            ],
            24: [
                {
                    id: "aug24-light",
                    text: "Hold 45% · review new-medium dry-down",
                    type: "light",
                },
            ],
            25: [
                {
                    id: "aug25-mcg-order",
                    text: "MCG order placed · collection receipt unverified",
                    type: "check",
                },
                {
                    id: "aug25-mcg-onboarding",
                    text: "G1–G3 / H1–H3 labels reserved · tracker IDs, watering, and placement wait for inspection",
                    type: "move",
                },
            ],
            26: [
                {
                    id: "aug26-water",
                    text: "4:22 p.m. · plain Beauchamp's RO soak completed for P01–P18 · no nutrients",
                    type: "water",
                },
            ],
            27: [
                {
                    id: "aug27-weights",
                    text: "12:14–12:20 a.m. · Wet setup-2 weights recorded about 8 hours after Water",
                    type: "sensor",
                },
                {
                    id: "aug27-fertilizer",
                    text: "0.75 g/gal MSU is only eligible at the next otherwise-ready watering",
                    type: "check",
                },
            ],
            28: [
                {
                    id: "aug28-mcg-arrival",
                    text: "MCG six received rooted · owner-inspected · repotted to 4 in pots · P23–P28 assigned",
                    type: "move",
                },
                {
                    id: "aug28-mcg-observation",
                    text: "No quarantine chosen · keep targeted pest checks + gradual indoor-light acclimation",
                    type: "check",
                },
            ],
            30: [
                {
                    id: "aug30-check",
                    text: inspectionEvent,
                    type: "check",
                },
            ],
            31: [
                {
                    id: "aug31-light",
                    text: "50% only if healthy + dry-down stable",
                    type: "light",
                },
            ],
        },
        startDay: 6,
        subtitle: "Shakedown + Weeks 1–5",
        title: "August 2026",
    },
    "2026-09": {
        days: 30,
        events: {
            6: [
                {
                    id: "sep06-check",
                    text: inspectionEvent,
                    type: "check",
                },
                {
                    id: "sep06-fan",
                    text: "Monthly fan grille check after off",
                    type: "check",
                },
            ],
            7: [
                {
                    id: "sep07-light",
                    text: "Hold lowest successful 45–50%",
                    type: "light",
                },
            ],
            13: [
                {
                    id: "sep13-check",
                    text: inspectionEvent,
                    type: "check",
                },
            ],
            14: [
                {
                    id: "sep14-light",
                    text: "55% only if fully healthy; hold 18 in",
                    type: "light",
                },
                {
                    id: "sep14-camera",
                    text: "After 8 PM · end acclimation time-lapse",
                    type: "sensor",
                },
            ],
            20: [
                {
                    id: "sep20-check",
                    text: "Final fixed-ramp check + rotation",
                    type: "check",
                },
            ],
            21: [
                {
                    id: "sep21-season",
                    text: "Seasonal timer · light 7:15–7:30",
                    type: "season",
                },
                {
                    id: "sep21-fan",
                    text: "Fan 7:45–7:15",
                    type: "season",
                },
            ],
            27: [
                {
                    id: "sep27-check",
                    text: "Weekly inspect/photo/log + rotation",
                    type: "check",
                },
            ],
        },
        startDay: 2,
        subtitle: "Weeks 5–7 + seasonal timer",
        title: "September 2026",
    },
};

const weekdays = [
    "Sun",
    "Mon",
    "Tue",
    "Wed",
    "Thu",
    "Fri",
    "Sat",
];
const storageKey = "gardening-indoor-calendar-completed";
const emptyDaysStorageKey = "gardening-indoor-calendar-hide-empty";

/** @returns {Set<string>} */
function loadCompleted() {
    try {
        /** @type {unknown} */
        const saved = JSON.parse(localStorage.getItem(storageKey) ?? "[]");
        return new Set(
            Array.isArray(saved)
                ? saved.filter((id) => typeof id === "string")
                : []
        );
    } catch {
        return new Set();
    }
}

const completed = loadCompleted();

/** @param {CalendarMonth} data @param {string} monthKey */
function buildMonth(data, monthKey) {
    const article = document.createElement("article");
    article.className = "month";

    const header = document.createElement("header");
    header.className = "month-header";
    const heading = document.createElement("h3");
    heading.textContent = data.title;
    const subtitle = document.createElement("span");
    subtitle.textContent = data.subtitle;
    header.append(heading, subtitle);

    const weekdayRow = document.createElement("div");
    weekdayRow.className = "weekdays";
    weekdayRow.setAttribute("aria-hidden", "true");
    for (const day of weekdays) {
        const label = document.createElement("div");
        label.className = "weekday";
        label.textContent = day;
        weekdayRow.append(label);
    }

    const grid = document.createElement("div");
    grid.className = "month-grid";
    for (let index = 0; index < data.startDay; index += 1) {
        const blank = document.createElement("div");
        blank.className = "day blank";
        grid.append(blank);
    }

    for (let day = 1; day <= data.days; day += 1) {
        const events = data.events[day] ?? [];
        const isoDate = `${monthKey}-${String(day).padStart(2, "0")}`;
        const cell = document.createElement("div");
        cell.className = `day${events.length > 0 ? " has-events" : ""}`;
        cell.dataset["date"] = isoDate;
        const number = document.createElement("span");
        number.className = "day-number";
        number.textContent = String(day);
        cell.append(number);
        for (const item of events) cell.append(makeEvent(item));
        grid.append(cell);
    }

    const remainder = (data.startDay + data.days) % 7;
    if (remainder) {
        for (let index = remainder; index < 7; index += 1) {
            const blank = document.createElement("div");
            blank.className = "day blank";
            grid.append(blank);
        }
    }

    const agenda = document.createElement("div");
    agenda.className = "mobile-agenda";
    for (const [day, events] of Object.entries(data.events)) {
        const isoDate = `${monthKey}-${day.padStart(2, "0")}`;
        const row = document.createElement("div");
        row.className = "agenda-day";
        row.dataset["date"] = isoDate;
        const date = document.createElement("div");
        date.className = "agenda-date";
        const dateObject = new Date(
            Number(data.title.slice(-4)),
            data.title.startsWith("August") ? 7 : 8,
            Number(day)
        );
        const dayNumber = document.createElement("strong");
        dayNumber.textContent = day;
        date.append(
            document.createTextNode(weekdays[dateObject.getDay()] ?? ""),
            dayNumber
        );
        const eventList = document.createElement("div");
        eventList.className = "agenda-events";
        for (const item of events) eventList.append(makeEvent(item));
        row.append(date, eventList);
        agenda.append(row);
    }

    article.append(header, weekdayRow, grid, agenda);
    return article;
}

/** @param {CalendarEvent} item */
function makeEvent(item) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `event ${item.type}`;
    button.dataset["eventId"] = item.id;
    /** @type {Record<string, string>} */
    const eventIcons = {
        check: "check",
        light: "light",
        move: "layout",
        season: "calendar",
        sensor: "observation",
        water: "water",
    };
    const isDone = completed.has(item.id);
    button.append(
        makeSiteIcon(isDone ? "check" : "observation", "event-status-icon"),
        makeSiteIcon(eventIcons[item.type] ?? "calendar", "event-type-icon"),
        document.createTextNode(item.text)
    );
    button.setAttribute("aria-pressed", isDone ? "true" : "false");
    button.title = "Mark this task complete";
    if (isDone) button.classList.add("done");
    button.addEventListener("click", () => {
        if (completed.has(item.id)) {
            completed.delete(item.id);
        } else {
            completed.add(item.id);
        }
        saveCompleted();
        syncEventButtons(item.id);
    });
    return button;
}

/** @param {string} name @param {string} [className] */
function makeSiteIcon(name, className = "") {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute(
        "class",
        ["site-icon", className].filter(Boolean).join(" ")
    );
    svg.setAttribute("viewBox", "0 0 64 64");
    svg.setAttribute("aria-hidden", "true");
    svg.setAttribute("focusable", "false");
    const use = document.createElementNS("http://www.w3.org/2000/svg", "use");
    use.setAttribute("href", `/Gardening/plant-icons.svg#icon-${name}`);
    use.setAttribute("width", "64");
    use.setAttribute("height", "64");
    svg.append(use);
    return svg;
}

function saveCompleted() {
    localStorage.setItem(storageKey, JSON.stringify([...completed]));
}

/** @param {string} id */
function syncEventButtons(id) {
    document
        .querySelectorAll(`[data-event-id="${CSS.escape(id)}"]`)
        .forEach((button) => {
            const isDone = completed.has(id);
            button.classList.toggle("done", isDone);
            button.setAttribute("aria-pressed", isDone ? "true" : "false");
            button
                .querySelector(":scope .event-status-icon use")
                ?.setAttribute(
                    "href",
                    `/Gardening/plant-icons.svg#icon-${isDone ? "check" : "observation"}`
                );
        });
}

const months = getRequiredElement("#months", HTMLElement);
for (const [monthKey, month] of Object.entries(calendarData))
    months.append(buildMonth(month, monthKey));
const emptyDaysToggle = getRequiredElement("#empty-days-toggle", HTMLElement);
const emptyDaysIcon = getRequiredElement("#empty-days-icon", SVGElement);
const emptyDaysLabel = getRequiredElement("#empty-days-label", HTMLElement);
const fentonTimeZone = "America/Detroit";
/** @type {{ at: Date; title: string }[]} */
const timedSchedule = [];

/**
 * @param {string} startDate @param {string} endDate @param {{time: string,
 *   title: string, sundayTitle?: string}[]} times
 */
function addDailySchedule(startDate, endDate, times) {
    forEachDate(startDate, endDate, (date, dayOfWeek) => {
        for (const { sundayTitle, time, title } of times) {
            const eventTitle =
                dayOfWeek === 0 &&
                sundayTitle !== undefined &&
                sundayTitle !== ""
                    ? sundayTitle
                    : title;
            addScheduledEvent(`${date}T${time}:00-04:00`, eventTitle);
        }
    });
}

/** @param {string} at @param {string} title */
function addScheduledEvent(at, title) {
    timedSchedule.push({ at: new Date(at), title });
}

/**
 * @param {string} startDate @param {string} endDate @param {(date: string,
 *   dayOfWeek: number) => void} visitDate
 */
function forEachDate(startDate, endDate, visitDate) {
    const cursor = new Date(`${startDate}T12:00:00Z`);
    const end = new Date(`${endDate}T12:00:00Z`);
    for (
        let time = cursor.getTime();
        time <= end.getTime();
        time += 86_400_000
    ) {
        cursor.setTime(time);
        visitDate(cursor.toISOString().slice(0, 10), cursor.getUTCDay());
    }
}

addScheduledEvent(
    "2026-07-31T04:00:00-04:00",
    "RO-water only dry pots; drain fully"
);

addDailySchedule("2026-07-31", "2026-08-02", [
    {
        time: "08:00",
        title: "AW200SE shakedown on: 40% at 20 inches",
    },
    {
        time: "08:15",
        title: "Original AeroWave on: Natural Wind Level 2",
    },
    {
        sundayTitle: "Final baseline sensor reading + inspection",
        time: "19:30",
        title: "Sensor reading + inspect lit surfaces",
    },
    { time: "19:45", title: "Original AeroWave off" },
    { time: "20:00", title: archivedLightOff },
]);

addScheduledEvent(
    "2026-08-01T20:05:00-04:00",
    "Install the measured 3×4 riser map, restore 20 inches, and make cable drip loops"
);
addScheduledEvent(
    "2026-08-02T20:05:00-04:00",
    "Lock the aligned tables, riser layout, and GrowCam framing"
);
addScheduledEvent(
    "2026-08-03T07:45:00-04:00",
    "Start or verify time-lapse and Week 1 settings"
);

for (const [date, title] of [
    [
        "2026-08-10",
        "Planned: lower the light to 18 inches and hold 40%; completion not recorded",
    ],
    [
        "2026-08-14",
        "Actual reset: 45% at 18 inches; add second E6 Gen2/E25; move P01–P18 to setup 2",
    ],
    ["2026-08-17", "Hold 45% at 18 inches; inspect without another increase"],
    [
        "2026-08-21",
        "Original plain-RO target passed without a completed soak being recorded",
    ],
    ["2026-08-24", "Hold 45%; review the new-medium dry-down"],
    [
        "2026-08-26",
        "Actual: P01–P18 plain Beauchamp's RO Water at 4:22 p.m.; no nutrients",
    ],
    [
        "2026-08-27",
        "Actual: Wet setup-2 weights at 12:14–12:20 a.m., about eight hours after Water",
    ],
    ["2026-08-31", "Raise to 50% only if plants and dry-down are stable"],
    ["2026-09-07", "Hold the lowest successful 45–50% setting"],
    ["2026-09-14", "Try 55% only if every lit surface is healthy"],
]) {
    if (date !== undefined && title !== undefined)
        addScheduledEvent(`${date}T07:45:00-04:00`, title);
}

forEachDate("2026-08-03", "2026-09-20", (date, dayOfWeek) => {
    addScheduledEvent(`${date}T08:00:00-04:00`, "AW200SE on");
    addScheduledEvent(
        `${date}T08:15:00-04:00`,
        Date.parse(date) < Date.parse("2026-08-14")
            ? "Original AeroWave on at Level 2"
            : "Both E6 Gen2 fans on at lowest successful Level 1–2 settings"
    );

    const isDailySensorWindow = Date.parse(date) <= Date.parse("2026-08-16");
    if (isDailySensorWindow || dayOfWeek === 0) {
        addScheduledEvent(
            `${date}T19:30:00-04:00`,
            dayOfWeek === 0
                ? "Sensor reading + Sunday inspection"
                : "Sensor reading"
        );
    }

    addScheduledEvent(
        `${date}T19:45:00-04:00`,
        Date.parse(date) < Date.parse("2026-08-14")
            ? "Original AeroWave off"
            : "Paired canopy-fan window ends"
    );
    addScheduledEvent(
        `${date}T20:00:00-04:00`,
        dayOfWeek === 0 ? "Light off + pot rotation" : archivedLightOff
    );
});

addScheduledEvent(
    "2026-09-14T20:00:00-04:00",
    "End the main acclimation time-lapse"
);
addScheduledEvent(
    "2026-09-21T07:00:00-04:00",
    "Set the September seasonal timers"
);
addScheduledEvent("2026-10-01T07:15:00-04:00", "Update the October timers");
addScheduledEvent("2026-10-19T07:45:00-04:00", "Update the mid-October timers");

addDailySchedule("2026-09-21", "2026-09-30", [
    { time: "07:15", title: "AW200SE on" },
    { time: "07:45", title: "Canopy-fan window starts" },
    {
        sundayTitle: "Sensor reading + Sunday inspection",
        time: "19:00",
        title: "",
    },
    { time: "19:15", title: "Canopy-fan window ends" },
    {
        sundayTitle: "Light off + pot rotation",
        time: "19:30",
        title: archivedLightOff,
    },
]);
addDailySchedule("2026-10-01", "2026-10-18", [
    { time: "07:30", title: "AW200SE on" },
    { time: "07:45", title: "Canopy-fan window starts" },
    {
        sundayTitle: "Sensor reading + Sunday inspection",
        time: "18:45",
        title: "",
    },
    { time: "19:00", title: "Canopy-fan window ends" },
    {
        sundayTitle: "Light off + pot rotation",
        time: "19:15",
        title: archivedLightOff,
    },
]);
addDailySchedule("2026-10-19", "2026-10-31", [
    { time: "08:00", title: "AW200SE on" },
    { time: "08:15", title: "Canopy-fan window starts" },
    {
        sundayTitle: "Sensor reading + Sunday inspection",
        time: "18:15",
        title: "",
    },
    { time: "18:30", title: "Canopy-fan window ends" },
    {
        sundayTitle: "Light off + pot rotation",
        time: "18:45",
        title: archivedLightOff,
    },
]);

timedSchedule.splice(
    0,
    timedSchedule.length,
    ...timedSchedule
        .filter(({ title }) => title)
        .toSorted((left, right) => left.at.getTime() - right.at.getTime())
);

const clockFormatter = new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    timeZone: fentonTimeZone,
});
const dateFormatter = new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    month: "long",
    timeZone: fentonTimeZone,
    weekday: "long",
    year: "numeric",
});
const eventFormatter = new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    month: "short",
    timeZone: fentonTimeZone,
    weekday: "short",
});
const dateKeyFormatter = new Intl.DateTimeFormat("en-CA", {
    day: "2-digit",
    month: "2-digit",
    timeZone: fentonTimeZone,
    year: "numeric",
});
const rampStart = new Date("2026-08-03T08:00:00-04:00");
const rampEnd = new Date("2026-09-21T07:15:00-04:00");
const liveClock = getRequiredElement("#live-clock", HTMLTimeElement);
const liveDate = getRequiredElement("#live-date", HTMLElement);
const nextEventTitle = getRequiredElement("#next-event-title", HTMLElement);
const nextEventTime = getRequiredElement("#next-event-time", HTMLTimeElement);
const countdown = getRequiredElement("#countdown", HTMLElement);
const progressStage = getRequiredElement("#progress-stage", HTMLElement);
const progressPercent = getRequiredElement("#progress-percent", HTMLElement);
const rampProgress = getRequiredElement("#ramp-progress", HTMLElement);
const progressBar = getRequiredElement("#progress-bar", HTMLElement);
const progressCaption = getRequiredElement("#progress-caption", HTMLElement);
const viewState = { highlightedDate: "" };

/** @param {Date} date */
function fentonDateKey(date) {
    const parts = Object.fromEntries(
        dateKeyFormatter
            .formatToParts(date)
            .filter(({ type }) => type !== "literal")
            .map(({ type, value }) => [type, value])
    );
    return [
        parts["year"],
        parts["month"],
        parts["day"],
    ].join("-");
}

/** @param {number} milliseconds */
function formatCountdown(milliseconds) {
    const totalSeconds = Math.max(0, Math.floor(milliseconds / 1000));
    const days = Math.floor(totalSeconds / 86_400);
    const hours = Math.floor((totalSeconds % 86_400) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);

    if (days) return `${days}d ${hours}h ${minutes}m`;
    const seconds = totalSeconds % 60;
    if (hours) return `${hours}h ${minutes}m ${seconds}s`;
    return `${minutes}m ${seconds}s`;
}

function syncViewControls() {
    const isEmptyDaysHidden =
        document.documentElement.classList.contains("hide-empty-days");
    emptyDaysIcon
        .querySelector("use")
        ?.setAttribute(
            "href",
            `/Gardening/plant-icons.svg#icon-${isEmptyDaysHidden ? "eye" : "eye-off"}`
        );
    emptyDaysLabel.textContent = isEmptyDaysHidden
        ? "Show empty days"
        : "Hide empty days";
    emptyDaysToggle.setAttribute(
        "aria-pressed",
        isEmptyDaysHidden ? "true" : "false"
    );
}

function updateLiveStatus() {
    const now = new Date();
    liveClock.textContent = clockFormatter.format(now);
    liveClock.dateTime = now.toISOString();
    liveDate.textContent = dateFormatter.format(now);

    const nextEvent = timedSchedule.find(({ at }) => at > now);
    if (nextEvent) {
        nextEventTitle.textContent = nextEvent.title;
        nextEventTime.textContent = eventFormatter.format(nextEvent.at);
        countdown.textContent = `in ${formatCountdown(nextEvent.at.getTime() - now.getTime())}`;
    } else {
        nextEventTitle.textContent = "No later calendar event is listed";
        nextEventTime.textContent = "Schedule currently ends October 31";
        countdown.textContent = "Add the next seasonal block when ready";
    }

    updateRampProgress(now);
    updateTodayHighlight(now);
}

/** @param {Date} now */
function updateRampProgress(now) {
    let percent;
    let stage;
    let caption;

    if (now < rampStart) {
        percent = 0;
        stage = "Three-day shakedown";
        caption = "Hold 40% at 20 inches; formal Week 1 begins August 3.";
    } else if (now < rampEnd) {
        percent = Math.min(
            100,
            Math.max(
                0,
                ((now.getTime() - rampStart.getTime()) /
                    (rampEnd.getTime() - rampStart.getTime())) *
                    100
            )
        );
        const week = Math.min(
            7,
            Math.floor(
                (now.getTime() - rampStart.getTime()) /
                    (7 * 24 * 60 * 60 * 1000)
            ) + 1
        );
        stage = `Week ${week} of 7`;
        caption =
            "Fixed 8:00 a.m.–8:00 p.m. light period through September 20.";
    } else {
        percent = 100;
        stage = "Ramp complete";
        caption = "Seasonal timer schedule is active.";
    }

    const roundedPercent = Math.round(percent);
    progressStage.textContent = stage;
    progressPercent.textContent = `${roundedPercent}%`;
    progressBar.style.width = `${percent}%`;
    progressCaption.textContent = caption;
    rampProgress.setAttribute("aria-valuenow", String(roundedPercent));
}

/** @param {Date} date */
function updateTodayHighlight(date) {
    const dateKey = fentonDateKey(date);
    if (dateKey === viewState.highlightedDate) return;
    document.querySelectorAll(".today").forEach((element) => {
        element.classList.remove("today");
    });
    document
        .querySelectorAll(`[data-date="${CSS.escape(dateKey)}"]`)
        .forEach((element) => {
            element.classList.add("today");
        });
    viewState.highlightedDate = dateKey;
}

emptyDaysToggle.addEventListener("click", () => {
    const isHidden =
        document.documentElement.classList.toggle("hide-empty-days");
    try {
        localStorage.setItem(emptyDaysStorageKey, String(isHidden));
    } catch {
        // The compact view still works for this page view when storage is unavailable.
    }
    syncViewControls();
});

updateLiveStatus();
setInterval(updateLiveStatus, 1000);
syncViewControls();
getRequiredElement("#print", HTMLButtonElement).addEventListener(
    "click",
    () => {
        print();
    }
);
getRequiredElement("#reset", HTMLElement).addEventListener("click", () => {
    completed.clear();
    saveCompleted();
    document.querySelectorAll("[data-event-id]").forEach((button) => {
        button.classList.remove("done");
        button.setAttribute("aria-pressed", "false");
    });
});
