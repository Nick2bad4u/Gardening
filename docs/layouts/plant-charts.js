const SVG_NS = "http://www.w3.org/2000/svg";
const WIDTH = 760;
const HEIGHT = 300;
const MARGIN = { bottom: 48, left: 62, right: 24, top: 24 };
const AXIS_LABEL_CLASS = "chart-axis-label";

/** @typedef {{ date: Date; value: number; state?: string }} ChartPoint */
/** @typedef {{ label: string; className?: string; points: ChartPoint[] }} ChartSeries */
/** @typedef {{ label: string; className?: string; value: number | null }} ReferenceLine */
/**
 * @typedef {{
 *     category: string;
 *     className: string;
 *     date: Date;
 *     label: string;
 * }} ActivityPoint
 */
/**
 * @typedef {{
 *     category?: string;
 *     className?: string;
 *     date: Date | null;
 *     label: string;
 * }} ActivityEvent
 */
/** @typedef {{ date: Date; days: number; from: Date; to: Date }} WateringInterval */

/**
 * @param {Element} container
 * @param {{
 *     ariaLabel: string;
 *     emptyMessage: string;
 *     events: ActivityEvent[];
 * }} options
 */
export function renderActivityChart(
    container,
    { ariaLabel, emptyMessage, events }
) {
    const points = events
        .map((event) => ({
            category: (event.category ?? "") || "Other",
            className: (event.className ?? "") || "activity-other",
            date: event.date,
            label: event.label,
        }))
        .filter(
            /** @returns {event is ActivityPoint} */
            (event) =>
                event.date instanceof Date &&
                !Number.isNaN(event.date.getTime())
        )
        .toSorted((left, right) => left.date.getTime() - right.date.getTime());
    if (points.length === 0) {
        renderEmpty(container, emptyMessage);
        return;
    }

    let minimumTime = Math.min(...points.map((point) => point.date.getTime()));
    let maximumTime = Math.max(...points.map((point) => point.date.getTime()));
    if (minimumTime === maximumTime) {
        minimumTime -= 43_200_000;
        maximumTime += 43_200_000;
    }
    /**
     * @type {Map<
     *     string,
     *     ActivityPoint & { count: number; labels: string[] }
     * >}
     */
    const groups = new Map();
    for (const point of points) {
        const dayKey = `${point.date.getFullYear()}-${point.date.getMonth()}-${point.date.getDate()}`;
        const key = `${point.category}\u{0}${dayKey}`;
        const group = groups.get(key) ?? { ...point, count: 0, labels: [] };
        group.count += 1;
        group.labels.push(point.label);
        groups.set(key, group);
    }
    // eslint-disable-next-line canonical/no-use-extend-native -- Array.prototype.toSorted is a standard ES2023 method.
    const categories = [
        ...new Set(points.map((point) => point.category)),
    ].toSorted((left, right) => left.localeCompare(right));
    const svg = chartFrame(container, ariaLabel);
    const detail = chartDetail(container);
    const margin = { bottom: 48, left: 128, right: 24, top: 24 };
    const plotWidth = WIDTH - margin.left - margin.right;
    const plotHeight = HEIGHT - margin.top - margin.bottom;
    const x = (/** @type {number} */ time) =>
        margin.left +
        ((time - minimumTime) / (maximumTime - minimumTime)) * plotWidth;
    const laneY = (/** @type {string} */ category) =>
        margin.top +
        ((categories.indexOf(category) + 0.5) / categories.length) * plotHeight;
    for (const category of categories) {
        const y = laneY(category);
        svg.append(
            svgElement("line", {
                class: "chart-grid-line chart-lane-line",
                x1: margin.left,
                x2: WIDTH - margin.right,
                y1: y,
                y2: y,
            }),
            svgElement(
                "text",
                {
                    class: "chart-axis-label chart-category-label",
                    "text-anchor": "end",
                    x: margin.left - 12,
                    y: y + 4,
                },
                category
            )
        );
    }
    for (const point of groups.values()) {
        const y = laneY(point.category);
        const countLabel = point.count > 1 ? ` · ${point.count} entries` : "";
        const label = `${point.labels.join("; ")} · ${formatShortDate(point.date)}${countLabel}`;
        const xPosition = x(point.date.getTime());
        const circle = svgElement("circle", {
            class: `chart-point ${point.className}`,
            cx: xPosition,
            cy: y,
            r: point.count > 1 ? 10 : 8,
            tabindex: 0,
        });
        circle.append(svgElement("title", {}, label));
        describeMark(circle, label, detail);
        svg.append(circle);
        if (point.count > 1)
            svg.append(
                svgElement(
                    "text",
                    {
                        class: "chart-count-label",
                        "text-anchor": "middle",
                        x: xPosition,
                        y: y + 4,
                    },
                    point.count
                )
            );
    }
    for (const [index, time] of [minimumTime, maximumTime].entries()) {
        svg.append(
            svgElement(
                "text",
                {
                    class: AXIS_LABEL_CLASS,
                    "text-anchor": index ? "end" : "start",
                    x: index ? WIDTH - margin.right : margin.left,
                    y: HEIGHT - 24,
                },
                formatShortDate(time)
            )
        );
    }
}

