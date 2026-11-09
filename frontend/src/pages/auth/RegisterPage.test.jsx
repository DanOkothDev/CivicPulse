import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import { api } from "../../services/api";
import RegisterPage from "./RegisterPage";

vi.mock("../../context/AuthContext", () => ({ useAuth: vi.fn() }));
vi.mock("../../context/ToastContext", () => ({ useToast: vi.fn() }));
vi.mock("../../services/api", () => ({
  api: {
    auth: {},
    reference: {
      getAreas: vi.fn(),
      getCounties: vi.fn(),
    },
  },
}));

describe("resident registration county selection", () => {
  const register = vi.fn();
  const counties = Array.from({ length: 47 }, (_, index) => ({
    id: index + 100,
    name: `County ${index + 1}`,
    code: `county-${index + 1}`,
  }));

  beforeEach(() => {
    vi.clearAllMocks();
    useAuth.mockReturnValue({ register });
    useToast.mockReturnValue({ success: vi.fn(), error: vi.fn() });
    api.reference.getAreas.mockResolvedValue([]);
    api.reference.getCounties.mockResolvedValue(counties);
    register.mockResolvedValue({});
  });

  it("loads every county from the API and submits the selected record ID", async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <RegisterPage />
      </MemoryRouter>,
    );

    const countySelect = await screen.findByLabelText(/Your county/i);
    await waitFor(() => expect(countySelect.options).toHaveLength(48));
    await user.type(screen.getByLabelText(/Full name/i), "Ada Otieno");
    await user.type(screen.getByLabelText(/Email/i), "ada@example.test");
    await user.selectOptions(countySelect, "146");
    await user.type(screen.getByLabelText(/^Password/i), "password123");
    await user.type(screen.getByLabelText(/Confirm password/i), "password123");
    await user.click(screen.getByRole("button", { name: /Create account/i }));

    await waitFor(() => {
      expect(register).toHaveBeenCalledWith({
        name: "Ada Otieno",
        email: "ada@example.test",
        password: "password123",
        area_id: undefined,
        county_id: 146,
      });
    });
  });

  it("explains county loading errors and allows retry", async () => {
    const user = userEvent.setup();
    api.reference.getCounties
      .mockRejectedValueOnce(new Error("network unavailable"))
      .mockResolvedValueOnce(counties);
    render(
      <MemoryRouter>
        <RegisterPage />
      </MemoryRouter>,
    );

    expect((await screen.findByRole("alert")).textContent).toContain("network unavailable");
    await user.click(screen.getByRole("button", { name: /Try loading counties again/i }));
    await screen.findByRole("option", { name: "County 47" });
    expect(api.reference.getCounties).toHaveBeenCalledTimes(2);
  });
});
