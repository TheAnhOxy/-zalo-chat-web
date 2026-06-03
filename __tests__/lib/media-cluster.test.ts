import { shouldSendAsMediaCluster } from "@/src/lib/media-cluster";

function file(type: string, name: string): File {
  return new File(["x"], name, { type });
}

describe("media-cluster", () => {
  it("clusters when selection has both image and video", () => {
    expect(
      shouldSendAsMediaCluster([file("image/jpeg", "a.jpg"), file("video/mp4", "b.mp4")])
    ).toBe(true);
  });

  it("does not cluster for images only", () => {
    expect(
      shouldSendAsMediaCluster([file("image/jpeg", "a.jpg"), file("image/png", "b.png")])
    ).toBe(false);
  });

  it("does not cluster for single file", () => {
    expect(shouldSendAsMediaCluster([file("image/jpeg", "a.jpg")])).toBe(false);
  });
});
