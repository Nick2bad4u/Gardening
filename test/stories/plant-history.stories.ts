import type { Meta, StoryObj } from "@storybook/react-vite";

import { expect, waitFor } from "storybook/test";

import {
    expectNoOverflow,
    releaseWebsiteFocus,
    renderWebsiteFrame,
    websiteArgTypes,
    websiteCanvas,
} from "./website-frame.js";

const EVENT_TYPE_LABEL = "Event type";

const meta = {
    afterEach: releaseWebsiteFocus,
    args: {
        path: "pots/P01/",
        scenario: "ready",
        theme: "light",
        width: 1280,
    },
    argTypes: websiteArgTypes,
    component: renderWebsiteFrame,
    parameters: {
        docs: {
            description: {
                component:
                    "Per-plant measurements and charts with synthetic observations, including empty history, unknown plants, and unavailable data. Controls configure the preview wrapper around the maintained static page.",
            },
        },
        layout: "fullscreen",
    },
    title: "Website/Plant history",
} satisfies Meta<typeof renderWebsiteFrame>;

export default meta;
type Story = StoryObj<typeof meta>;

export const MeasurementsAndFilters: Story = {
    play: async ({ canvasElement }) => {
        const { canvas, document, userEvent } =
            await websiteCanvas(canvasElement);
        await waitFor(() =>
            expect(document.querySelector("#page-status")).toHaveTextContent(
                "Showing 4"
            )
        );
        await expect(
            document.querySelector("#latest-weight")
        ).toHaveTextContent("550 g");
        await expect(document.querySelector("#dry-average")).toHaveTextContent(
            "400.0 g"
        );
        await expect(document.querySelector("#wet-average")).toHaveTextContent(
            "600.0 g"
        );
        await expect(
            document.querySelector("#weight-chart svg")
        ).toBeInTheDocument();
        await expect(
            document.querySelector("#leaf-vpd-card")
        ).not.toBeVisible();
        await expect(
            canvas.getByText(
                "Elapsed days between recorded soak-to-runoff events."
            )
        ).toBeVisible();
        await expect(
            document.querySelector("#watering-chart-summary")
        ).toHaveTextContent(
            "Log Water only when the container is actually soaked to runoff."
        );
        await userEvent.selectOptions(
            canvas.getByRole("combobox", { name: EVENT_TYPE_LABEL }),
            "Water"
        );
        await expect(document.querySelectorAll("tbody tr")).toHaveLength(1);
        await expect(document.querySelector("tbody")).toHaveTextContent(
            "Plain water"
        );
        await userEvent.type(
            canvas.getByRole("searchbox", { name: "Search this history" }),
            "no such note"
        );
        await expect(
            canvas.getByText("No observations match the current filters.")
        ).toBeVisible();
        await userEvent.clear(
            canvas.getByRole("searchbox", { name: "Search this history" })
        );
        await userEvent.selectOptions(
            canvas.getByRole("combobox", { name: EVENT_TYPE_LABEL }),
            "all"
        );
        await expect(document.querySelectorAll("tbody tr")).toHaveLength(4);
    },
};

export const MobileDark: Story = {
    args: { theme: "dark", width: 390 },
    play: async ({ canvasElement }) => {
        const { document } = await websiteCanvas(canvasElement);
        await waitFor(() =>
            expect(document.querySelector("#page-status")).toHaveTextContent(
                "Showing 4"
            )
        );
        await expect(document.documentElement).toHaveAttribute(
            "data-theme",
            "dark"
        );
        await expectNoOverflow(document);
    },
};

export const NoObservations: Story = {
    args: { path: "pots/P03/" },
    play: async ({ canvasElement }) => {
        const { canvas, document } = await websiteCanvas(canvasElement);
        await expect(
            await canvas.findByText(
                "No observations have been logged for this plant yet."
            )
        ).toBeVisible();
        await expect(
            document.querySelector("#latest-weight")
        ).toHaveTextContent("Not logged");
        await expect(document.querySelector("#weight-chart")).toHaveTextContent(
            "No weights in this chart range yet."
        );
    },
};

