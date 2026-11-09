import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { api } from "../../services/api";
import DepartmentManagementPanel from "./DepartmentManagementPanel";

vi.mock("../../services/api", () => ({
  api: {
    reference: {
      getCounties: vi.fn(),
      getDepartments: vi.fn(),
      createDepartment: vi.fn(),
      updateDepartment: vi.fn(),
      deleteDepartment: vi.fn(),
    },
  },
}));

describe("department management", () => {
  const toast = { success: vi.fn(), error: vi.fn() };
  let departments;

  beforeEach(() => {
    vi.clearAllMocks();
    departments = [];
    api.reference.getCounties.mockResolvedValue([
      { id: 1, name: "Nairobi" },
      { id: 2, name: "Kisumu" },
    ]);
    api.reference.getDepartments.mockImplementation(async () => departments);
    api.reference.createDepartment.mockImplementation(async (countyId, payload) => {
      departments = [...departments, { id: 8, county_id: Number(countyId), ...payload }];
      return departments[0];
    });
    api.reference.updateDepartment.mockImplementation(async (id, payload) => {
      departments = departments.map((department) =>
        department.id === id ? { ...department, ...payload } : department,
      );
      return departments[0];
    });
    api.reference.deleteDepartment.mockImplementation(async (id) => {
      departments = departments.filter((department) => department.id !== id);
    });
    vi.stubGlobal("confirm", vi.fn(() => true));
  });

  it("loads county departments and supports create, edit, and confirmed delete", async () => {
    const user = userEvent.setup();
    render(
      <DepartmentManagementPanel
        user={{ county_id: null }}
        toast={toast}
      />,
    );

    await user.selectOptions(await screen.findByLabelText("County"), "2");
    await screen.findByText("No departments are configured for this county yet.");
    await user.type(screen.getByLabelText("Name"), "Public Works");
    await user.type(screen.getByLabelText(/Code/), "public-works");
    await user.click(screen.getByRole("button", { name: "Create department" }));
    expect(await screen.findByText("Public Works")).toBeTruthy();
    expect(api.reference.createDepartment).toHaveBeenCalledWith("2", {
      name: "Public Works",
      code: "public-works",
    });

    await user.click(screen.getByRole("button", { name: /Edit/ }));
    const name = screen.getByLabelText("Name");
    await user.clear(name);
    await user.type(name, "Roads");
    await user.click(screen.getByRole("button", { name: "Save changes" }));
    await waitFor(() => expect(api.reference.updateDepartment).toHaveBeenCalledWith(8, {
      name: "Roads",
      code: "public-works",
    }));

    await user.click(screen.getByRole("button", { name: /Delete/ }));
    expect(window.confirm).toHaveBeenCalledOnce();
    await waitFor(() => expect(api.reference.deleteDepartment).toHaveBeenCalledWith(8));
    expect(await screen.findByText("No departments are configured for this county yet.")).toBeTruthy();
  });

  it("shows county loading errors instead of failing silently", async () => {
    api.reference.getCounties.mockRejectedValueOnce(new Error("offline"));
    const view = render(
      <DepartmentManagementPanel
        user={{ county_id: 1, county: { name: "Nairobi" } }}
        toast={toast}
      />,
    );
    expect((await screen.findByRole("alert")).textContent).toContain("Could not load counties: offline");
    view.unmount();
  });

  it("shows department loading errors instead of failing silently", async () => {
    api.reference.getDepartments.mockRejectedValueOnce(new Error("unavailable"));
    render(
      <DepartmentManagementPanel
        user={{ county_id: 1, county: { name: "Nairobi" } }}
        toast={toast}
      />,
    );
    expect((await screen.findByRole("alert")).textContent).toContain("Could not load departments: unavailable");
  });
});