/**
 * @param {Element} container
 * @param {{
 *     ariaLabel: string;
 *     emptyMessage: string;
 *     items: { label: string; value: number; className?: string }[];
 *     unit?: string;
 * }} options
 */
export function renderBarChart(
    container,
    { ariaLabel, emptyMessage, items, unit = "events" }
) {
    const bars = items.filter(
        (item) =>
            item.label !== "" && Number.isFinite(item.value) && item.value >= 0
    );
    if (bars.length === 0) {
        renderEmpty(container, emptyMessage);
        return;
    }
    const svg = chartFrame(container, ariaLabel);
    const detail = chartDetail(container);
    const margin = { bottom: 18, left: 150, right: 46, top: 18 };
    const plotWidth = WIDTH - margin.left - margin.right;
    const plotHeight = HEIGHT - margin.top - margin.bottom;
    const gap = Math.max(3, Math.min(10, plotHeight / bars.length / 3));
    const barHeight = Math.max(
        8,
        (plotHeight - gap * (bars.length - 1)) / bars.length
    );
    const maximum = Math.max(1, ...bars.map((item) => item.value));
    for (const [index, item] of bars.entries()) {
        const y = margin.top + index * (barHeight + gap);
        const width = Math.max(2, (item.value / maximum) * plotWidth);
        svg.append(
            svgElement(
                "text",
                {
                    class: "chart-axis-label chart-category-label",
                    "text-anchor": "end",
                    x: margin.left - 10,
                    y: y + barHeight / 2 + 4,
                },
                item.label
            )
        );
        const label = `${item.label}: ${formatTick(item.value, 0)} ${unit}`;
        const bar = svgElement("rect", {
            class: `chart-category-bar ${item.className ?? "activity-other"}`,
            height: barHeight,
            rx: Math.min(5, barHeight / 2),
            tabindex: 0,
            width,
            x: margin.left,
            y,
        });
        bar.append(svgElement("title", {}, label));
        describeMark(bar, label, detail);
        svg.append(
            bar,
            svgElement(
                "text",
                {
                    class: "chart-axis-label chart-value-label",
                    x: Math.min(
                        WIDTH - margin.right + 8,
                        margin.left + width + 8
                    ),
                    y: y + barHeight / 2 + 4,
                },
                formatTick(item.value, 0)
            )
        );
    }
}

/**
 * @param {Element} container
 * @param {{
 *     ariaLabel: string;
 *     emptyMessage: string;
 *     intervals: WateringInterval[];
 * }} options
 */
export function renderIntervalChart(
    container,
    { ariaLabel, emptyMessage, intervals }
) {
    const points = intervals.filter(
        (entry) =>
            entry.date instanceof Date &&
            !Number.isNaN(entry.date.getTime()) &&
            Number.isFinite(entry.days)
    );
    if (points.length === 0) {
        renderEmpty(container, emptyMessage);
        return;
    }

    const svg = chartFrame(container, ariaLabel);
    const detail = chartDetail(container);
    const plotWidth = WIDTH - MARGIN.left - MARGIN.right;
    const plotHeight = HEIGHT - MARGIN.top - MARGIN.bottom;
    const maximum = Math.max(1, ...points.map((point) => point.days));
    const barGap = 10;
    const barWidth = Math.max(
        10,
        (plotWidth - barGap * (points.length + 1)) / points.length
    );

    for (let index = 0; index <= 4; index += 1) {
        const value = (maximum * index) / 4;
        const y = MARGIN.top + plotHeight - (value / maximum) * plotHeight;
        svg.append(
            svgElement("line", {
                class: "chart-grid-line",
                x1: MARGIN.left,
                x2: WIDTH - MARGIN.right,
                y1: y,
                y2: y,
            })
        );
        svg.append(
            svgElement(
                "text",
                {
                    class: AXIS_LABEL_CLASS,
                    "text-anchor": "end",
                    x: MARGIN.left - 10,
                    y: y + 4,
                },
                `${formatTick(value)} d`
            )
        );
    }

    for (const [index, point] of points.entries()) {
        const x = MARGIN.left + barGap + index * (barWidth + barGap);
        const height = (point.days / maximum) * plotHeight;
        const y = MARGIN.top + plotHeight - height;
        const bar = svgElement("rect", {
            class: "chart-interval-bar",
            height,
            rx: 5,
            tabindex: 0,
            width: barWidth,
            x,
            y,
        });
        bar.append(
            svgElement(
                "title",
                {},
                `${point.days} days · ${formatShortDate(point.from)} to ${formatShortDate(point.to)}`
            )
        );
        describeMark(
            bar,
            `${point.days} days · ${formatShortDate(point.from)} to ${formatShortDate(point.to)}`,
            detail
        );
        svg.append(bar);
        if (index === 0 || points.length <= 12 || index === points.length - 1) {
            svg.append(
                svgElement(
                    "text",
                    {
                        class: AXIS_LABEL_CLASS,
                        "text-anchor": "middle",
                        x: x + barWidth / 2,
                        y: HEIGHT - 16,
                    },
                    formatShortDate(point.date)
                )
            );
        }
    }
}