export const UnknownPlant: Story = {
    args: { path: "pots/?id=unknown" },
    play: async ({ canvasElement }) => {
        const { document } = await websiteCanvas(canvasElement);
        await waitFor(() =>
            expect(document.querySelector("#page-status")).toHaveTextContent(
                "No collection label matches"
            )
        );
        await expect(document.querySelector("#plant-label")).toHaveTextContent(
            "Plant not found"
        );
    },
};

export const Unavailable: Story = {
    args: { scenario: "error" },
    play: async ({ canvasElement }) => {
        const { document } = await websiteCanvas(canvasElement);
        await waitFor(
            () =>
                expect(
                    document.querySelector("#page-status")
                ).toHaveTextContent("503"),
            { timeout: 5000 }
        );
    },
};

export const TerrariumHumidity: Story = {
    args: {
        path: "pots/P38/",
        scenario: "humidity",
        theme: "dark",
        width: 390,
    },
    play: async ({ canvasElement }) => {
        const { canvas, document, userEvent } =
            await websiteCanvas(canvasElement);
        await waitFor(() =>
            expect(
                document.querySelector("#latest-humidity")
            ).toHaveTextContent("65.5 % RH")
        );
        await expect(document.querySelector("#plant-name")).toHaveTextContent(
            "Terrarium"
        );
        await expect(
            document.querySelector("#plant-scientific")
        ).toHaveTextContent("Plant identities pending");
        await expect(
            document.querySelector("#humidity-chart svg")
        ).toBeInTheDocument();
        await expect(document.querySelector("#last-watered")).toHaveTextContent(
            "Not logged"
        );
        await userEvent.selectOptions(
            canvas.getByRole("combobox", { name: EVENT_TYPE_LABEL }),
            "humidity"
        );
        await expect(document.querySelector("tbody")).toHaveTextContent(
            "0% RH"
        );
        await expect(document.querySelector("tbody")).toHaveTextContent(
            "100% RH"
        );
        await expect(
            document.querySelector(".baseline-panel")
        ).not.toBeVisible();
        await expect(
            document.querySelector("#baseline-status")
        ).toHaveTextContent("Manual care review");
        await expect(
            canvas.getByText(
                "Recorded weights only; no dry or wet care targets are assigned."
            )
        ).toBeVisible();
        await expect(
            canvas.getByText(
                "Past intervals are descriptive history, not a watering schedule."
            )
        ).toBeVisible();
        await expect(
            document.querySelector("#watering-chart")
        ).toHaveTextContent(
            "No recorded watering intervals in this chart range."
        );
        await expect(
            document.querySelector("#watering-chart-summary")
        ).toHaveTextContent(
            "Review the plants and enclosure before choosing a watering method. Recorded intervals do not set a care schedule."
        );
        await expect(
            document.querySelector(".charts-panel")
        ).not.toHaveTextContent(
            /dry and wet means|soak(?:ed)? to runoff|soak-to-runoff/v
        );
        await expectNoOverflow(document);
    },
};

export const TerrariumDesktopLight: Story = {
    ...TerrariumHumidity,
    args: { ...TerrariumHumidity.args, theme: "light", width: 1280 },
};

export const TerrariumDesktopDark: Story = {
    ...TerrariumHumidity,
    args: { ...TerrariumHumidity.args, theme: "dark", width: 1280 },
};

export const TerrariumMobileLight: Story = {
    ...TerrariumHumidity,
    args: { ...TerrariumHumidity.args, theme: "light", width: 390 },
};

