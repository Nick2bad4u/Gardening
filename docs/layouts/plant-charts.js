const SVG_NS = "http://www.w3.org/2000/svg";
const WIDTH = 760;
const HEIGHT = 300;
const MARGIN = { top: 24, right: 24, bottom: 48, left: 62 };

function svgElement(name, attributes = {}, text) {
    const node = document.createElementNS(SVG_NS, name);
    Object.entries(attributes).forEach(([key, value]) =>
        node.setAttribute(key, String(value))
    );
    if (text !== undefined) node.textContent = text;
    return node;
}

function formatTick(value, digits = 1) {
    return new Intl.NumberFormat("en-US", {
        maximumFractionDigits: digits,
    }).format(value);
}

function formatShortDate(date) {
    return new Intl.DateTimeFormat("en-US", {
        month: "short",
        day: "numeric",
    }).format(date);
}

function chartFrame(container, label) {
    const svg = svgElement("svg", {
        viewBox: `0 0 ${WIDTH} ${HEIGHT}`,
        role: "img",
        "aria-label": label,
        class: "trend-chart-svg",
    });
    container.replaceChildren(svg);
    return svg;
}

function renderEmpty(container, message) {
    const empty = document.createElement("div");
    empty.className = "chart-empty";
    empty.textContent = message;
    container.replaceChildren(empty);
}

function domains(points) {
    const times = points.map((point) => point.date.getTime());
    const values = points.map((point) => point.value);
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

function drawAxes(svg, domain, unit) {
    const plotWidth = WIDTH - MARGIN.left - MARGIN.right;
    const plotHeight = HEIGHT - MARGIN.top - MARGIN.bottom;
    const x = (time) =>
        MARGIN.left +
        ((time - domain.minimumTime) /
            (domain.maximumTime - domain.minimumTime)) *
            plotWidth;
    const y = (value) =>
        MARGIN.top +
        ((domain.maximumValue - value) /
            (domain.maximumValue - domain.minimumValue)) *
            plotHeight;

    for (let index = 0; index <= 4; index += 1) {
        const value =
            domain.minimumValue +
            ((domain.maximumValue - domain.minimumValue) * index) / 4;
        const yPosition = y(value);
        svg.append(
            svgElement("line", {
                x1: MARGIN.left,
                x2: WIDTH - MARGIN.right,
                y1: yPosition,
                y2: yPosition,
                class: "chart-grid-line",
            })
        );
        svg.append(
            svgElement(
                "text",
                {
                    x: MARGIN.left - 10,
                    y: yPosition + 4,
                    "text-anchor": "end",
                    class: "chart-axis-label",
                },
                `${formatTick(value)}${unit ? ` ${unit}` : ""}`
            )
        );
    }

    [
        0,
        0.5,
        1,
    ].forEach((fraction) => {
        const time =
            domain.minimumTime +
            (domain.maximumTime - domain.minimumTime) * fraction;
        svg.append(
            svgElement(
                "text",
                {
                    x: x(time),
                    y: HEIGHT - 16,
                    "text-anchor":
                        fraction === 0
                            ? "start"
                            : fraction === 1
                              ? "end"
                              : "middle",
                    class: "chart-axis-label",
                },
                formatShortDate(new Date(time))
            )
        );
    });

    return { x, y };
}

function pointTitle(point, seriesLabel, unit) {
    const state = point.state ? ` · ${point.state}` : "";
    return `${seriesLabel}: ${formatTick(point.value, 2)} ${unit} · ${formatShortDate(point.date)}${state}`;
}

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

    const domain = domains([
        ...points,
        ...referenceLines
            .filter((line) => Number.isFinite(line.value))
            .flatMap((line) => [
                {
                    date: new Date(Math.min(...points.map((p) => p.date))),
                    value: line.value,
                },
                {
                    date: new Date(Math.max(...points.map((p) => p.date))),
                    value: line.value,
                },
            ]),
    ]);
    const svg = chartFrame(container, ariaLabel);
    const scale = drawAxes(svg, domain, unit);

    referenceLines
        .filter((line) => Number.isFinite(line.value))
        .forEach((line) => {
            const y = scale.y(line.value);
            svg.append(
                svgElement("line", {
                    x1: MARGIN.left,
                    x2: WIDTH - MARGIN.right,
                    y1: y,
                    y2: y,
                    class: `chart-reference ${line.className ?? ""}`.trim(),
                })
            );
            svg.append(
                svgElement(
                    "text",
                    {
                        x: WIDTH - MARGIN.right,
                        y: y - 6,
                        "text-anchor": "end",
                        class: "chart-reference-label",
                    },
                    `${line.label} ${formatTick(line.value)} ${unit}`
                )
            );
        });

    cleanSeries.forEach((entry) => {
        const ordered = [...entry.points].sort(
            (left, right) => left.date - right.date
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
                    d: path,
                    class: `chart-series-line ${entry.className ?? ""}`.trim(),
                })
            );
        }
        ordered.forEach((point) => {
            const circle = svgElement("circle", {
                cx: scale.x(point.date.getTime()),
                cy: scale.y(point.value),
                r: 5,
                tabindex: 0,
                class: `chart-point ${entry.className ?? ""} state-${String(point.state ?? "routine").toLowerCase()}`.trim(),
            });
            circle.append(
                svgElement("title", {}, pointTitle(point, entry.label, unit))
            );
            svg.append(circle);
        });
    });

    const legend = document.createElement("div");
    legend.className = "chart-legend";
    cleanSeries.forEach((entry) => {
        const item = document.createElement("span");
        const swatch = document.createElement("i");
        swatch.className = entry.className ?? "";
        item.append(swatch, document.createTextNode(entry.label));
        legend.append(item);
    });
    container.append(legend);
}

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
                x1: MARGIN.left,
                x2: WIDTH - MARGIN.right,
                y1: y,
                y2: y,
                class: "chart-grid-line",
            })
        );
        svg.append(
            svgElement(
                "text",
                {
                    x: MARGIN.left - 10,
                    y: y + 4,
                    "text-anchor": "end",
                    class: "chart-axis-label",
                },
                `${formatTick(value)} d`
            )
        );
    }

    points.forEach((point, index) => {
        const x = MARGIN.left + barGap + index * (barWidth + barGap);
        const height = (point.days / maximum) * plotHeight;
        const y = MARGIN.top + plotHeight - height;
        const bar = svgElement("rect", {
            x,
            y,
            width: barWidth,
            height,
            rx: 5,
            tabindex: 0,
            class: "chart-interval-bar",
        });
        bar.append(
            svgElement(
                "title",
                {},
                `${point.days} days · ${formatShortDate(point.from)} to ${formatShortDate(point.to)}`
            )
        );
        svg.append(bar);
        if (points.length <= 12 || index === 0 || index === points.length - 1) {
            svg.append(
                svgElement(
                    "text",
                    {
                        x: x + barWidth / 2,
                        y: HEIGHT - 16,
                        "text-anchor": "middle",
                        class: "chart-axis-label",
                    },
                    formatShortDate(point.date)
                )
            );
        }
    });
}