/**
 * @param {Element} container
 * @param {{
 *     ariaLabel: string;
 *     emptyMessage: string;
 *     referenceLines?: ReferenceLine[];
 *     series: ChartSeries[];
 *     unit: string;
 * }} options
 */
export function renderLineChart(
    container,
    { ariaLabel, emptyMessage, referenceLines = [], series, unit }
) {
    const cleanSeries = series
        .map((entry) => ({
            ...entry,
            points: entry.points.filter(
                (point) =>
                    point.date instanceof Date &&
                    !Number.isNaN(point.date.getTime()) &&
                    Number.isFinite(point.value)
            ),
        }))
        .filter((entry) => entry.points.length > 0);
    const points = cleanSeries.flatMap((entry) => entry.points);
    if (points.length === 0) {
        renderEmpty(container, emptyMessage);
        return;
    }

    const validReferenceLines = referenceLines.filter(
        /** @returns {line is ReferenceLine & {value: number}} */
        (line) => line.value !== null && Number.isFinite(line.value)
    );
    const domain = domains(
        points,
        validReferenceLines.map((line) => line.value)
    );
    const svg = chartFrame(container, ariaLabel);
    const scale = drawAxes(svg, domain, unit);
    const detail = chartDetail(container);

    for (const line of validReferenceLines) {
        const y = scale.y(line.value);
        svg.append(
            svgElement("line", {
                class: `chart-reference ${line.className ?? ""}`.trim(),
                x1: MARGIN.left,
                x2: WIDTH - MARGIN.right,
                y1: y,
                y2: y,
            })
        );
        svg.append(
            svgElement(
                "text",
                {
                    class: "chart-reference-label",
                    "text-anchor": "end",
                    x: WIDTH - MARGIN.right,
                    y: y - 6,
                },
                `${line.label} ${formatTick(line.value)} ${unit}`
            )
        );
    }

    for (const entry of cleanSeries) {
        const ordered = entry.points.toSorted(
            (left, right) => left.date.getTime() - right.date.getTime()
        );
        if (ordered.length > 1) {
            const path = ordered
                .map(
                    (point, index) =>
                        `${index === 0 ? "M" : "L"}${scale.x(point.date.getTime()).toFixed(2)},${scale.y(point.value).toFixed(2)}`
                )
                .join(" ");
            svg.append(
                svgElement("path", {
                    class: `chart-series-line ${entry.className ?? ""}`.trim(),
                    d: path,
                })
            );
        }
        for (const point of ordered) {
            const circle = svgElement("circle", {
                class: `chart-point ${entry.className ?? ""} state-${(point.state ?? "routine").toLowerCase()}`.trim(),
                cx: scale.x(point.date.getTime()),
                cy: scale.y(point.value),
                r: 7,
                tabindex: 0,
            });
            circle.append(
                svgElement("title", {}, pointTitle(point, entry.label, unit))
            );
            describeMark(circle, pointTitle(point, entry.label, unit), detail);
            svg.append(circle);
        }
    }

    const legend = document.createElement("div");
    legend.className = "chart-legend";
    for (const entry of cleanSeries) {
        const item = document.createElement("span");
        const swatch = document.createElement("i");
        swatch.className = entry.className ?? "";
        item.append(swatch, document.createTextNode(entry.label));
        legend.append(item);
    }
    container.append(legend);
}

/**
 * @param {Element} container
 */
function chartDetail(container) {
    const detail = document.createElement("p");
    detail.className = "chart-detail";
    detail.setAttribute("aria-live", "polite");
    detail.textContent = "Focus or point to a chart mark for its exact value.";
    container.append(detail);
    return detail;
}

/**
 * @param {Element} container
 * @param {string} label
 */
function chartFrame(container, label) {
    const svg = svgElement("svg", {
        "aria-label": label,
        class: "trend-chart-svg",
        role: "img",
        viewBox: `0 0 ${WIDTH} ${HEIGHT}`,
    });
    container.replaceChildren(svg);
    return svg;
}

/**
 * @param {SVGElement} mark
 * @param {string} label
 * @param {HTMLParagraphElement} detail
 */