export const InspectionAndLightReadings: Story = {
    args: { path: "pots/P02/", scenario: "light" },
    play: async ({ canvasElement }) => {
        const { canvas, document, userEvent } =
            await websiteCanvas(canvasElement);
        await waitFor(() =>
            expect(document.querySelector("#inspect-count")).toHaveTextContent(
                "1"
            )
        );
        await expect(document.querySelector("#check-count")).toHaveTextContent(
            "1"
        );
        await expect(
            document.querySelector("#latest-inspect-detail")
        ).toHaveTextContent("Healthy leaves");
        await expect(
            document.querySelector("#latest-inspect-detail")
        ).not.toHaveTextContent("Superseded");
        await expect(
            document.querySelector("#latest-activity")
        ).toHaveTextContent("Light reading");
        const eventFilter = canvas.getByRole("combobox", {
            name: EVENT_TYPE_LABEL,
        });
        await userEvent.selectOptions(eventFilter, "light");
        await expect(document.querySelectorAll("tbody tr")).toHaveLength(6);
        const historyBody = document.querySelector("tbody");
        await expect(historyBody).toHaveTextContent(
            "PPFD 0 µmol/m²/s · light app estimate"
        );
        await expect(historyBody).toHaveTextContent(
            "Illuminance 0 lux · lux meter reading"
        );
        const bothRow = canvas.getByRole("row", { name: /Both readings/v });
        await expect(bothRow).toHaveTextContent(
            "PPFD 200 µmol/m²/s · light app estimate"
        );
        await expect(bothRow).toHaveTextContent(
            "Illuminance 10000 lux · lux meter reading"
        );
        await expect(bothRow).toHaveTextContent("Quality: Estimated");
        await expect(
            canvas.getByRole("row", { name: /Missing reading/v })
        ).toHaveTextContent("Light reading not recorded");
        await expect(
            canvas.getByRole("row", { name: /Original reading/v })
        ).toHaveTextContent("Record status: Removed");
        await expect(
            canvas.getByRole("row", { name: /Corrected reading/v })
        ).toHaveTextContent("PPFD 350");
        await userEvent.click(
            canvas.getByRole("button", { name: "Export this plant CSV" })
        );
        await waitFor(() =>
            expect(document.documentElement.dataset["exportedCsv"]).toContain(
                "PPFD (µmol/m²/s),Illuminance (lux)"
            )
        );
        const [headerLine, ...lines] = (
            document.documentElement.dataset["exportedCsv"] ?? ""
        )
            .trim()
            .split("\r\n");
        const headers = (headerLine ?? "").trim().split(",");
        const records = lines.map((line) =>
            Object.fromEntries(
                line
                    .split(",")
                    .map((value, index) => [headers[index] ?? "", value])
            )
        );
        const ppfdZero = records.find(
            (record) => record["Notes"] === "Zero PPFD"
        );
        await expect(ppfdZero).toMatchObject({
            Event: "Light",
            "Illuminance (lux)": "",
            "Measurement method": "Light app",
            "Observation quality": "Estimated",
            "PPFD (µmol/m²/s)": "0",
        });
        await expect(
            records.find((record) => record["Notes"] === "Zero lux")
        ).toMatchObject({
            "Illuminance (lux)": "0",
            "Measurement method": "Lux meter",
            "Observation quality": "Measured",
            "PPFD (µmol/m²/s)": "",
        });
        await expect(
            records.find(
                (record) => record["Observation ID"] === "light-original"
            )
        ).toMatchObject({
            "PPFD (µmol/m²/s)": "999",
            "Record status": "Removed",
        });
        await expect(
            records.find(
                (record) => record["Observation ID"] === "light-corrected"
            )
        ).toMatchObject({
            "Corrects observation ID": "light-original",
            "PPFD (µmol/m²/s)": "350",
        });
        await expect(records).toHaveLength(9);
        await userEvent.selectOptions(eventFilter, "inspect");
        await expect(document.querySelectorAll("tbody tr")).toHaveLength(2);
        await expectNoOverflow(document);
    },
};

export const InspectionAndLightMobileDark: Story = {
    ...InspectionAndLightReadings,
    args: { ...InspectionAndLightReadings.args, theme: "dark", width: 390 },
};

export const InspectionAndLightDesktopDark: Story = {
    ...InspectionAndLightReadings,
    args: { ...InspectionAndLightReadings.args, theme: "dark", width: 1280 },
};

