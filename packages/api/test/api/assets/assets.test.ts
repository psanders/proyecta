/**
 * Copyright (C) 2026 by Proyecta. All rights reserved.
 */
import { expect } from "chai";
import sinon from "sinon";
import { ValidationError } from "@proyecta/common";
import {
  createDeleteAsset,
  createListAssets,
  createUploadAsset
} from "../../../src/api/assets/createAssetFunctions.js";
import { DomainError } from "../../../src/identity/errors.js";
import type { ProbedMedia } from "../../../src/media/ffmpeg.js";

const ASSET_ID = "7f3c2a8e-1b2d-4c5e-9f00-112233445566";
const SHA = "a".repeat(64);
const CREATED = new Date("2026-09-14T12:00:00Z");

function row(overrides: Record<string, unknown> = {}) {
  return {
    id: ASSET_ID,
    workspaceAccessKeyId: "WO1",
    name: "Promo Verano",
    kind: "VIDEO",
    status: "PROCESSING",
    durationMs: 15000,
    width: 1920,
    height: 1080,
    orientation: "LANDSCAPE",
    sourceFile: "source.mp4",
    sizeBytes: 1000,
    sha256: SHA,
    renditions: {},
    failureReason: null,
    createdAt: CREATED,
    updatedAt: CREATED,
    _count: { placements: 0 },
    ...overrides
  };
}

function stubs(media: ProbedMedia | null) {
  return {
    db: {
      asset: {
        create: sinon.stub().callsFake(({ data }) => Promise.resolve(row({ ...data }))),
        findMany: sinon.stub().resolves([row()]),
        findFirst: sinon.stub().resolves(row()),
        delete: sinon.stub().resolves({})
      },
      adPlacement: {}
    },
    store: {
      dirFor: (id: string) => `/content/${id}`,
      urlFor: (id: string, file: string) => `/content/${id}/${file}`,
      importSource: sinon.stub().resolves("source.mp4"),
      remove: sinon.stub().resolves()
    },
    probe: sinon.stub().resolves(media),
    enqueue: sinon.stub()
  };
}

const upload = (overrides: Record<string, unknown> = {}) => ({
  workspaceAccessKeyId: "WO1",
  name: "Promo Verano",
  contentType: "video/mp4",
  sizeBytes: 1000,
  tempPath: "/tmp/upload-1",
  sha256: SHA,
  ...overrides
});

const video = (durationSec: number, width = 1920, height = 1080): ProbedMedia => ({
  kind: "VIDEO",
  width,
  height,
  durationSec
});

async function expectDomain(promise: Promise<unknown>, messageId: string) {
  try {
    await promise;
    expect.fail(`expected ${messageId}`);
  } catch (err) {
    expect(err).to.be.instanceOf(DomainError);
    expect((err as DomainError).messageId).to.equal(messageId);
  }
}

describe("asset functions", () => {
  afterEach(() => sinon.restore());

  it("should accept a video, round its duration to 5 s, store it and prepare renditions", async () => {
    // Arrange
    const deps = stubs(video(15.03));

    // Act
    const view = await createUploadAsset(deps as never)(upload());

    // Assert
    const data = deps.db.asset.create.firstCall.args[0].data;
    expect(data).to.include({ durationMs: 15000, orientation: "LANDSCAPE", kind: "VIDEO" });
    expect(deps.store.importSource.firstCall.args.slice(1)).to.deep.equal([data.id, "mp4"]);
    expect(deps.enqueue.calledOnceWith(data.id)).to.equal(true);
    expect(view).to.include({ status: "PROCESSING", inUse: false, durationMs: 15000 });
  });

  it("should use the chosen duration for an image and record portrait orientation", async () => {
    // Arrange
    const deps = stubs({ kind: "IMAGE", width: 1080, height: 1920, durationSec: null });

    // Act
    await createUploadAsset(deps as never)(
      upload({ contentType: "image/png", durationMs: "10000" })
    );

    // Assert
    expect(deps.db.asset.create.firstCall.args[0].data).to.include({
      durationMs: 10000,
      orientation: "PORTRAIT",
      kind: "IMAGE"
    });
  });

  it("should reject a video that isn't a 5-second multiple", async () => {
    // Arrange
    const deps = stubs(video(17));

    // Act + Assert
    await expectDomain(createUploadAsset(deps as never)(upload()), "errors.asset.videoDuration");
    expect(deps.db.asset.create.called).to.equal(false);
  });

  it("should reject a file smaller than 480 px on its shorter side", async () => {
    // Arrange
    const deps = stubs({ kind: "IMAGE", width: 640, height: 360, durationSec: null });

    // Act + Assert
    await expectDomain(
      createUploadAsset(deps as never)(upload({ contentType: "image/jpeg", durationMs: 5000 })),
      "errors.asset.tooSmall"
    );
  });

  it("should reject a file that can't be read or isn't the declared kind", async () => {
    // Arrange
    const unreadable = stubs(null);
    const imageAsVideo = stubs({ kind: "IMAGE", width: 1920, height: 1080, durationSec: null });

    // Act + Assert
    await expectDomain(createUploadAsset(unreadable as never)(upload()), "errors.asset.unreadable");
    await expectDomain(
      createUploadAsset(imageAsVideo as never)(upload()),
      "errors.asset.unreadable"
    );
    expect(unreadable.store.importSource.called).to.equal(false);
  });

  it("should reject an image without a duration before inspecting it", async () => {
    // Arrange
    const deps = stubs(null);

    // Act + Assert
    try {
      await createUploadAsset(deps as never)(upload({ contentType: "image/png" }));
      expect.fail("expected ValidationError");
    } catch (err) {
      expect(err).to.be.instanceOf(ValidationError);
      expect(deps.probe.called).to.equal(false);
    }
  });

  it("should list the business's assets newest first", async () => {
    // Arrange
    const deps = stubs(null);

    // Act
    const list = await createListAssets(deps as never)({ workspaceAccessKeyId: "WO1" });

    // Assert
    expect(list).to.have.length(1);
    expect(deps.db.asset.findMany.firstCall.args[0]).to.deep.include({
      where: { workspaceAccessKeyId: "WO1" },
      orderBy: { createdAt: "desc" }
    });
  });

  it("should refuse to delete an asset an ad has used", async () => {
    // Arrange
    const deps = stubs(null);
    deps.db.asset.findFirst.resolves(row({ _count: { placements: 2 } }));

    // Act + Assert
    await expectDomain(
      createDeleteAsset(deps as never)({ id: ASSET_ID, workspaceAccessKeyId: "WO1" }),
      "errors.asset.inUse"
    );
    expect(deps.db.asset.delete.called).to.equal(false);
  });

  it("should delete an unused asset and its files", async () => {
    // Arrange
    const deps = stubs(null);

    // Act
    await createDeleteAsset(deps as never)({ id: ASSET_ID, workspaceAccessKeyId: "WO1" });

    // Assert
    expect(deps.db.asset.delete.calledOnce).to.equal(true);
    expect(deps.store.remove.calledOnceWith(ASSET_ID)).to.equal(true);
  });
});
