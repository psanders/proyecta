/**
 * Copyright (C) 2026 by Proyecta. All rights reserved.
 */
import { expect } from "chai";
import sinon from "sinon";
import { createRenditionQueue } from "../../../src/media/createRenditionQueue.js";
import { classifyProbe, renditionSize } from "../../../src/media/ffmpeg.js";

describe("media probe and renditions", () => {
  afterEach(() => sinon.restore());

  it("should classify ffprobe output as video, image or unreadable", () => {
    // Act + Assert
    expect(
      classifyProbe({
        streams: [{ codec_type: "video", codec_name: "h264", width: 1920, height: 1080 }],
        format: { format_name: "mov,mp4,m4a,3gp,3g2,mj2", duration: "15.000000" }
      })
    ).to.deep.equal({ kind: "VIDEO", width: 1920, height: 1080, durationSec: 15 });
    expect(
      classifyProbe({
        streams: [{ codec_type: "video", codec_name: "png", width: 1080, height: 1920 }],
        format: { format_name: "png_pipe" }
      })
    ).to.deep.include({ kind: "IMAGE" });
    expect(classifyProbe({ streams: [], format: { format_name: "tty" } })).to.equal(null);
  });

  it("should cap renditions at 1920 on the long side with even dimensions", () => {
    // Act + Assert
    expect(renditionSize(3840, 2160)).to.deep.equal({ width: 1920, height: 1080 });
    expect(renditionSize(1081, 1921)).to.deep.equal({ width: 1080, height: 1920 });
    expect(renditionSize(1280, 720)).to.deep.equal({ width: 1280, height: 720 });
  });

  it("should mark an asset ready with rendition URLs, or failed when rendering throws", async () => {
    // Arrange
    const asset = (id: string) => ({
      id,
      status: "PROCESSING",
      sourceFile: "source.mp4",
      kind: "VIDEO",
      width: 1920,
      height: 1080
    });
    const db = {
      asset: {
        findUnique: sinon.stub().callsFake(({ where }) => Promise.resolve(asset(where.id))),
        update: sinon.stub().resolves({}),
        findMany: sinon.stub().resolves([{ id: "a1" }, { id: "a2" }])
      }
    };
    const render = sinon.stub();
    render.onFirstCall().resolves({ webm: "video.webm", mp4: "video.mp4", poster: "poster.webp" });
    render.onSecondCall().rejects(new Error("ffmpeg exited with 1"));
    const store = {
      dirFor: (id: string) => `/c/${id}`,
      urlFor: (id: string, file: string) => `/content/${id}/${file}`,
      importSource: sinon.stub(),
      remove: sinon.stub()
    };
    const queue = createRenditionQueue({ db: db as never, store, render });

    // Act
    await queue.resume();
    await queue.idle();

    // Assert
    expect(render.firstCall.args[0]).to.include({ source: "/c/a1/source.mp4", dir: "/c/a1" });
    expect(db.asset.update.firstCall.args[0]).to.deep.equal({
      where: { id: "a1" },
      data: {
        status: "READY",
        renditions: {
          webm: "/content/a1/video.webm",
          mp4: "/content/a1/video.mp4",
          poster: "/content/a1/poster.webp"
        }
      }
    });
    expect(db.asset.update.secondCall.args[0].data).to.include({
      status: "FAILED",
      failureReason: "ffmpeg exited with 1"
    });
  });
});