export const InspectionAndLightMobileLight: Story = {
    ...InspectionAndLightReadings,
    args: { ...InspectionAndLightReadings.args, theme: "light", width: 390 },
};
export const ExtendedCareEvents: Story = {
    args: {
        path: "pots/P02/",
        scenario: "care-events",
        theme: "dark",
        width: 390,
    },
    play: async ({ canvasElement }) => {
        const { canvas, document, userEvent } =
            await websiteCanvas(canvasElement);
        await waitFor(() =>
            expect(
                document.querySelector("#current-location")
            ).toHaveTextContent("Window")
        );
        await expect(
            document.querySelector("#latest-temperature")
        ).toHaveTextContent("-2.5 °C");
        await expect(document.querySelector("#last-watered")).toHaveTextContent(
            "Not logged"
        );
        await expect(
            document.querySelector("#temperature-chart-summary")
        ).toHaveTextContent("1 air readings and 1 soil readings");
        await expect(
            document.querySelectorAll("#temperature-chart .chart-point")
        ).toHaveLength(5);
        await expect(document.querySelector("tbody")).toHaveTextContent(
            "Fine spray"
        );
        await expect(document.querySelector("tbody")).toHaveTextContent(
            "Lower shelf → Window"
        );
        await expect(document.querySelector("tbody")).toHaveTextContent(
            "8 hours → 10 hours"
        );
        await expect(document.querySelector("tbody")).toHaveTextContent(
            "Two cuttings"
        );
        await expect(document.querySelector("tbody")).toHaveTextContent(
            "Loose tie"
        );
        const eventFilter = canvas.getByRole("combobox", {
            name: EVENT_TYPE_LABEL,
        });
        await Promise.all(
            [
                "Mist",
                "Move",
                "Temperature",
                "Environment",
                "Propagate",
                "Support",
                "Leaf VPD",
            ].map(async (name) =>
                expect(canvas.getByRole("option", { name })).toBeInTheDocument()
            )
        );
        await userEvent.selectOptions(eventFilter, "temperature");
        await expect(document.querySelector("tbody")).toHaveTextContent(
            "Air: 0 °C"
        );
        await expect(document.querySelector("tbody")).toHaveTextContent(
            "Entered in °F (32 °F)"
        );
        await expect(document.querySelector("tbody")).toHaveTextContent(
            "Soil: -2.5 °C"
        );
        await userEvent.selectOptions(eventFilter, "leaf vpd");
        await expect(document.querySelectorAll("tbody tr")).toHaveLength(3);
        await expect(document.querySelector("tbody")).toHaveTextContent(
            "Leaf VPD: 0 kPa"
        );
        await expect(document.querySelector("tbody")).toHaveTextContent(
            "Leaf VPD: -0.3155 kPa"
        );
        await expect(document.querySelector("tbody")).toHaveTextContent(
            "Paired humidity: 100% RH"
        );
        await expect(document.querySelector("tbody")).toHaveTextContent(
            "Source: Not calculated"
        );
        await expect(document.querySelector("tbody")).toHaveTextContent(
            "Leaf VPD not recorded"
        );
        await expect(document.querySelector("tbody")).toHaveTextContent(
            "Leaf: 0 °C · entered in °F (32 °F)"
        );
        await expect(
            document.querySelectorAll("#leaf-vpd-chart .chart-point")
        ).toHaveLength(2);
        await expect(document.querySelector("#leaf-vpd-card")).toBeVisible();
        await expect(
            document.querySelectorAll(
                "#leaf-vpd-chart .chart-point.series-leaf-vpd-device"
            )
        ).toHaveLength(1);
        await expect(
            document.querySelectorAll(
                "#leaf-vpd-chart .chart-point.series-leaf-vpd-calculated"
            )
        ).toHaveLength(1);
        await userEvent.click(
            canvas.getByRole("button", { name: "Export this plant CSV" })
        );
        await waitFor(() =>
            expect(document.documentElement.dataset["exportedCsv"]).toContain(
                "Temperature (°C),Temperature target,Temperature entry unit"
            )
        );
        await expect(document.documentElement.dataset["exportedCsv"]).toContain(
            "Fine spray"
        );
        await expect(document.documentElement.dataset["exportedCsv"]).toContain(
            "Two cuttings"
        );
        await expect(document.documentElement.dataset["exportedCsv"]).toContain(
            "move-original"
        );
        await expect(document.documentElement.dataset["exportedCsv"]).toContain(
            "Leaf VPD (kPa),Leaf VPD source"
        );
        await expect(document.documentElement.dataset["exportedCsv"]).toContain(
            "Negative calculated VPD"
        );
        const [header, ...records] = (
            document.documentElement.dataset["exportedCsv"] ?? ""
        )
            .trim()
            .split("\r\n");
        const exportedHeaders = (header ?? "").trim().split(",");
        const leafRecords = records.map((line) =>
            Object.fromEntries(
                line.split(",").map((value, index) => [
                    exportedHeaders[index] ?? "",
                    value,
                ])
            )
        );
        await expect(
            leafRecords.find((row) => row["Notes"] === "Zero device VPD")
        ).toMatchObject({
            "Leaf temperature (°C)": "0",
            "Leaf VPD (kPa)": "0",
            "Leaf VPD source": "Device",
            "Paired air temperature (°C)": "0",
            "Paired relative humidity (%)": "100",
        });
        await expect(
            leafRecords.find(
                (row) => row["Notes"] === "Leaf only without pairing"
            )
        ).toMatchObject({
            "Leaf temperature (°C)": "20",
            "Leaf VPD (kPa)": "",
            "Leaf VPD source": "Not calculated",
            "Paired air temperature (°C)": "",
            "Paired relative humidity (%)": "",
        });
        await expectNoOverflow(document);
    },
};