function describeMark(mark, label, detail) {
    mark.setAttribute("role", "img");
    mark.setAttribute("aria-label", label);
    for (const eventName of [
        "focus",
        "mouseenter",
        "pointerdown",
    ])
        mark.addEventListener(eventName, () => {
            detail.textContent = label;
        });
}

/**
 * @param {ChartPoint[]} points
 * @param {number[]} referenceValues
 */
function domains(points, referenceValues) {
    const times = points.map((point) => point.date.getTime());
    const values = [...points.map((point) => point.value), ...referenceValues];
    let minimumTime = Math.min(...times);
    let maximumTime = Math.max(...times);
    if (minimumTime === maximumTime) {
        minimumTime -= 43_200_000;
        maximumTime += 43_200_000;
    }
    let minimumValue = Math.min(...values);
    let maximumValue = Math.max(...values);
    const valuePadding = Math.max(
        (maximumValue - minimumValue) * 0.12,
        Math.abs(maximumValue) * 0.025,
        0.5
    );
    minimumValue -= valuePadding;
    maximumValue += valuePadding;
    return { maximumTime, maximumValue, minimumTime, minimumValue };
}

/**
 * @param {SVGSVGElement} svg
 * @param {ReturnType<typeof domains>} domain
 * @param {string} unit
 */
function drawAxes(svg, domain, unit) {
    const plotWidth = WIDTH - MARGIN.left - MARGIN.right;
    const plotHeight = HEIGHT - MARGIN.top - MARGIN.bottom;
    const x = (/** @type {number} */ time) =>
        MARGIN.left +
        ((time - domain.minimumTime) /
            (domain.maximumTime - domain.minimumTime)) *
            plotWidth;
    const y = (/** @type {number} */ value) =>
        MARGIN.top +
        ((domain.maximumValue - value) /
            (domain.maximumValue - domain.minimumValue)) *
            plotHeight;

    const unitSuffix = unit ? ` ${unit}` : "";
    for (let index = 0; index <= 4; index += 1) {
        const value =
            domain.minimumValue +
            ((domain.maximumValue - domain.minimumValue) * index) / 4;
        const yPosition = y(value);
        svg.append(
            svgElement("line", {
                class: "chart-grid-line",
                x1: MARGIN.left,
                x2: WIDTH - MARGIN.right,
                y1: yPosition,
                y2: yPosition,
            })
        );
        svg.append(
            svgElement(
                "text",
                {
                    class: AXIS_LABEL_CLASS,
                    "text-anchor": "end",
                    x: MARGIN.left - 10,
                    y: yPosition + 4,
                },
                `${formatTick(value)}${unitSuffix}`
            )
        );
    }

    for (const fraction of [
        0,
        0.5,
        1,
    ]) {
        const time =
            domain.minimumTime +
            (domain.maximumTime - domain.minimumTime) * fraction;
        svg.append(
            svgElement(
                "text",
                {
                    class: AXIS_LABEL_CLASS,
                    "text-anchor":
                        fraction === 0
                            ? "start"
                            : fraction === 1
                              ? "end"
                              : "middle",
                    x: x(time),
                    y: HEIGHT - 16,
                },
                formatShortDate(time)
            )
        );
    }

    return { x, y };
}

/**
 * @param {number | Date | undefined} date
 */
function formatShortDate(date) {
    const formatter = new Intl.DateTimeFormat("en-US", {
        day: "numeric",
        month: "short",
    });
    return formatter.format(date);
}

/**
 * @param {number} value
 * @param {number} [digits]
 */
function formatTick(value, digits = 1) {
    const formatter = new Intl.NumberFormat("en-US", {
        maximumFractionDigits: digits,
    });
    return formatter.format(value);
}

/**
 * @param {ChartPoint} point
 * @param {string} seriesLabel
 * @param {string} unit
 */
function pointTitle(point, seriesLabel, unit) {
    const state =
        point.state === undefined || point.state === ""
            ? ""
            : ` · ${point.state}`;
    return `${seriesLabel}: ${formatTick(point.value, 2)} ${unit} · ${formatShortDate(point.date)}${state}`;
}

/**
 * @param {Element} container
 * @param {string | null} message
 */
function renderEmpty(container, message) {
    const empty = document.createElement("div");
    empty.className = "chart-empty";
    empty.textContent = message;
    container.replaceChildren(empty);
}

/**
 * @template {keyof SVGElementTagNameMap} T
 *
 * @param {T} name
 * @param {Record<string, string | number>} attributes
 * @param {string | number} [text]
 *
 * @returns {SVGElementTagNameMap[T]}
 */
function svgElement(name, attributes, text) {
    const node = document.createElementNS(SVG_NS, name);
    for (const [key, value] of Object.entries(attributes))
        node.setAttribute(key, String(value));
    if (text !== undefined) node.textContent = String(text);
    return node;
}
