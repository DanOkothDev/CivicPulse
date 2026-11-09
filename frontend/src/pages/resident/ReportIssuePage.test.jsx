import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { api } from "../../services/api";
import { useToast } from "../../context/ToastContext";
import ReportIssuePage from "./ReportIssuePage";

vi.mock("../../context/ToastContext", () => ({ useToast: vi.fn() }));
vi.mock("../../services/api", () => ({
  api: {
    reports: {
      classify: vi.fn(),
      create: vi.fn(),
      submitClassificationFeedback: vi.fn(),
    },
    reference: { getCategories: vi.fn() },
  },
}));
vi.mock("../../components/ui/ImageUploadComponent", () => ({
  default: ({ onImageChange }) => (
    <input
      aria-label="Upload report photo"
      type="file"
      onChange={(event) => onImageChange({ file: event.target.files[0] })}
    />
  ),
}));
vi.mock("../../components/ui/MapComponent", () => ({ default: () => <div /> }));

function renderReportForm() {
  return render(
    <MemoryRouter>
      <ReportIssuePage />
    </MemoryRouter>,
  );
}

describe("resident report classification", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useToast.mockReturnValue({
      success: vi.fn(),
      warning: vi.fn(),
      error: vi.fn(),
    });
    api.reference.getCategories.mockResolvedValue([
      { id: 1, name: "Pothole" },
      { id: 3, name: "Drainage" },
    ]);
    api.reports.create.mockResolvedValue({ id: 42 });
    api.reports.submitClassificationFeedback.mockResolvedValue({});
  });

  it("shows a named suggestion and submits the resident's category correction", async () => {
    const user = userEvent.setup();
    api.reports.classify.mockResolvedValue({
      available: true,
      supported: true,
      category: { id: 1, name: "Pothole" },
      class_name: "pothole",
      confidence: 0.78,
    });
    renderReportForm();
    await user.type(screen.getByPlaceholderText(/Deep pothole/), "Roadside damage");
    await user.type(screen.getByPlaceholderText(/Explain the problem/), "Needs repair");
    await user.upload(
      screen.getByLabelText("Upload report photo"),
      new File(["photo"], "issue.jpg", { type: "image/jpeg" }),
    );
    await screen.findByText("Pothole", { selector: "p" });
    expect(screen.getByText("Confidence: 78%")).toBeTruthy();
    expect(screen.queryByText(/category #/i)).toBeNull();
    await user.click(screen.getByRole("button", { name: "Choose another category" }));
    await user.selectOptions(screen.getByRole("combobox"), "3");
    await user.click(screen.getByRole("button", { name: "Submit report" }));

    await waitFor(() => {
      expect(api.reports.submitClassificationFeedback).toHaveBeenCalledWith(42, {
        predicted_class: "pothole",
        predicted_category_id: 1,
        confidence: 0.78,
        selected_category_id: 3,
        accepted: false,
      });
    });
  });

  it("allows manual report submission when classification fails", async () => {
    const user = userEvent.setup();
    api.reports.classify.mockRejectedValue(new Error("offline"));
    renderReportForm();
    await user.type(screen.getByPlaceholderText(/Deep pothole/), "Roadside damage");
    await user.type(screen.getByPlaceholderText(/Explain the problem/), "Needs repair");
    await user.upload(
      screen.getByLabelText("Upload report photo"),
      new File(["photo"], "issue.jpg", { type: "image/jpeg" }),
    );
    expect(await screen.findByText(/AI suggestions are unavailable/)).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "Submit report" }));
    await waitFor(() => expect(api.reports.create).toHaveBeenCalledOnce());
    const [submission] = api.reports.create.mock.calls[0];
    expect(submission.get("lat")).toBe("-1.2921");
    expect(submission.get("lon")).toBe("36.8219");
    expect(submission.has("county_id")).toBe(false);
    expect(api.reports.submitClassificationFeedback).not.toHaveBeenCalled();
  });

  it("collects a manual label for a model class unsupported by report categories", async () => {
    const user = userEvent.setup();
    api.reports.classify.mockResolvedValue({
      available: true,
      supported: false,
      category: null,
      class_name: "future_facility_type",
      confidence: 0.91,
    });
    renderReportForm();
    await user.type(screen.getByPlaceholderText(/Deep pothole/), "Broken amenity");
    await user.type(screen.getByPlaceholderText(/Explain the problem/), "Needs attention");
    await user.upload(
      screen.getByLabelText("Upload report photo"),
      new File(["photo"], "issue.jpg", { type: "image/jpeg" }),
    );
    expect(await screen.findByText(/cannot suggest a supported category/)).toBeTruthy();
    await user.selectOptions(screen.getByRole("combobox"), "3");
    await user.click(screen.getByRole("button", { name: "Submit report" }));

    await waitFor(() => {
      expect(api.reports.submitClassificationFeedback).toHaveBeenCalledWith(42, {
        predicted_class: "future_facility_type",
        predicted_category_id: null,
        confidence: 0.91,
        selected_category_id: 3,
        accepted: false,
      });
    });
  });
});