export const ExtendedCareEventsMobileLight: Story = {
    ...ExtendedCareEvents,
    args: { ...ExtendedCareEvents.args, theme: "light" },
};

export const ExtendedCareEventsDesktop: Story = {
    ...ExtendedCareEvents,
    args: { ...ExtendedCareEvents.args, width: 1280 },
};

export const ExtendedCareEventsDesktopLight: Story = {
    ...ExtendedCareEvents,
    args: { ...ExtendedCareEvents.args, theme: "light", width: 1280 },
};

export const FittoniaManualCare: Story = {
    args: {
        path: "pots/P39/",
        scenario: "houseplants",
        theme: "light",
        width: 1280,
    },
    play: async ({ canvasElement }) => {
        const { document } = await websiteCanvas(canvasElement);
        await waitFor(() =>
            expect(document.querySelector("#latest-weight")).toHaveTextContent(
                "550 g"
            )
        );
        await expect(
            document.querySelector(".baseline-panel")
        ).not.toBeVisible();
        await expect(document.querySelector("#dry-average")).toHaveTextContent(
            "—"
        );
        await expect(
            document.querySelector("#manual-care-guidance")
        ).toHaveTextContent("Keep lightly moist");
        await expect(
            document.querySelector("#watering-chart-summary")
        ).toHaveTextContent("do not use a cactus dry-weight plateau");
        await expect(
            document.querySelector("#weight-chart svg")
        ).toBeInTheDocument();
        await expectNoOverflow(document);
    },
};

export const PeperomiaManualCare: Story = {
    args: {
        path: "pots/P40/",
        scenario: "houseplants",
        theme: "dark",
        width: 390,
    },
    play: async ({ canvasElement }) => {
        const { document } = await websiteCanvas(canvasElement);
        await waitFor(() =>
            expect(document.querySelector("#latest-weight")).toHaveTextContent(
                "550 g"
            )
        );
        await expect(
            document.querySelector(".baseline-panel")
        ).not.toBeVisible();
        await expect(document.querySelector("#wet-average")).toHaveTextContent(
            "—"
        );
        await expect(
            document.querySelector("#manual-care-guidance")
        ).toHaveTextContent("Allow partial drying");
        await expect(
            document.querySelector("#watering-chart-summary")
        ).toHaveTextContent("do not use a cactus dry-weight plateau");
        await expect(
            document.querySelector("#weight-chart svg")
        ).toBeInTheDocument();
        await expectNoOverflow(document);
    },
};
