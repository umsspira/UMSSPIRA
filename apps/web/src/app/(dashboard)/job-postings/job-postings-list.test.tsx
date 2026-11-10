import { render, screen } from "@testing-library/react";
import { listJobPostings } from "@/shared/services/job-postings";
import { JobPostingsList } from "./job-postings-list";

jest.mock("@/shared/services/job-postings", () => ({
  listJobPostings: jest.fn(),
}));

const listJobPostingsMock = jest.mocked(listJobPostings);

beforeEach(() => {
  listJobPostingsMock.mockReset();
});

it("navega al detalle usando el identificador real de la vacante del API", async () => {
  listJobPostingsMock.mockResolvedValue([
    {
      id: "10000000-0000-4000-8000-000000000001",
      title: "Desarrolladora frontend",
      modality: "REMOTO",
      experienceLevel: "Junior",
      technicalDescription: "Descripción real de la oferta.",
      publishedAt: null,
      company: { name: "Empresa real", description: null, logoUrl: null, bannerUrl: null },
      technicalRequirements: [],
    },
  ]);

  render(<JobPostingsList />);

  const detailLink = await screen.findByRole("link", { name: "Ver detalle" });
  expect(detailLink).toHaveAttribute(
    "href",
    "/job-postings/10000000-0000-4000-8000-000000000001",
  );
});
